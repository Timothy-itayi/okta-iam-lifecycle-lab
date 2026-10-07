# Leaver with an open request

Previous: [Wrong department can see the queue](09-wrong-department.md).

Date: 2026-10-08. A SCIM deactivation now cancels that person's open leave. The live proof has not been shot.

## What the code does

`PUT` or `PATCH /scim/v2/Users/:id` that changes `active` from true to false calls `cancelOpenLeave`. Each open request (`submitted`, `with_admin`, `with_hr`) moves to `cancelled`. The event actor is `scim`, action `cancel`, note "Deactivated in Rostr". Approved leave is left as it is. A second deactivation finds nothing open.

## How to shoot it

Do not deactivate Priya Shah while LV-0003 is the incident 08 evidence. Pick someone else who has an open request, or send one as Jonah Hale first. Deactivate that Okta user with Deactivate Users still on for the Rostr SAML app. Okta should `PATCH` or `PUT` `active` false.

Then, as a manager or as HR, open the request. The chain should show it cancelled, and `leave_events` should have actor `scim`.

The test is `deactivating a user cancels their open leave` in `rostr/test/scim.test.js`.
