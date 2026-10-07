# HR group dropped from the sign-in

Previous: [Leaver with an open request](10-leaver-open-request.md).

Date: 2026-10-08. The claim has not been changed. This is the shot list, and which control actually moves Helen.

## What decides the hub

Helen Cho's HR role comes from the SAML `groups` attribute on the Rostr app. Her Rostr row is only in `APP-Rostr-Users`. `APP-Rostr-HR` is not in the SCIM group tables, so a missing SAML group makes her staff on the next sign-in.

The default authorization server claim is a different control. It feeds the OIDC ID token, which is Rostr Admin and `/me`. Incident 04 already broke that one with Starts with `APP-Rostrx`. Changing only that claim does not change Helen's SAML session.

The claim list before this drill:

[evidence/leave/11-groups-claim-before.png](../../evidence/leave/11-groups-claim-before.png)

## What to change, by hand

Rostr SAML app → General → SAML Settings → Group Attribute Statements. The `groups` filter is Starts with `APP-Rostr`. Set the value to `APP-Rostrx`. Save. Sign Helen out and sign her in again in a new session. She should land on My leave, role Staff, with no HR section.

The svc-jml-sync app used by the scripts has users, groups, and logs. It cannot edit authorization servers or SAML apps. This step stays in the Admin Console.

## After the screenshots

Put the SAML filter back to Starts with `APP-Rostr`. If the authorization server claim was changed as well, put that back to the same value. A new sign-in is required. The old session keeps the groups it was issued.
