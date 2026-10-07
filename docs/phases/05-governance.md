# Phase 5 — Governance

osTicket is the ticket, not the provisioner. Staff login, the Access Request help topic, Lena Ortiz's `REQ-0001`, and the manager approval note are in place. The Access Request flow added her to `APP-Rostr-Admins` at 13:06. OIDC `/admin/users` has not been proven. The one-hour remove has not fired. Stale-Access is not started.

Login pain is [docs/incidents/01-osticket-staff-login.md](../incidents/01-osticket-staff-login.md). osTicket is `rinkp/osticket-dockerized:1.18.4` on `127.0.0.1:8080`, leftover volume from 29 September, not this repo's compose.

## 5.1 osTicket Access Request ticket

Lena Ortiz, EMP-1005, asked for `APP-Rostr-Admins` for one hour. Marcus Bell, EMP-1004, is her manager. Mail is not configured, so the approval is an Internal Note from Admin, not a message Marcus received.

| Step | Clock (Sydney) | Evidence |
| --- | --- | --- |
| Staff `/scp` as Admin | 12:15 | [evidence/5.1-osticket-staff-login.png](../../evidence/5.1-osticket-staff-login.png) |
| Help topic `Access Request`, Active, Public, Support | 12:24 | [evidence/5.1-osticket-help-topics.png](../../evidence/5.1-osticket-help-topics.png) |
| Open ticket `357784`, subject `REQ-0001 APP-Rostr-Admins`, From Lena Ortiz | 12:27 | [evidence/5.1-osticket-ticket-list.png](../../evidence/5.1-osticket-ticket-list.png) |
| Thread: Lena's request, then Internal Note recording Marcus's approval | 12:28 | [evidence/5.1-osticket-approval.png](../../evidence/5.1-osticket-approval.png) |

osTicket timestamps on those screens are 1:24–1:28, which is UTC in the container. The screenshot files are 12:24–12:28 +1100.

The ticket is Open, unassigned, Help Topic Access Request, user `lena.ortiz@lanternfieldgoods.co.uk`. The lab id is `REQ-0001`. osTicket's number is `357784`. Leave it Open until she is in the group and, one hour later, out of it. Then Internal Note that it was revoked, then Close.

`hr-sync` is not used. `hr/employees.json` does not change.

## 5.2 Access Request flow

Saved, Flow ON, **Not saving data**. It adds the user to `APP-Rostr-Admins`, returns HTTP 200, waits one hour, then removes them. It does not update the Okta profile. It does not assign the Rostr Admin app as an Individual. `hr-sync` does not call it.

A first POST returned 404 from Add User to Group: the flow was ON but the canvas still had body `email` on User ID and had not been saved. After Save, a second POST at about 13:06 returned HTTP 200 `{}`. `hr-sync --ticket REQ-0001` dry-run reported `no changes`; that is expected.

| Event | Time (Sydney) | Evidence |
| --- | --- | --- |
| `group.user_membership.add` SUCCESS, actor Timothy Itayi (Workflows Okta connection), target Lena Ortiz / `APP-Rostr-Admins` | 13:06:18 | [evidence/5.2-system-log-group-add.png](../../evidence/5.2-system-log-group-add.png) |
| Group Push of that membership to Rostr | 13:06:18 | same log |
| Lena in `APP-Rostr-Admins`, Active, Managed Manually | 13:07 | [evidence/5.2-lena-in-app-rostr-admins.png](../../evidence/5.2-lena-in-app-rostr-admins.png) |

OIDC `/admin/users` was not a 200. Express `Cannot GET` is a missing route, not the admin gate. `/admin/users` with no session returns `401 Not signed in.` `/oidc/login` only exists if OIDC is mounted. Open a private window, go to `https://rostr.lanternfieldgoods.co.uk/oidc/login`, sign in as Lena (Any two factors), then open `/admin/users`. Do not paste `/admin/users` as the first URL.

The ticket stays Open until she is removed. Wait For is one hour from the successful POST, so revoke is due around 14:06. Then Internal Note, then Close.

`APP-Rostr-Admins` group id `00g18dk6nvdMFQAgi698`. Close uses a dummy API Connector connection named `unused-close` with auth None, because Workflows stuffed Close under API Connector.

| Card | What it does |
| --- | --- |
| API Endpoint | Body `email`, `ticket`. |
| Read User | `User or Login` = body `email`. |
| Add User to Group | Group id above. User ID = Read User **ID** (System Properties). |
| Close | Status 200, empty body. Lets the caller return before the wait. |
| Wait For | Delay 1, unit hour. |
| Remove User from Group | Same group id. User ID = Read User **ID**. |

Do not copy a `00u` from Directory. Read User's input is labelled **User or Login**, so body `email` is legal there. Add and Remove are labelled **User ID**. Drag the **ID** output under Read User System Properties onto those two fields. A first canvas had body `email` on Add/Remove User ID; that is the wrong pill.

![Access Request flow, left: Endpoint, Read User, Add User to Group, Close, Wait For](../../evidence/5.2-access-request-flow-left.png)

![Access Request flow, right: Add, Close, Wait For, Remove](../../evidence/5.2-access-request-flow-right.png)

The invoke URL is `WORKFLOWS_ACCESS_REQUEST_URL`. The client token is `WORKFLOWS_ACCESS_REQUEST_TOKEN`, this flow's token, not the Joiner token. Neither value is in Git. Fulfilment is a POST to that endpoint, not `hr-sync`.
