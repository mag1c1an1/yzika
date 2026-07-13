# Nginx deployment notes

`stream-auth.conf` protects `/stream/` with nginx Basic Auth.

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

If `STREAM_HTPASSWD` is configured, the deploy workflow writes it to `/etc/nginx/.htpasswd-stream` on every deploy.

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

After the one-time include is in place, GitHub Actions will keep `/etc/nginx/snippets/stream-auth.conf` synchronized, run `nginx -t`, and reload nginx on each deploy.
