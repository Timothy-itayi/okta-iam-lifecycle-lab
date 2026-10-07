# Leaver leaves Rostr active

Date: 2026-10-07, 18:21–18:26 Sydney. Drill 6.6. Deactivate Users was turned off on the Rostr SAML app, then Thomas Okeke, EMP-1008, was terminated from the HR file. Okta deactivated him. Rostr stayed active until Deactivate Users was turned back on and he was deactivated a second time.

## What we saw

Provisioning → To App had Create Users and Update User Attributes ticked. Deactivate Users was not.

[evidence/6.6-deactivate-users-off.png](../../evidence/6.6-deactivate-users-off.png)

`hr/employees.json` changed only his row, in `fdacc1d`: `status` `terminated`, `endDate` `2026-10-07`. The dry-run was one line: `leaver EMP-1008 status`. `--apply` for `REQ-0008` returned in about 4 seconds. `logs/jml.csv` has `2026-10-07T07:22:37.812Z,REQ-0008,leaver,EMP-1008`.

## Where we looked

The API showed Thomas `DEPROVISIONED`, Okta user `00u18f077u3WXcjuY698`. He was still in `Everyone`, `DEPT-Operations`, and `APP-Rostr-Users`.

Rostr id `bd5b32ef-eccb-4b1a-af38-fdae04c82da1` was read back `active` true, title `Operations Coordinator`, department `Operations`. `logs/scim.jsonl` has no Okta write for him between the leaver and the later reactivation. The last Okta call before that was `GET /Users?startIndex=1&count=2` at `07:20:59.640Z`, which is the provisioning page being saved. A `GET` at `07:23:06.393Z` is `userAgent` `node`. That was a check from this repo, not Okta.

## Cause

Deactivate Users is the switch that tells Okta to push `active: false` when the Okta user is deactivated or the app assignment is removed. With it off, the Leaver flow still clears sessions and deactivates the directory user. Rostr is a separate account, and nothing in that flow writes to it except through SCIM. The first deactivation had already happened, so turning the checkbox back on did not replay it.

## Fix

Deactivate Users was ticked again and the page saved. `GET /Users?startIndex=1&count=2` at `07:24:54.705Z` is that save. Thomas was activated in Directory, not deleted. Okta then sent `PUT /Users/bd5b32ef-eccb-4b1a-af38-fdae04c82da1` at `07:25:13.946Z` with `active` true. He was `PROVISIONED`. He was deactivated again from Directory.

## Check

The same id at `2026-10-07T07:26:41.087Z` returned 200 with `active` false. Title and department were still on that body. The API shows him `DEPROVISIONED`. The row is still in Rostr, inactive. Create Users, Update User Attributes, and Deactivate Users are on. `rostr/src/scim.js` matches git.

## Do this next time

A deactivated directory user is not a deactivated app account. Read the downstream row before closing a leaver. If Deactivate Users was off, the missed push does not catch up on its own. The account has to be activated and deactivated again while the checkbox is on.
