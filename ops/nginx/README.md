# Nginx deployment notes

`stream-auth.conf` protects `/stream/` with nginx Basic Auth and proxies `/signal/` to the local WebRTC signaling service at `127.0.0.1:3000`.

## Basic Auth credentials

Do not commit the password file and do not put it under `/var/www/mag1cian/`, because the deploy job syncs `dist/` there with `--delete`.

Preferred automated setup: add a GitHub Actions secret named `STREAM_HTPASSWD` containing one htpasswd line, for example:

```txt
admin:$2y$05$...
```

You can generate the value on a machine with `htpasswd` installed:

```bash
htpasswd -nbB admin 'your-password'
```

If `STREAM_HTPASSWD` is configured, the deploy workflow writes it to `/etc/nginx/.htpasswd-stream` on every deploy and sets permissions so nginx workers can read it.

Manual fallback: create the password file directly on the server.

```bash
sudo apt install apache2-utils -y
sudo htpasswd -c /etc/nginx/.htpasswd-stream admin
```

For CentOS / Alibaba Cloud Linux / RHEL:

```bash
sudo yum install httpd-tools -y
sudo htpasswd -c /etc/nginx/.htpasswd-stream admin
```

## One-time nginx include

Include the managed snippet inside the nginx `server { ... }` block for `mag1cian.top`:

```nginx
include /etc/nginx/snippets/stream-auth.conf;
```

Example:

```nginx
server {
    server_name mag1cian.top www.mag1cian.top;
    root /var/www/mag1cian;
    index index.html;

    include /etc/nginx/snippets/stream-auth.conf;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

After the one-time include is in place, GitHub Actions will keep `/etc/nginx/snippets/stream-auth.conf` synchronized, deploy and restart the systemd service `technological-trappist-signal.service`, run `nginx -t`, and reload nginx on each deploy.

## Runtime checks

```bash
systemctl status technological-trappist-signal.service
curl -fsS http://127.0.0.1:3000/health
curl -I https://mag1cian.top/signal/health
curl -I https://mag1cian.top/stream/
```

Unauthenticated `/stream/` should return `401`, not `500`. If nginx returns `500`, check the password file permissions first:

```bash
ls -l /etc/nginx/.htpasswd-stream
sudo chgrp www-data /etc/nginx/.htpasswd-stream
sudo chmod 640 /etc/nginx/.htpasswd-stream
sudo nginx -t
sudo systemctl reload nginx
```

The nginx error log will usually show `permission denied` or `No such file or directory` for `/etc/nginx/.htpasswd-stream` if Basic Auth is the cause.

`/stream/` uses `wss://mag1cian.top/signal/ws?peerId=broadcaster`, and `/live/` uses the same endpoint with a generated viewer peer ID.
