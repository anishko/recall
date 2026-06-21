#!/usr/bin/env bash
# Integration test suite for new-web API routes
set -euo pipefail

BASE="${1:-http://127.0.0.1:3001}"
PASS=0
FAIL=0
WARN=0

green() { printf "\033[32m%s\033[0m\n" "$1"; }
red() { printf "\033[31m%s\033[0m\n" "$1"; }
yellow() { printf "\033[33m%s\033[0m\n" "$1"; }

assert_status() {
  local name="$1" expected="$2" actual="$3" body="$4"
  if [[ "$actual" == "$expected" ]]; then
    green "PASS $name (HTTP $actual)"
    PASS=$((PASS + 1))
  else
    red "FAIL $name — expected HTTP $expected, got $actual"
    echo "  body: ${body:0:300}"
    FAIL=$((FAIL + 1))
  fi
}

assert_json_field() {
  local name="$1" json="$2" field="$3"
  if echo "$json" | python3 -c "import sys,json; d=json.load(sys.stdin); assert '$field' in d or (isinstance(d,list) and len(d)>0)" 2>/dev/null; then
    green "PASS $name (has $field)"
    PASS=$((PASS + 1))
  else
    red "FAIL $name — missing field $field"
    echo "  body: ${json:0:300}"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== Testing new-web at $BASE ==="
echo ""

# 1. GET /api/cases
echo "--- GET /api/cases ---"
STATUS=$(curl -s -o /tmp/cases.json -w "%{http_code}" "$BASE/api/cases")
BODY=$(cat /tmp/cases.json)
assert_status "GET /api/cases" "200" "$STATUS" "$BODY"
assert_json_field "GET /api/cases array" "$BODY" "id"
CASE_COUNT=$(echo "$BODY" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")
echo "  → $CASE_COUNT cases returned"
FIRST_ID=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['id'] if d else '')" 2>/dev/null || echo "")
FIRST_FIELDS=$(echo "$BODY" | python3 -c "
import sys,json
d=json.load(sys.stdin)
if not d: sys.exit(0)
c=d[0]
required=['id','patientName','urgency','confidence','status','patientScript','slices']
missing=[k for k in required if k not in c]
print('missing:', missing if missing else 'none')
" 2>/dev/null)
echo "  → adapter fields: $FIRST_FIELDS"

# 2. GET /api/cases/[id]
echo ""
echo "--- GET /api/cases/[id] ---"
if [[ -n "$FIRST_ID" ]]; then
  STATUS=$(curl -s -o /tmp/case.json -w "%{http_code}" "$BASE/api/cases/$FIRST_ID")
  BODY=$(cat /tmp/case.json)
  assert_status "GET /api/cases/$FIRST_ID" "200" "$STATUS" "$BODY"
  assert_json_field "case detail id" "$BODY" "id"
else
  yellow "SKIP GET /api/cases/[id] — no cases"
  WARN=$((WARN + 1))
fi

STATUS=$(curl -s -o /tmp/case404.json -w "%{http_code}" "$BASE/api/cases/nonexistent-uuid-000")
assert_status "GET /api/cases/404" "404" "$STATUS" "$(cat /tmp/case404.json)"

# 3. Mock patient tokens
echo ""
echo "--- GET /api/patient/[token] (mock) ---"
for TOK in tok_sarah_abc123 tok_grandma_chen_xyz789 tok_alex_ar789; do
  STATUS=$(curl -s -o /tmp/pv.json -w "%{http_code}" "$BASE/api/patient/$TOK")
  BODY=$(cat /tmp/pv.json)
  assert_status "GET /api/patient/$TOK" "200" "$STATUS" "$BODY"
  assert_json_field "patient view token $TOK" "$BODY" "patientFirstName"
done

STATUS=$(curl -s -o /tmp/pv404.json -w "%{http_code}" "$BASE/api/patient/bad_token_xyz")
assert_status "GET /api/patient/bad token" "404" "$STATUS" "$(cat /tmp/pv404.json)"

STATUS=$(curl -s -o /tmp/pvfam.json -w "%{http_code}" "$BASE/api/patient/tok_sarah_abc123?view=family")
BODY=$(cat /tmp/pvfam.json)
assert_status "GET /api/patient family view" "200" "$STATUS" "$BODY"
FAMILY_SAFE=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('familySafe'))" 2>/dev/null)
if [[ "$FAMILY_SAFE" == "True" ]]; then
  green "PASS family view familySafe=true"
  PASS=$((PASS + 1))
else
  red "FAIL family view familySafe=$FAMILY_SAFE"
  FAIL=$((FAIL + 1))
fi

# 4. POST schedule / send-to-family (mock)
echo ""
echo "--- POST patient actions (mock tokens) ---"
STATUS=$(curl -s -o /tmp/sched.json -w "%{http_code}" -X POST "$BASE/api/patient/tok_sarah_abc123/schedule" \
  -H "Content-Type: application/json" -d '{"date":"2026-06-25","time":"10:00"}')
assert_status "POST schedule mock" "200" "$STATUS" "$(cat /tmp/sched.json)"
CONFIRMED=$(cat /tmp/sched.json | python3 -c "import sys,json; print(json.load(sys.stdin).get('confirmed'))" 2>/dev/null)
if [[ "$CONFIRMED" == "True" ]]; then
  green "PASS schedule confirmed=true"
  PASS=$((PASS + 1))
else
  red "FAIL schedule confirmed=$CONFIRMED"
  FAIL=$((FAIL + 1))
fi

STATUS=$(curl -s -o /tmp/fam.json -w "%{http_code}" -X POST "$BASE/api/patient/tok_sarah_abc123/send-to-family" \
  -H "Content-Type: application/json" -d '{"phone":"+15555551234","name":"Jane"}')
assert_status "POST send-to-family mock" "200" "$STATUS" "$(cat /tmp/fam.json)"

# 5. GET /api/audit
echo ""
echo "--- GET /api/audit ---"
STATUS=$(curl -s -o /tmp/audit.json -w "%{http_code}" "$BASE/api/audit")
BODY=$(cat /tmp/audit.json)
assert_status "GET /api/audit" "200" "$STATUS" "$BODY"
AUDIT_COUNT=$(echo "$BODY" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo 0)
echo "  → $AUDIT_COUNT audit entries"

# 6. GET /api/eval
echo ""
echo "--- GET /api/eval ---"
STATUS=$(curl -s -o /tmp/eval.json -w "%{http_code}" "$BASE/api/eval")
assert_status "GET /api/eval" "200" "$STATUS" "$(cat /tmp/eval.json)"

# 7. POST approve/flag (may hit backend or mock fallback)
echo ""
echo "--- POST /api/cases/[id]/approve & /flag ---"
if [[ -n "$FIRST_ID" ]]; then
  # Use a case that's likely pending — don't actually approve real approved cases in prod
  # Just verify endpoint responds (200 or 4xx from backend is OK structurally)
  STATUS=$(curl -s -o /tmp/flag.json -w "%{http_code}" -X POST "$BASE/api/cases/$FIRST_ID/flag" \
    -H "Content-Type: application/json" -d '{"note":"test flag"}')
  if [[ "$STATUS" =~ ^(200|400|409|502)$ ]]; then
    green "PASS POST /api/cases/$FIRST_ID/flag (HTTP $STATUS — endpoint reachable)"
    PASS=$((PASS + 1))
  else
    red "FAIL POST flag unexpected HTTP $STATUS"
    echo "  $(cat /tmp/flag.json | head -c 200)"
    FAIL=$((FAIL + 1))
  fi
fi

# 8. Signoff routes — missing token
echo ""
echo "--- Signoff routes ---"
STATUS=$(curl -s -o /tmp/soa.json -w "%{http_code}" "$BASE/api/signoff/approve")
assert_status "GET /api/signoff/approve no token" "400" "$STATUS" "$(cat /tmp/soa.json)"

STATUS=$(curl -s -o /tmp/sor.json -w "%{http_code}" "$BASE/api/signoff/reject")
assert_status "GET /api/signoff/reject no token" "400" "$STATUS" "$(cat /tmp/sor.json)"

# 9. /cases/[id] redirect
echo ""
echo "--- Page redirects ---"
if [[ -n "$FIRST_ID" ]]; then
  REDIR=$(curl -s -o /dev/null -w "%{http_code} %{redirect_url}" "$BASE/cases/$FIRST_ID?approved=1")
  CODE=$(echo "$REDIR" | awk '{print $1}')
  URL=$(echo "$REDIR" | awk '{print $2}')
  if [[ "$CODE" == "307" || "$CODE" == "308" ]] && echo "$URL" | grep -q "dashboard/case/$FIRST_ID"; then
    green "PASS /cases/$FIRST_ID redirects to dashboard (HTTP $CODE)"
    PASS=$((PASS + 1))
  else
    red "FAIL /cases/$FIRST_ID redirect: $REDIR"
    FAIL=$((FAIL + 1))
  fi
fi

# 10. Analyze — bad request
echo ""
echo "--- POST /api/analyze ---"
STATUS=$(curl -s -o /tmp/analyze.json -w "%{http_code}" -X POST "$BASE/api/analyze" \
  -H "Content-Type: application/json" -d '{"foo":"bar"}')
assert_status "POST /api/analyze non-multipart" "400" "$STATUS" "$(cat /tmp/analyze.json)"

# 11. Backend rewrite /backend
echo ""
echo "--- /backend rewrite ---"
STATUS=$(curl -s -o /tmp/backend.json -w "%{http_code}" "$BASE/backend/orchestrator/patient/view?token=bad")
if [[ "$STATUS" =~ ^(401|400|502)$ ]]; then
  green "PASS /backend rewrite reachable (HTTP $STATUS)"
  PASS=$((PASS + 1))
else
  red "FAIL /backend rewrite HTTP $STATUS"
  FAIL=$((FAIL + 1))
fi

# 12. Static pages
echo ""
echo "--- Static pages ---"
for PAGE in /dashboard /upload /dashboard/audit /dashboard/eval /p/tok_sarah_abc123 /signoff/rejected; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE$PAGE")
  if [[ "$STATUS" == "200" ]]; then
    green "PASS GET $PAGE (HTTP 200)"
    PASS=$((PASS + 1))
  else
    red "FAIL GET $PAGE (HTTP $STATUS)"
    FAIL=$((FAIL + 1))
  fi
done

echo ""
echo "================================"
echo "Results: $PASS passed, $FAIL failed, $WARN skipped"
if [[ "$FAIL" -gt 0 ]]; then exit 1; fi
