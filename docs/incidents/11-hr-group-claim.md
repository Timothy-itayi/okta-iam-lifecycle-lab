# HR group dropped from the sign-in

Previous: [Leaver with an open request](10-leaver-open-request.md).

Date: 2026-10-12. The SAML filter was not changed. Helen Cho was not signed in again. The result below is [the groups claim drill](04-groups-claim.md), which is the same filter failure on the other app.

## Expected

Helen Cho's HR hub comes from the SAML `groups` attribute on the Rostr app. Her Rostr row is only in `APP-Rostr-Users`. `APP-Rostr-HR` is not in the SCIM group tables. If that attribute filter is Starts with `APP-Rostrx`, the next assertion has no `APP-Rostr-HR`, `roleFromGroups` returns staff, and she lands on My leave.

The default authorization server claim is a different control. It feeds the OIDC ID token for Rostr Admin. Changing only that claim does not move her SAML session. The svc-jml-sync app cannot edit either control.

## Result

Incident 04 set the authorization server groups claim to Starts with `APP-Rostrx`. Jonah Hale's next ID token had no groups, so he was not an admin. The filter was put back to `APP-Rostr`, and the groups returned. That is the observed result of dropping the prefix.

This round did not repeat it on the SAML app. The before shot of the authorization server claim is [evidence/leave/11-groups-claim-before.png](../../evidence/leave/11-groups-claim-before.png). The filter in that shot was not edited. Helen's role was not re-checked in a browser.

## Cause

Two filters, same prefix, different tokens. Treating the OIDC claim as Helen's HR switch would "fix" the wrong app and leave the SAML attribute where it was.

## Fix

Nothing was broken, so nothing was restored. The SAML group attribute stays Starts with `APP-Rostr`. The authorization server claim stays Starts with `APP-Rostr`.

## Do this next time

Change the SAML group attribute by hand, sign Helen out, sign her in, shoot My leave, then put the filter back before the session is reused. The old session keeps the groups it was issued.
