# Leave hub — 7. Manager queue

Date: 2026-10-08, 05:09–05:17 Sydney. Priya can open a request again after she sends it. Marcus can see that request and decide it. HR still cannot.

## Staff

Each open request on My leave is a card. The card shows the reference, the dates, and the chain: Sent, Manager, HR, Done. The current step is marked. The card links to the same detail page as before.

The section mark sits under the tab for the page you are on. It no longer draws across the date line. Buttons do not take an underline.

## Manager

`GET /admin/leave` lists the department. Waiting is `with_admin`. Decided is everything else. Oldest waiting first. A row opens `GET /admin/leave/:ref`.

The decision page shows the reason, the balance and notice, Jev's stored recommendation, and the policy check. Approve moves the request to HR. Deny needs a note. A manager cannot decide their own request. The confirmation is the same window as a staff request, not a toast.

The week grid and the "flag Jev" form from the design spec are not on this page. Helen's HR desk is still the placeholder.

## Live

Priya Shah sent LV-0002 at 05:04 Sydney on 8 October 2026. Annual leave, Thursday 22 to Friday 23 October, two working days, reason "R&R". The policy check was `within_policy` / approve. Jev returned approve at confidence 1, urgency 1.79 of 5. They agree.

Marcus Bell opened it from Team requests and approved it at 05:19. The window said "Sent to HR" and "Approved. LV-0002 is with HR." The row is now `with_hr`. The event actor is `marcus.bell@lanternfieldgoods.co.uk`, action `to_hr`, at `2026-10-07T18:19:08.463Z`.

[evidence/leave/07-marcus-lv0002-sent.png](../../evidence/leave/07-marcus-lv0002-sent.png), [evidence/leave/07-marcus-lv0002-decision.png](../../evidence/leave/07-marcus-lv0002-decision.png).
