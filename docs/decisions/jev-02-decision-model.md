# Jev 02 — Decision model

Previous: [Jev 01 — Leave workflow](jev-01-leave-workflow.md).

Decision date: 2026-10-08

Jev is a decision model from TypeSafe. It is used here because a leave request is a judgment with a written reason, not a group-rule calculation. The model reads the request, the leave policy, and the employee's facts, and it returns approve, deny, or needs review, plus the rule it used and a confidence score.

## What Jev is allowed to do

Jev recommends. It never approves and it never denies. The department admin and then HR make those calls. Plain code checks the hard rules at the same time: balance, notice, cover, and whether the person is still employed. The admin sees both results. If they disagree, the person still decides. The disagreement is logged.

The JavaScript package is `@typesafe-ai/sdk`. It is installed. `POST /leave` saves the request, then `reviewLeave` runs the policy check and one `systemOne` call. The model is `jev-latest`. The call times out after 5 seconds and does not retry. The runner does not move the request. `createLeaveRequest` already sent it to the department admin, or to HR when there is no other admin.

## What leaves the machine

The request text is sent to TypeSafe's API. The staff are fictional and the leave reasons will be fictional. That is acceptable in this lab. A real company sending employee text to that API needs a data processing agreement before it does so. This note is not that agreement.

`TYPESAFE_API_KEY` is set in `rostr/.env`. The value is not in Git. The name is in [rostr/.env.example](../../rostr/.env.example).

## Confidence

`JEV_MIN_CONFIDENCE` defaults to 0.7. The name is in [rostr/.env.example](../../rostr/.env.example). `jevIsSure` is true when confidence is at least that number. Phase 7 shows the recommendation only then. Below it, the screen says Jev isn't sure and the person uses the policy check. 0.7 is a display gate. It is not a permission to auto-approve. Leave decisions stay with people. The number is high enough to hide a coin-flip and low enough that a fairly sure recommendation still appears.

## Urgency

The SDK score starts at 0. The scale this lab uses is 1 "can wait" through 5 "same-day emergency". `jev_urgency` stores `score + 1`. The five labels, in order, are: Can wait; Soon, not this week; This week; Next couple of days; Same-day emergency.

## The reason

The text the employee wrote is one field on the state, `reasonWrittenByEmployee`. Question instructions are fixed strings. The reason is not interpolated into them.

`agree` is 1 when the policy outcome and Jev's outcome both exist and match, 0 when both exist and differ, and null when Jev did not answer. A missing model is not a disagreement.

## When the API is down

The policy check still runs and is stored. Jev's columns stay empty. A `leave_events` row records `401`, `422`, `429`, `529`, `timeout`, or `no_key`. The response body is not logged, and neither is the key. The request stays where it was. A missing recommendation is not a denial and not an approval. The admin can still decide.
