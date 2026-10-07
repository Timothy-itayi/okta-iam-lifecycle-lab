# osTicket staff login Access denied

Date: 2026-10-07. Phase 5 needs the staff control panel at `http://127.0.0.1:8080/scp` to create an Access Request help topic. The guest form loaded. Staff login returned **Access denied**. osTicket is `rinkp/osticket-dockerized:1.18.4` in a separate itops compose stack (`itops-osticket`, `itops-mariadb`), not this repo's `rostr/` compose. The install ticket in the panel is dated 29 September, so this is a leftover homelab volume, not a fresh Phase 5 install.

## What we saw

`/scp/login.php` rejected every combination we tried: the admin email, `OST_ADMIN_PASSWD` from compose, and the password printed in the osticket container log after `Succesfully run installation`. MariaDB logs showed `Access denied for user 'root'@'localhost'`. The compose YAML interpolated `${MARIADB_ROOT_PASSWORD}` and `${OST_DB_PASSWORD}` and looked consistent. A first `docker exec … mariadb -uroot -p` also failed, which looked like the old homelab bug: the MariaDB volume password no longer matching what osTicket claimed to use.

## Cause

Three secrets, three different failures, one leftover volume.

| Secret | Who it is for | What it is not |
| --- | --- | --- |
| `MARIADB_ROOT_PASSWORD` | `root` in MariaDB | Not `/scp`, not the app DB user |
| `OST_DB_PASSWORD` → `MARIADB_PASSWORD` and `OST_DBPASS` | PHP user `osticket` | Not staff login |
| `OST_ADMIN_PASSWD` | Staff password **at first install only** | Changing compose later does not rewrite `ost_staff.passwd` |

`root@localhost` denials were `docker exec` into MariaDB with no password, or with the wrong secret. osTicket talks to host `mariadb` as user `osticket`. An app failure would be `osticket@172…`, not `root@localhost`. There were no `osticket@` denials. The helpdesk was already using the database.

`rinkp`'s installer sets `ost_staff.username` to `md5(OST_ADMIN_EMAIL)`, then prints `sign in with username` plus the email. That log line is wrong. For `admin@homelab.internal` the stored username was `cf9f5a9893ae6a9c264f6b9b8c11f2e1`. `/scp` authenticates against `username` (email lookup also exists, and still failed here). After install it also calls `forcePasswdRest()`, which sets `change_passwd = 1`. It does not keep `OST_ADMIN_PASSWD` in sync with the hash if the env later drifts, and it does not re-hash on container restart. `MARIADB_*` is applied once, when `osticket-db` is first created.

The Access denied on `/scp` was `ost_staff.passwd` not matching what was typed. osTicket 1.18 stores bcrypt cost 8 (PHPass), not `MD5()` in SQL.

## Fix

Connected as the `osticket` DB user (`OST_DB_PASSWORD`), not root with an empty `-p`. Confirmed `ost_staff` staff_id 1 is active and admin. Renamed `username` to `admin`. Generated a bcrypt cost-8 hash inside `itops-osticket` with PHP `password_hash(..., PASSWORD_BCRYPT, ["cost"=>8])` and wrote it to `ost_staff.passwd`. Set `backend` to SQL `NULL` and `change_passwd` to 0. Logged in at `http://127.0.0.1:8080/scp/login.php` as `admin` with that new password.

Did not `docker compose down -v` from this repo. That volume is Rostr. Did not wipe `osticket-db`.

## Check

12:15, `http://127.0.0.1:8080/scp/index.php`, Welcome **Admin.**, Tickets tab, open ticket `829363` subject `osTicket Installed!` from 29 September. Screenshot: [evidence/5.1-osticket-staff-login.png](../../evidence/5.1-osticket-staff-login.png).

## Do this next time

Staff URL is `/scp/login.php`, not the guest Sign in page. Query `ost_staff.username` before trusting the install log. Reset `passwd` with bcrypt cost 8 inside the app container. `docker exec … mariadb -uroot` without `-p` fails on this image; use `-uosticket -p` and `OST_DB_PASSWORD`, or `-uroot -p -h 127.0.0.1` and `MARIADB_ROOT_PASSWORD`. Compose looking fine does not mean the volume was initialised with the current `.env`.
