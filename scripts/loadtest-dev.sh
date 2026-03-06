#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-${BASE_URL:-http://localhost:3000}}"
TMP_DIR="$(mktemp -d)"
FAILURES=0

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

run_case() {
  local name="$1"
  local method="$2"
  local url="$3"
  local body="${4:-}"
  local requests="$5"
  local concurrency="$6"

  local out="$TMP_DIR/${name}.codes"
  : > "$out"

  printf "\n==> %s [%s] %s (%s req, c=%s)\n" "$name" "$method" "$url" "$requests" "$concurrency"

  for ((i = 1; i <= requests; i += 1)); do
    {
      if [[ "$method" == "GET" ]]; then
        code="$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "000")"
        echo "$code"
      else
        code="$(curl -s -o /dev/null -w "%{http_code}" \
          -X "$method" \
          -H "content-type: application/json" \
          -d "$body" \
          "$url" || echo "000")"
        echo "$code"
      fi
    } >> "$out" &

    if (( i % concurrency == 0 )); then
      wait
    fi
  done
  wait

  local total ok too_many server_err network_err other
  total="$(wc -l < "$out" | tr -d ' ')"
  ok="$(grep -cE '^2[0-9][0-9]$' "$out" || true)"
  too_many="$(grep -c '^429$' "$out" || true)"
  server_err="$(grep -cE '^5[0-9][0-9]$' "$out" || true)"
  network_err="$(grep -c '^000$' "$out" || true)"
  other=$((total - ok - too_many - server_err - network_err))

  printf "   total=%s ok=%s 429=%s 5xx=%s net=%s other=%s\n" \
    "$total" "$ok" "$too_many" "$server_err" "$network_err" "$other"

  if (( server_err > 0 || network_err > 0 )); then
    FAILURES=$((FAILURES + 1))
  fi
}

echo "Load test target: $BASE_URL"

run_case "events_list" "GET" "$BASE_URL/api/events" "" 120 20
run_case "players_search" "GET" "$BASE_URL/api/players/search?q=an&limit=10" "" 100 20
run_case "onboarding_lookup" "POST" "$BASE_URL/api/onboarding/by-email" '{"email":"loadtest@example.com"}' 60 15

EVENT_ID="$(
  curl -s "$BASE_URL/api/events" | node -e '
    let s = "";
    process.stdin.on("data", (d) => (s += d));
    process.stdin.on("end", () => {
      try {
        const j = JSON.parse(s);
        const id = j?.data?.[0]?.id;
        process.stdout.write(id ? String(id) : "");
      } catch {
        process.stdout.write("");
      }
    });
  '
)"

if [[ -n "$EVENT_ID" ]]; then
  run_case "event_detail" "GET" "$BASE_URL/api/events/$EVENT_ID" "" 80 20
else
  echo "==> event_detail skipped (no event id found)"
fi

if (( FAILURES > 0 )); then
  echo
  echo "Result: FAIL ($FAILURES case(s) with 5xx/network errors)"
  exit 1
fi

echo
echo "Result: PASS (no 5xx/network errors in tested cases)"
