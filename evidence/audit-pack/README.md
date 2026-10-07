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

**Gap:** JSONL files not generated. Trial org rate-limited `/api/v1/logs` (429) for several minutes. The script (`scripts/audit-log-export.js`) backs off 60 s per retry but could not complete before timeout.

When rate limits clear, run:

```
node scripts/audit-log-export.js --out evidence/audit-pack
```

Expected files (redacted, secrets stripped):

| File | Event family | Control | What it proves |
| --- | --- | --- | --- |
| `system-log-user-lifecycle.jsonl` | `user.lifecycle.*` | CC6.1 / A.5.15 | User creation, activation, suspension, deactivation, password resets |
| `system-log-group-membership.jsonl` | `group.user_membership.*` | CC6.3 / A.5.18 | Group adds and removes (manual and rule-based) |
| `system-log-app-membership.jsonl` | `application.user_membership.*` | CC6.3 / A.5.18 | App assignments and unassignments |
| `system-log-mfa-factor.jsonl` | `user.mfa.factor.*` | CC6.2 / A.5.17 | MFA enrolment, reset, and removal |
| `system-log-counts.csv` | — | — | Event counts by type |

Meanwhile, `evidence/5.2-system-log-group-add.png` shows the `group.user_membership.add` for Lena's Access Request grant.

### Access Request (REQ-0001)

Lena Ortiz requested `APP-Rostr-Admins` for one hour. Marcus Bell approved. Workflows granted at 13:06, due to remove at 14:06.

| File | Control | What it proves |
| --- | --- | --- |
| `access-request/records.md` | CC6.3 / A.5.18 | Request, approval, and grant timeline |
| [../5.1-osticket-staff-login.png](../5.1-osticket-staff-login.png) | CC6.1 / A.5.15 | IT admin authenticated to ticket system |
| [../5.1-osticket-help-topics.png](../5.1-osticket-help-topics.png) | CC6.3 / A.5.18 | Access Request help topic exists |
| [../5.1-osticket-ticket-list.png](../5.1-osticket-ticket-list.png) | CC6.3 / A.5.18 | Ticket `357784` opened by requester |
| [../5.1-osticket-approval.png](../5.1-osticket-approval.png) | CC6.3 / A.5.18 | Manager approval recorded as Internal Note |
| [../5.2-system-log-group-add.png](../5.2-system-log-group-add.png) | CC6.3 / A.5.18 | `group.user_membership.add` SUCCESS in System Log |
| [../5.2-lena-in-app-rostr-admins.png](../5.2-lena-in-app-rostr-admins.png) | CC6.3 / A.5.18 | User in group after grant |
| [../5.2-lena-oidc-me.png](../5.2-lena-oidc-me.png) | CC6.1 / A.5.16 | OIDC token includes granted group |
| [../5.2-lena-admin-users.png](../5.2-lena-admin-users.png) | CC6.3 / A.5.18 | Elevated access used (admin page rendered) |
| [../5.2-rostr-admin-group-assignment.png](../5.2-rostr-admin-group-assignment.png) | CC6.3 / A.5.18 | App assigned to group, not individual |
| [../5.2-access-request-flow-left.png](../5.2-access-request-flow-left.png) | CC6.3 / A.5.18 | Workflow: add, wait, remove |
| [../5.2-access-request-flow-right.png](../5.2-access-request-flow-right.png) | CC6.3 / A.5.18 | Workflow: automatic revoke after timer |

**Gap:** Close-out evidence (remove event, History URL, ticket Closed) is not in this pack. Wait For was due around 14:06.

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
