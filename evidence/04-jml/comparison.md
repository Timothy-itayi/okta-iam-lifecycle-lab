# REQ-0006 mover and leaver

HR commit [1e632bb](https://github.com/Timothy-itayi/okta-iam-lifecycle-lab/commit/1e632bb) (`HR: move Priya Shah to Operations and terminate Samir Adeyemi`). Dry run: `mover EMP-1003 department,title,managerId` and `leaver EMP-1007 status`. Thomas Okeke is not in this diff. He was already applied as REQ-0004, and he is in both CSVs.

`before.csv` was taken while Priya was in `DEPT-Sales` and Samir was `ACTIVE`. `after.csv` was taken after Priya's move and Samir's deactivation.

## What changed

| Person | HR change | Okta | Rostr |
| --- | --- | --- | --- |
| Priya Shah, EMP-1003 | Sales to Operations, title `Operations Analyst`, manager `EMP-1004` | `user.account.update_profile` at `14:41:06.052Z`. `DEPT-Sales` removed, `DEPT-Operations` added. Still `APP-Rostr-Users`, still `ACTIVE`. | `PUT /scim/v2/Users/7c6e64c3-b1b4-4e29-a0c6-d475e1006f43` at `14:41:07.509Z`, 200, title `Operations Analyst`, department `Operations`, `active` true. |
| Samir Adeyemi, EMP-1007 | `status` terminated, `endDate` 2026-10-07 | `user.lifecycle.deactivate` SUCCESS at `15:12:13.550Z`. Status `DEPROVISIONED`. Rostr app assignment removed at `15:12:13.535Z`. Still in `DEPT-Finance`, `APP-Rostr-Users`, and `Everyone`. Active user count 10 to 9. | `PUT /scim/v2/Users/3b9b6859-19a1-4f1c-abed-92e04406b470` at `15:12:22.899Z`, 200, `active` false. `rostr.sqlite` has `active` 0. |

`after.csv` differs from `before.csv` in those two places. Priya's department group is `DEPT-Operations`. Samir's status is `DEPROVISIONED`, and his Rostr app row is gone. His three group rows remain. No row in either file has source `individual`.

A second Leaver call on Samir returned HTTP 200 in 1.4 seconds. No new System Log event. No new SCIM line. He stayed `DEPROVISIONED`. Rostr stayed `active` 0.

## How the events were sent

The Mover update came from `node scripts/hr-sync --ticket REQ-0006 --apply`. That command then returned HTTP 504 after about 61 seconds, because the Mover flow's Wait For card is 60 seconds. `logs/jml.csv` has no REQ-0006 row. The Leaver post never left the script.

The Leaver was then called directly, twice, after the flow was saved at `15:11:23.127Z`. Screenshots: [evidence/4.5-leaver-flow.png](../4.5-leaver-flow.png), [evidence/4.5-leaver-true-branch.png](../4.5-leaver-true-branch.png). The first of those two calls is the deactivation in the table above. Two earlier calls, at `14:42:51Z` and `14:42:53Z`, only cleared sessions, because Deactivate User was not in the saved flow yet.

## App source

Group source is `rule` or `built-in`, from the group rules API. App source is `unknown` on every row. `GET /api/v1/apps/{appId}/users/{userId}` returned 403 for `svc-jml-sync`. That app has no app scope. The Assignments tab remains the evidence that Rostr is assigned by group.
