# Leave hub — 9. Drill setup

Date: 2026-10-08. The failure drills start from a known balance and a working Jev. Nothing is broken yet.

Priya Shah's annual balance is 2 again. REQ-0010 had taken it to 0 for LV-0002. That request stays approved, Thursday 22 to Friday 23 October. A new request must not overlap those two days. Five weekdays that do not overlap, for the first drill, are Monday 26 to Friday 30 October.

Open requests are what reduce the balance the form and the policy check use. Approved leave does not. With no other open annual request, five days against 2 left is a policy deny. The form still lets her send it.

Jev is on. The key is in `rostr/.env` and in the container. It is not in Git. `JEV_MIN_CONFIDENCE` is 0.7. To take Jev down later, set `TYPESAFE_API_KEY=wrong`, recreate the container from `rostr/`, and put the real key back when the drill is recorded. Do not commit `.env`.

The report calls the first drill incident 08. This repo already uses incident 08 for the FastPass sign-in. The drill write-ups will not overwrite that file.
