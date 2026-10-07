# SCIM department missing on create

Date: 2026-10-07, 17:35–18:01 Sydney. Drill 6.4. Not closed. Rostr's create route was changed so a user with no department returned 400, the department mapping was removed, and `drill.scim@lanternfieldgoods.co.uk` was created in Okta with department `Sales`. The refusal is in the log. The later create is not a fix: Okta marked it successful, and the body still had no department.

## What we saw

Drill Scim landed on Rostr → Assignments with a red mark. System Log `application.provision.user.push` at `2026-10-07T06:44:14.247Z` failed. The reason was `Bad Request. Errors reported by remote server: department is required`.

[evidence/6.4-drill-scim-error.png](../../evidence/6.4-drill-scim-error.png)

`logs/scim.jsonl` at `2026-10-07T06:44:14.139Z` is `POST /scim/v2/Users`, status 400, `scimType` `invalidValue`, detail `department is required`. The body had `userName`, `name`, and `emails`. `schemas` was only `urn:ietf:params:scim:schemas:core:2.0:User`. Okta user id `00u18gcp8vmAocAtp698`.

## Where we looked

The Okta profile, read from the API after the retry, has `department` `Sales`. He is in `DEPT-Sales` and `APP-Rostr-Users`. The mapping table then showed `user.department`, Apply on create and update, with no quotes.

[evidence/6.4-department-mapping.png](../../evidence/6.4-department-mapping.png)

The Assignments tab no longer shows an error on his row.

[evidence/6.4-assignments-no-error.png](../../evidence/6.4-assignments-no-error.png)

## Cause

The 400 is the missing mapping. Rostr was refusing a create whose body had no enterprise `department`. That check was only on the running container. `rostr/src/scim.js` in git does not contain it, and it was taken off the container before the retry.

The retry is a different fact. At `2026-10-07T07:00:21.831Z` the same `POST` returned 201. Rostr id `e4aaf631-250f-4fe8-b8c0-3df1394665f2`. The request body matches the failed one: no enterprise extension, no department. System Log `application.provision.user.push` at `07:00:21.683Z` is SUCCESS, and `app.user_management.push_new_user_success` followed it. Okta treats a 201 as the push working. It does not check that a mapped attribute was in the body.

A group `PUT` at `07:00:26.286Z` added that Rostr id to `APP-Rostr-Users`. Membership pushed. Department did not.

## Fix

Not done. The mapping row is back on the screen. The create that Okta accepted did not use it. Deactivate Users, Create Users, and Update User Attributes were left ticked. Drill Scim is still active, which fills the last user slot.

## Check

Still open. The next write for this user has to be a `PUT /Users/e4aaf631-250f-4fe8-b8c0-3df1394665f2` whose body includes `urn:ietf:params:scim:schemas:extension:enterprise:2.0:User` and `department` `Sales`. A 201 with no department does not close this drill.

## Do this next time

The Assignments tab going quiet means Rostr returned a success status. Read `logs/scim.jsonl` for the attribute that was supposed to move. Okta will not.
