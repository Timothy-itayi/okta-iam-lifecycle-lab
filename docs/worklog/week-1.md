# Week 1

## 2026-10-06

- Date: Tuesday 6 October 2026 (session started 5 October 2026, 23:56 +1100)
- Time spent: about 15 minutes, from the first commit at 23:56 to this entry
- What was done:
  - Created the public repo [okta-iam-lifecycle-lab](https://github.com/Timothy-itayi/okta-iam-lifecycle-lab) and cloned it.
  - First commit: [cfa6e59](https://github.com/Timothy-itayi/okta-iam-lifecycle-lab/commit/cfa6e59e6e91cc2fe43cd39e269dfc6e16a14007) (`Initial commit`). Second commit: [3634655](https://github.com/Timothy-itayi/okta-iam-lifecycle-lab/commit/36346555092085c32b607293b877bb90b55ccbb1) (`init repo`).
  - Created `docs/phases`, `docs/decisions`, `docs/runbooks`, `docs/incidents`, `docs/worklog`, `evidence`, `hr`, `rostr`, and `scripts`. The `docs` folders were first created with a trailing comma in the name and then renamed.
  - Added `.gitignore` so `Okta-IAM-Lifecycle-Lab-Runbook.pdf` is not committed. Not committed yet.
  - At this point `README.md` was still the Phase 0 blurb. The phase table, the learning-lab line, and the AI-assistance line were added later the same night.
  - Started this worklog (task 0.1 step 4). Not committed yet.

## 2026-10-06, later the same night

- Time spent: about 30 minutes, from the routing test at 00:25 to the Admin Console screenshot at 00:53
- What was done:
  - Registered `lanternfieldgoods.co.uk` on Cloudflare and turned on Email Routing to `timmytam10@gmail.com`. Address plan and the still-disabled catch-all are in [docs/decisions/00-domain.md](../decisions/00-domain.md).
  - Proved `test-env@lanternfieldgoods.co.uk` arrives in Gmail. `admin@`, `breakglass@`, and `it@` are Active. At 01:17 the catch-all was changed from Drop/Disabled to Send to `timmytam10@gmail.com` and set Active. A staff-address delivery test after that change is not in the screenshots.
  - Activated the Okta org `trial-7464750` with `admin@lanternfieldgoods.co.uk` and enrolled Okta Verify. Recorded in [docs/decisions/01-org.md](../decisions/01-org.md).
  - The console says 30 days left on a free trial. The runbook asked for an Integrator Free Plan org, which does not expire. Plan type is unconfirmed.
  - Did not import users. A SAML app named `testapp` was created afterwards. That is task 0.4, and it is not deleted yet.
  - Task 0.3 dashboard screenshot filed as `evidence/0.3-admin-console-dashboard.png`.
  - Created `breakglass@lanternfieldgoods.co.uk`, assigned Super Organization Administrator, and enrolled it in Okta Verify on the same phone as the daily admin. Break-glass then opened its own Admin Console. Decision and screenshots are in [docs/decisions/02-break-glass.md](../decisions/02-break-glass.md). Directory shows 2 active users. The left nav says Free Trial Plan.
  - Wrote `hr/employees.json`: 7 active staff, Sales 3, Operations 2, Finance 2, one manager in each department. `jq -r '.[] | .email'` printed 7 `@lanternfieldgoods.co.uk` addresses. Committed in [9cd2849](https://github.com/Timothy-itayi/okta-iam-lifecycle-lab/commit/9cd2849) (`complete 0.5`). The runbook message was `HR: initial 7 staff`. That message was not used.
  - Wrote [docs/decisions/02-design.md](../decisions/02-design.md): 10 user slots, 5 flows, naming, the HR-to-Rostr path, and the out-of-scope list.
  - Extended `.gitignore` with `.env`, `*.pem`, `*.key`, `logs/`, `evidence-raw/`, and `node_modules/`. Added `.env.example` with empty placeholders only.
  - Task 0.7 step 5. Tool versions printed in the repo directory:

    ```
    cloudflared --version
    cloudflared version 2026.9.3 (built 2026-09-24T15:31:10Z)
    jq --version
    jq-1.8.2
    node -v
    v24.4.1
    ```

    The runbook asked for Node 20. This machine printed v24.4.1. Docker Desktop and the SAML-tracer extension were not in this output.

## Checkpoint, end of prep

The three conditions in this check:

- The org exists with two secured admins. `trial-7464750` has `admin@lanternfieldgoods.co.uk` and `breakglass@lanternfieldgoods.co.uk`. Both are Active, both are enrolled in Okta Verify, and break-glass reached its own Admin Console with Super Organization Administrator. Both factors are on the same phone.
- The HR file is committed. `hr/employees.json` is in `9cd2849`.
- The design note answers where every user slot and every flow goes. [docs/decisions/02-design.md](../decisions/02-design.md) is in `8c5e1c5`.

Not in this check: `.gitignore` and `.env.example` are still uncommitted. A message to `ava.nguyen@lanternfieldgoods.co.uk` has not been shown arriving since the catch-all was turned on. The org nav says Free Trial Plan.

## Phase 1

- Task 1.1. Confirmed `title`, `employeeNumber`, `department`, and `managerId` on the Okta user profile. Custom attributes are `employmentStatus`, `startDate`, and `endDate`. Every HR field has an Okta attribute. Mapping table is in [docs/phases/01-foundation.md](../phases/01-foundation.md).
- Task 1.2 step 1. Generated `hr/okta-import.csv` from `hr/employees.json` with `jq`. Seven rows. `login` is the email. `employeeNumber` is the HR `employeeId`. The three managers have an empty `managerId`.
- Task 1.2 import. Okta imported 7 new users with 0 errors. The widget says 9 of 10. By 02:15 all seven staff and both admins are Active. Jonah Hale signed in to an empty end-user dashboard. Login, email, and title match the HR file. Notes are in [docs/phases/01-foundation.md](../phases/01-foundation.md).
- Task 1.3. Six groups created. Department rules and the `APP-Rostr-Users` rule are Active. Counts are Sales 3, Operations 2, Finance 2, Rostr users 7. `APP-Rostr-Admins` and `ADM-Helpdesk` are empty on purpose.
- Task 1.4. Lena Ortiz got an Okta Verify number challenge (75) at 02:50. That sign-in offered Okta Verify and password, not SMS. Email is recovery only. Minimum password length is 12. The Password Security screen shows history of 4 and lockout after 10.
- Task 1.5. Global session policies Admins and Staff are Active, Admins first. Staff covers the three `DEPT-` groups. Admins covers `ADM-Helpdesk` and `APP-Rostr-Admins`. Marcus Bell got password then Okta Verify number 41. The admin sign-in required MFA. Session-length reasoning is in [docs/phases/01-foundation.md](../phases/01-foundation.md).
- Task 1.6. Helen Cho is Help Desk Administrator, scoped to the three `DEPT-` groups. She can open Jonah Hale and sees password reset. The reset mail names Timothy Itayi; the System Log actor is Helen. Jonah's new password met the 12-character rule, then Okta Verify number 72. Helen's nav does not show Applications or Security.
- Task 1.7. Helen reset Jonah Hale's Okta Verify at 03:46. He enrolled it again and signed in to the Dashboard at 04:07. Runbook is [docs/runbooks/mfa-reset.md](../runbooks/mfa-reset.md). The log export is the evidence, because a search with Jonah as the actor does not show Helen's reset.
- Task 1.8. Entra-to-Okta table is in [docs/phases/01-foundation.md](../phases/01-foundation.md). Group rule, authentication and session policies, Help Desk Administrator, Management API, app integration, and System Log, each pointed at the object already built.
- README. Replaced the Phase 0 blurb with the lab brief, a phase status table through Phase 1, and links to the repository folders. The map is [docs/built-so-far.png](../built-so-far.png). Break-glass is on it. `scripts/`, Workflows, `rostr/`, incidents, and phase notes 2-7 are marked TBC.
- Task 2.1, steps 1 to 4. `express`, `better-sqlite3`, and `express-session` are installed. `node_modules/` was already ignored. Users table, `/health`, `/me`, `/admin/users`, and `logs/rostr-auth.jsonl` are in `rostr/`. Five tests pass. Docker and `/health` from the container are not done.
- Task 2.1, step 5. `rostr/Dockerfile` and `rostr/docker-compose.yml` mount `logs/` and `rostr/data/` (the database file is `rostr.sqlite` inside that directory). The image is Node 22 because `better-sqlite3` 13 refuses Node 20 and segfaults. `http://127.0.0.1:3000/health` returned `OK` from the container.
- Task 2.1 complete. The container log shows `Rostr listening on 3000`, and Docker Desktop shows `3000:3000`. Note is [docs/phases/02-onboarding.md](../phases/02-onboarding.md). The MemoryStore warning is the session default, not a failed start.
- Task 2.2 complete. CNAME `rostr.lanternfieldgoods.co.uk` points at tunnel `rostr`. Host `cloudflared` sends that name to `http://localhost:3000`. Public `/health` returned `OK`. A phone at 14:27 got `Cannot GET /`, the same Express response as localhost `/`. The changing-URL fallback was not used.
- Task 2.3. SAML app Rostr. Metadata URL is in `rostr/.env`. Attributes are email, firstName, lastName, department, and groups starting with `APP-Rostr`. The saved Sign On view uses `https://rostr.lanternfieldgoods.co.uk/saml/acs` for SSO, Recipient, and Destination, and `https://rostr.lanternfieldgoods.co.uk/saml/metadata` as the audience. An earlier edit used the bare host `rostr`. Record is [docs/phases/02-onboarding.md](../phases/02-onboarding.md).
- Task 2.4, steps 2 to 5. Rostr reads the Okta metadata at startup and has `/saml/login`, `/saml/acs`, and `/saml/metadata`. Assertions must be signed. Clock skew is 30 seconds. A sign-in upserts by email, sets `lastLogin`, and maps `APP-Rostr-Admins` to admin and anything else to staff. Failures are logged with a reason. On the public host, a forged POST returned 401 with `Invalid document signature`.
- Task 2.4 sign-in. Only `APP-Rostr-Users` is assigned; no person is assigned directly. At 15:07 Okta refused an unnamed account that is not in that group, and Rostr has no log line for it. At 15:11 Jonah Hale reached `/me` as staff, department Sales, group `APP-Rostr-Users`. The log says success at `2026-10-06T04:11:23.173Z`. `APP-Rostr-Admins` is not assigned and has not been tested.
- Task 2.6, steps 1 to 5. App sign-in policy Rostr is on the Rostr app. Priority 1 is `APP-Rostr-Admins`, possession factor, every sign-in. Priority 2 is `APP-Rostr-Users`, password plus Okta Verify, password every 2 hours and the other factor every 1 hour. Catch-all denies. Both allow rules require a phishing-resistant factor, which Okta is satisfying with FastPass.
- Task 2.6 catch-all. One account, `admin@`, assigned as an Individual. The page at 16:00 said "You do not have permission to perform the requested action." The System Log at 15:59:44 is `app.generic.unauth_app_access_attempt` for Timothy itayi against Rostr. That row does not name the Catch-all Rule. The Individual row was removed after the test. The SAML app is assigned to `APP-Rostr-Users` only.
- Task 2.6 done. Jonah Hale reached `/me` at 16:20 as staff, group `APP-Rostr-Users`, and Rostr logged success at `2026-10-06T05:20:26.837Z`. The shot does not show the factor prompt. Helen Cho at 16:18:31 was `policy.evaluate_sign_on` DENY against Rostr. Marcus Bell at 16:26:33 was `application.policy.sign_on.deny_access`: his enrolled factors did not satisfy the policy. Both are staff. `APP-Rostr-Admins` was empty during that test.
- Task 2.7 done. OIDC app Rostr Admin, client ID `0oa18egjva6o5FpoP698`, assigned to `APP-Rostr-Admins`. A second app with the same name was deleted, and the default authorization server then needed an access policy. Incident: [docs/incidents/00-duplicate-rostr-admin.md](../incidents/00-duplicate-rostr-admin.md). Jonah Hale signed in through `/oidc/login`. `/me` shows `sub` `00u18dk3t4h0G1k9I698` and groups `APP-Rostr-Users`, `APP-Rostr-Admins`. The log at `2026-10-06T06:35:49.607Z` is `protocol: oidc`, that `sub`, success. `/admin/users` rendered. His roster `lastLogin` is still the SAML time. He was removed from `APP-Rostr-Admins` after the test. The group is empty again.
- Task 2.8. SaaS onboarding runbook is [docs/runbooks/saas-onboarding.md](../runbooks/saas-onboarding.md). Intake, the 2.3 and 2.7 configuration tables, test plan, rollback, and handover. IdP-initiated SAML is marked not run. No business owner has accepted Rostr.
- Task 3.1. SCIM call list and test plan are in [docs/phases/03-scim.md](../phases/03-scim.md), from Okta's SCIM 2.0 reference and RFC 7643/7644. Okta's reference says Classic-experience custom apps get PUT for updates and deactivation, not the PATCH the runbook lists, so Rostr will accept both. Jonah Hale's SAML row should be linked by the `userName` filter, not created. Unknowns left for 3.4 and 3.6: the verb, what the connector test calls, and whether existing assignees are pushed.
- Task 3.2. SCIM `/scim/v2/Users` and `/ServiceProviderConfig` are in Rostr behind `SCIM_TOKEN`. Filter, paging, POST with 409, GET, PUT, and PATCH including `active` false. Logs go to `logs/scim.jsonl` with the token and `password` redacted. 32 unit tests pass. `scripts/scim-tests.sh` passed 23 of 23 against a throwaway instance: [evidence/3.2-scim-tests.txt](../../evidence/3.2-scim-tests.txt). The public host at 19:26 returned 401 without the token and listed Jonah's SAML row with it.
- Task 3.3. `POST`, `GET`, `PATCH`, `PUT`, and `DELETE` for `/scim/v2/Groups`. Members are Rostr user ids. `displayName` is unique without regard to case. `scripts/scim-tests.sh` passed 38 of 38, including create, add, remove, replace, rename, and delete: [evidence/3.3-scim-tests.txt](../../evidence/3.3-scim-tests.txt). The public group list is empty. Pushed groups do not change who can sign in.
- Task 3.4. Provisioning on the Rostr app is SCIM. Base URL `https://rostr.lanternfieldgoods.co.uk/scim/v2`, unique identifier `userName`, HTTP Header. Import Groups is off. Test Connector Configuration passed. Okta sent only `GET /Users?startIndex=1&count=2`. A 401 at `2026-10-06T08:41:09.475Z` was followed by 200 at `08:41:34.600Z`, returning Jonah Hale's existing row. Okta adds `Bearer`. It did not call `/Groups` or create a user. To App create, update, and deactivate are still 3.5.
- Task 3.5. To App mappings are `userName` from the Sign On username, `user.firstName`, `user.lastName`, `user.email`, `user.title`, and `user.department`. Department's external namespace is the enterprise extension. `userType` was on the 19:57 list and was removed after that screenshot. Saving the page at 19:45 only produced `GET /Users?startIndex=1&count=2`. No user was created or updated. The table is in [docs/phases/03-scim.md](../phases/03-scim.md).
