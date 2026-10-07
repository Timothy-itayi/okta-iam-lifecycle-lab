# Leave hub — 3. UI shell and role routing

Date: 2026-10-08. One layout for the three hubs. Okta groups decide which one opens. The forms are not built.

`GET /` sends a signed-in person to one hub. `APP-Rostr-HR` wins, then `APP-Rostr-Admins`, then everyone else. The groups are read from the session and, when the session has an email, from the SCIM `group_members` table. A person whose Rostr row is inactive gets 403. `/health` stays open.

| Role | Lands on | Refused |
| --- | --- | --- |
| Staff | `/leave` | `/admin/leave`, `/hr/leave` |
| Admin | `/admin/leave` | `/leave`, `/hr/leave` |
| HR | `/hr/leave` | `/leave`, `/admin/leave` |

The top bar shows the name, department, a role badge, the one hub they can open, and sign out. A flash message in the session is shown once and hidden after 4 seconds. Styles are `rostr/public/app.css`.

Live sign-in as Priya, Marcus, and Helen is not done. The unit tests cover the three landings, a SCIM-only HR membership, an inactive user, and the flash.
