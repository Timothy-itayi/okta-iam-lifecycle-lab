# Jev is down

Previous: [HR group dropped from the sign-in](11-hr-group-claim.md).

Date: 2026-10-12. The live key was not replaced. The failure behaviour is already what the request path does when the client throws.

## Expected

A staff member can still send a request. The policy check is stored. Jev's columns stay empty. `agree` is null. The request stays with the manager. The event is actor `jev`, action `jev_unavailable`, and the note is the status code (`401`, `422`, `429`, `529`) or `timeout`. The response body is not logged. The page can still say Jev is unavailable. A wrong `TYPESAFE_API_KEY` is one way to get the 401. `no_key` is the same shape when the client is missing.

## Result

The Jev tests post a request with a client that throws each of those errors. Status stays `with_admin`. `policy_outcome` is deny for that fixture. `jev_outcome`, `jev_confidence`, `agree`, and `model` are null. The event note is the code, and it does not contain the failure body.

The container was not recreated with a bad key. Recreating it would drop every session, and a failed restore would leave recommendations off. The key stays the one already in `rostr/.env`. It is not in Git.

## Cause

The recommendation is a side write after the request is saved. A down model is not a reason to refuse the form or to invent an outcome.

## Fix

No change. Do not retry inside the request. The caller already sets `maxRetries` to 0.

## Do this next time

If a live 401 is required, set the key to a wrong value, recreate from `rostr/`, send one request, record the event note, and put the real key back in the same sitting.
