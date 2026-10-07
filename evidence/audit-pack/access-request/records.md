# Access Request records — REQ-0001

Ticket `357784`. Lab id `REQ-0001`. Requester Lena Ortiz (`lena.ortiz@lanternfieldgoods.co.uk`, EMP-1005). Resource `APP-Rostr-Admins` (`00g18dk6nvdMFQAgi698`) for one hour. Approver Marcus Bell (EMP-1004), recorded as an Internal Note. Mail is not configured, so Marcus did not receive the request in his inbox.

osTicket is the ticket, not the provisioner. Fulfilment is a POST to the Access Request Workflows endpoint. `hr-sync` is not used. `hr/employees.json` does not change.

## What exists

| Record | Clock (Sydney, 2026-10-07) | File |
| --- | --- | --- |
| Staff login `/scp` as Admin | 12:15 | [5.1-osticket-staff-login.png](../../5.1-osticket-staff-login.png) |
| Help topic Access Request, Active, Public | 12:24 | [5.1-osticket-help-topics.png](../../5.1-osticket-help-topics.png) |
| Open ticket `357784`, From Lena Ortiz | 12:27 | [5.1-osticket-ticket-list.png](../../5.1-osticket-ticket-list.png) |
| Internal Note: Marcus Bell approved | 12:28 | [5.1-osticket-approval.png](../../5.1-osticket-approval.png) |
| Flow canvas: add, Close, Wait For 1 hour, remove | 12:57 | [5.2-access-request-flow-left.png](../../5.2-access-request-flow-left.png), [5.2-access-request-flow-right.png](../../5.2-access-request-flow-right.png) |
| System Log `group.user_membership.add` SUCCESS | 13:06:18 | [5.2-system-log-group-add.png](../../5.2-system-log-group-add.png) |
| Lena in `APP-Rostr-Admins`, Managed Manually | 13:07 | [5.2-lena-in-app-rostr-admins.png](../../5.2-lena-in-app-rostr-admins.png) |
| OIDC `/me` includes `APP-Rostr-Admins` | 13:19 | [5.2-lena-oidc-me.png](../../5.2-lena-oidc-me.png) |
| `/admin/users` 200 as Lena | 13:23 | [5.2-lena-admin-users.png](../../5.2-lena-admin-users.png) |
| Rostr Admin assigned to `APP-Rostr-Admins` | 13:23 | [5.2-rostr-admin-group-assignment.png](../../5.2-rostr-admin-group-assignment.png) |

Actor on the add event is Timothy Itayi via the Workflows Okta connection, not Marcus. Marcus approved the ticket. The flow granted the group.

## Remove

`group.user_membership.remove` for Lena Ortiz / `APP-Rostr-Admins` is in [../system-log-group-membership.jsonl](../system-log-group-membership.jsonl) at `2026-10-07T03:06:20.435Z` (14:06:20 Sydney). Actor display name is Timothy itayi, client IP `35.82.175.79` (Workflows), same pattern as the add at `02:06:18Z`. One hour, to the second.

## Still not in this pack

Workflows History URL on the ticket, and ticket `357784` Closed. Screenshots still needed: `evidence/5.2-flow-history.png`, `evidence/5.2-system-log-group-remove.png`, `evidence/5.2-ticket-closed.png`.
