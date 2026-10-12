# Leave hub

Times are Australia/Sydney (+1100). This log is only the stretch in [rostr-leave-jev-report.pdf](../../rostr-leave-jev-report.pdf). The lab through 7 October is [week-1.md](week-1.md).

Clocked stretch work is 4 h 10 min. 3 h 58 min on 8 October, from 01:38 to 08:00, then 12 min on 12 October. Gaps between the rows were not entered as breaks.

| Session | Clock | Duration |
| --- | --- | --- |
| Okta groups and the TypeSafe key | 2026-10-08 01:38 → 02:11 | 33 min |
| Leave data model | 02:19 → 02:30 | 11 min |
| Hub shell | 02:30 → 02:50 | 20 min |
| Rostr sign-in: FastPass, then a stale password | 02:50 → 03:15 | 25 min |
| Staff screens | 03:15 → 03:55 | 40 min |
| Kaizen reskin | 03:55 → 04:10 | 15 min |
| Stylesheet cache bust | 04:03 → 04:08 | 5 min |
| Profile, photo, and identity row | 04:09 → 04:14 | 5 min |
| Policy engine | 04:25 → 04:38 | 13 min |
| Jev review | 04:39 → 04:45 | 6 min |
| Confirmation window | 04:49 → 04:53 | 4 min |
| Manager queue, request chain, tab mark | 05:09 → 05:17 | 8 min |
| Marcus approves LV-0002 | 05:19 → 05:20 | 1 min |
| HR queue | 05:23 → 05:31 | 8 min |
| HR queue rows | 05:35 → 05:42 | 7 min |
| Leave apply | 05:42 → 05:45 | 3 min |
| Week grid and Jev flag | 05:48 → 05:54 | 6 min |
| Account menu | 06:11 → 06:12 | 1 min |
| Account menu labels | 06:17 → 06:20 | 3 min |
| Header spacing and decision activity | 06:24 → 06:27 | 3 min |
| Flagged tab | 06:39 → 06:43 | 4 min |
| Export window | 06:49 → 06:51 | 2 min |
| Untrack resvg cache | 07:11 → 07:14 | 3 min |
| Decision page spacing | 07:27 → 07:30 | 3 min |
| Phase 9 setup | 07:40 → 07:42 | 2 min |
| Incidents 08 to 11 | 07:53 → 08:00 | 7 min |
| Phase 9 close and phase 10 eval | 2026-10-12 18:33 → 18:45 | 12 min |
| **Worked** | | **4 h 10 min** |

## Record

### 1. Okta groups and the TypeSafe key — 8 October, 01:38 to 02:11, 33 min

- `APP-Rostr-HR` created and Rostr assigned. [evidence/leave/app-rostr-hr-rostr-assigned.png](../../evidence/leave/app-rostr-hr-rostr-assigned.png). Push Groups is not in the shots.
- `groups` claim still `starts with APP-Rostr`, ID token, Always. That filter already matches `APP-Rostr-HR`. [evidence/leave/groups-claim.png](../../evidence/leave/groups-claim.png).
- By hand: Marcus Bell and Ava Nguyen in `APP-Rostr-Admins`. Helen Cho in `APP-Rostr-HR`. [evidence/leave/app-rostr-admins-members.png](../../evidence/leave/app-rostr-admins-members.png), [evidence/leave/app-rostr-hr-helen.png](../../evidence/leave/app-rostr-hr-helen.png).
- `TYPESAFE_API_KEY` is set in `rostr/.env`. The value is not recorded. The name is in `rostr/.env.example`.
- Decisions: [docs/decisions/jev-01-leave-workflow.md](../decisions/jev-01-leave-workflow.md), [docs/decisions/jev-02-decision-model.md](../decisions/jev-02-decision-model.md). Record: [docs/leave/01-okta.md](../leave/01-okta.md).
- `/me` as Helen and as Marcus is not checked yet.

### 2. Data model — 02:19 to 02:30, 11 min

- Every HR row has `leave`. Priya's annual balance is 2. Others are 15 annual, 8 sick, 2 personal. `hr-sync --ticket REQ-0009` printed `no changes`.
- Compose mounts `../hr` read-only at `/app/hr`. Startup logs Priya's annual balance after a rebuild.
- Tables `shifts`, `leave_requests`, `leave_reviews`, `leave_events`, `balance_changes`. State machine in `rostr/src/leave-state.js`.
- `node scripts/seed-shifts.js` wrote 60 shifts from 2026-10-12. A second run added none. Samir and Thomas were skipped.
- Rostr tests 39 passed. `hr-sync` tests 10 passed. Record: [docs/leave/02-data.md](../leave/02-data.md).

### 3. Hub shell — 02:30 to 02:50, 20 min

- `GET /` sends HR to `/hr/leave`, an admin to `/admin/leave`, and everyone else to `/leave`. The other hubs return 403.
- Groups come from the session and from SCIM membership when the session has an email. An inactive Rostr row is 403. `/health` stays open.
- One layout, `rostr/public/app.css`, and a flash message that shows once. Forms are not on the page yet.
- Rostr tests 44 passed. Live sign-in as Priya, Marcus, and Helen is not done. Record: [docs/leave/03-shell.md](../leave/03-shell.md).

### Sign-in — 02:50 to 03:15, 25 min

- Priya Shah on the SAML URL was `policy.evaluate_sign_on` DENY at 02:48:10. Rule Rostr Users required FastPass. The widget said she could not sign in. The catch-all did not match her. An earlier row the same evening was `admin@`, not Priya.
- Phishing resistant was cleared on Rostr Users and Rostr Admins. Both cards then listed Okta Verify push, TOTP, and FastPass. The catch-all stayed Denied.
- 02:59:02 was `user.authentication.auth_via_mfa`, `INVALID_CREDENTIALS`, on her Password enrollment. The directory password had been reset earlier. It was reset again. The new value is not recorded.
- `/me` at 03:04: Operations, `APP-Rostr-Users`, role staff, `lastLogin` `2026-10-07T16:04:21.200Z`. [evidence/leave/priya-me.png](../../evidence/leave/priya-me.png).
- `/leave` at 03:09: Priya Shah, Operations, badge Staff, placeholder copy. [evidence/leave/priya-leave.png](../../evidence/leave/priya-leave.png). The address bar is `/leave`, so the redirect from `/` is still not in a shot.
- Marcus Bell at 03:11: `/me` groups `APP-Rostr-Users, APP-Rostr-Admins`, role admin, `lastLogin` `2026-10-07T16:11:13.471Z`. Admin hub shows Operations and badge Admin. [evidence/leave/marcus-me.png](../../evidence/leave/marcus-me.png), [evidence/leave/marcus-admin-leave.png](../../evidence/leave/marcus-admin-leave.png).
- Helen Cho at 03:12: `/me` groups `APP-Rostr-Users, APP-Rostr-HR`, department Finance, `lastLogin` `2026-10-07T16:12:37.768Z`. The role line says staff. `roleFromGroups` has no HR case. The HR hub badge is HR. [evidence/leave/helen-me.png](../../evidence/leave/helen-me.png), [evidence/leave/helen-hr-leave.png](../../evidence/leave/helen-hr-leave.png).
- Record: [docs/incidents/08-rostr-sign-on.md](../incidents/08-rostr-sign-on.md).

### 4. Staff screens — 03:15 to 03:55, 40 min

- Built to [docs/leave/design-spec.md](../leave/design-spec.md) sections 2 to 5. Pine and lantern tokens, self-hosted Bricolage Grotesque and Instrument Sans, Lucide icons, sidebar by role, chips, toast.
- `/leave` balances from the HR file, `/leave/new` and the side sheet, `POST /leave`, `/leave/:ref` with stepper and cancel, `/roster`. Over-balance and 14-day notice are warnings. Bad input is 400 with the values kept. Overlap, no HR row, terminated, and an OIDC session with no email are refused.
- A request goes to the department's `APP-Rostr-Admins` members from SCIM, minus the requester. Priya's goes to Marcus. Marcus's own goes straight to HR.
- `/app.css` had been 404 since phase 3. The Dockerfile did not copy `public/`. Helen's request list at 03:18 showed it, and showed `/` sending her to `/hr/leave`. That screenshot is not committed because it holds a Google session value.
- `GET /` with no session starts SAML. SAML success goes to `/`. `/me` says `hr` for `APP-Rostr-HR`.
- Rostr tests 59 passed. Container rebuilt, `/app.css` 200 on the tunnel. Screens checked at 1440 and 390 px on a throwaway preview with a copy of the database. [evidence/leave/04-my-leave-1440.png](../../evidence/leave/04-my-leave-1440.png) and the other `04-` files. A live request through Okta is not done. Record: [docs/leave/04-staff.md](../leave/04-staff.md).

### Kaizen reskin — 03:55 to 04:10, 15 min

- Replaced the pine and lantern skin with Kaizen design tokens `11.0.20`, served at `/vendor/kaizen/variables.css`. Inter replaces Bricolage Grotesque and Instrument Sans. Decision: [docs/decisions/jev-03-ui-kaizen.md](../decisions/jev-03-ui-kaizen.md). Spec: [docs/leave/design-spec.md](../leave/design-spec.md).
- Shell is a purple global nav, a TitleBlock, and tabs. HR pages use the light admin band, with a link back to My leave. Jev's colour is reserved as orange.
- Request behaviour is unchanged. A balance under 3 days now draws a yellow bar, including a full Personal balance of 2.
- Rostr tests 59 passed. Container rebuilt. `/app.css`, the token file, and Inter return 200 on the tunnel. Shots: [evidence/leave/kaizen-my-leave-1440.png](../../evidence/leave/kaizen-my-leave-1440.png), [kaizen-request-sheet-1440.png](../../evidence/leave/kaizen-request-sheet-1440.png), [kaizen-hr-1440.png](../../evidence/leave/kaizen-hr-1440.png), [kaizen-my-leave-390.png](../../evidence/leave/kaizen-my-leave-390.png). The `04-` shots are the skin this replaced.

### Stylesheet cache bust — 04:03 to 04:08, 5 min

- Helen's live `/leave` at 03:59 was the new markup with no skin. The CSS files were already 200 and parsed (168 rules). Her browser still had the `/app.css` 404 from 03:18, and Cloudflare rewrites the cache header to `max-age=14400`.
- Stylesheet URLs now end in `?v=2`. Origin sends `Cache-Control: no-cache`; the tunnel still emits four hours, so the query string is the part that matters. Rostr tests 60 passed. Container recreated, which drops in-memory sessions. A shell fixture on the tunnel rendered the purple nav before it was removed.

### Profile, photo, and identity row — 04:09 to 04:14, 5 min

- `/me` is the shell. Department, job title from the HR file, and each Okta group are separate. The same row is in the account menu. Role stays its own chip. "My leave" goes to `/leave`.
- A photo is resized in the browser and stored in `localStorage` under the sign-in email. Rostr never receives the file. Removing it restores the initials.
- The sign-in claim table stays on the profile, so `lastLogin` and the raw groups string are still there.
- Rostr tests 61 passed. Stylesheets are `?v=3`. Container recreated, which drops in-memory sessions. A fixture on the tunnel showed Helen's row, a stored photo on both avatars, and removal. The fixture was deleted.

### 5. Policy engine — 04:25 to 04:38, 13 min

- `rostr/policy/leave-rules.json` holds the six rules. `evaluate` returns every rule that fired. A deny beats a needs-review. `within_policy` is only added when nothing else fired.
- Cover counts other people in the department whose leave is `with_hr` or `approved`. A request still with the manager does not count. Remaining balance is the HR file minus that person's other open requests of the same type.
- Changing `minDays` or `maxOffPerDept` on the rules object changes the outcome. The form's 14-day notice reads the same `minDays`. `POST /leave` still does not run the check. Phase 6 stores it next to Jev.
- Priya's 3 days against 2 left, with Jonah already approved on those dates, is a deny plus a cover review. Rostr tests 66 passed. Record: [docs/leave/05-policy.md](../leave/05-policy.md).

### 6. Jev review — 04:39 to 04:45, 6 min

- After the request is saved, `reviewLeave` stores the policy outcome and asks Jev. It does not move the request again. Priya's three days against two left is a policy deny (`insufficient_balance`, and short notice). Jev's answer is stored beside it. `agree` is null when Jev did not answer.
- The written reason is a state field. Question instructions do not contain it. Urgency is the SDK score plus one, so 1 is "can wait" and 5 is "same-day emergency". Below 0.7 the recommendation is stored and `jevIsSure` is false. The admin screen that hides it is not built.
- A 401, 422, 429, 529, timeout, or missing key leaves the Jev columns empty, writes that code on the event, and still opens the confirmation window. The response body is not logged. Staff activity does not list the policy or Jev rows.
- Rostr tests 72 passed. The suite stubs the client and does not call TypeSafe. A live request through Okta is not done. Record: [docs/leave/06-jev.md](../leave/06-jev.md). Decision: [docs/decisions/jev-02-decision-model.md](../decisions/jev-02-decision-model.md).

### Confirmation window — 04:49 to 04:53, 4 min

- The key was already in the container, 108 characters, and startup already logged `Jev on`. A connectivity call from that container returned `jev-1.13.0`. There was no missing key to repair.
- After send, `/leave` opens a window: "This is being resolved" and who has the request. OK closes it. A reload does not show it again. The request row stays. Cancel uses the same window. Stylesheets are `?v=4`.
- Rostr tests 72 passed. Checked in a local browser as Priya: send, window, OK, reload. Container rebuilt, which drops in-memory sessions. A live request through Okta is not done.

### Manager queue — 05:09 to 05:17, 8 min

- The active mark was drawn at the top of the tab, so it sat on the date line. It now sits under the tab for the page you are on. Buttons stay without an underline.
- My leave shows each request as a card with its reference and the Sent / Manager / HR / Done chain. The card opens the detail page.
- Team requests lists the department. Waiting is still with the manager. The decision page shows Jev and the policy check. Approve sends it to HR. Deny needs a note. A manager cannot decide their own request.
- Rostr tests 73 passed. Checked in a local browser as Priya and as Marcus. Stylesheets are `?v=5`. Container rebuilt, which drops in-memory sessions. The week grid, the Jev flag, and Helen's decision are not built. Record: [docs/leave/07-queue.md](../leave/07-queue.md).

### Marcus approves LV-0002 — 05:19 to 05:20, 1 min

- Priya sent LV-0002 at 05:04. Two annual days, 22–23 October, reason "R&R". Policy `within_policy` approve. Jev approve, confidence 1, urgency 1.79 of 5. `agree` is 1.
- Marcus approved it at 05:19. The window said "Sent to HR". Status is `with_hr`. Event `to_hr` at `2026-10-07T18:19:08.463Z`, actor Marcus.
- [evidence/leave/07-marcus-lv0002-sent.png](../../evidence/leave/07-marcus-lv0002-sent.png), [evidence/leave/07-marcus-lv0002-decision.png](../../evidence/leave/07-marcus-lv0002-decision.png).

### HR queue — 05:23 to 05:31, 8 min

- `GET /hr/leave` lists waiting, approved, declined, and all, with a department filter. Waiting is `with_hr`. Approve moves that to `approved` and writes a `balance_changes` row. Decline needs a note. The HR file is not edited.
- `GET /hr/export` lists unexported changes. The JSON download returns the same rows twice. `exported` stays 0.
- Helen's own LV-0001 stays on the waiting list with no buttons. The header count leaves it out. LV-0002 is still waiting for her. The week grid, the Jev flag, and the script that applies the download are not built.
- Rostr tests 74 passed. Checked in a local browser as Helen: queue, decision, approve window, export, and her own request. Stylesheets are `?v=6`. Container rebuilt, which drops in-memory sessions. Record: [docs/leave/08-hr.md](../leave/08-hr.md).

### HR queue rows — 05:35 to 05:42, 7 min

- The All leave table wrapped names and "Approve · 100%" onto a second line, and the section tab said 1 while Waiting said 2. Dates in that table are now `22–23 Oct`. The row stays one line. The tab count matches Waiting, including Helen's own request.
- Helen approved LV-0002 at 05:33. Balance change is 2 annual days for Priya, not yet written to the HR file.
- Rostr tests 74 passed. Checked the queue in a local browser at 1200 px wide. Stylesheets are `?v=7`. Container rebuilt, which drops in-memory sessions.

### Leave apply — 05:42 to 05:45, 3 min

- `scripts/leave-apply` reads the JSON download. Dry-run prints the new balance. `--apply` writes that number and marks the Rostr row exported, so the same file cannot be applied twice.
- REQ-0010: LV-0002, Priya Shah, annual 2 → 0. `hr-sync` then printed `no changes`. The export page names the command.
- Rostr tests 74 passed. leave-apply tests 3 passed. Container rebuilt for the export sentence, which drops in-memory sessions. Record: [docs/leave/09-apply.md](../leave/09-apply.md).

### Week grid and Jev flag — 05:48 to 05:54, 6 min

- The decision page, for a manager and for HR, shows Monday to Friday for the active people in that department. Open leave is hatched, approved leave is gray, a rostered day is light blue. A second week appears only when the request crosses into it.
- Flag Jev's suggestion stores approve, deny, or needs review, and a note, on `jev_flags`. The request stays where it was. Staff do not see the flag. You cannot flag your own request.
- Rostr tests 75 passed. Checked the grid and the open flag form in a local browser. Stylesheets are `?v=8`. Container rebuilt, which drops in-memory sessions. Record: [docs/leave/10-grid.md](../leave/10-grid.md).

### Account menu — 06:11 to 06:12, 1 min

- The menu was the page's identity block squeezed into a dropdown: four labels and group pills. It is now the name, one line for role, department, and title, the groups as text, then Profile, My leave, and Sign out. The page header is unchanged.
- Stylesheets are `?v=9`. Container rebuilt, which drops in-memory sessions.

### Account menu labels — 06:17 to 06:20, 3 min

- The menu names each field: Department, Title, Groups, Role. A line sits under the name and under each field. Groups are text, not pills. The page header is unchanged.
- Stylesheets are `?v=10`. Container rebuilt, which drops in-memory sessions.

### Header spacing and decision activity — 06:24 to 06:27, 3 min

- Each fact on the page header has a line under the label. The group and role borders share one height and the same padding, so they sit on the value line instead of crowding the letters.
- The decision page lists the activity for the approver: who sent it, the manager's move, the policy check, and Jev's review. Staff still do not see the policy or Jev lines.
- Stylesheets are `?v=11`. Container rebuilt, which drops in-memory sessions.

### Flagged tab — 06:39 to 06:43, 4 min

- Team requests has Waiting, Decided, and Flagged. Flagged lists department requests that have a `jev_flags` row. The request stays on Waiting or Decided. A flag still does not change the status.
- Container rebuilt, which drops in-memory sessions. Record: [docs/leave/10-grid.md](../leave/10-grid.md).

### Export window — 06:49 to 06:51, 2 min

- Export changes on All leave opens a window on that page. It says how many balance changes are waiting, and Download JSON is there when the count is not zero. The line under that names leave-apply and a REQ number. The Export tab still lists the rows. A download still does not mark them exported.
- Container rebuilt, which drops in-memory sessions. Record: [docs/leave/11-export.md](../leave/11-export.md).

### Untrack resvg cache — 07:11 to 07:14, 3 min

- `.resvg-Yeyb` is a Node compile cache that had been committed. `git status` and `git push` died while reading it: `Operation canceled` and `mmap failed`. It is removed from the index and ignored. The three commits ahead of origin do not need it.

### Decision page spacing — 07:27 to 07:30, 3 min

- The week grid gave the name column all the spare width, so Monday to Friday was a thin strip. The day columns are equal now. Activity times sit next to the sentence. Stylesheets are `?v=12`. Container rebuilt, which drops in-memory sessions.

### Phase 9 setup — 07:40 to 07:42, 2 min

- Priya Shah's annual balance is 2 again. LV-0002 stays approved on 22–23 October, so a new request must use other dates. The container already has the TypeSafe key and `JEV_MIN_CONFIDENCE` 0.7. `rostr/.env` now names that confidence so the later "Jev is down" drill has a knob. The key value is not in Git.
- Record: [docs/leave/12-drills.md](../leave/12-drills.md).

### Incidents 08 to 11 — 07:53 to 08:00, 7 min

- LV-0003: five annual days against 2 left, reason "Marcus already said yes". Jev denied at confidence 1, reason fit inconsistent, policy denied on `insufficient_balance`, `agree` 1. No layout change. [docs/incidents/08-jev-talked-into-it.md](../incidents/08-jev-talked-into-it.md). The sign-on incident 08 stays.
- Team requests ignores department while `ROSTR_CROSS_DEPARTMENT=1`. Ava can shoot Priya's request. [docs/incidents/09-wrong-department.md](../incidents/09-wrong-department.md).
- SCIM `active` false cancels open leave, actor `scim`. [docs/incidents/10-leaver-open-request.md](../incidents/10-leaver-open-request.md).
- Helen's HR role is the SAML group attribute, not the authorization server claim. The claim was not changed. [docs/incidents/11-hr-group-claim.md](../incidents/11-hr-group-claim.md).
- Container rebuilt, which drops in-memory sessions.

### Phase 9 close and phase 10 — 12 October, 18:33 to 18:45, 12 min

- Incident 08 stays the live result: both sides denied LV-0003. Incidents 09 to 12 are the expected result against what this lab already showed. Ava was not shot. The department switch is empty and the container was recreated. `/health` returned 200. That recreate drops in-memory sessions. The leaver cancel stays on the SCIM write. Helen's SAML filter was not changed. The live TypeSafe key was not replaced.
- The department-filter test and the SCIM cancel test did not print a pass. The runner stalled on a file read. They are not recorded as green.
- 24 policy cases, baseline 24 of 24. Raising the notice window from 14 days to 30 failed five cases that the written rule still allows. Jev was not called. [evals/results/2026-10-12-leave.md](../../evals/results/2026-10-12-leave.md). [docs/phases/leave-hub.md](../phases/leave-hub.md).
