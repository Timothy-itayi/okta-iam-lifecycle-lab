# Audit evidence pack

Assembled 2026-10-07. This folder collects what an auditor would ask for from this lab: who has access, who approved it, how it was reviewed, and the System Log proving changes.

## Control mapping

| SOC 2 | ISO 27001:2022 | What it covers |
| --- | --- | --- |
| CC6.1 | A.5.15, A.5.16 | Logical access security: authentication, identity management, access provisioning |
| CC6.2 | A.5.17, A.8.5 | Credential management: passwords, MFA, service accounts |
| CC6.3 | A.5.18, A.8.2 | Access authorisation: role assignment, least privilege, periodic review |

## Evidence index

### System Log exports

Pulled 2026-10-07 with `node scripts/audit-log-export.js --out evidence/audit-pack`. `since` is `2026-10-05T00:00:00.000Z`. Each row is slimmed (uuid, time, type, outcome, actor, targets). Tokens, JWTs, and secret-shaped fields are stripped. The trial log API is 60 requests a minute; two earlier runs overlapped and sat on 429 until they were killed.

| File | Events | Control | What it proves |
| --- | --- | --- | --- |
| `system-log-user-lifecycle.jsonl` | 27: create 12, activate 12, deactivate 3 | CC6.1 / A.5.15, A.5.16 | Accounts were created, activated, and deactivated. Joiner and Leaver left a row. |
| `system-log-group-membership.jsonl` | 29: add 21, remove 5, rule trigger 3 | CC6.3 / A.5.18 | Group grants and revokes, including rule-driven `DEPT-*` / `APP-Rostr-Users`. Lena Ortiz added to `APP-Rostr-Admins` at `2026-10-07T02:06:18Z` and removed at `2026-10-07T03:06:20Z` (14:06 Sydney). Access-review removes for Samir Adeyemi and `test.joiner` are at `02:43:30Z` and `02:43:31Z`, actor `svc-jml-sync`. |
| `system-log-app-membership.jsonl` | 46: add 23, remove 5, update 18 | CC6.3 / A.5.18 | App assignment followed group membership. This is the record that a person was actually on the app, not only in a group. |
| `system-log-mfa-factor.jsonl` | 61: activate 58, deactivate 3 | CC6.2 / A.5.17, A.8.5 | Factors were enrolled, and the three deactivates are the lost-phone resets. |
| `system-log-counts.csv` | — | — | Counts above, by event type. |

### Access Request (REQ-0001)

Lena Ortiz requested `APP-Rostr-Admins` for one hour. Marcus Bell approved. Workflows granted at 13:06, due to remove at 14:06.

| File | Control | What it proves |
| --- | --- | --- |
| `access-request/records.md` | CC6.3 / A.5.18 | Request, approval, and grant timeline |
| [../5.1-osticket-staff-login.png](../5.1-osticket-staff-login.png) | CC6.1 / A.5.15 | IT admin authenticated to ticket system |
| [../5.1-osticket-help-topics.png](../5.1-osticket-help-topics.png) | CC6.3 / A.5.18 | Access Request help topic exists |
| [../5.1-osticket-ticket-list.png](../5.1-osticket-ticket-list.png) | CC6.3 / A.5.18 | Ticket `357784` opened by requester |
| [../5.2-ticket-closed.png](../5.2-ticket-closed.png) | CC6.3 / A.5.18 | Ticket `357784` closed by Admin |
| [../5.1-osticket-approval.png](../5.1-osticket-approval.png) | CC6.3 / A.5.18 | Manager approval recorded as Internal Note |
| [../5.2-system-log-group-add.png](../5.2-system-log-group-add.png) | CC6.3 / A.5.18 | `group.user_membership.add` SUCCESS in System Log |
| [../5.2-lena-in-app-rostr-admins.png](../5.2-lena-in-app-rostr-admins.png) | CC6.3 / A.5.18 | User in group after grant |
| [../5.2-lena-oidc-me.png](../5.2-lena-oidc-me.png) | CC6.1 / A.5.16 | OIDC token includes granted group |
| [../5.2-lena-admin-users.png](../5.2-lena-admin-users.png) | CC6.3 / A.5.18 | Elevated access used (admin page rendered) |
| [../5.2-rostr-admin-group-assignment.png](../5.2-rostr-admin-group-assignment.png) | CC6.3 / A.5.18 | App assigned to group, not individual |
| [../5.2-access-request-flow-left.png](../5.2-access-request-flow-left.png) | CC6.3 / A.5.18 | Workflow: add, wait, remove |
| [../5.2-access-request-flow-right.png](../5.2-access-request-flow-right.png) | CC6.3 / A.5.18 | Workflow: automatic revoke after timer |

The remove is in `system-log-group-membership.jsonl` (`03:06:20Z`). Ticket `357784` is Closed: [../5.2-ticket-closed.png](../5.2-ticket-closed.png), panel Date Closed `10/7/26 1:17 PM` (UTC), Closed By Admin Admin. Still missing from the pack: the Workflows History URL. That is a screenshot, not a log row.

### Access review (REQ-0002)

Periodic review of Rostr access. Managers decided Keep or Revoke. Leftovers on deprovisioned accounts were removed.

| File | Control | What it proves |
| --- | --- | --- |
| `access-review/ava-nguyen.csv` | CC6.3 / A.8.2 | Ava Nguyen reviewed Jonah Hale: Keep |
| `access-review/marcus-bell.csv` | CC6.3 / A.8.2 | Marcus Bell reviewed Lena, Priya, Thomas: Keep |
| `access-review/helen-cho.csv` | CC6.3 / A.8.2 | Helen Cho reviewed Samir Adeyemi: Revoke |
| `access-review/no-manager.csv` | CC6.3 / A.8.2 | Department heads self-review: Keep |
| `access-review/unmanaged.csv` | CC6.3 / A.8.2 | Non-HR accounts: Orphan Keep, test.joiner Revoke |
| `access-review/revocation.csv` | CC6.3 / A.5.18 | HTTP 204 deletes for Samir and test.joiner |

### Stale-Access

Accounts with no Rostr sign-in for 30+ days or licensed but not in HR.

| File | Control | What it proves |
| --- | --- | --- |
| `stale-access/stale-access.md` | CC6.3 / A.8.2 | Findings: Jonah Hale stale (planted), Orphan Roster unused |
| `stale-access/stale-plant.json` | — | Test data: backdated lastLogin, licensed flag |

### OAuth integration review

Service apps with API scopes. Unapproved apps flagged and deactivated.

| File | Control | What it proves |
| --- | --- | --- |
| `oauth-review/oauth-review-found.md` | CC6.2 / A.8.5 | Found `legacy-report-tool` with four manage scopes |
| `oauth-review/oauth-review.md` | CC6.2 / A.8.5 | After revoke: grants removed, app deactivated |

## Out of scope

- Full JML event detail (see `evidence/04-jml/`)
- SCIM provisioning logs (see `evidence/03-scim/`)
- MFA enrolment screenshots (see `evidence/1.4-*`, `evidence/1.7-*`)
- Password policy config (see `evidence/1.4-password-security.png`)

## Redaction

`scripts/audit-log-export.js` strips:
- Bearer tokens
- JWTs (three-part base64)
- `clientToken=` query parameters
- Fields matching `token`, `secret`, `password`, `authorization`, `apikey`, `privatekey`, `client_secret`

No `.env` or private key file is in this folder.
