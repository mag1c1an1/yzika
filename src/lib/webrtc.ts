export const BROADCASTER_ID = "broadcaster";
export const SIGNAL_PATH = "/signal/ws";
export const PLAYBACK_TIMEOUT_MS = 4000;
export const CONNECTION_STATS_INTERVAL_MS = 5000;

export const SCREEN_SHARE_WIDTH = 1920;
export const SCREEN_SHARE_HEIGHT = 1080;
export const SCREEN_SHARE_FRAME_RATE = 60;
export const SCREEN_SHARE_CONTENT_HINT = "detail";

export const P2P_SCREEN_SHARE_MAX_BITRATE = 6_000_000;
export const RELAY_SCREEN_SHARE_MAX_BITRATE = 1_200_000;
export const RELAY_SCREEN_SHARE_FRAME_RATE = 15;
export const RELAY_SCREEN_SHARE_SCALE_DOWN_BY = 1.5;

export const screenCaptureOptions: DisplayMediaStreamOptions = {
  video: {
    width: { ideal: SCREEN_SHARE_WIDTH, max: SCREEN_SHARE_WIDTH },
    height: { ideal: SCREEN_SHARE_HEIGHT, max: SCREEN_SHARE_HEIGHT },
    frameRate: {
      ideal: SCREEN_SHARE_FRAME_RATE,
      max: SCREEN_SHARE_FRAME_RATE,
    },
  },
  audio: false,
};

export const initialScreenShareEncoding: RTCRtpEncodingParameters = {
  maxBitrate: RELAY_SCREEN_SHARE_MAX_BITRATE,
  maxFramerate: RELAY_SCREEN_SHARE_FRAME_RATE,
  scaleResolutionDownBy: RELAY_SCREEN_SHARE_SCALE_DOWN_BY,
};

export const p2pScreenShareEncoding: RTCRtpEncodingParameters = {
  maxBitrate: P2P_SCREEN_SHARE_MAX_BITRATE,
  maxFramerate: SCREEN_SHARE_FRAME_RATE,
  scaleResolutionDownBy: 1,
};

export const relayScreenShareEncoding: RTCRtpEncodingParameters = {
  maxBitrate: RELAY_SCREEN_SHARE_MAX_BITRATE,
  maxFramerate: RELAY_SCREEN_SHARE_FRAME_RATE,
  scaleResolutionDownBy: RELAY_SCREEN_SHARE_SCALE_DOWN_BY,
};

export const rtcConfig: RTCConfiguration = {
  iceServers: [
    {
      urls: "turn:mag1cian.top:3478",
      username: "stream",
      credential: "simplepassword",
    },
    { urls: "stun:stun.l.google.com:19302" },
  ],
};

export type SignalMessage = {
  type: string;
  peerId?: string;
  from?: string;
  target?: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  message?: string;
};

type CandidatePairStats = RTCStats & {
  state?: string;
  nominated?: boolean;
  selected?: boolean;
  localCandidateId?: string;
  remoteCandidateId?: string;
};

type CandidateStats = RTCStats & {
  candidateType?: string;
  protocol?: string;
  relayProtocol?: string;
  address?: string;
  ip?: string;
  port?: number;
};

export type IceRouteInfo = {
  isTurnRelay: boolean;
  localType?: string;
  remoteType?: string;
  localProtocol?: string;
  remoteProtocol?: string;
};

export type ScreenShareRouteProfile = "p2p" | "relay" | "unknown";

export function createSignalUrl(peerId: string) {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  const params = new URLSearchParams({ peerId });
  return `${protocol}//${location.host}${SIGNAL_PATH}?${params}`;
}

export async function getSelectedIceRoute(
  peerConnection: RTCPeerConnection,
): Promise<IceRouteInfo | undefined> {
  const stats = await peerConnection.getStats();
  let selectedPair = findSelectedCandidatePair(stats);

  if (!selectedPair) {
    return undefined;
  }

  const localCandidate = selectedPair.localCandidateId
    ? (stats.get(selectedPair.localCandidateId) as CandidateStats | undefined)
    : undefined;
  const remoteCandidate = selectedPair.remoteCandidateId
    ? (stats.get(selectedPair.remoteCandidateId) as CandidateStats | undefined)
    : undefined;

  const localType = localCandidate?.candidateType;
  const remoteType = remoteCandidate?.candidateType;

  return {
    isTurnRelay: localType === "relay" || remoteType === "relay",
    localType,
    remoteType,
    localProtocol: localCandidate?.protocol ?? localCandidate?.relayProtocol,
    remoteProtocol: remoteCandidate?.protocol ?? remoteCandidate?.relayProtocol,
  };
}

export function getScreenShareRouteProfile(
  route: IceRouteInfo | undefined,
): ScreenShareRouteProfile {
  if (!route) {
    return "unknown";
  }

  return route.isTurnRelay ? "relay" : "p2p";
}

export function getScreenShareEncodingForRoute(
  route: IceRouteInfo | undefined,
) {
  return getScreenShareRouteProfile(route) === "p2p"
    ? p2pScreenShareEncoding
    : relayScreenShareEncoding;
}

export function describeScreenShareProfile(profile: ScreenShareRouteProfile) {
  switch (profile) {
    case "p2p":
      return "P2P 档：1080p60 / 最高 6Mbps";
    case "relay":
      return "TURN 档：约 720p15 / 最高 1.2Mbps";
    case "unknown":
      return "初始保守档：约 720p15 / 最高 1.2Mbps";
  }
}

export function describeIceRoute(route: IceRouteInfo | undefined) {
  if (!route) {
    return "连接路径未知";
  }

  const typeSummary = [route.localType, route.remoteType]
    .filter(Boolean)
    .join(" -> ");

  if (route.isTurnRelay) {
    return `TURN 中继 (${typeSummary || "relay"})`;
  }

  if (typeSummary.includes("srflx") || typeSummary.includes("prflx")) {
    return `P2P 直连 / STUN 打洞 (${typeSummary})`;
  }

  if (typeSummary.includes("host")) {
    return `P2P 直连 / host (${typeSummary})`;
  }

  return `P2P 直连 (${typeSummary || "unknown"})`;
}

export function formatBitrate(bitsPerSecond: number | undefined) {
  if (bitsPerSecond === undefined || !Number.isFinite(bitsPerSecond)) {
    return "unknown";
  }

  if (bitsPerSecond >= 1_000_000) {
    return `${(bitsPerSecond / 1_000_000).toFixed(2)}Mbps`;
  }

  return `${Math.round(bitsPerSecond / 1_000)}kbps`;
}

function findSelectedCandidatePair(stats: RTCStatsReport) {
  let selectedPair: CandidatePairStats | undefined;
  let selectedPairId: string | undefined;

  stats.forEach((stat) => {
    if (stat.type === "transport") {
      const transport = stat as RTCStats & { selectedCandidatePairId?: string };
      if (transport.selectedCandidatePairId) {
        selectedPairId = transport.selectedCandidatePairId;
      }
    }

    if (stat.type === "candidate-pair") {
      const pair = stat as CandidatePairStats;
      if (pair.selected || (pair.nominated && pair.state === "succeeded")) {
        selectedPair = pair;
      }
    }
  });

  if (selectedPairId) {
    return stats.get(selectedPairId) as CandidatePairStats | undefined;
  }

  return selectedPair;
}
