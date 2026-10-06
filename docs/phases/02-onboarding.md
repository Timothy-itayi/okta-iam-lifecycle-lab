# Phase 2 — SaaS onboarding

## 2.1 Scaffold Rostr

Rostr is an Express app in `rostr/`. It uses `better-sqlite3` and `express-session`. The users table columns are `id`, `userName`, `givenName`, `familyName`, `email`, `department`, `title`, `active`, `lastLogin`, and `licensed`. `id` is text. `userName` is unique.

Routes: `/health` returns the text `OK`, `/me` shows the signed-in attributes or "Not signed in", `/admin/users` lists the table. A sign-in is appended to `logs/rostr-auth.jsonl` as `time`, `protocol`, `user`, and `outcome`. Nothing calls that logger until SAML is added. `/admin/users` is not gated. That check is the OIDC task.

`docker compose up` from `rostr/` built the image and started the container. The log says `Rostr listening on 3000`: [evidence/2.1-rostr-listening.png](../../evidence/2.1-rostr-listening.png). Docker Desktop shows `rostr-1` with `3000:3000`: [evidence/2.1-rostr-docker-desktop.png](../../evidence/2.1-rostr-docker-desktop.png).

The MemoryStore warning in that log is the `express-session` default. One process is what this lab runs. It is not a failed start.

The image is Node 22. `better-sqlite3` 13 requires Node 22 or newer. Node 20 installed the module and then the process died with a segfault before it listened.

Compose mounts the repo `logs/` directory and `rostr/data/`. The database file is `rostr/data/rostr.sqlite` inside that directory. `SESSION_SECRET` comes from `rostr/.env` and is not in the image.

An earlier run of this image returned `OK` from `http://127.0.0.1:3000/health`. The two screenshots above show the container listening. They do not show that response body.

## 2.2 HTTPS address

The hostname is `rostr.lanternfieldgoods.co.uk`, not the runbook's `.com`. Tunnel `rostr` was created with id `52a3de6f-81d8-4452-93e5-a550ed263116`: [evidence/2.2-tunnel-created.png](../../evidence/2.2-tunnel-created.png). The CNAME was added: [evidence/2.2-tunnel-dns-cname.png](../../evidence/2.2-tunnel-dns-cname.png).

`~/.cloudflared/config.yml` sends that hostname to `http://localhost:3000`, then `http_status:404` for everything else. `cloudflared tunnel run rostr` registered a connection. `https://rostr.lanternfieldgoods.co.uk/health` returned `OK` with `content-type: text/plain` at 2026-10-06 14:24 +1100.

The credentials file stays outside the repo. The quick-tunnel fallback was not used. The reason is in [docs/decisions/00-domain.md](../decisions/00-domain.md).

A phone opened the public hostname at 14:27 and the page showed `Cannot GET /`: [evidence/2.2-phone-public-root.png](../../evidence/2.2-phone-public-root.png). That is Express's response for `/`. Localhost `/` returns the same text, because Rostr has no route there. `/health` is the route that returns `OK`. The phone reached the Rostr process through the public name.
