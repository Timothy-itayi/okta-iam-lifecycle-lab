# OIDC redirect URI mismatch

Date: 2026-10-07, 17:13–17:18 Sydney. Drill 6.2. Rostr Admin `0oa18egjva6o5FpoP698` had its sign-in redirect URI changed from `https://rostr.lanternfieldgoods.co.uk/oidc/callback` to `https://rostr.lanternfieldgoods.co.uk/oidc/callback-wrong`. The sign-out redirect URI was left on the real callback. The client secret was not regenerated.

## What we saw

A private window opened `https://rostr.lanternfieldgoods.co.uk/oidc/login`. Okta answered on `trial-7464750.okta.com/oauth2/default/v1/authorize` with HTTP 400, error code `invalid_request`. The text was: the `redirect_uri` parameter must be a Login redirect URI in the client app settings. The client id in that URL was `0oa18egjva6o5FpoP698`.

[evidence/6.2-oidc-400.jpg](../../evidence/6.2-oidc-400.jpg)

The General tab at the same time showed Sign-in redirect URIs as `callback-wrong`, and Sign-out redirect URIs still as `callback`.

[evidence/6.2-signin-redirect-wrong.png](../../evidence/6.2-signin-redirect-wrong.png)

## Where we looked

`logs/rostr-auth.jsonl` gained no OIDC line. The last OIDC success is still Lena Ortiz at `2026-10-07T02:19:25.054Z`. Rostr only writes that file after the callback. Okta rejected the authorize request, so the browser never came back to `/oidc/callback`.

## Cause

Rostr sends `redirect_uri=https://rostr.lanternfieldgoods.co.uk/oidc/callback`. Okta compares that value with the Sign-in redirect URIs list only. The sign-out list is not consulted for this request, which is why leaving it on the real callback did not help.

## Fix

General → LOGIN → Sign-in redirect URIs → Edit. Replaced `callback-wrong` with `https://rostr.lanternfieldgoods.co.uk/oidc/callback`. Wildcard stayed off. Sign-out redirect URIs were not edited. The API then showed both lists as the real callback.

## Check

The same private-window URL then showed the Okta sign-in form, "Connecting to Rostr", instead of the 400.

[evidence/6.2-oidc-signin-restored.jpg](../../evidence/6.2-oidc-signin-restored.jpg)

That form is the proof the redirect matches. `/me` was not loaded. `APP-Rostr-Admins` is empty, and the username on the form was Helen Cho, who is not in that group. Finishing as Helen would have been an assignment failure, which is a different fault.

## Do this next time

The sign-in list and the sign-out list are separate, even when the text is the same. Read the label above the box before deleting a row. The client id on the 400 page is how you know which of two apps with the same name you broke.
