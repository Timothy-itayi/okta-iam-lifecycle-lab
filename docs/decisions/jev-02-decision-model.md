# Jev 02 — Decision model

Previous: [Jev 01 — Leave workflow](jev-01-leave-workflow.md).

Decision date: 2026-10-08

Jev is a decision model from TypeSafe. It is used here because a leave request is a judgment with a written reason, not a group-rule calculation. The model reads the request, the leave policy, and the employee's facts, and it returns approve, deny, or needs review, plus the rule it used and a confidence score.

## What Jev is allowed to do

Jev recommends. It never approves and it never denies. The department admin and then HR make those calls. Plain code checks the hard rules at the same time: balance, notice, cover, and whether the person is still employed. The admin sees both results. If they disagree, the person still decides. The disagreement is logged.

The JavaScript package named for this is `@typesafe-ai/sdk`. It is not installed in this phase.

## What leaves the machine

The request text is sent to TypeSafe's API. The staff are fictional and the leave reasons will be fictional. That is acceptable in this lab. A real company sending employee text to that API needs a data processing agreement before it does so. This note is not that agreement.

`TYPESAFE_API_KEY` is set in `rostr/.env`. The value is not in Git. The name is in [rostr/.env.example](../../rostr/.env.example).

## When the API is down

The code checks still run. They do not call Jev. The recommendation is absent, and the screen has to say so. The admin can still approve or deny. A missing recommendation is not a denial and not an approval.
