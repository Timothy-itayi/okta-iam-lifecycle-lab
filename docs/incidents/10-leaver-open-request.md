# Leaver with an open request

Previous: [Wrong department can see the queue](09-wrong-department.md).

Date: 2026-10-12. The cancel hook was already in the SCIM write. This drill was not run through the Leaver workflow, and Priya Shah was not deactivated. LV-0003 is still the incident 08 evidence.

## Expected

The existing Leaver workflow deactivates the Okta user. With Deactivate Users on for the Rostr SAML app, Okta writes `active` false over SCIM. Rostr then cancels that person's open leave (`submitted`, `with_admin`, `with_hr`). The event actor is `scim`, action `cancel`, note "Deactivated in Rostr". Approved leave stays approved. A second deactivation finds nothing open.

That is the same path as [the downstream leaver](07-leaver-downstream.md). There, the first run missed the SCIM write because Deactivate Users was off. The retry wrote `active` false. This drill adds the cancel on top of a write that already works.

## Result

`PUT` and `PATCH` in `rostr/src/scim.js` both call `cancelOpenLeave` when `active` goes from true to false. The test `deactivating a user cancels their open leave` asserts that a throwaway user's LV-0099 moves to `cancelled` and the last event is actor `scim`, action `cancel`. This session's runner stalled before that test printed, so I am not calling it green.

No System Log row was captured for this drill. No live user was deactivated. The workflow half is the incident 07 result, not a new run.

## Cause

A leaver who still has `with_admin` or `with_hr` would sit in someone's queue after the account was gone. The cancel is on the SCIM write, so a hand edit in Rostr is not required and a sixth workflow is not required.

## Fix

No further change. Deactivate Users stays on. Do not add a leave card to the Leaver flow.

## Do this next time

If a live shot is still wanted, send a request as Jonah Hale and run the Leaver workflow on him. Do not use Priya while LV-0003 is open.
