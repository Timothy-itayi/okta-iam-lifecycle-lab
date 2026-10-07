# Leave hub — 5. Policy engine

Date: 2026-10-08, 04:25–04:38 Sydney. The hard rules are data. `evaluate` reads them. Jev does not run yet, and a person can still send a request the rules would deny.

## The file

`rostr/policy/leave-rules.json`, version 1.

| Rule | Outcome | When it fires |
| --- | --- | --- |
| `inactive_employee` | deny | HR status is not `active`, or the Rostr user is missing or inactive |
| `insufficient_balance` | deny | Working days are more than the remaining balance for that type |
| `short_notice_annual` | needs review | Annual leave, and the start is fewer than `params.minDays` (14) calendar days from today |
| `cover_conflict` | needs review | On any weekday of the request, at least `params.maxOffPerDept` (1) other person in the department is already `with_hr` or `approved` |
| `long_sick` | needs review | Sick leave of more than `params.days` (3) working days |
| `within_policy` | approve | None of the above fired |

A deny beats a needs-review. Both are returned. `within_policy` is added only when nothing else fired. The text on each rule is what phase 6 will hand to Jev.

Cover ignores `submitted`, `with_admin`, `denied`, and `cancelled`. A request still sitting with the manager is not treated as someone being off. The requester's own leave is not cover against themselves. Remaining balance is the HR file figure minus that person's other open requests of the same type.

`rostr/src/policy.js` exports `evaluate(request, facts, rules)` and `factsFor(db, hr, request, { today })`. `factsFor` reads the HR file, the Rostr user, and `listCoverRequests`. Passing a different rules object changes the outcome without changing the function. The tests raise `minDays` to 21 and `maxOffPerDept` to 2 to prove that.

## What did not change

`POST /leave` still saves the request and still shows the amber notices. It does not call `evaluate`. Phase 4 said the review must not block the person. Phase 6 is the runner that stores the policy result next to Jev's.

The 14-day notice on the form is no longer a constant in `leave.js`. The form and the engine both read `short_notice_annual.params.minDays` from the JSON file. The Dockerfile copies `policy/` into the image. Without that copy, opening the form would throw.

Priya's 3-day annual request, with 2 days left and Jonah already approved on those dates, is a deny for balance and a needs-review for cover. The deny wins. That case is in `rostr/test/policy.test.js`. It has not been sent through Okta.
