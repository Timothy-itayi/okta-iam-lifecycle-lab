# Stale access and unused licences

Generated 2026-10-07T02:49:41.981Z. Rostr `lastLogin` older than 30 days is stale.
This script does not change `hr/employees.json` and does not deactivate anyone.

## Plant

jonah.hale@lanternfieldgoods.co.uk `lastLogin` was `2026-10-06T05:20:26.829Z`.
Shifted by −45 days to `2026-08-22T05:20:26.829Z`. `licensed` set to 1 on that row and on orphan.roster@example.invalid.
Rostr never sets `licensed` itself. Sign-in does not grant a seat. The two seats were marked so the licence comparison is not vacuously zero.

## Counts

| Measure | Count |
| --- | --- |
| HR active staff | 7 |
| Rostr active rows | 8 |
| Rostr licensed seats | 2 |
| Stale lastLogin (≥ 30 days) | 1 |
| Licensed and unused (stale or not in HR) | 2 |

HR active is 7. Licensed seats are the two planted rows. The extra Rostr active row is Orphan Roster, who is not in the HR file.

## Findings

| user | last sign-in | licence held | recommendation | why |
| --- | --- | --- | --- | --- |
| ava.nguyen@lanternfieldgoods.co.uk | (never) | no | confirm with manager | never signed in; no licence; in HR; rostr active |
| helen.cho@lanternfieldgoods.co.uk | (never) | no | confirm with manager | never signed in; no licence; in HR; rostr active |
| jonah.hale@lanternfieldgoods.co.uk | 2026-08-22T05:20:26.829Z | yes | reclaim | stale lastLogin; licensed; in HR; rostr active |
| lena.ortiz@lanternfieldgoods.co.uk | (never) | no | confirm with manager | never signed in; no licence; in HR; rostr active |
| marcus.bell@lanternfieldgoods.co.uk | (never) | no | confirm with manager | never signed in; no licence; in HR; rostr active |
| orphan.roster@example.invalid | (never) | yes | reclaim | never signed in; licensed; not in HR active; rostr active |
| priya.shah@lanternfieldgoods.co.uk | (never) | no | confirm with manager | never signed in; no licence; in HR; rostr active |
| samir.adeyemi@lanternfieldgoods.co.uk | (never) | no | reclaim | never signed in; no licence; not in HR active; rostr inactive |
| test.joiner@lanternfieldgoods.co.uk | (never) | no | reclaim | never signed in; no licence; not in HR active; rostr inactive |
| thomas.okeke@lanternfieldgoods.co.uk | (never) | no | confirm with manager | never signed in; no licence; in HR; rostr active |

Jonah Hale is the planted stale account. Recommendation: **reclaim**.

