# Offline classroom kit (plain-LAN mirror) - BMC-19 / GitHub #16

Serve the whole Astro Lab Playground from one machine on a classroom network, with no
internet. The site is entirely static and uses only relative paths, so an unzipped copy
needs nothing external. This recipe uses a plain LXC container as the classroom server;
any box that can run a static file server works the same way.

## How offline actually works here (read this first)

- **Live https site** (`https://.../`): a service worker precaches every file after the
  first visit, so the pages reload with no connection afterwards. Registered on purpose.
- **Plain-http LAN mirror** (this recipe): browsers **refuse to register a service worker
  over plain `http://` BY DESIGN** (secure context only). That is fine and expected:
  **no page on this site ever calls the network** - all code, styles, data and images are
  local and relative - so a served mirror works fully offline with **no service worker at
  all**. Do not try to force a service worker over http; there is nothing for it to do.
- **Double-click `index.html`** (`file://`): also works, again because nothing fetches.

So the zip itself is the real answer for the classroom: unzip, serve, done.

## 0. Build the kit on your laptop (once)

```sh
cd astro-lab-playground
node scripts/offline-kit.js          # writes site/sw.js and site/offline/kit.zip
ls -l site/offline/kit.zip           # ~3.3 MB, 85 files, STORE method
```

`site/offline/kit.zip` is committed, so on a fresh clone you can skip the build.

## 1. Create and start the container

```sh
sudo lxc-create -n astrokit -t download -- -d ubuntu -r noble -a amd64
sudo lxc-start -n astrokit -d
sudo lxc-wait -n astrokit -s RUNNING
lxc-info -n astrokit -iH                # note the container's IPv4 address
```

## 2. Copy the kit into the container

```sh
# container rootfs path:
ROOTFS="$(lxc-info -n astrokit -pH)"
sudo mkdir -p "$ROOTFS/opt/astrokit"
sudo cp site/offline/kit.zip "$ROOTFS/opt/astrokit/kit.zip"
```

## 3. Inside the container: unzip and serve

```sh
sudo lxc-attach -n astrokit -- bash -euo pipefail -c '
  apt-get update -qq && apt-get install -y -qq python3 unzip >/dev/null
  rm -rf /srv/astrokit && mkdir -p /srv/astrokit
  unzip -q -o /opt/astrokit/kit.zip -d /srv/astrokit
  echo "served root:"; ls /srv/astrokit
'
```

Then serve the unzipped web root (keep the container in the foreground, or wrap it in a
unit):

```sh
sudo lxc-attach -n astrokit -- python3 -m http.server 8080 --bind 0.0.0.0 --directory /srv/astrokit
```

### Optional: nginx instead of python http.server

```nginx
server {
    listen 8080 default_server;
    listen [::]:8080 default_server;
    root /srv/astrokit;
    index index.html;
    location / { try_files $uri $uri/ =404; }
    # relative paths + index.html fallback mean the SW-cache rules are never needed here
}
```

```sh
sudo lxc-attach -n astrokit -- bash -euo pipefail -c '
  apt-get install -y -qq nginx >/dev/null
  cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.bak
  cat >/etc/nginx/sites-available/default <<EOF
server {
    listen 8080 default_server;
    root /srv/astrokit;
    index index.html;
    location / { try_files \$uri \$uri/ =404; }
}
EOF
  nginx -t && (service nginx restart || nginx -s reload)
'
```

## 4. Checklist (run from the classroom machine or the host)

Every line must print `200`. Point `BASE` at the container address from step 1, or use
`http://localhost:8080` if you port-forwarded.

```sh
BASE=http://$(lxc-info -n astrokit -iH):8080
for path in /index.html /labs/10-spectra/index.html /img/m87.jpg; do
  printf "%-38s %s\n" "$path" "$(curl -s -o /dev/null -w "%{http_code}" "$BASE$path")"
done
```

Expected:

```text
/index.html                            200
/labs/10-spectra/index.html            200
/img/m87.jpg                           200
```

Students point a browser at `http://<container-ip>:8080/` and use every lab. No internet,
no service worker, no errors.

## Teardown

```sh
sudo lxc-stop -n astrokit && sudo lxc-destroy -n astrokit
```
