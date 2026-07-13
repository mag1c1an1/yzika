use std::{
    collections::HashMap,
    net::SocketAddr,
    sync::Arc,
    sync::atomic::{AtomicU64, Ordering},
};

use axum::{
    Router,
    extract::{
        Query, State,
        ws::{Message, WebSocket, WebSocketUpgrade},
    },
    response::IntoResponse,
    routing::get,
};
use futures_util::{SinkExt, StreamExt};
use serde::Deserialize;
use serde_json::{Value, json};
use tokio::sync::{Mutex, mpsc};
use tower_http::{services::ServeDir, trace::TraceLayer};
use tracing::{debug, error, info, warn};
use tracing_subscriber::{EnvFilter, fmt};

const MAX_PEERS: usize = 32;
const PEER_QUEUE_CAPACITY: usize = 64;
const MAX_SIGNAL_MESSAGE_BYTES: usize = 64 * 1024;

// Each peer gets a bounded outbound queue. This prevents a slow or disconnected
// websocket from accumulating unbounded messages in memory.
type PeerSender = mpsc::Sender<Message>;
type Peers = Arc<Mutex<HashMap<String, PeerSender>>>;

#[derive(Clone)]
struct AppState {
    peers: Peers,
    next_peer_id: Arc<AtomicU64>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            peers: Arc::new(Mutex::new(HashMap::new())),
            next_peer_id: Arc::new(AtomicU64::new(1)),
        }
    }
}

impl AppState {
    fn allocate_peer_id(&self) -> String {
        let id = self.next_peer_id.fetch_add(1, Ordering::Relaxed);
        format!("peer-{id}")
    }
}

#[derive(Debug, Deserialize)]
struct ConnectParams {
    #[serde(rename = "peerId")]
    peer_id: Option<String>,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("signal=info,tower_http=info"));
    fmt().with_env_filter(filter).init();

    let state = AppState::default();
    let app = Router::new()
        .route("/health", get(|| async { "ok" }))
        .route("/ws", get(ws_handler))
        .fallback_service(ServeDir::new("public").append_index_html_on_directories(true))
        .with_state(state)
        .layer(TraceLayer::new_for_http());

    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));
    let listener = tokio::net::TcpListener::bind(addr).await?;
    info!(%addr, "listening");

    axum::serve(listener, app).await?;
    Ok(())
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    Query(params): Query<ConnectParams>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, params.peer_id, state))
}

async fn handle_socket(mut socket: WebSocket, requested_peer_id: Option<String>, state: AppState) {
    let peer_id = requested_peer_id
        .map(|peer_id| peer_id.trim().to_owned())
        .filter(|peer_id| !peer_id.is_empty())
        .unwrap_or_else(|| state.allocate_peer_id());

    if !is_valid_peer_id(&peer_id) {
        send_socket_error(
            &mut socket,
            "peerId may only contain letters, numbers, hyphen, and underscore, and must be at most 64 characters",
        )
        .await;
        return;
    }

    let (tx, mut rx) = mpsc::channel::<Message>(PEER_QUEUE_CAPACITY);

    {
        let mut peers = state.peers.lock().await;
        if peers.contains_key(&peer_id) {
            drop(peers);
            send_socket_error(&mut socket, "peerId is already connected").await;
            return;
        }

        if peers.len() >= MAX_PEERS {
            drop(peers);
            send_socket_error(&mut socket, "server is at peer capacity").await;
            return;
        }

        peers.insert(peer_id.clone(), tx.clone());
    }

    info!(%peer_id, "peer connected");
    send_json_to_peer(
        &state,
        &peer_id,
        json!({ "type": "welcome", "peerId": peer_id }),
    )
    .await;
    broadcast_except(
        &state,
        &peer_id,
        json!({ "type": "peer-joined", "peerId": peer_id }),
    )
    .await;

    let (mut socket_sender, mut socket_receiver) = socket.split();

    let send_peer_id = peer_id.clone();
    let send_task = tokio::spawn(async move {
        while let Some(message) = rx.recv().await {
            if let Err(err) = socket_sender.send(message).await {
                debug!(%send_peer_id, %err, "websocket send error");
                break;
            }
        }
    });

    while let Some(result) = socket_receiver.next().await {
        // 处理客户端发来的 offer / answer / ice-candidate 等
        match result {
            Ok(Message::Text(text)) => {
                if text.len() > MAX_SIGNAL_MESSAGE_BYTES {
                    send_json_to_peer(
                        &state,
                        &peer_id,
                        json!({ "type": "error", "message": "signal message is too large" }),
                    )
                    .await;
                    continue;
                }

                forward_signal(&state, &peer_id, text.as_str()).await;
            }
            Ok(Message::Close(_)) => break,
            Ok(Message::Binary(_)) => {
                send_json_to_peer(
                    &state,
                    &peer_id,
                    json!({ "type": "error", "message": "binary messages are not supported" }),
                )
                .await;
            }
            Ok(Message::Ping(_)) | Ok(Message::Pong(_)) => {}
            Err(err) => {
                debug!(%peer_id, %err, "websocket receive error");
                break;
            }
        }
    }

    {
        let mut peers = state.peers.lock().await;
        peers.remove(&peer_id);
    }

    send_task.abort();
    broadcast_except(
        &state,
        &peer_id,
        json!({ "type": "peer-left", "peerId": peer_id }),
    )
    .await;
    info!(%peer_id, "peer disconnected");
}

async fn forward_signal(state: &AppState, from: &str, raw_message: &str) {
    let mut message: Value = match serde_json::from_str(raw_message) {
        Ok(message) => message,
        Err(err) => {
            warn!(%from, %err, "invalid json from peer");
            send_json_to_peer(
                state,
                from,
                json!({ "type": "error", "message": "invalid JSON message" }),
            )
            .await;
            return;
        }
    };

    let Some(message_type) = message.get("type").and_then(Value::as_str) else {
        send_json_to_peer(
            state,
            from,
            json!({ "type": "error", "message": "message.type is required" }),
        )
        .await;
        return;
    };

    if !is_supported_message_type(message_type) {
        send_json_to_peer(
            state,
            from,
            json!({ "type": "error", "message": format!("unsupported signal type: {message_type}") }),
        )
        .await;
        return;
    }

    let Some(target) = message
        .get("target")
        .and_then(Value::as_str)
        .map(str::to_owned)
        .filter(|target| is_valid_peer_id(target))
    else {
        send_json_to_peer(
            state,
            from,
            json!({ "type": "error", "message": "valid message.target is required" }),
        )
        .await;
        return;
    };

    let Value::Object(ref mut object) = message else {
        send_json_to_peer(
            state,
            from,
            json!({ "type": "error", "message": "message must be a JSON object" }),
        )
        .await;
        return;
    };

    object.insert("from".to_owned(), Value::String(from.to_owned()));

    let target_sender = {
        let peers = state.peers.lock().await;
        peers.get(&target).cloned()
    };

    match target_sender {
        Some(sender) => {
            if sender
                .try_send(Message::Text(message.to_string().into()))
                .is_err()
            {
                error!(%from, %target, "failed to enqueue signal for target");
                send_json_to_peer(
                    state,
                    from,
                    json!({ "type": "error", "message": "target is busy or not available" }),
                )
                .await;
            }
        }
        None => {
            send_json_to_peer(
                state,
                from,
                json!({ "type": "error", "message": format!("target peer not found: {target}") }),
            )
            .await;
        }
    }
}

async fn send_socket_error(socket: &mut WebSocket, message: &str) {
    let payload = json!({ "type": "error", "message": message }).to_string();
    let _ = socket.send(Message::Text(payload.into())).await;
    let _ = socket.send(Message::Close(None)).await;
}

async fn send_json_to_peer(state: &AppState, peer_id: &str, payload: Value) {
    let sender = {
        let peers = state.peers.lock().await;
        peers.get(peer_id).cloned()
    };

    if let Some(sender) = sender {
        let _ = sender.try_send(Message::Text(payload.to_string().into()));
    }
}

async fn broadcast_except(state: &AppState, excluded_peer_id: &str, payload: Value) {
    let serialized = payload.to_string();
    let senders = {
        let peers = state.peers.lock().await;
        peers
            .iter()
            .filter(|(peer_id, _)| peer_id.as_str() != excluded_peer_id)
            .map(|(_, sender)| sender.clone())
            .collect::<Vec<_>>()
    };

    for sender in senders {
        let _ = sender.try_send(Message::Text(serialized.clone().into()));
    }
}

fn is_supported_message_type(message_type: &str) -> bool {
    matches!(
        message_type,
        "offer"
            | "answer"
            | "ice-candidate"
            | "viewer-ready"
            | "broadcast-unavailable"
            | "broadcast-stopped"
    )
}

fn is_valid_peer_id(peer_id: &str) -> bool {
    !peer_id.is_empty()
        && peer_id.len() <= 64
        && peer_id
            .chars()
            .all(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '-' | '_'))
}
