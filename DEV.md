# NPMplus local development

This is a dev setup for hacking on the **backend** (Node.js/Express API) and
**frontend** (React + Vite) without rebuilding the heavy production image
(which compiles nginx + aws-lc + certbot from source).

## How it fits together

| Part | Tech | Runs where in dev |
|------|------|-------------------|
| Backend | Node.js ESM, Express 5, better-sqlite3. Listens on a **unix socket** `/run/npmplus.sock`; calls real nginx/certbot on startup. | Inside the dev container (it needs nginx/certbot/Linux). Source is bind-mounted so you edit on the host. |
| Frontend | React 19 + Vite. Talks to the backend via relative `/api`. Auth uses a Secure `__Host-` cookie. | On the host via `pnpm vite` (HTTPS, port 5173), proxying `/api` to the container. |
| nginx | Custom C build, ~15 modules. | Comes prebuilt from the released image — **never recompiled** in this setup. |

The dev container is built by `Dockerfile.dev`: it starts `FROM zoeyvid/npmplus:latest`
(which already has the compiled nginx) and just reinstalls the backend deps for
the current `develop` source, because `develop` is often ahead of the released image.

## Prerequisites (already installed on this machine)

- Docker Desktop, Node.js, pnpm, OpenSSL, git.

## First-time setup

```sh
# 1. Frontend deps
cd frontend && pnpm install && cd ..

# 2. A self-signed cert for the Vite HTTPS dev server (needed for the auth cookie)
#    Already generated at frontend/.dev-cert/. To recreate:
#    MSYS_NO_PATHCONV=1 openssl req -x509 -newkey rsa:2048 -nodes \
#      -keyout frontend/.dev-cert/key.pem -out frontend/.dev-cert/cert.pem \
#      -days 3650 -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
```

## Run it

**Terminal 1 — backend + nginx (Docker):**

```sh
docker compose -f compose.dev.yaml up -d --build   # --build only needed the first time / after dep changes
docker compose -f compose.dev.yaml logs -f          # watch backend logs
```

The admin UI + API is now at **https://localhost:8181** (self-signed — accept the warning).
Default login (seeded via env in compose.dev.yaml):

- email: `admin@example.com`
- password: `changeme123`

**Terminal 2 — frontend with hot reload:**

```sh
cd frontend
# PowerShell:
$env:VITE_DEV_PROXY_TARGET="https://localhost:8181"; pnpm vite
# Git Bash:
VITE_DEV_PROXY_TARGET=https://localhost:8181 pnpm vite
```

Open **https://localhost:5173**. Edits to `frontend/src/**` hot-reload instantly,
and `/api` calls are proxied to the container.

> You can also just use the in-container UI at https://localhost:8181 (the prebuilt
> frontend), but you only get hot reload via the Vite server on 5173.

## Making changes

### Backend (`backend/**`)
Plain JS, no build step. Edit the file, then restart the container to reload:

```sh
docker compose -f compose.dev.yaml restart
```

- New **dependency** in `backend/package.json` → rebuild the dev image:
  `docker compose -f compose.dev.yaml up -d --build`
- New **DB migration** in `backend/migrations/` → applied automatically on restart
  (the backend runs migrations on startup).

### Frontend (`frontend/**`)
Hot-reloads automatically while `pnpm vite` is running. New deps → `pnpm install`.

## Useful commands

```sh
docker compose -f compose.dev.yaml ps         # status / health
docker compose -f compose.dev.yaml logs -f    # follow logs
docker compose -f compose.dev.yaml restart    # apply backend code changes
docker compose -f compose.dev.yaml down       # stop (keeps ./data and volumes)
docker compose -f compose.dev.yaml down -v    # stop + wipe node_modules/frontend volumes
docker exec -it npmplus-dev sh                # shell into the container
```

Persistent data (sqlite db, certs) lives in `./data/` on the host (gitignored).
Delete it to start from a clean slate.

## Gotchas

- **Line endings:** the container runs `backend/**` as Linux scripts, so they must be
  **LF**, not CRLF. `core.autocrlf` is set to `false` for this clone. If you ever see
  `env: 'node\r': No such file or directory`, convert with:
  `find backend rootfs -type f -exec sed -i 's/\r$//' {} +`
- **Version drift:** if the backend fails to start with a missing/incompatible module
  after a `git pull`, rebuild the dev image: `docker compose -f compose.dev.yaml up -d --build`.
- **Full production image:** only needed if you change nginx config compilation, lua,
  or C modules — `docker build -t npmplus .` (slow, compiles nginx from source).
- **Host networking:** production `compose.yaml` uses `network_mode: host`, which is
  unreliable on Docker Desktop. `compose.dev.yaml` uses published ports instead.
