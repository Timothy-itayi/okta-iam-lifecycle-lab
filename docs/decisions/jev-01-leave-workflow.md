# Jev 01 — Leave workflow

Previous: [OIG mapping](oig-mapping.md).

Decision date: 2026-10-08

This is a stretch on the finished lab. It does not replace the joiner, mover, and leaver path. Leave is a new workflow inside Rostr. Okta still decides who can open it.

## Approval chain

A department admin approves first. HR approves second, for every department. Jev recommends. Jev does not approve. The hard rules (balance, notice, cover, employment status) are code. The person sees the recommendation and the code result side by side and makes the call.

## Who is HR

One existing user. Helen Cho, EMP-1006, Finance, is the HR approver for Sales, Operations, and Finance. No eighth employee is added. The 10-user cap still applies.

Helen cannot approve her own leave. Those requests stay at "needs HR" and are shown to the break-glass admin. That is a gap we are keeping, not a user we are adding.

## Groups

Membership is assigned by hand in the Admin Console. This trial does not include Okta Identity Governance Access Requests. The earlier Access Request workflow granted `APP-Rostr-Admins` for one hour and then removed it. Leave access is a standing grant, so that flow is not reused. No new Workflow is created. The five-flow budget stays where it is.

| Group | Who | What they will see, once the hubs exist |
| --- | --- | --- |
| `APP-Rostr-Users` | Priya Shah, Jonah Hale, Lena Ortiz, and the other staff already in it by rule | Own leave requests |
| `APP-Rostr-Admins` | Marcus Bell (Operations) and Ava Nguyen (Sales), added by hand on 8 October | Pending requests for their own department |
| `APP-Rostr-HR` | Helen Cho, added by hand on 8 October | Admin-approved requests for every department |

Department is the value Okta already sends to Rostr over SCIM. It is not hard-coded in the leave screens.

Samir Adeyemi and Thomas Okeke are terminated. They are not in these groups. A later phase has to show they cannot request leave.

## HR file

`hr/employees.json` stays the source of truth for leave balances. Rostr will read it. Writing an approval back into that file is a later phase. This decision does not add the `leave` fields yet.

## Cast

| Person | Department | Role in this stretch |
| --- | --- | --- |
| Priya Shah, EMP-1003 | Operations | Main requester |
| Jonah Hale, EMP-1002 | Operations | Second requester, for a cover clash |
| Lena Ortiz, EMP-1005 | Operations | Third requester |
| Marcus Bell, EMP-1004 | Operations | Operations admin |
| Ava Nguyen, EMP-1001 | Sales | Sales admin, including the wrong-department drill |
| Helen Cho, EMP-1006 | Finance | HR approver for every department |
