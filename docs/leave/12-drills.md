# Leave hub — 9. Drill setup

Date: 2026-10-08. The failure drills start from a known balance and a working Jev. Nothing is broken yet.

Priya Shah's annual balance is 2 again. REQ-0010 had taken it to 0 for LV-0002. That request stays approved, Thursday 22 to Friday 23 October. A new request must not overlap those two days. Five weekdays that do not overlap, for the first drill, are Monday 26 to Friday 30 October.

Open requests are what reduce the balance the form and the policy check use. Approved leave does not. With no other open annual request, five days against 2 left is a policy deny. The form still lets her send it.

Jev is on. The key is in `rostr/.env` and in the container. It is not in Git. `JEV_MIN_CONFIDENCE` is 0.7. To take Jev down later, set `TYPESAFE_API_KEY=wrong`, recreate the container from `rostr/`, and put the real key back when the drill is recorded. Do not commit `.env`.

The report calls the first drill incident 08. This repo already uses [docs/incidents/08-rostr-sign-on.md](../incidents/08-rostr-sign-on.md) for the FastPass sign-in. The leave drill is [docs/incidents/08-jev-talked-into-it.md](../incidents/08-jev-talked-into-it.md). It does not replace that file.

LV-0003 is with Marcus. Jev and the policy check both denied. The next three drills are set up for live shots: [09](../incidents/09-wrong-department.md) the department filter is off, [10](../incidents/10-leaver-open-request.md) a SCIM deactivation cancels open leave, [11](../incidents/11-hr-group-claim.md) the SAML group filter is still `APP-Rostr` and has to be changed by hand.
