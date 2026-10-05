# Week 1

## 2026-10-06

- Date: Tuesday 6 October 2026 (session started 5 October 2026, 23:56 +1100)
- Time spent: about 15 minutes, from the first commit at 23:56 to this entry
- What was done:
  - Created the public repo [okta-iam-lifecycle-lab](https://github.com/Timothy-itayi/okta-iam-lifecycle-lab) and cloned it.
  - First commit: [cfa6e59](https://github.com/Timothy-itayi/okta-iam-lifecycle-lab/commit/cfa6e59e6e91cc2fe43cd39e269dfc6e16a14007) (`Initial commit`). Second commit: [3634655](https://github.com/Timothy-itayi/okta-iam-lifecycle-lab/commit/36346555092085c32b607293b877bb90b55ccbb1) (`init repo`).
  - Created `docs/phases`, `docs/decisions`, `docs/runbooks`, `docs/incidents`, `docs/worklog`, `evidence`, `hr`, `rostr`, and `scripts`. The `docs` folders were first created with a trailing comma in the name and then renamed.
  - Added `.gitignore` so `Okta-IAM-Lifecycle-Lab-Runbook.pdf` is not committed. Not committed yet.
  - `README.md` is still the Phase 0 blurb. It does not yet have the phase table, the learning-lab line, or the AI-assistance line from task 0.1 step 3.
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
  - Wrote `hr/employees.json`: 7 active staff, Sales 3, Operations 2, Finance 2, one manager in each department. `jq -r '.[] | .email'` printed 7 `@lanternfieldgoods.co.uk` addresses. Not committed yet. The runbook commit message is `HR: initial 7 staff`.
