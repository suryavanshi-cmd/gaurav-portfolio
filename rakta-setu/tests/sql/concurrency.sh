#!/usr/bin/env bash
# Two simultaneous extractions racing one balance. Exactly one may proceed.
# This is the failure a plain check-then-deduct cannot prevent.
set -euo pipefail
SOCK="${1:-/tmp}"; PORT="${2:-5433}"
P="psql -h $SOCK -p $PORT -U postgres -d rakta -tAq"

U=$($P -c "with a as (insert into auth.users (email) values ('race-'||gen_random_uuid()||'@t') returning id) select id from a;")
O="order_race_$RANDOM"
$P -c "insert into payments (user_id, razorpay_order_id, amount_inr) values ('$U','$O',11.12);" >/dev/null
$P -c "select fn_credit_payment('$O','pay_race',11.12,10000);" >/dev/null

reserve() {
  psql -h "$SOCK" -p "$PORT" -U postgres -d rakta -tAq <<SQL
begin;
select '$1 -> ok=' || ok from fn_reserve_credits('$U', 6000, '$1');
select pg_sleep(1.2);
commit;
SQL
}
reserve "session-A" > /tmp/_a.out 2>&1 & A=$!
sleep 0.3
reserve "session-B" > /tmp/_b.out 2>&1 & B=$!
wait $A $B
grep -h "session-" /tmp/_a.out /tmp/_b.out | sed 's/^/  /'

GRANTED=$($P -c "select count(*) from credit_holds where user_id='$U' and status='held'")
RESERVED=$($P -c "select reserved_tokens from credits where user_id='$U'")
if [ "$GRANTED" = "1" ] && [ "$RESERVED" = "6000" ]; then
  echo "  PASS  exactly one reservation granted — the account cannot be overdrawn"
  exit 0
fi
echo "  FAIL  $GRANTED holds / $RESERVED reserved (expected 1 / 6000)"
exit 1
