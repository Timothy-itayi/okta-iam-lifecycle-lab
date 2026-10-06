# Service identity

Decision date: 2026-10-06

`hr-sync` calls Okta as its own app, `svc-jml-sync`. It does not use the daily admin's session. The private key is not in this repository.

## App

| Item | Value |
| --- | --- |
| Name | `svc-jml-sync`. The Admin roles heading in the saved screenshot reads `svc-jml-syn`. |
| Client id | `0oa18eu8qpmkJBqdg698` |
| Client authentication | Public key / private key. Okta generated the client id. |
| Key id | `svc-jml-sync-1` |
| Public key in Okta | JWK, key use `sig`, status Active |
| Private key | `~/.okta-lab/svc-jml-sync/private.pem`, mode `600` |
| Scopes granted | `okta.users.manage`, `okta.groups.manage`, `okta.logs.read` |
| Admin role | Custom role `jml-sync`, bound to resource set `jml-sync`. Standard role Report Administrator, no resource set |

The resource set is all users and all groups. A joiner does not belong to a department group at the moment of creation, so a set limited to one department would fail the create. Screenshots: [evidence/4.1-custom-role.png](../../evidence/4.1-custom-role.png), [evidence/4.1-admin-role-assignment.png](../../evidence/4.1-admin-role-assignment.png).

The custom role permission list has no system-log permission. `okta.logs.read` is granted as an OAuth scope, and Report Administrator is the role that makes that scope usable. It is a second assignment on the same app. The `jml-sync` row and its resource set were left as they were.

## DPoP

The org requires a DPoP proof on the token request. The first call, signed with the private key and carrying no `DPoP` header, returned `invalid_dpop_proof`: "The DPoP proof JWT header is missing." A proof signed by the same key, with the public JWK in the header, then returned `use_dpop_nonce`. Okta's `DPoP-Nonce` response header supplied the nonce, and the retry with that nonce in the proof succeeded.

DPoP was not turned off. The token call implements it. `hr-sync` has to do the same: client assertion plus a DPoP proof, and a second proof after the nonce challenge. The access token is token type `DPoP`, not `Bearer`. API calls send `Authorization: DPoP` and a fresh proof that includes `ath`, the base64url SHA-256 of the access token.

## Token

Requested 2026-10-06 against `https://trial-7464750.okta.com/oauth2/v1/token`.

| Field | Value |
| --- | --- |
| HTTP | 200 |
| `token_type` | `DPoP` |
| `expires_in` | 3600 |
| `scope` | `okta.users.manage okta.groups.manage okta.logs.read` |

Those are the three granted scopes and no others. The access token was not written down.

The same token was then used once against each API, `limit=1`, and only the status was kept.

| Call | HTTP | Result |
| --- | --- | --- |
| `GET /api/v1/users` | 200 | Allowed |
| `GET /api/v1/groups` | 200 | Allowed |
| `GET /api/v1/logs` | 403, then 200 | Refused before Report Administrator was assigned. A later token, after that role was added, received one event and HTTP 200. |

The first log call failed with `You do not have permission to perform the requested action` while the scope was already on the token. The custom role cannot grant log access in this org. Report Administrator is what changed the result. The event body was not saved. It can carry a source IP.
