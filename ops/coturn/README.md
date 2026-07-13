# coturn provisioning

coturn is a TURN relay server for WebRTC. It is separate from nginx and the Rust signaling service.

This repo includes a manual GitHub Actions workflow:

```txt
.github/workflows/provision-coturn.yml
```

It is triggered only by `workflow_dispatch`, so normal `git push` deploys do not reinstall or reconfigure coturn.

## Required GitHub Secrets

Add these under `Settings -> Secrets and variables -> Actions`:

| Secret | Required | Description |
| --- | --- | --- |
| `DEPLOY_KEY` | yes | Existing SSH deploy key for the server |
| `TURN_PASSWORD` | yes | coturn password for the static TURN user |
| `TURN_USERNAME` | no | coturn username; defaults to `stream` if omitted |

## Workflow inputs

When running `Provision coturn` manually, keep or adjust:

| Input | Default | Description |
| --- | --- | --- |
| `turn_public_ip` | `101.132.60.231` | Public IP advertised by coturn |
| `turn_realm` | `mag1cian.top` | TURN realm / server name |
| `turn_min_port` | `49160` | Minimum UDP relay port |
| `turn_max_port` | `49200` | Maximum UDP relay port |

## What the workflow does

- Installs `coturn` via `apt-get`, `dnf`, or `yum`
- Backs up `/etc/turnserver.conf`
- Writes a managed `/etc/turnserver.conf`
- Enables coturn on Debian-style systems via `/etc/default/coturn`
- Enables and restarts the detected systemd service: `coturn` or `turnserver`

## Cloud firewall / security group

The workflow cannot update Alibaba Cloud security groups unless cloud API credentials are added. Manually allow:

```txt
3478/tcp
3478/udp
49160-49200/udp
```

If you change the relay port range in the workflow inputs, update the security group accordingly.

## Runtime checks

On the server:

```bash
systemctl status coturn || systemctl status turnserver
ss -lunt | grep ':3478'
```

For browser-side TURN testing, use:

```txt
https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
```

## Frontend note

Deploying coturn only starts the relay. To actually use it, both `/stream/` and `/live/` need the TURN server in `RTCPeerConnection.iceServers`, for example:

```ts
{
  urls: "turn:mag1cian.top:3478",
  username: "stream",
  credential: "TURN_PASSWORD"
}
```

A fixed TURN password in frontend code is visible to users. For a small personal site this may be acceptable temporarily, but the safer long-term approach is to issue short-lived TURN credentials from the Rust signaling service.
