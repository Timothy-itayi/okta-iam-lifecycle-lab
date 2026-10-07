# Mover leaves a manual admin grant

Date: 2026-10-07, 18:09–18:17 Sydney. Drill 6.5. Jonah Hale, EMP-1002, was moved from Sales to Operations. He had been added to `APP-Rostr-Admins` by hand before the move. The Mover flow does not remove that membership. Group rules moved the department group and left the admin grant in place.

## What we saw

The Mover canvas is API Endpoint, Read User, Get User Groups, Update User, and Wait For. There is no card that removes an individual app assignment, and none that removes a group. The flow was left as it was, and it was left on.

`hr/employees.json` changed only Jonah's `department`, from `Sales` to `Operations`, in `b2b36a1`. The dry-run was one line: `mover EMP-1002 department`.

`--apply` for `REQ-0007` returned HTTP 504 after 61 seconds. The Wait For card is 60 seconds. `logs/jml.csv` has no REQ-0007 row. The script writes that file only after the POST returns OK.

## Where we looked

After the 504, the API showed Jonah `ACTIVE`, department `Operations`, title `Account Executive`, manager `EMP-1001`. Groups were `Everyone`, `DEPT-Operations`, `APP-Rostr-Users`, and `APP-Rostr-Admins`. `DEPT-Sales` was gone.

`logs/scim.jsonl` at `2026-10-07T07:14:40.069Z` is `PUT /Users/810dde51-dd11-41ac-afda-5400f831d908`, status 200, `title` `Account Executive`, enterprise `department` `Operations`, `active` true.

The entitlements export at that point has his `APP-Rostr-Admins` row as source `individual`. `APP-Rostr-Users` and `DEPT-Operations` are `rule`.

[evidence/06-mover-residue.csv](../../evidence/06-mover-residue.csv)

The admin group had been pushed to Rostr when he was added, `PUT` at `07:09:30.149Z` with one member, `jonah.hale@lanternfieldgoods.co.uk`.

## Cause

Get User Groups reads the list. It does not change it. Department rules replace `DEPT-Sales` with `DEPT-Operations` because those groups are ruled on `department`. `APP-Rostr-Admins` was assigned on the group page, so the rule that fills it from an approved request does not own this membership, and a department change does not drop it. A mover that only writes the profile will leave that grant behind.

## Fix

Directory → Groups → `APP-Rostr-Admins` → People → Jonah Hale → remove. `DEPT-Operations` and `APP-Rostr-Users` were not touched. The flow was not edited.

[evidence/6.5-jonah-removed.png](../../evidence/6.5-jonah-removed.png)

## Check

The group members API returned an empty list. Jonah's groups are `Everyone`, `DEPT-Operations`, and `APP-Rostr-Users`. No row in the second export is `APP-Rostr-Admins`.

[evidence/06-mover-residue-after.csv](../../evidence/06-mover-residue-after.csv)

`PUT /Groups/6e95185e-5563-4d6c-9422-bf8723cf269f` at `2026-10-07T07:17:38.677Z` returned 200 with `members` `[]`. He stays in Operations. The group is empty again.

## Do this next time

A department move proves the department rules. It does not prove that every group on the user came from a rule. Read the Managed column, or the entitlements `source` field, before calling the mover finished. `individual` is a grant the flow did not touch.
