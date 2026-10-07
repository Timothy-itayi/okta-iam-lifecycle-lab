# Wrong department can see the queue

Previous: [Jev was not talked into it](08-jev-talked-into-it.md).

Date: 2026-10-08. The department filter is off on the live container so the broken queue can be shot. The code path is still the filtered one when the switch is empty.

## What is live

`ROSTR_CROSS_DEPARTMENT=1` in `rostr/.env`. Team requests lists every department, and an admin can open a request that is not theirs. Ava Nguyen is Sales and `APP-Rostr-Admins`. Priya Shah's LV-0003 is Operations, `with_admin`.

Sign in as Ava in a new session. Team requests should show LV-0003. Open it. That is the broken state.

## Where the filter is

`GET /admin/leave` uses `listLeaveByDepartment` unless that variable is `1`, in which case it uses `listAllLeave`. The detail route returns 404 for another department unless the same variable is set. Tests do not set it, so they still expect the 404.

## After the screenshots

Set `ROSTR_CROSS_DEPARTMENT` empty and recreate the container from `rostr/`. Do not leave the switch on.
