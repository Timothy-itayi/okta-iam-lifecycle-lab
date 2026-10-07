# Leave hub — 2. Data model

Date: 2026-10-08. Balances live in the HR file. Requests, reviews, events, and shifts live in Rostr. No leave screen exists yet.

## Balances

Every row in `hr/employees.json` has `leave.annual`, `leave.sick`, and `leave.personal`. The default is 15, 8, and 2. Priya Shah's annual balance is 2, so a later 3-day request fails the balance rule. `scripts/hr-sync` still classifies only department, title, manager, and leaver fields. A leave-only change produces no event. The test is in `scripts/hr-sync.test.js`.

## Rostr

`rostr/docker-compose.yml` mounts `../hr` at `/app/hr` read-only and sets `HR_FILE`. Startup logs Priya's annual balance from that file. It does not write the file.

`rostr/src/hr.js` reloads when the file's modified time changes. `rostr/src/leave-state.js` is the only allowed set of status moves: submitted, with the admin, with HR, approved or denied, and cancel from any open state. `rostr/src/db.js` creates `shifts`, `leave_requests`, `leave_reviews`, `leave_events`, and `balance_changes`.

`node scripts/seed-shifts.js` writes two weeks of weekday shifts, 09:00–17:00, from Monday 2026-10-12, for employees whose status is `active`. A second run does not duplicate a person and day. Terminated staff get no shifts.
