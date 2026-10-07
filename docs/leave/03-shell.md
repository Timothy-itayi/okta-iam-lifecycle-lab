# Leave hub — 3. UI shell and role routing

Date: 2026-10-08. One layout for the three hubs. Okta groups decide which one opens. The forms are not built.

`GET /` sends a signed-in person to one hub. `APP-Rostr-HR` wins, then `APP-Rostr-Admins`, then everyone else. The groups are read from the session and, when the session has an email, from the SCIM `group_members` table. A person whose Rostr row is inactive gets 403. `/health` stays open.

| Role | Lands on | Refused |
| --- | --- | --- |
| Staff | `/leave` | `/admin/leave`, `/hr/leave` |
| Admin | `/admin/leave` | `/leave`, `/hr/leave` |
| HR | `/hr/leave` | `/leave`, `/admin/leave` |

The top bar shows the name, department, a role badge, the one hub they can open, and sign out. A flash message in the session is shown once and hidden after 4 seconds. Styles are `rostr/public/app.css`.

Priya Shah signed in through the SAML app at 03:04 and reached `/me`: `APP-Rostr-Users`, Operations, role staff, `lastLogin` `2026-10-07T16:04:21.200Z`. [evidence/leave/priya-me.png](../../evidence/leave/priya-me.png). The sign-on policy and a stale directory password blocked that until then. [docs/incidents/08-rostr-sign-on.md](../incidents/08-rostr-sign-on.md). The SAML handler still sends a success to `/me`. At 03:09 the address bar was `https://rostr.lanternfieldgoods.co.uk/leave`: Priya Shah, Operations, badge Staff, hub link My leave, and the placeholder copy. [evidence/leave/priya-leave.png](../../evidence/leave/priya-leave.png). That is the staff shell. It does not show the redirect from `/`.

Marcus Bell at 03:11 is on the admin shell: Marcus Bell, Operations, badge Admin, title Department leave. The address bar is truncated at `/admi`. [evidence/leave/marcus-me.png](../../evidence/leave/marcus-me.png), [evidence/leave/marcus-admin-leave.png](../../evidence/leave/marcus-admin-leave.png).

Helen Cho at 03:12 is on the HR shell: Helen Cho, Finance, badge HR, title HR leave. The address bar is truncated at `/hr/le`. [evidence/leave/helen-me.png](../../evidence/leave/helen-me.png), [evidence/leave/helen-hr-leave.png](../../evidence/leave/helen-hr-leave.png). Her `/me` page still prints role staff, because that string is computed by `roleFromGroups`, which has no HR case. The hub badge is HR. None of the three shots shows the redirect from `/`. Helen's browser request list at 03:18 does: `POST /saml/acs`, `GET /me`, `GET /`, `GET /hr/leave`. The same list shows `/app.css` failing, which phase 4 fixed. That screenshot is not in the repo because it holds a Google session value from another tab. The unit tests cover the three landings, a SCIM-only HR membership, an inactive user, and the flash.

Phase 4 changed three things here. Every role can open its own `/leave`. SAML success goes to `/`. `GET /` with no session starts SAML. [04-staff.md](04-staff.md).
