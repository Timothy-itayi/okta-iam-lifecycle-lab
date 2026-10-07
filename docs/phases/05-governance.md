# Phase 5 — Governance

osTicket is the ticket, not the provisioner. Staff login, the Access Request help topic, Lena Ortiz's `REQ-0001`, and the manager approval note are in place. The Access Request flow added her to `APP-Rostr-Admins` at 13:06. OIDC `/me` and `/admin/users` as Lena worked at 13:19–13:23. The one-hour remove has not fired. Access review REQ-0002 applied at 13:43. Stale-Access is not started.

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
| Incognito `/oidc/login` as Lena, `/me` shows `aud` `0oa18egjva6o5FpoP698`, `sub` `00u18dk3t6entw6Kv698`, `groups` `APP-Rostr-Users, APP-Rostr-Admins` | 13:19 | [evidence/5.2-lena-oidc-me.png](../../evidence/5.2-lena-oidc-me.png) |
| Same session, `/admin/users` renders the Rostr users table | 13:23 | [evidence/5.2-lena-admin-users.png](../../evidence/5.2-lena-admin-users.png) |

Group membership was not enough to open the OIDC app until Rostr Admin was assigned to `APP-Rostr-Admins`. That group assignment is now on the app at priority 1: [evidence/5.2-rostr-admin-group-assignment.png](../../evidence/5.2-rostr-admin-group-assignment.png). An Individual assignment of Lena was used to get `/oidc/login` working. Remove that People row if it is type Individual. Do not unassign the group, and do not take her out of `APP-Rostr-Admins`. Wait For only removes the group membership. An Individual row would survive the revoke.

OIDC does not write `lastLogin`. Lena's row stayed empty. Jonah Hale's SAML time `2026-10-06T05:20:26.829Z` is unchanged. Samir Adeyemi and `test.joiner` are `active` no. Orphan Roster is still in the table.

The ticket stays Open until she is removed. The 13:06 POST already triggered the flow with `REQ-0001`. Do not POST again. Wait For is one hour from that call, so revoke is due around 14:06.

## 5.2 Close-out (not done)

Done when grant-after-approval and automatic remove show in all three records: ticket `357784`, Workflows History for the 13:06 run, System Log add and remove.

The flow is **Not saving data**, same as Leaver. History will have the execution row and not the card outputs. That row's URL is still the run link. Copy it from Workflows → this flow → History. The 13:06 run should still be in progress until Wait For ends.

After ~14:06, in this order:

1. System Log: `group.user_membership.add` at 13:06:18 (already shot) and `group.user_membership.remove` for Lena / `APP-Rostr-Admins`. Same actor as the add.
2. Directory: Lena not in `APP-Rostr-Admins`. Rostr sqlite and SCIM should drop her from that group.
3. New private window, `/oidc/login` as Lena, then `/admin/users`. Expect 403 (`Not allowed.`) if she can still sign in, or Okta refusing the app if group assignment is the only grant.
4. osTicket `357784`, Internal Note, then Close. Note text: `REQ-0001` granted 13:06, removed automatically after one hour, paste the History run URL. Do not Close before the remove event exists.
5. Save: History (completed run), System Log remove, ticket Closed with that note.

| Evidence still needed | File |
| --- | --- |
| Workflows History, this run | `evidence/5.2-flow-history.png` |
| `group.user_membership.remove` | `evidence/5.2-system-log-group-remove.png` |
| Ticket Closed, note has the run link | `evidence/5.2-ticket-closed.png` |

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

## 5.3 Access review

The runbook lists this as 5.2. This repo already used 5.2 for Access Request.

`scripts/access-review` is a script, not a flow. It reads every Rostr sqlite user, joins HR for manager, Okta for groups, and the System Log for last `user.authentication.sso` against the SAML Rostr app `0oa18eddmjpNG4dNI698` or the OIDC app `0oa18egjva6o5FpoP698`. It writes one CSV per manager with an empty `decision` column.

```
node scripts/access-review export --out evidence/5.3
node scripts/access-review apply --in evidence/5.3 --ticket REQ-0002
node scripts/access-review apply --in evidence/5.3 --ticket REQ-0002 --apply
```

Dry-run is the default. `--apply` removes the user from `APP-Rostr-Users` and `APP-Rostr-Admins` only. `svc-jml-sync` has no `okta.apps.manage`, so it cannot unassign the app. It does not touch `DEPT-` groups. The `DEPT-*` → `APP-Rostr-Users` rule would put an **active** staff member back. The two Revoke rows were leftover memberships on deprovisioned accounts, so the deletes stuck.

Export at 13:42: 10 Rostr rows, 5 files. Last Rostr SSO: Jonah Hale `2026-10-06T06:35:49.117Z`, Lena Ortiz `2026-10-07T02:19:24.525Z`. Everyone else empty. Assignment source is `group` where `APP-Rostr-*` is present, `none` for Orphan Roster (no Okta user).

| File | Who decides | Rows | Decision |
| --- | --- | --- | --- |
| [ava-nguyen.csv](../../evidence/5.3/ava-nguyen.csv) | Ava Nguyen | Jonah Hale | Keep |
| [marcus-bell.csv](../../evidence/5.3/marcus-bell.csv) | Marcus Bell | Lena, Priya, Thomas | Keep |
| [helen-cho.csv](../../evidence/5.3/helen-cho.csv) | Helen Cho | Samir Adeyemi | Revoke |
| [no-manager.csv](../../evidence/5.3/no-manager.csv) | Department heads | Ava, Helen, Marcus | Keep |
| [unmanaged.csv](../../evidence/5.3/unmanaged.csv) | Not in HR | Orphan Roster Keep, `test.joiner` Revoke | mixed |

Lena stayed Keep. Her `APP-Rostr-Admins` grant is the in-flight Access Request.

Apply REQ-0002 at `2026-10-07T02:43:27.024Z` (13:43 +1100). Both deletes HTTP 204. Log: [evidence/5.3/revocation.csv](../../evidence/5.3/revocation.csv). A second dry-run then reported `(no APP-Rostr group)` for both. Rostr sqlite still listed Samir in `APP-Rostr-Users` immediately after; group push is not the review's apply path.
