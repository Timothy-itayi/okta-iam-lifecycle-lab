# Leave hub — 4. Staff screens

Date: 2026-10-08, 03:15–03:55 Sydney. Built from [design-spec.md](design-spec.md) sections 2 to 5: tokens, fonts, icons, shell, shared components, My leave, the request sheet, request detail, and My roster. No policy engine and no Jev yet. Staff do not see either.

## What a person sees

Every role opens `/leave` for their own leave and `/roster` for their own shifts. Managers add a Team section with the count waiting for them. HR adds an HR section. The other hubs are still 403 for the wrong role.

| Screen | Route | What it does |
| --- | --- | --- |
| My leave | `GET /leave` | Three balance tiles from the HR file, then open requests, then Past |
| Request leave | `/leave/new`, or the side sheet on `/leave` | A real form posting to `POST /leave`. The sheet is a `<dialog>`. Without JavaScript the link opens the page |
| Request detail | `GET /leave/:ref` | Stepper, reason, and activity in plain words. Cancel only while open, after a confirm step |
| My roster | `GET /roster` | The person's shifts. Approved leave strikes a shift through |

[evidence/leave/04-my-leave-1440.png](../../evidence/leave/04-my-leave-1440.png), [04-request-sheet-1440.png](../../evidence/leave/04-request-sheet-1440.png), [04-detail-cancel-1440.png](../../evidence/leave/04-detail-cancel-1440.png), [04-my-leave-390.png](../../evidence/leave/04-my-leave-390.png), [04-detail-390.png](../../evidence/leave/04-detail-390.png), [04-marcus-team-1440.png](../../evidence/leave/04-marcus-team-1440.png).

These were taken from a throwaway server on port 3100. It used a copy of `rostr/data/rostr.sqlite` and a session route that is not in Git. The live database has no leave requests from these shots. The 390 shots are 580 px tall because the browser pane is. A taller capture repeats the page.

## Rules in code

The server counts working days, Monday to Friday, both ends included. Public holidays are not known to Rostr.

| Check | Result |
| --- | --- |
| No type, bad date, end before start, no weekday, no reason, reason over 500 | 400, the form again with the values kept and a summary of links to each field |
| Overlaps an open or approved request of the same person | 400, names that request |
| No email in the session (OIDC), no HR row, or an HR row that is not `active` | 403 with the reason |
| More days than the balance, counting open requests of that type | Amber notice. It still sends |
| Annual leave starting within 14 days | Amber notice. It still sends |

A request goes to every active member of `APP-Rostr-Admins` in the requester's department, from the SCIM tables, except the requester. Priya, Jonah, and Lena go to Marcus Bell. If nobody is left, it goes straight to HR and the activity says why. Marcus's own request does that, because he is the only Operations admin. Helen's goes to HR, which is herself. Phase 8 has to stop that.

A request is stored as `submitted` and moved to `with_admin`, or through `with_admin` to `with_hr` when there is no admin, using `rostr/src/leave-state.js`. Each move is a row in `leave_events`. Cancel is the owner only. Another person's reference is 404, not 403, so it does not confirm the number exists.

## Changes outside the screens

- The image never copied `public/`. Every hub before this was unstyled, and `/app.css` was 404 on the tunnel. Helen's request list at 03:18 showed it red. The Dockerfile now copies `public/`.
- `GET /` with no session now starts SAML. It used to start the OIDC app Rostr Admin, which staff are not assigned to and which has no email in its token.
- SAML success redirects to `/`, so a person lands on their hub. Before, it went to `/me`. Helen's request list at 03:18 was `POST /saml/acs`, `/me`, then `/` and `/hr/leave`. That screenshot also shows a Google session value from another tab, so it is not in the repo.
- `/me` now says `hr` for `APP-Rostr-HR`. It said staff for Helen.
- Fonts are self-hosted in `rostr/public/fonts/` with their OFL licence files. Icons are Lucide, copied into `rostr/src/views/icons.js`.

Departures from the spec: a balance bar turns amber under 3 days only when some of it is used, so a full Personal 2 of 2 stays pine. The location column on My roster is left out because shifts have no location. The manager and HR pages are placeholders that state the count waiting. They do not say "Nothing waiting" when something is.

Sessions are in memory. Rebuilding the container signs everyone out. The cookie is `SameSite=Lax`, which keeps a cross-site form post from carrying it. There is no CSRF token.

The same morning the skin was replaced with Kaizen tokens. The screenshots above are the first skin. The replacement is [docs/decisions/jev-03-ui-kaizen.md](../decisions/jev-03-ui-kaizen.md).

## Check

`npm test` in `rostr/`: 59 passed. Container rebuilt. `/health` 200, and `/app.css` 200 on the tunnel. Live sign-in after this rebuild, and a request sent through Okta, are not done yet.
