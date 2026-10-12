# Wrong department can see the queue

Previous: [Jev was not talked into it](08-jev-talked-into-it.md).

Date: 2026-10-12. The switch was turned on for a live shot on 8 October. Ava Nguyen did not sign in. The before and after is the test, which is the same check the queue already had.

## Expected

With `ROSTR_CROSS_DEPARTMENT=1`, Ava Nguyen (Sales, `APP-Rostr-Admins`) sees Priya Shah's Operations request on Team requests and can open it.

With the variable unset, Team requests lists only her department, and the detail route returns 404, "That request is not in your department."

## Result

There is no screenshot of Ava's browser. The live container had the variable set from the 8 October rebuild so that shot could be taken. It was not taken.

The test `another department sees the queue only while the drill switch is on` is written for both sides: Ava's queue does not list Priya while the variable is unset, and the detail is 404; with the variable set to `1`, the queue lists her and the detail is 200. This session's test runner stalled on a file read and did not print a pass. I am not calling that test green.

The variable is empty in `rostr/.env` and in the recreated container. `GET /health` returned 200. Recreating the container drops in-memory sessions.

## Cause

The list and the detail both read the same variable. Forgetting to clear it after a screenshot would leave every admin able to open every department.

## Fix

`ROSTR_CROSS_DEPARTMENT` is empty. The route is `listLeaveByDepartment` again.

## Do this next time

Shoot Ava, then clear the variable in the same sitting. A rebuild drops in-memory sessions.
