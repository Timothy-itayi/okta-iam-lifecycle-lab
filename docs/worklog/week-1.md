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
