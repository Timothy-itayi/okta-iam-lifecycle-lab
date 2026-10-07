# Leave hub — 6. Jev review

Date: 2026-10-08, 04:39–04:45 Sydney. A saved request gets a policy result and, when the API answers, a recommendation beside it. Neither one approves the leave.

## What runs

`POST /leave` still saves first and still redirects. The next page opens a window: "This is being resolved", and which person has the request. It is not a toast, and it does not dismiss itself. `reviewLeave` runs after that commit. It does not call `transition`. Routing stays in `createLeaveRequest`: Priya's request is already `with_admin` before Jev is asked. Calling the move again would throw.

The policy check is `factsFor` plus `evaluate` on `rostr/policy/leave-rules.json`. The same request Priya can send, 20–22 October 2026, three working days against two annual days left, is `deny` for `insufficient_balance` and `needs_review` for `short_notice_annual`. The deny is the policy outcome. Both rule ids are stored.

Jev is one `systemOne` call on `@typesafe-ai/sdk`, model `jev-latest`. Questions are a recommendation (`approve`, `deny`, `needs_review`), the deciding rule, whether the written reason fits the leave type, and an urgency score. The call waits at most 5 seconds and does not retry.

The employee's reason is `state.request.reasonWrittenByEmployee`. It is not copied into the question instructions. The tests use a marker string and assert it is absent from the questions.

## What is stored

`leave_reviews` holds `policy_outcome`, the fired rule ids, and Jev's outcome, rule, confidence, probabilities, reason fit, urgency, model, and `agree`. `agree` is 1 when both outcomes exist and match, 0 when both exist and differ, and null when Jev did not answer. A missing model is not counted as a disagreement.

The SDK score starts at 0. The plan's scale is 1 "can wait" through 5 "same-day emergency". `jev_urgency` is `score + 1`.

`JEV_MIN_CONFIDENCE` defaults to 0.7. `jevIsSure` is true at 0.7 and above. A lower confidence is still stored. Phase 7 is the screen that says "Jev isn't sure" instead of showing that recommendation. 0.7 does not approve anything.

Two `leave_events` rows are added, actors `policy` and `jev`. On failure the Jev note is the status (`401`, `422`, `429`, `529`), `timeout`, or `no_key`. The response body is not written. Staff activity only lists `submitted`, `to_admin`, `to_hr`, `approve`, `deny`, and `cancel`, so Priya's detail page still says she sent it and that it went to Marcus.

## When Jev is down

No key, a 401, 422, 429, 529, or a timeout leaves the Jev columns null. The policy row is still there. The request status does not change, and the same window still opens. Staff are not told the error code. `rostr/index.js` builds the client only when `TYPESAFE_API_KEY` is set. Compose passes that name and `JEV_MIN_CONFIDENCE` through. The value stays in `rostr/.env`.

Tests stub the client. `npm test` does not call TypeSafe. Priya's over-balance case has not been sent through Okta.
