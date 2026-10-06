#!/usr/bin/env bash
# Curl tests for Rostr's SCIM Users and Groups endpoints. Test ids match docs/phases/03-scim.md.
#
#   SCIM_BASE_URL  default http://127.0.0.1:3000/scim/v2
#   SCIM_TOKEN     default: the SCIM_TOKEN line in rostr/.env
#   SCIM_LOG       default logs/scim.jsonl, read by L1 when the file exists
#
# Each run creates one user named scim-test-<epoch>@example.invalid and leaves that user inactive.
# It also creates APP-Rostr-Users-<epoch>, changes its members, and deletes it.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${SCIM_BASE_URL:-http://127.0.0.1:3000/scim/v2}"
LOG="${SCIM_LOG:-$ROOT/logs/scim.jsonl}"
if [ -z "${SCIM_TOKEN:-}" ] && [ -f "$ROOT/rostr/.env" ]; then
  SCIM_TOKEN="$(sed -n 's/^SCIM_TOKEN=//p' "$ROOT/rostr/.env" | tail -n 1)"
fi
: "${SCIM_TOKEN:?Set SCIM_TOKEN or add it to rostr/.env}"

USER_SCHEMA='urn:ietf:params:scim:schemas:core:2.0:User'
ENTERPRISE='urn:ietf:params:scim:schemas:extension:enterprise:2.0:User'
PATCH_OP='urn:ietf:params:scim:api:messages:2.0:PatchOp'
LIST='urn:ietf:params:scim:api:messages:2.0:ListResponse'
ERROR='urn:ietf:params:scim:api:messages:2.0:Error'

umask 077
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
printf 'Authorization: Bearer %s\n' "$SCIM_TOKEN" > "$WORK/auth"
printf 'Authorization: Bearer wrong-token\n' > "$WORK/badauth"
printf '%s\n' "$SCIM_TOKEN" > "$WORK/token"

RUN="$(date +%s)"
USER_NAME="scim-test-$RUN@example.invalid"
GROUP_NAME="APP-Rostr-Users-$RUN"
RENAMED_GROUP="APP-Rostr-Admins-$RUN"
UPPER_NAME="$(printf '%s' "$USER_NAME" | tr '[:lower:]' '[:upper:]')"
PASSED=0
FAILED=0

request() {
  local method="$1" route="$2" body="${3:-}" auth="${4:-$WORK/auth}"
  local args=(-sS -X "$method" -o "$WORK/body" -D "$WORK/headers" -w '%{http_code}')
  if [ "$auth" != none ]; then
    args+=(-H "@$auth")
  fi
  if [ -n "$body" ]; then
    args+=(-H 'Content-Type: application/scim+json' --data-binary "$body")
  fi
  STATUS="$(curl "${args[@]}" "$BASE$route")"
}

pass() {
  printf 'PASS  %-4s %-60s %s\n' "$1" "$2" "$3"
  PASSED=$((PASSED + 1))
}

fail() {
  printf 'FAIL  %-4s %-60s %s\n' "$1" "$2" "$3"
  FAILED=$((FAILED + 1))
}

check() {
  local id="$1" what="$2" want="$3" expr="$4"
  if [ "$STATUS" = "$want" ] && jq -e "$expr" "$WORK/body" > /dev/null 2>&1; then
    pass "$id" "$what" "$STATUS"
  else
    fail "$id" "$what" "got $STATUS, want $want"
    head -c 400 "$WORK/body"
    echo
  fi
}

filter() {
  jq -rn --arg value "userName eq \"$1\"" '$value | @uri'
}

name_filter() {
  jq -rn --arg value "displayName eq \"$1\"" '$value | @uri'
}

user_body() {
  jq -n --arg userName "$1" --arg schema "$USER_SCHEMA" '{
    schemas: [$schema],
    userName: $userName,
    name: { givenName: "Scim", familyName: "Test" },
    emails: [{ primary: true, value: $userName, type: "work" }],
    displayName: "Scim Test",
    locale: "en-US",
    externalId: "00uSCIMTEST",
    groups: [],
    password: "1mz050nq",
    active: true
  }'
}

full_body() {
  jq -n --arg userName "$1" --argjson active "$2" --arg schema "$USER_SCHEMA" --arg ext "$ENTERPRISE" '{
    schemas: [$schema, $ext],
    userName: $userName,
    name: { givenName: "Scim", familyName: "Test" },
    emails: [{ primary: true, value: $userName, type: "work" }],
    title: "Account Executive",
    active: $active,
    ($ext): { department: "Sales" }
  }'
}

echo "SCIM tests $(date -u +%Y-%m-%dT%H:%M:%SZ) against $BASE"
echo "Test user $USER_NAME"
echo

request GET /Users '' none
check A1 'GET /Users with no Authorization header' 401 ".status == \"401\" and .schemas == [\"$ERROR\"]"

request GET /Users '' "$WORK/badauth"
check A2 'GET /Users with a wrong token' 401 '.status == "401"'

request GET /ServiceProviderConfig
check S1 'GET /ServiceProviderConfig declares PATCH' 200 '.patch.supported == true and .bulk.supported == false'

request GET "/Users?filter=$(filter "$USER_NAME")&startIndex=1&count=100"
check U3a 'filter userName eq for a user that is not there' 200 ".schemas == [\"$LIST\"] and .totalResults == 0 and .Resources == []"

request POST /Users "$(user_body "$USER_NAME")"
check U4 'POST /Users with the Okta create body' 201 '(.id | length) > 0 and .active == true and (has("password") | not)'
USER_ID="$(jq -r '.id // empty' "$WORK/body")"
if grep -qi "^location: .*/Users/$USER_ID" "$WORK/headers" && [ -n "$USER_ID" ]; then
  pass U4 'Location header points at the new user' "$STATUS"
else
  fail U4 'Location header points at the new user' 'missing or wrong'
fi

request GET "/Users?filter=$(filter "$UPPER_NAME")&startIndex=1&count=100"
check U3b 'filter userName eq, same user in upper case' 200 ".totalResults == 1 and .itemsPerPage == 1 and .Resources[0].id == \"$USER_ID\""

request GET '/Users?startIndex=1&count=2'
check U1 'GET /Users?startIndex=1&count=2, integer paging fields' 200 \
  "(.totalResults | type) == \"number\" and (.startIndex | type) == \"number\" and (.itemsPerPage | type) == \"number\" and (.Resources | length) <= 2"

request GET '/Users?startIndex=1&count=0'
check U2a 'count=0 returns totalResults and no resources' 200 '.totalResults >= 1 and .itemsPerPage == 0 and .Resources == []'

request GET '/Users?startIndex=1&count=1'
FIRST_ID="$(jq -r '.Resources[0].id' "$WORK/body")"
request GET '/Users?startIndex=0&count=1'
check U2b 'startIndex=0 is read as 1' 200 ".startIndex == 1 and .Resources[0].id == \"$FIRST_ID\""

request POST /Users "$(user_body "$USER_NAME")"
check U5a 'POST the same userName again' 409 '.scimType == "uniqueness" and .status == "409"'

request POST /Users "$(user_body "$UPPER_NAME")"
check U5b 'POST the same userName in upper case' 409 '.scimType == "uniqueness"'

request GET "/Users/$USER_ID"
check U6a 'GET /Users/{id}' 200 ".id == \"$USER_ID\" and .userName == \"$USER_NAME\""

request GET /Users/does-not-exist
check U6b 'GET /Users/{id} for an unknown id' 404 ".status == \"404\" and .schemas == [\"$ERROR\"]"

request PUT "/Users/$USER_ID" "$(full_body "$USER_NAME" true)"
check U7a 'PUT /Users/{id} with a title and department' 200 ".title == \"Account Executive\" and .\"$ENTERPRISE\".department == \"Sales\" and .active == true"

request PUT /Users/does-not-exist "$(full_body "ghost-$RUN@example.invalid" true)"
check U7b 'PUT /Users/{id} for an unknown id' 404 '.status == "404"'
request GET "/Users?filter=$(filter "ghost-$RUN@example.invalid")"
check U7b 'that PUT created no row' 200 '.totalResults == 0'

request PATCH "/Users/$USER_ID" "{\"schemas\":[\"$PATCH_OP\"],\"Operations\":[{\"op\":\"replace\",\"value\":{\"active\":false}}]}"
check U8a 'PATCH replace without path, active false (Okta OIN form)' 200 '.active == false'
request GET "/Users/$USER_ID"
check U8a 'GET after PATCH shows active false' 200 '.active == false'

request PATCH "/Users/$USER_ID" "{\"schemas\":[\"$PATCH_OP\"],\"Operations\":[{\"op\":\"replace\",\"path\":\"active\",\"value\":true}]}"
check U9 'PATCH replace path active, value true' 200 '.active == true'

request PUT "/Users/$USER_ID" "$(full_body "$USER_NAME" false)"
check U8b 'PUT with active false (Classic-experience form)' 200 '.active == false and .title == "Account Executive"'

request GET "/Users?filter=$(jq -rn --arg value 'userName co "scim"' '$value | @uri')"
check U3c 'unsupported filter userName co' 400 '.scimType == "invalidFilter" and .status == "400"'

request GET '/Groups?startIndex=1&count=100'
check G1 'GET /Groups?startIndex=1&count=100' 200 ".schemas == [\"$LIST\"] and (.totalResults | type) == \"number\""

request GET "/Groups?filter=$(name_filter "$GROUP_NAME")&startIndex=1&count=100"
check G3 'filter displayName eq before the group exists' 200 '.totalResults == 0 and .Resources == []'

request POST /Groups "$(jq -n --arg name "$GROUP_NAME" --arg schema 'urn:ietf:params:scim:schemas:core:2.0:Group' '{schemas:[$schema], displayName:$name, members:[]}')"
check G2 'POST /Groups with displayName and no members' 201 '(.id | length) > 0 and .members == [] and .meta.resourceType == "Group"'
GROUP_ID="$(jq -r '.id // empty' "$WORK/body")"
if grep -qi "^location: .*/Groups/$GROUP_ID" "$WORK/headers" && [ -n "$GROUP_ID" ]; then
  pass G2 'Location header points at the new group' "$STATUS"
else
  fail G2 'Location header points at the new group' 'missing or wrong'
fi

request GET "/Groups?filter=$(name_filter "$GROUP_NAME")&startIndex=1&count=100"
check G3 'filter displayName eq finds the group' 200 ".totalResults == 1 and .Resources[0].id == \"$GROUP_ID\""

request GET "/Groups/$GROUP_ID"
check G4 'GET /Groups/{id} returns the members list' 200 ".id == \"$GROUP_ID\" and .members == []"

request PATCH "/Groups/$GROUP_ID" "$(jq -n --arg op "$PATCH_OP" --arg id "$USER_ID" --arg name "$USER_NAME" '{schemas:[$op], Operations:[{op:"add", path:"members", value:[{value:$id, display:$name}]}]}')"
check G6a 'PATCH add a member' 200 ".members == [{value:\"$USER_ID\", display:\"$USER_NAME\"}]"
request GET "/Groups/$GROUP_ID"
check G6a 'GET after add shows the member' 200 ".members[0].value == \"$USER_ID\""

request PATCH "/Groups/$GROUP_ID" "$(jq -n --arg op "$PATCH_OP" --arg id "$USER_ID" '{schemas:[$op], Operations:[{op:"remove", path:("members[value eq \"" + $id + "\"]")}]}')"
check G6b 'PATCH remove members[value eq id]' 200 '.members == []'

request PATCH "/Groups/$GROUP_ID" "$(jq -n --arg op "$PATCH_OP" --arg id "$USER_ID" --arg name "$USER_NAME" '{schemas:[$op], Operations:[{op:"replace", path:"members", value:[{value:$id, display:$name}]}]}')"
check G6c 'PATCH replace members with one value' 200 ".members == [{value:\"$USER_ID\", display:\"$USER_NAME\"}]"

request PATCH "/Groups/$GROUP_ID" "$(jq -n --arg op "$PATCH_OP" --arg id "$GROUP_ID" --arg name "$RENAMED_GROUP" '{schemas:[$op], Operations:[{op:"replace", value:{id:$id, displayName:$name}}]}')"
check G5a 'PATCH replace displayName, no path' 200 ".displayName == \"$RENAMED_GROUP\" and .members[0].value == \"$USER_ID\""

request PUT "/Groups/$GROUP_ID" "$(jq -n --arg schema 'urn:ietf:params:scim:schemas:core:2.0:Group' --arg name "$GROUP_NAME" --arg id "$USER_ID" --arg user "$USER_NAME" '{schemas:[$schema], displayName:$name, members:[{value:$id, display:$user}]}')"
check G5b 'PUT /Groups/{id} with displayName and members' 200 ".displayName == \"$GROUP_NAME\" and .members == [{value:\"$USER_ID\", display:\"$USER_NAME\"}]"

request DELETE "/Groups/$GROUP_ID"
if [ "$STATUS" = 204 ] && [ ! -s "$WORK/body" ]; then
  pass G7 'DELETE /Groups/{id}' 204
else
  fail G7 'DELETE /Groups/{id}' "got $STATUS"
fi
request GET "/Groups/$GROUP_ID"
check G7 'GET the deleted group' 404 '.status == "404"'
request GET "/Groups?filter=$(name_filter "$GROUP_NAME")&startIndex=1&count=100"
check G7 'deleted group is not in the filter' 200 '.totalResults == 0'

if [ -f "$LOG" ]; then
  if grep -qF -f "$WORK/token" "$LOG"; then
    fail L1 "$LOG contains the token" 'leak'
  elif grep -qF '1mz050nq' "$LOG"; then
    fail L1 "$LOG contains the create password" 'leak'
  elif grep -qF "scim-test-$RUN" "$LOG"; then
    pass L1 'SCIM log has this run, no token, no password' "$(grep -cF "scim-test-$RUN" "$LOG") lines"
  else
    fail L1 'SCIM log has no line for this run' "$LOG"
  fi
else
  echo "SKIP  L1   $LOG not found on this machine"
fi

echo
echo "$PASSED passed, $FAILED failed"
[ "$FAILED" -eq 0 ]
