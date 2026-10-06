# SCIM lifecycle pairs

Each action is one Okta System Log event next to the `logs/scim.jsonl` line it produced. Okta time is UTC in the log and +1100 in the Admin Console.

System Log rows carry a source IP, so the fields are copied as text. Those screenshots stay out of the repo, the same as phase 1 and 2.

## Baseline before 3.6

Taken 2026-10-06T09:10Z, before any lifecycle action.

- `logs/scim.jsonl` has 8 lines. The last is `GET /scim/v2/Users?startIndex=1&count=2` at `2026-10-06T08:45:47.361Z`. No `POST`, `PUT`, or `PATCH` from Okta.
- Rostr has one user: `jonah.hale@lanternfieldgoods.co.uk`, id `810dde51-dd11-41ac-afda-5400f831d908`, department Sales, `title` empty, `active` 1. That row came from SAML in 2.4, not from SCIM.
- Rostr has no groups.

So every `POST`, `PUT`, `PATCH`, and `/Groups` line below is new, and is Okta's doing.

The two sides are tied together by the Okta user id. Okta sends it as `externalId` on every call, and it is the Target id on every System Log row: `00u18ep2sjmnGT1wk698`. Rostr ignores `externalId` because the schema has no column for it, which the log records in the `ignored` field.

## 1. Create

Okta user `test joiner` was created in Directory, given a department, and picked up by the group rules, which put the person in `APP-Rostr-Users` and so assigned them the Rostr app.

| Side | Record |
| --- | --- |
| Okta System Log | Pending. |
| `logs/scim.jsonl` | `2026-10-06T09:13:57.688Z` `GET /scim/v2/Users?filter=userName eq "test.joiner@lanternfieldgoods.co.uk"&startIndex=1&count=100` 200, empty ListResponse. Then `2026-10-06T09:13:57.937Z` `POST /scim/v2/Users` 201 in 30 ms. |
| Rostr row | id `14128da2-800f-4f81-959d-fa08c9d1db15`, `userName` `test.joiner@lanternfieldgoods.co.uk`, `active` 1. |

Okta looks before it creates. The filter call came 249 ms before the `POST`, which is the behaviour predicted in the 3.1 contract: Okta will not create a user it can already find by `userName`.

The request body was:

```json
{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
  "userName": "test.joiner@lanternfieldgoods.co.uk",
  "name": { "givenName": "test", "familyName": "joiner" },
  "emails": [{ "primary": true, "value": "test.joiner@lanternfieldgoods.co.uk" }],
  "externalId": "00u18ep2sjmnGT1wk698",
  "groups": [],
  "password": "[redacted]",
  "active": true
}
```

Three things Rostr ignored and logged as ignored: `externalId`, `groups`, and `password`. The password is a placeholder Okta generates for apps that ask for one; Rostr does not store passwords, and the log redacts it so the value never reaches disk. This is the behaviour 3.1 said to expect.

No `title` and no enterprise extension in the create body, because the Okta profile had no title at that point.

## 2. Update

Title changed to `Account Executive` on the Okta user.

| Side | Record |
| --- | --- |
| Okta System Log | Pending. |
| `logs/scim.jsonl` | `2026-10-06T09:16:04.758Z` `GET /scim/v2/Users/14128da2-800f-4f81-959d-fa08c9d1db15` 200, then `2026-10-06T09:16:04.973Z` `PUT` on the same id, 200 in 16 ms. |
| Rostr row | `title` went from empty to `Account Executive`. |

**This app sends `PUT`, not `PATCH`.** That is the open question from 3.1 answered. The app was built in the App Integration Wizard, so it runs on Okta's classic SCIM path, which reads the resource and writes the whole thing back rather than sending a `PatchOp`. Rostr accepts both, which is why this cost nothing.

The read-then-write pattern matters: Okta `GET`s the current resource first and sends it back with the one field changed. A server that implemented only `PATCH` would have failed here.

## 3. Deactivate

Okta user deactivated in Directory.

| Side | Record |
| --- | --- |
| Okta System Log | `Oct 06 20:18:32`, actor Timothy itayi (`00u18dfk5x7gEIpq0698`), event `user.lifecycle.deactivate` SUCCESS, event id `4f1c0ccf24870fe68372d5584b4dd737`, target `test joiner` (`00u18ep2sjmnGT1wk698`) User. The next row at the same second is `Remove user's application`, target `test joiner` (AppUser). |
| `logs/scim.jsonl` | `2026-10-06T09:18:33.801Z` `GET /scim/v2/Users/14128da2-800f-4f81-959d-fa08c9d1db15` 200, then `2026-10-06T09:18:33.996Z` `PUT` on the same id, 200 in 10 ms, with `"active": false`. |
| Rostr row | `active` 1 to 0. The row is retained, not deleted. |

`20:18:32` +1100 is `09:18:32Z`, and the `PUT` is at `09:18:33.996Z`. Okta deactivated the user and pushed the change to Rostr inside two seconds.

Deactivation is two events in Okta, not one: the directory lifecycle change, and then the app unassignment that follows from it. Only the second one produces SCIM traffic. Rostr sets `active` to false and keeps the row, which is what an audit needs. Deleting the row would destroy the record of who had access.

## Department mapping

The test joiner's three writes carry no enterprise extension, and the Rostr row has `department` null. The profile was reported as having Department set to Sales. The log disagrees: the value was not on the payload Okta sent at `09:13:57Z`, `09:16:04Z`, or `09:18:33Z`.

The other seven users settle it. They were assigned to Rostr in phase 2, before provisioning existed, so Force Sync did nothing to them. Okta's own message on the Assignments tab was "User was assigned this application before Provisioning was enabled and not provisioned in the downstream application. Click Provision User." Clicking that at `2026-10-06T09:27:00Z` produced a `GET` filter per user, then:

| Call | userName | title | department |
| --- | --- | --- | --- |
| POST 201 | ava.nguyen@ | Sales Manager | Sales |
| POST 201 | priya.shah@ | Account Executive | Sales |
| PUT 200 | jonah.hale@ | Account Executive | Sales |
| POST 201 | marcus.bell@ | Operations Manager | Operations |
| POST 201 | lena.ortiz@ | Shift Supervisor | Operations |
| POST 201 | helen.cho@ | Finance Manager | Finance |
| POST 201 | samir.adeyemi@ | Accounts Assistant | Finance |

Every one of those bodies includes `urn:ietf:params:scim:schemas:extension:enterprise:2.0:User`. The `department` mapping from 3.5 works. Jonah was not created: the filter found the row SAML wrote in 2.4 (`810dde51-dd11-41ac-afda-5400f831d908`), and Okta `PUT` the profile onto it. That is a link, not a create, and it is the behaviour 3.7 will have to account for.

The test joiner stays unexplained. Either the Department attribute was empty at push time, or it was set somewhere Okta does not map. Not re-tested, because the user is deactivated and the six real profiles are the better sample.

## 4. Group push

Both groups were pushed by name. `APP-Rostr-Users` completed on the first attempt. `APP-Rostr-Admins` failed once at the tunnel, then completed on retry. Both rows are **Active**: [3.6-push-groups.png](3.6-push-groups.png).

### APP-Rostr-Users

| Side | Record |
| --- | --- |
| Okta System Log | `Oct 06 20:30:04`, actor Timothy itayi (`00u18dfk5x7gEIpq0698`), `application.provision.group_push.updated` SUCCESS, event id `gmr18eppKqmoNx85o698`. Targets: `APP-Rostr-Users` (`AGr18eppkqj65d7qD698`) AppGroup, Rostr (`0oa18eddmjpNG4dNI698`) AppInstance. |
| `logs/scim.jsonl` | `09:30:03.997Z` `GET /Groups?filter=displayName eq "APP-Rostr-Users"` 200, empty. `09:30:04.282Z` `POST /Groups` 201. `09:30:04.537Z` `GET /Groups/6305f001-33ef-42a8-9e17-0aef8a440ead` 200. `09:30:04.737Z` `PUT` on that id 200. |
| Rostr group | id `6305f001-33ef-42a8-9e17-0aef8a440ead`, displayName `APP-Rostr-Users`, 7 members. |

The `POST` members, by the id Rostr assigned at 09:27:01Z: Ava Nguyen, Jonah Hale, Priya Shah, Marcus Bell, Lena Ortiz, Helen Cho, Samir Adeyemi. Okta read each user back and sent the same seven on the `PUT`. Same pattern as the user update: this app writes groups with `PUT`, not `PATCH`.

### APP-Rostr-Admins

| Side | Record |
| --- | --- |
| Okta System Log | `Oct 06 20:30:13`, `application.provision.group.add` FAILURE, event id `gmr18epsy08FIJnug698`, target Rostr (`0oa18eddmjpNG4dNI698`). Outcome text is the Cloudflare 502 below. Retry `Oct 06 20:35:12`, `application.provision.group_push.updated` SUCCESS, event id `gmr18epw486tMqyqS698`. Targets: `APP-Rostr-Admins` (`AGr18epw4837PQuvb698`) AppGroup, Rostr (`0oa18eddmjpNG4dNI698`) AppInstance. |
| `logs/scim.jsonl` | `09:35:11.528Z` `GET /Groups?filter=displayName eq "APP-Rostr-Admins"` 200, empty. `09:35:11.814Z` `POST /Groups` 201. `09:35:12.044Z` `GET /Groups/6e95185e-5563-4d6c-9422-bf8723cf269f` 200. `09:35:12.233Z` `PUT` on that id 200. |
| Rostr group | id `6e95185e-5563-4d6c-9422-bf8723cf269f`, displayName `APP-Rostr-Admins`, `members` `[]`. |

The empty member list is the truth. Jonah was removed from this group after 2.7, and nobody was put back. Okta sent `"members": []` on both the `POST` and the `PUT`, and Rostr stored that. A group push does not invent members.

The 8:30:13 failure never reached Rostr. There is no log line for it, and the container did not restart (`RestartCount` 0, started `08:35:54Z`). Okta's text was `Bad Gateway. Errors reported by remote server: Invalid JSON: Unrecognized token 'error' ... line: 1, column: 6`. A SCIM error from this server is a JSON object and starts with `{`. The token Okta could not parse is Cloudflare's plain-text gateway page, `error code: 502`. The word `error` occupies columns 1–5, so column 6 is the space. A probe at `09:33:54Z` got a normal SCIM 401 through the same host. The retry at `09:35:11Z` is the same shape of call as the users group, and it succeeded. No code change.
