# Leave hub — 3. UI shell and role routing

Date: 2026-10-08. One layout for the three hubs. Okta groups decide which one opens. The forms are not built.

`GET /` sends a signed-in person to one hub. `APP-Rostr-HR` wins, then `APP-Rostr-Admins`, then everyone else. The groups are read from the session and, when the session has an email, from the SCIM `group_members` table. A person whose Rostr row is inactive gets 403. `/health` stays open.

| Role | Lands on | Refused |
| --- | --- | --- |
| Staff | `/leave` | `/admin/leave`, `/hr/leave` |
| Admin | `/admin/leave` | `/leave`, `/hr/leave` |
| HR | `/hr/leave` | `/leave`, `/admin/leave` |

The top bar shows the name, department, a role badge, the one hub they can open, and sign out. A flash message in the session is shown once and hidden after 4 seconds. Styles are `rostr/public/app.css`.

Priya Shah signed in through the SAML app at 03:04 and reached `/me`: `APP-Rostr-Users`, Operations, role staff, `lastLogin` `2026-10-07T16:04:21.200Z`. [evidence/leave/priya-me.png](../../evidence/leave/priya-me.png). The sign-on policy and a stale directory password blocked that until then. [docs/incidents/08-rostr-sign-on.md](../incidents/08-rostr-sign-on.md). The SAML handler still sends a success to `/me`. Opening `/` with that session, which is the redirect to `/leave`, was not captured. Marcus and Helen have not signed in. The unit tests cover the three landings, a SCIM-only HR membership, an inactive user, and the flash.
