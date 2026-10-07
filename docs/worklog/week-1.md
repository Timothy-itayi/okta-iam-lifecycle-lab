# Week 1

Times are Australia/Sydney (+1100). Duration is from the first clock we have for that task to the last. A stretch with no commit and no evidence is a break.

Two working days, then a third sitting on the morning of 7 October. Night of 5–6 October, afternoon and night of 6 October into 7 October, morning of 7 October.

| Session | Clock | Duration |
| --- | --- | --- |
| Night, prep and Phase 1 | 2026-10-05 23:56 → 2026-10-06 04:39 | 4 h 43 min |
| Break | 04:39 → 14:27 | 9 h 48 min |
| Afternoon, Phase 2 and 3 | 14:27 → 20:53 | 6 h 26 min |
| Break | 20:53 → 23:08 | 2 h 15 min |
| Night, Phase 4 | 2026-10-06 23:08 → 2026-10-07 02:23 | 3 h 15 min |
| Break | 02:23 → 11:46 | 9 h 23 min |
| Morning, Phase 5 osTicket through OIG mapping | 2026-10-07 11:46 → 15:02 | 3 h 16 min |
| Break | 15:02 → 16:59 | 1 h 57 min |
| Afternoon, drills 6.1 to 6.3 | 2026-10-07 16:59 → 17:34 | 35 min |
| **Worked** | | **18 h 15 min** |

## Phase 0 — Prep

About 1 h 40 min, 23:56 to 01:36.

| Task | Clock | Duration |
| --- | --- | --- |
| 0.1 Repository | 23:56 → 00:10 | 14 min |
| 0.2 Domain and email | 00:25 → 00:59 | 34 min |
| 0.3 and 0.4 Org and features | 00:53 → 01:14 | 21 min |
| 0.5 Break-glass and HR file | 01:14 → 01:19 | 5 min |
| 0.6 Design note | 01:19 → 01:24 | 5 min |
| 0.7 / 0.8 Tooling and `.env.example` | 01:24 → 01:36 | 12 min |

### 0.1 Repository — 23:56 to 00:10, 14 min

- Created the public repo [okta-iam-lifecycle-lab](https://github.com/Timothy-itayi/okta-iam-lifecycle-lab) and cloned it.
- First commit: [cfa6e59](https://github.com/Timothy-itayi/okta-iam-lifecycle-lab/commit/cfa6e59e6e91cc2fe43cd39e269dfc6e16a14007) (`Initial commit`) at 23:56. Second: [3634655](https://github.com/Timothy-itayi/okta-iam-lifecycle-lab/commit/36346555092085c32b607293b877bb90b55ccbb1) (`init repo`) at 00:03.
- Created `docs/phases`, `docs/decisions`, `docs/runbooks`, `docs/incidents`, `docs/worklog`, `evidence`, `hr`, `rostr`, and `scripts`. The `docs` folders were first created with a trailing comma in the name and then renamed.
- Added `.gitignore` so `Okta-IAM-Lifecycle-Lab-Runbook.pdf` is not committed. Not committed yet.
- `README.md` was still the Phase 0 blurb. [5f6c105](https://github.com/Timothy-itayi/okta-iam-lifecycle-lab/commit/5f6c105) (`udate docs`) at 00:10.

### 0.2 Domain and email — 00:25 to 00:59, 34 min

- Registered `lanternfieldgoods.co.uk` on Cloudflare and turned on Email Routing to `timmytam10@gmail.com`.
- Routing test at 00:25. Admin Console screenshot at 00:53. [3f907bd](https://github.com/Timothy-itayi/okta-iam-lifecycle-lab/commit/3f907bd) (`finish 0.1 and 0.2`) at 00:59.
- Proved `test-env@lanternfieldgoods.co.uk` arrives in Gmail. `admin@`, `breakglass@`, and `it@` are Active. At 01:17 the catch-all was changed from Drop/Disabled to Send to `timmytam10@gmail.com` and set Active. That change is after the 0.2 commit. A staff-address delivery test after it is not in the screenshots.
- Address plan: [docs/decisions/00-domain.md](../decisions/00-domain.md).

### 0.3 and 0.4 Org and features — 00:53 to 01:14, 21 min

- Activated `trial-7464750` with `admin@lanternfieldgoods.co.uk` and enrolled Okta Verify. [docs/decisions/01-org.md](../decisions/01-org.md).
- Console says 30 days left on a free trial. The runbook asked for an Integrator Free Plan org. Plan type is unconfirmed.
- Task 0.3 dashboard: `evidence/0.3-admin-console-dashboard.png`.
- A SAML app named `testapp` was created. That is task 0.4. It is not deleted yet.
- [1b1b390](https://github.com/Timothy-itayi/okta-iam-lifecycle-lab/commit/1b1b390) (`complete 0.3 and 0.4`) at 01:14.

### 0.5 Break-glass and HR file — 01:14 to 01:19, 5 min

- Created `breakglass@lanternfieldgoods.co.uk`, assigned Super Organization Administrator, enrolled Okta Verify on the same phone as the daily admin. Break-glass opened its own Admin Console. [docs/decisions/02-break-glass.md](../decisions/02-break-glass.md). Directory shows 2 active users. The left nav says Free Trial Plan.
- Wrote `hr/employees.json`: 7 active staff, Sales 3, Operations 2, Finance 2, one manager in each department. `jq -r '.[] | .email'` printed 7 `@lanternfieldgoods.co.uk` addresses.
- [9cd2849](https://github.com/Timothy-itayi/okta-iam-lifecycle-lab/commit/9cd2849) (`complete 0.5`) at 01:19. The runbook message was `HR: initial 7 staff`. That message was not used.

### 0.6 Design note — 01:19 to 01:24, 5 min

- Wrote [docs/decisions/02-design.md](../decisions/02-design.md): 10 user slots, 5 flows, naming, the HR-to-Rostr path, and the out-of-scope list.
- [8c5e1c5](https://github.com/Timothy-itayi/okta-iam-lifecycle-lab/commit/8c5e1c5) (`complete 0.6`) at 01:24.

### 0.7 / 0.8 Tooling — 01:24 to 01:36, 12 min

- Extended `.gitignore` with `.env`, `*.pem`, `*.key`, `logs/`, `evidence-raw/`, and `node_modules/`. Added `.env.example` with empty placeholders only.
- Tool versions in the repo directory:

```
cloudflared version 2026.9.3 (built 2026-09-24T15:31:10Z)
jq-1.8.2
node v24.4.1
```

- The runbook asked for Node 20. Docker Desktop and the SAML-tracer extension were not in this output.
- [e204034](https://github.com/Timothy-itayi/okta-iam-lifecycle-lab/commit/e204034) (`commit .env.example`) at 01:36.

### Checkpoint, end of prep — 01:36

- Two secured admins in `trial-7464750`. Both Active, both enrolled in Okta Verify, both factors on the same phone.
- HR file committed in `9cd2849`. Design note in `8c5e1c5`.
- Not in this check: a message to `ava.nguyen@lanternfieldgoods.co.uk` has not been shown arriving since the catch-all was turned on. The org nav says Free Trial Plan.

## Phase 1 — Okta foundation

About 3 h 3 min, 01:36 to 04:39.

| Task | Clock | Duration |
| --- | --- | --- |
| 1.1 and 1.2 Profile and CSV import | 01:36 → 02:18 | 42 min |
| 1.3 Groups and rules | 02:18 → 02:50 | 32 min |
| 1.4 Authenticators | 02:50 → 03:07 | 17 min |
| 1.5 Session policy | 03:07 → about 03:30 | about 23 min |
| 1.6 Help desk admin | about 03:30 → 03:46 | about 16 min |
| 1.7 MFA reset | 03:46 → 04:07 | 21 min |
| 1.8 Entra map and README | 04:07 → 04:39 | 32 min |

1.5 and 1.6 have no screenshot minute of their own. Those two rows are the gap between the 1.4 commit at 03:07 and the 1.7 reset at 03:46.

### 1.1 and 1.2 — 01:36 to 02:18, 42 min

- Confirmed `title`, `employeeNumber`, `department`, and `managerId` on the Okta user profile. Custom attributes are `employmentStatus`, `startDate`, and `endDate`. Mapping table: [docs/phases/01-foundation.md](../phases/01-foundation.md).
- Generated `hr/okta-import.csv` with `jq`. Seven rows. `login` is the email. `employeeNumber` is the HR `employeeId`. The three managers have an empty `managerId`.
- Okta imported 7 new users with 0 errors at 02:00. The widget says 9 of 10. By 02:15 all seven staff and both admins are Active. Jonah Hale signed in to an empty end-user dashboard.
- [a9c378c](https://github.com/Timothy-itayi/okta-iam-lifecycle-lab/commit/a9c378c) (`complete 1.2 with active users`) at 02:18.

### 1.3 Groups and rules — 02:18 to 02:50, 32 min

- Six groups created. Department rules and the `APP-Rostr-Users` rule are Active. Counts are Sales 3, Operations 2, Finance 2, Rostr users 7. `APP-Rostr-Admins` and `ADM-Helpdesk` are empty on purpose.

### 1.4 Authenticators — 02:50 to 03:07, 17 min

- Lena Ortiz got an Okta Verify number challenge (75) at 02:50. Okta Verify and password, not SMS. Email is recovery only. Minimum password length is 12. History of 4, lockout after 10.
- [b51b7e0](https://github.com/Timothy-itayi/okta-iam-lifecycle-lab/commit/b51b7e0) (`complete task 1.4 very number challenge`) at 03:07.

### 1.5 Session policy — 03:07 to about 03:30, about 23 min

- Global session policies Admins and Staff are Active, Admins first. Staff covers the three `DEPT-` groups. Admins covers `ADM-Helpdesk` and `APP-Rostr-Admins`. Marcus Bell got password then Okta Verify number 41. Session-length reasoning is in [docs/phases/01-foundation.md](../phases/01-foundation.md).

### 1.6 Help desk admin — about 03:30 to 03:46, about 16 min

- Helen Cho is Help Desk Administrator, scoped to the three `DEPT-` groups. She can open Jonah Hale and sees password reset. The reset mail names Timothy Itayi; the System Log actor is Helen. Jonah's new password met the 12-character rule, then Okta Verify number 72. Helen's nav does not show Applications or Security.

### 1.7 MFA reset — 03:46 to 04:07, 21 min

- Helen reset Jonah Hale's Okta Verify at 03:46. He enrolled it again and signed in to the Dashboard at 04:07. Runbook: [docs/runbooks/mfa-reset.md](../runbooks/mfa-reset.md). The log export is the evidence, because a search with Jonah as the actor does not show Helen's reset.

### 1.8 Entra map and README — 04:07 to 04:39, 32 min

- Entra-to-Okta table in [docs/phases/01-foundation.md](../phases/01-foundation.md).
- [3a0f099](https://github.com/Timothy-itayi/okta-iam-lifecycle-lab/commit/3a0f099) (`complete Phase 1 and 1.8`) at 04:25.
- README replaced the Phase 0 blurb with the lab brief. [09b4b72](https://github.com/Timothy-itayi/okta-iam-lifecycle-lab/commit/09b4b72) (`update readme`) at 04:39. The map at that point still marked `scripts/`, Workflows, `rostr/`, incidents, and phase notes 2–7 as TBC.

Break until 14:27.

## Phase 2 — SaaS onboarding

About 4 h 37 min, 14:27 to 19:04.

| Task | Clock | Duration |
| --- | --- | --- |
| 2.1 and 2.2 Scaffold and HTTPS | ends 14:29 | start after the break, clock not recorded |
| 2.3 and 2.4 SAML app and sign-in | 14:29 → 15:11 | 42 min |
| 2.6 App sign-in policy | 15:11 → 16:26 | 1 h 15 min |
| 2.7 OIDC admin | 16:26 → 17:39 | 1 h 13 min |
| 2.8 Onboarding runbook | 17:39 → 19:04 | 1 h 25 min |

2.5 is not a separate line here. The assertion inspection is in the 2.4 sign-in at 15:11.

### 2.1 and 2.2 — done by 14:29

- `express`, `better-sqlite3`, and `express-session` in `rostr/`. Users table, `/health`, `/me`, `/admin/users`, `logs/rostr-auth.jsonl`. Five tests pass.
- Image is Node 22 because `better-sqlite3` 13 refuses Node 20 and segfaults. Container `/health` returned `OK`. Docker Desktop shows `3000:3000`. The MemoryStore warning is the session default.
- CNAME `rostr.lanternfieldgoods.co.uk` points at tunnel `rostr`. A phone at 14:27 got `Cannot GET /`, the same Express response as localhost `/`.
- [eb1a4ef](https://github.com/Timothy-itayi/okta-iam-lifecycle-lab/commit/eb1a4ef) (`scaffold rostr and give rostr an HTTPS address`) at 14:29. Note: [docs/phases/02-onboarding.md](../phases/02-onboarding.md).

### 2.3 and 2.4 — 14:29 to 15:11, 42 min

- SAML app Rostr. Attributes email, firstName, lastName, department, groups starting with `APP-Rostr`. ACS, Recipient, and Destination are `https://rostr.lanternfieldgoods.co.uk/saml/acs`. Audience is `https://rostr.lanternfieldgoods.co.uk/saml/metadata`. Metadata URL is in `rostr/.env`.
- Rostr requires signed assertions. Clock skew 30 seconds. Sign-in upserts by email. A forged POST on the public host returned 401 `Invalid document signature`.
- Only `APP-Rostr-Users` is assigned. At 15:07 Okta refused an account that is not in that group. At 15:11 Jonah Hale reached `/me` as staff. Rostr log success at `2026-10-06T04:11:23.173Z` (15:11 +1100).

### 2.6 App sign-in policy — 15:11 to 16:26, 1 h 15 min

- Policy Rostr on the Rostr app. Priority 1 `APP-Rostr-Admins`, possession factor, every sign-in. Priority 2 `APP-Rostr-Users`, password plus Okta Verify. Catch-all denies. Both allow rules required a phishing-resistant factor, which Okta satisfied with FastPass.
- Catch-all test at 16:00: `admin@` assigned as an Individual, denied. System Log 15:59:44 `app.generic.unauth_app_access_attempt`. Individual row removed after the test.
- Jonah Hale `/me` at 16:20, Rostr success `2026-10-06T05:20:26.837Z`. Helen Cho deny at 16:18:31. Marcus Bell deny at 16:26:33. `APP-Rostr-Admins` was empty during that test.

### 2.7 OIDC admin — 16:26 to 17:39, 1 h 13 min

- OIDC app Rostr Admin, client ID `0oa18egjva6o5FpoP698`, assigned to `APP-Rostr-Admins`. A second app with the same name was deleted. Incident: [docs/incidents/00-duplicate-rostr-admin.md](../incidents/00-duplicate-rostr-admin.md).
- Jonah Hale signed in through `/oidc/login`. `/me` shows `sub` `00u18dk3t4h0G1k9I698` and groups `APP-Rostr-Users`, `APP-Rostr-Admins`. Log `2026-10-06T06:35:49.607Z` (17:35 +1100), `protocol: oidc`. `/admin/users` rendered. He was removed from `APP-Rostr-Admins` after the test.
- [d0c728f](https://github.com/Timothy-itayi/okta-iam-lifecycle-lab/commit/d0c728f) (`complete phase 2.7`) at 17:39.

### 2.8 Onboarding runbook — 17:39 to 19:04, 1 h 25 min

- [docs/runbooks/saas-onboarding.md](../runbooks/saas-onboarding.md). Intake, the 2.3 and 2.7 tables, test plan, rollback, handover. IdP-initiated SAML is marked not run. No business owner has accepted Rostr.
- [208dc6d](https://github.com/Timothy-itayi/okta-iam-lifecycle-lab/commit/208dc6d) (`update sass onboarding`) at 19:04.

## Phase 3 — SCIM

About 1 h 49 min, 19:04 to 20:53.

| Task | Clock | Duration |
| --- | --- | --- |
| 3.1 to 3.3 Contract, Users, Groups | 19:04 → 19:41 | 37 min |
| 3.4 Connector | 19:41 → 19:45 | 4 min |
| 3.5 Mappings | 19:45 → 20:10 | 25 min |
| 3.6 Lifecycle | 20:10 → 20:35 | 25 min |
| 3.7 Import | 20:35 → 20:53 | 18 min |

3.6 has no commit of its own. 20:35 is the midpoint between the 3.5 commit at 20:10 and the 3.7 import at 20:45.

### 3.1 to 3.3 — 19:04 to 19:41, 37 min

- Call list and test plan in [docs/phases/03-scim.md](../phases/03-scim.md). Classic-experience custom apps get PUT, not the PATCH the runbook lists. Rostr accepts both.
- `/scim/v2/Users` and `/ServiceProviderConfig` behind `SCIM_TOKEN`. 32 unit tests pass. `scripts/scim-tests.sh` 23 of 23: [evidence/3.2-scim-tests.txt](../../evidence/3.2-scim-tests.txt). Public host at 19:26 returned 401 without the token and listed Jonah's SAML row with it.
- Groups: create, add, remove, replace, rename, delete. `scripts/scim-tests.sh` 38 of 38: [evidence/3.3-scim-tests.txt](../../evidence/3.3-scim-tests.txt). Pushed groups do not change who can sign in.

### 3.4 Connector — 19:41 to 19:45, 4 min

- Base URL `https://rostr.lanternfieldgoods.co.uk/scim/v2`, unique identifier `userName`, HTTP Header. Import Groups is off. Test Connector Configuration passed. Okta sent `GET /Users?startIndex=1&count=2`. 401 at `08:41:09.475Z`, 200 at `08:41:34.600Z` (19:41 +1100), Jonah Hale's existing row. Okta adds `Bearer`.

### 3.5 Mappings — 19:45 to 20:10, 25 min

- To App: `userName`, `user.firstName`, `user.lastName`, `user.email`, `user.title`, `user.department` (enterprise extension). `userType` was on the 19:57 list and was removed. Saving at 19:45 only produced `GET /Users?startIndex=1&count=2`.
- [02154ed](https://github.com/Timothy-itayi/okta-iam-lifecycle-lab/commit/02154ed) (`complete phase 3.5`) at 20:10.

### 3.6 Lifecycle — 20:10 to about 20:35, about 25 min

- `test.joiner@`: `POST`, then two `PUT`s. Deactivate `user.lifecycle.deactivate` at 20:18:32, SCIM `PUT` `active: false` at `09:18:33.996Z`. Force Sync did nothing for the seven staff. Provision User created six and `PUT` Jonah. `APP-Rostr-Users` pushed with those seven. `APP-Rostr-Admins` failed once on a Cloudflare 502, then pushed empty. Okta sent `PUT`, not `PATCH`. Pairs: [evidence/03-scim/lifecycle-pairs.md](../../evidence/03-scim/lifecycle-pairs.md).

### 3.7 Import — 20:35 to 20:53, 18 min

- `orphan.roster@example.invalid` inserted into Rostr, active, in no group. Import at `09:45:39Z` (20:45 +1100): 9 users returned, 8 scanned, 1 new, 7 unchanged. Proposed new Okta user, ignored: 0 created, 0 linked, 1 ignored. The Rostr row remains.
- [c7a131b](https://github.com/Timothy-itayi/okta-iam-lifecycle-lab/commit/c7a131b) (`phase 3 complete`) at 20:53.

Break until 23:08.

## Phase 4 — Joiner, mover, and leaver

About 3 h 15 min, 23:08 to 02:23.

| Task | Clock | Duration |
| --- | --- | --- |
| 4.1 Automation identity | complete 23:08 | start after the 20:53 break, clock not recorded |
| 4.2 hr-sync | 23:08 → 23:15 | 7 min |
| 4.3 Joiner | 23:08 → 00:58 | 1 h 50 min |
| 4.4 Mover | 00:58 → 01:41 | 43 min |
| 4.5 Leaver | 01:41 → 02:13 | 32 min |
| 4.6 Entitlements and write-up | 01:40 → 02:23 | 43 min |

4.3 overlaps 4.1 and 4.2: the Workflows sign-on denial at 23:08 is the start of 4.3, and 4.1's commit is the same minute. 4.6's `before.csv` was taken at 01:40, before the Leaver succeeded, so that row overlaps 4.4 and 4.5.

### 4.1 Automation identity — complete 23:08

- API service app `svc-jml-sync`, client id `0oa18eu8qpmkJBqdg698`, key id `svc-jml-sync-1`. Private key outside the repo. Scopes `okta.users.manage`, `okta.groups.manage`, `okta.logs.read`. Custom role `jml-sync` plus Report Administrator. Org requires DPoP. Token type `DPoP`, one hour, those three scopes. `/users` and `/groups` 200. `/logs` 403 until Report Administrator, then 200.
- [46604cd](https://github.com/Timothy-itayi/okta-iam-lifecycle-lab/commit/46604cd) (`complete phase 4.1`) at 23:08. Record: [docs/decisions/scripts-identity.md](../decisions/scripts-identity.md).

### 4.2 hr-sync — 23:08 to 23:15, 7 min

- Diffs `hr/employees.json` against `HEAD~1`. New id = joiner. Department, title, or `managerId` = mover. `status` terminated or `endDate` on or before today in Sydney = leaver. Dry-run is the default. `--apply` posts, then appends `logs/jml.csv`.
- Throwaway-repo dry run in [evidence/4.2-hr-sync-dry-run.txt](../../evidence/4.2-hr-sync-dry-run.txt). That commit is not in this repo.
- [14e5a9f](https://github.com/Timothy-itayi/okta-iam-lifecycle-lab/commit/14e5a9f) (`complete phase 4.2`) at 23:15.

### 4.3 Joiner — 23:08 to 00:58, 1 h 50 min

- 23:08 and 23:17: Workflows sign-on denied. Policy "Any two factors", catch-all had Phishing resistant on. That box was turned off. Password plus Okta Verify push then worked. Rostr Admin uses the same policy. Screenshot: [evidence/4.3-any-two-factors-rule.png](../../evidence/4.3-any-two-factors-rule.png).
- Joiner flow in the `JML` folder. Create User **without Credentials**. Activate had to be set True. Username is `email`. `employeeId` maps to `employeeNumber`. Invoke URL alias `d9ad739ee0a9801bbdc1e8b1943845b4`. Token lives in the root `.env`. The Create User connection secret is on **Okta Workflows OAuth › Sign On**, not on `svc-jml-sync`.
- 00:13: `node scripts/hr-sync --ticket REQ-0003 --apply`. `logs/jml.csv` row `2026-10-06T13:13:29.334Z`. Department was `HR`, Activate was False. No `DEPT-HR` group. SCIM was not called.
- 00:35: REQ-0004, Thomas Okeke, Operations, Activate True. SCIM `POST` 201 at `13:35:59.943Z`, group `PUT` at `13:36:04.077Z`. Assignments are Type Group: [evidence/4.3-rostr-assignments-group.png](../../evidence/4.3-rostr-assignments-group.png). Dashboard: [evidence/4.3-thomas-okeke-dashboard.png](../../evidence/4.3-thomas-okeke-dashboard.png). He has not signed in to Rostr.
- [3d8e533](https://github.com/Timothy-itayi/okta-iam-lifecycle-lab/commit/3d8e533) (`HR: joiner EMP-1008 Thomas Okeke, Operations`) and [b1906a4](https://github.com/Timothy-itayi/okta-iam-lifecycle-lab/commit/b1906a4) (`complete phase 4.3`) at 00:58.

### 4.4 Mover — 00:58 to 01:41, 43 min

- Priya Shah, EMP-1003, Sales to Operations, title `Operations Analyst`, manager `EMP-1004`.
- [1e632bb](https://github.com/Timothy-itayi/okta-iam-lifecycle-lab/commit/1e632bb) (`HR: move Priya Shah to Operations and terminate Samir Adeyemi`) at 01:40.
- `--apply` REQ-0006: profile update `14:41:06.052Z` (01:41 +1100), SCIM `PUT` at `14:41:07.509Z`, then HTTP 504 after 61 seconds because the Mover Wait For is 60 seconds. `logs/jml.csv` has no REQ-0006 row.

### 4.5 Leaver — 01:41 to 02:13, 32 min

- 01:42: two calls only cleared sessions. Deactivate User was on the canvas and not in the saved flow.
- 02:11: flow saved. Screenshots: [evidence/4.5-leaver-flow.png](../../evidence/4.5-leaver-flow.png), [evidence/4.5-leaver-true-branch.png](../../evidence/4.5-leaver-true-branch.png).
- 02:12: `user.lifecycle.deactivate` SUCCESS at `15:12:13.550Z`. SCIM `PUT` `active` false at `15:12:22.899Z`. `rostr.sqlite` `active` 0. Active users 10 to 9. Second call HTTP 200 in 1.4 seconds, no new System Log event, no new SCIM line. He stayed `DEPROVISIONED`. Still in `DEPT-Finance` and `APP-Rostr-Users`.

### 4.6 Entitlements and write-up — 01:40 to 02:23, 43 min

- `scripts/entitlements` lists every user, including deprovisioned. Group source from the group rules. App source is `unknown`: `svc-jml-sync` gets 403 from the app-user API.
- `before.csv` taken while Priya was in Sales and Samir was `ACTIVE`. `after.csv` shows Priya in `DEPT-Operations` and Samir `DEPROVISIONED` with no Rostr app row. No individual assignment appeared.
- [2c34ea4](https://github.com/Timothy-itayi/okta-iam-lifecycle-lab/commit/2c34ea4) (`finish phase 4`) at 02:19. [854abf0](https://github.com/Timothy-itayi/okta-iam-lifecycle-lab/commit/854abf0) (`update readme`) at 02:23.
- Record: [docs/phases/04-jml.md](../phases/04-jml.md), [evidence/04-jml/comparison.md](../../evidence/04-jml/comparison.md).

Break until 11:46.

## Phase 5 — Governance (started)

About 3 h 16 min, 11:46 to 15:02. Staff login through OIDC `/admin/users`. Access review complete. Stale-Access planted Jonah Hale. OAuth review revoked `legacy-report-tool`. Audit pack assembled with control mapping. System Log JSONL exported at 15:00. OIG mapping closed at 15:02. Access Request remove is in the log; the ticket is not Closed.

| Task | Clock | Duration |
| --- | --- | --- |
| 5.1 osTicket staff login | 11:46 → 12:15 | 29 min |
| 5.1 Help topic, ticket, approval | 12:15 → 12:28 | 13 min |
| 5.2 Access Request flow and grant | 12:31 → 13:11 | 40 min |
| 5.2 OIDC as Lena | 13:11 → 13:23 | 12 min |
| 5.2 Rostr Admin group assignment | 13:23 → 13:31 | 8 min |
| 5.3 Access review | 13:35 → 13:43 | 8 min |
| 5.4 Stale-Access | 13:46 → 13:49 | 3 min |
| 5.5 OAuth review | 13:52 → 14:12 | 20 min |
| 5.6 Audit pack | 14:15 → 15:00 | 45 min |
| 5.6 OIG mapping (runbook) | 14:15 → 15:02 | 47 min |

Phase 5 started after sleep. The first clock we have is 11:46, when `/scp` was still Access denied and MariaDB `root@localhost` looked like the cause.

### 5.1 osTicket staff login — 11:46 to 12:15, 29 min

- osTicket is `rinkp/osticket-dockerized:1.18.4` on `127.0.0.1:8080`, containers `itops-osticket` and `itops-mariadb`. Compose lives in the itops repo, not `rostr/`. The volume is from 29 September (`osTicket Installed!` ticket `829363`).
- `/scp` returned Access denied for the email in the install log and for `OST_ADMIN_PASSWD`. First guess was the old homelab mismatch: MariaDB password vs what osTicket claimed. `docker exec … mariadb -uroot` without `-p` failed (`using password: NO`). Logs showed `root@localhost` denied at `00:47Z` (11:47 +1100). Those lines were the exec, not the app. osTicket uses user `osticket` to host `mariadb`. No `osticket@` denials.
- `ost_staff` staff_id 1 was active and admin. `username` was `md5(admin@homelab.internal)`, not the email the installer printed. Renamed it to `admin`. Login still failed: `passwd` did not match what was typed. osTicket 1.18 wants bcrypt cost 8, not `MD5()` in SQL. `OST_ADMIN_PASSWD` is applied at first install only.
- Reset: hash generated in `itops-osticket` with PHP `password_hash` cost 8, written to `ost_staff.passwd`, `backend` NULL, `change_passwd` 0. Logged in at `/scp/login.php` as `admin`.
- 12:15: Welcome Admin, Tickets tab. [evidence/5.1-osticket-staff-login.png](../../evidence/5.1-osticket-staff-login.png). Incident: [docs/incidents/01-osticket-staff-login.md](../incidents/01-osticket-staff-login.md).

### 5.1 Help topic, ticket, approval — 12:15 to 12:28, 13 min

- Admin Panel → Manage → Help Topics. `Access Request`, Active, Public, Support. Created 1:24 UTC. [evidence/5.1-osticket-help-topics.png](../../evidence/5.1-osticket-help-topics.png).
- Guest form as Lena. Open ticket `357784`, subject `REQ-0001 APP-Rostr-Admins`, From Lena Ortiz. [evidence/5.1-osticket-ticket-list.png](../../evidence/5.1-osticket-ticket-list.png).
- Internal Note, not Reply: Marcus Bell EMP-1004 approved. Mail is not configured. Ticket stayed Open. [evidence/5.1-osticket-approval.png](../../evidence/5.1-osticket-approval.png).
- Record: [docs/phases/05-governance.md](../phases/05-governance.md).

### 5.2 Access Request flow and grant — 12:31 to 13:11, 40 min

- `JML` folder, Access Request Flow, ON, Not saving data. Cards: API Endpoint (`email`, `ticket`), Read User, Add User to Group `00g18dk6nvdMFQAgi698`, Close on dummy connection `unused-close` auth None, Wait For 1 hour, Remove User from Group. Close search only offered the API Connector card; New Connection with auth None was required to drop it on the canvas.
- 12:57: Add and Remove **User ID** dragged from Read User System Properties **ID**, not from body `email`. Group id stays the pasted `00g…`. [evidence/5.2-access-request-flow-left.png](../../evidence/5.2-access-request-flow-left.png), [evidence/5.2-access-request-flow-right.png](../../evidence/5.2-access-request-flow-right.png).
- First POST 404: flow ON, canvas not saved, User ID still `email`. `hr-sync --ticket REQ-0001` dry-run `no changes`. Second POST after Save: HTTP 200 `{}` about 13:06.
- 13:06:18 System Log `group.user_membership.add` SUCCESS, Lena / `APP-Rostr-Admins`, actor Timothy Itayi (the Workflows Okta connection). Group Push to Rostr the same second. [evidence/5.2-system-log-group-add.png](../../evidence/5.2-system-log-group-add.png).
- 13:07: Lena in the group, Active, Managed Manually. [evidence/5.2-lena-in-app-rostr-admins.png](../../evidence/5.2-lena-in-app-rostr-admins.png).
- First OIDC attempt was a 400 from Okta, not a missing Express route. `/oidc/login` 302s. Group membership was already in Okta, Rostr, and SCIM. Lena was not assigned to the Rostr Admin OIDC app. An Individual assignment unblocked sign-in. That assignment is still the wrong grant: the app should be assigned to `APP-Rostr-Admins` only.
- 13:19: incognito `/oidc/login` as Lena. `/me` `aud` `0oa18egjva6o5FpoP698`, `sub` `00u18dk3t6entw6Kv698`, `groups` `APP-Rostr-Users, APP-Rostr-Admins`. [evidence/5.2-lena-oidc-me.png](../../evidence/5.2-lena-oidc-me.png).
- 13:23: `/admin/users` rendered. Lena `lastLogin` empty (OIDC does not write it). [evidence/5.2-lena-admin-users.png](../../evidence/5.2-lena-admin-users.png).
- [3bcd8d3](https://github.com/Timothy-itayi/okta-iam-lifecycle-lab/commit/3bcd8d3d85aaa39251d0c942e523cb59105857d9) (`Record Lena's APP-Rostr-Admins grant from REQ-0001`) at 13:12.

### 5.2 Rostr Admin group assignment — 13:23 to 13:31, 8 min

- Rostr Admin Assignments → Groups: `APP-Rostr-Admins` at priority 1. [evidence/5.2-rostr-admin-group-assignment.png](../../evidence/5.2-rostr-admin-group-assignment.png). People Individual of Lena is the leftover grant; drop that row if it is still type Individual. Do not unassign the group.
- Ticket `357784` still Open. The 13:06 POST is the trigger; do not invoke again. Wait For due around 14:06. Close-out is add + remove in System Log, flow History for that run, Internal Note with the run link, then Close.
- [f2ce849](https://github.com/Timothy-itayi/okta-iam-lifecycle-lab/commit/f2ce84998c7e1413dba12d1713d6851818fed6f4) (`update governance`) at 13:31. OIDC screenshots and the group assignment.

### 5.3 Access review — 13:35 to 13:43, 8 min

- `scripts/access-review`: Rostr sqlite users, HR manager, Okta groups, System Log `user.authentication.sso` for both Rostr apps. One CSV per manager. Revoke deletes `APP-Rostr-Users` / `APP-Rostr-Admins` only. Dry-run default.
- First user lookup used `/users/{email}` and Okta returned HTTP 400 on `%40`. Switched to `profile.login eq "..."`.
- Export 13:42: 10 rows, 5 files in [evidence/5.3](../../evidence/5.3). Jonah last SSO `2026-10-06T06:35:49.117Z`. Lena `2026-10-07T02:19:24.525Z`.
- Acting as each manager: Keep everyone still employed, including Lena. Revoke Samir Adeyemi and `test.joiner` leftover `APP-Rostr-Users`. Orphan Roster Keep (no Okta user).
- Dry-run REQ-0002, then `--apply` at `02:43:27Z`, both HTTP 204. [evidence/5.3/revocation.csv](../../evidence/5.3/revocation.csv). Second dry-run: no `APP-Rostr` group on either. Record: [docs/phases/05-governance.md](../phases/05-governance.md).
- [b77be14](https://github.com/Timothy-itayi/okta-iam-lifecycle-lab/commit/b77be14c30b222056e5e40c5d6751e904d76ff13) (`Record the access-review script and REQ-0002 recertification.`) at 13:47.

### 5.4 Stale-Access — 13:46 to 13:49, 3 min

- `scripts/stale-access plant` backdated Jonah Hale `lastLogin` `2026-10-06T05:20:26.829Z` → `2026-08-22T05:20:26.829Z`, `licensed` 1 on Jonah and Orphan Roster. Report: [evidence/05-governance/stale-access.md](../../evidence/05-governance/stale-access.md). Jonah is the stale reclaim. Does not touch HR or deactivate. Access Request Wait For still due around 14:06.
- [8a067e2](https://github.com/Timothy-itayi/okta-iam-lifecycle-lab/commit/8a067e2eb874898460cd5a762dd5eebf2da2d7ed) (`complete phase 5.2`) at 13:51. The message says 5.2. The files are Stale-Access.

### 5.5 OAuth review — 13:52 to 14:01, 9 min

- **Problem:** `GET /api/v1/apps` 403. Token requested with `okta.apps.manage` still only had `okta.users.manage okta.groups.manage okta.logs.read`. Okta omitted the ungranted scope instead of returning `invalid_scope`.
- **Fix:** Granted `okta.apps.manage` on `svc-jml-sync` and assigned Application Administrator. Token then included `okta.apps.manage`. `/api/v1/apps` 200.
- Plant created `legacy-report-tool` `0oa18g5mzseAfusVa698`. `POST /apps/{id}/grants` 403. Super Administrator at 14:05 did not fix it: token still omitted `okta.appGrants.manage`. Role and scope are separate.
- **Fix 2:** Granted `okta.appGrants.manage` and `okta.appGrants.read`. `GET /grants` 200. Planted four manage scopes. Found: [evidence/5.5/oauth-review-found.md](../../evidence/5.5/oauth-review-found.md). Revoke `--apply`: four grant DELETE 204, deactivate 200. After: [evidence/5.5/oauth-review.md](../../evidence/5.5/oauth-review.md). Take Super Admin off `svc-jml-sync`. Runbook: [docs/runbooks/oauth-review.md](../runbooks/oauth-review.md).
- [e14d47d](https://github.com/Timothy-itayi/okta-iam-lifecycle-lab/commit/e14d47d53cf7f9ef21a96ee3f46c42e6c0254964) (`complete phase 5.4 Access Reviews`) at 14:15. The message says access reviews. The files are the OAuth review.

### 5.6 Audit pack — 14:15 to 14:36, 21 min

- `scripts/audit-log-export.js` pulls System Log by event family, redacts secrets, writes JSONL + counts CSV. DPoP auth via `svc-jml-sync`.
- **Problem:** `/api/v1/logs` is 60 requests a minute. The first run was killed in the shell and the node process kept going. A second run started on top of it. Both sat on 429, and one `sw` query followed Okta's next link onto an empty page and would have looped.
- **Fix:** Killed every `audit-log-export` process, waited out the window, capped pages, stopped on an empty page. One run at 15:00: 27 lifecycle, 29 group, 46 app, 61 MFA. Lena's `APP-Rostr-Admins` remove is `2026-10-07T03:06:20Z`.
- Copied access-review CSVs, access-request records, stale-access findings, oauth-review tables into `evidence/audit-pack/` subdirs.
- Wrote `evidence/audit-pack/README.md`: index of every file, mapped to SOC 2 CC6.1–CC6.3 and ISO 27001:2022 A.5.15–A.5.18, A.8.2, A.8.5.
- [3a860f5](https://github.com/Timothy-itayi/okta-iam-lifecycle-lab/commit/3a860f537b8e1a650e4fac6f6a29d3509558b4d6) (`audit pack and OIG mapping (5.5-5.6)`) at 14:38. Pack index, copied reviews, and the first `oig-mapping.md`. System Log JSONL was not in this commit. The export was still on 429.
- [733cbe2](https://github.com/Timothy-itayi/okta-iam-lifecycle-lab/commit/733cbe274df2a55f9441f7e0edab040a32f55376) (`Export the audit-pack System Log and index it to the controls.`) at 15:01. 27 lifecycle, 29 group, 46 app, 61 MFA. Lena's remove is in the group file.

### 5.6 OIG mapping — 14:15 to 15:02

Runbook 5.6. The audit pack is runbook 5.5. This log already used 5.5 for the OAuth review.

- Fetched Okta docs on Identity Governance, Access Requests, Access Certifications, Entitlement Management.
- Wrote [docs/decisions/oig-mapping.md](../decisions/oig-mapping.md): lab process, how OIG does it, what OIG adds, who approved whose access, what to learn first on the job.
- 15:02: checkpoint updated for the 14:06 remove. Marcus Bell approved Lena's hour. Workflows is the System Log actor on the add and the remove. Ticket `357784` is still Open.
- Trial does not have OIG. The note is not a compliance claim. [docs/decisions/02-design.md](../decisions/02-design.md) now points at it.
- [090572e](https://github.com/Timothy-itayi/okta-iam-lifecycle-lab/commit/090572e48027110aee6ca24482d3f30b1bab4310) (`Close the OIG mapping as runbook 5.6.`) at 15:03.

### Access Request close-out (remove only)

Wait For fired. `group.user_membership.remove` for Lena / `APP-Rostr-Admins` is `2026-10-07T03:06:20.435Z` in [evidence/audit-pack/system-log-group-membership.jsonl](../../evidence/audit-pack/system-log-group-membership.jsonl). Ticket `357784` is still Open. Still needed: Workflows History URL on the ticket, Internal Note, Close, and the three screenshots.

## Phase 6 — Failure drills (started)

About 35 min, 16:59 to 17:34. Rostr was already up. Local and public `/health` were 200.

### 6.1 SAML ACS mismatch — 16:59 to 17:12, 13 min

- Confirmed the Rostr SAML app `0oa18eddmjpNG4dNl698` was on `https://rostr.lanternfieldgoods.co.uk/saml/acs` for single sign-on URL, recipient, and destination.
- Edit → Configure SAML. Changed only Single sign-on URL to `acs2`. Left **Use this for Recipient URL and Destination URL** ticked. Audience stayed `saml/metadata`. API confirmed all three URLs were `acs2`.
- Jonah Hale, private window, `/saml/login`. Browser stopped on `/saml/acs2` with `Cannot POST /saml/acs2`. [evidence/6.1-saml-acs2.png](../../evidence/6.1-saml-acs2.png). `logs/rostr-auth.jsonl` gained no line. The SAML handler never ran.
- Restored `/saml/acs` the same way. Jonah's dashboard tile reached `/me` at `2026-10-07T06:12:09.466Z`. Auth log `06:12:09.478Z`, `protocol` `saml`, `outcome` `success`. [evidence/6.1-jonah-me.png](../../evidence/6.1-jonah-me.png).
- That success overwrote the planted stale `lastLogin`. The Phase 5 stale-access report no longer matches Rostr.
- Record: [docs/incidents/02-saml-acs.md](../incidents/02-saml-acs.md).
- [e51a3c1](https://github.com/Timothy-itayi/okta-iam-lifecycle-lab/commit/e51a3c1372519e717aab75e94f1ce3d74e16da2a) (`Record the SAML ACS mismatch drill.`) at 17:13.

### 6.2 OIDC redirect mismatch — 17:13 to 17:18, 5 min

- Rostr Admin `0oa18egjva6o5FpoP698`. Sign-in redirect was `https://rostr.lanternfieldgoods.co.uk/oidc/callback`. Sign-out was the same text. Changed only the sign-in row to `callback-wrong`.
- Private window `/oidc/login`. Okta 400 `invalid_request` on `/oauth2/default/v1/authorize`. Client id in the URL was the real app. [evidence/6.2-oidc-400.jpg](../../evidence/6.2-oidc-400.jpg). No new OIDC line in `logs/rostr-auth.jsonl`.
- Put the sign-in URI back. API shows both lists on the real callback. The next open of `/oidc/login` showed the Okta sign-in form instead of the 400. [evidence/6.2-oidc-signin-restored.jpg](../../evidence/6.2-oidc-signin-restored.jpg). Did not finish as Helen Cho. She is not in `APP-Rostr-Admins`.
- Record: [docs/incidents/03-oidc-redirect.md](../incidents/03-oidc-redirect.md).
- [e76f762](https://github.com/Timothy-itayi/okta-iam-lifecycle-lab/commit/e76f7622b306b1b6418a556425d4abbf1d41b90b) (`Record the OIDC redirect mismatch drill.`) at 17:19.

### 6.3 Missing groups claim — 17:20 to 17:34, 14 min

- First membership check was empty. Jonah had been removed from the app's People tab, which does not add him to the group. Directory → Groups → `APP-Rostr-Admins` → Assign people. [evidence/6.3-jonah-in-group.png](../../evidence/6.3-jonah-in-group.png).
- Default authorization server, claim `groups`, filter changed from `APP-Rostr` to `APP-Rostrx`. Still included in the ID token. [evidence/6.3-groups-claim-wrong.png](../../evidence/6.3-groups-claim-wrong.png).
- Jonah `/oidc/login` reached `/me` with a blank `groups` line. `/admin/users` was not allowed. Auth log `2026-10-07T06:31:17.124Z` was still `outcome` `success`. [evidence/6.3-me-groups-empty.png](../../evidence/6.3-me-groups-empty.png).
- Filter restored to `APP-Rostr`. New private window. `/me` showed `APP-Rostr-Users, APP-Rostr-Admins`. Auth log `2026-10-07T06:34:02.105Z`. [evidence/6.3-me-groups-restored.png](../../evidence/6.3-me-groups-restored.png).
- Record: [docs/incidents/04-groups-claim.md](../incidents/04-groups-claim.md). Jonah is still in `APP-Rostr-Admins` until he is removed after this record.
