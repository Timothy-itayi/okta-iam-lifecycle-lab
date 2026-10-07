# Leave hub — 7. Manager queue

Date: 2026-10-08, 05:09–05:17 Sydney. Priya can open a request again after she sends it. Marcus can see that request and decide it. HR still cannot.

## Staff

Each open request on My leave is a card. The card shows the reference, the dates, and the chain: Sent, Manager, HR, Done. The current step is marked. The card links to the same detail page as before.

The section mark sits under the tab for the page you are on. It no longer draws across the date line. Buttons do not take an underline.

## Manager

`GET /admin/leave` lists the department. Waiting is `with_admin`. Decided is everything else. Oldest waiting first. A row opens `GET /admin/leave/:ref`.

The decision page shows the reason, the balance and notice, Jev's stored recommendation, and the policy check. Approve moves the request to HR. Deny needs a note. A manager cannot decide their own request. The confirmation is the same window as a staff request, not a toast.

The week grid and the "flag Jev" form from the design spec are not on this page. Helen's HR desk is still the placeholder.

Priya's LV-0002 was already `with_admin` when this was built. It stays in the database. Marcus sees it after he signs in again.
