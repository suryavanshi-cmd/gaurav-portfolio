\set ON_ERROR_STOP on
create or replace function assert_eq(got anyelement, want anyelement, label text)
returns void language plpgsql as $$
begin
  if got is distinct from want then
    raise exception 'FAIL % — got %, want %', label, got, want;
  end if;
  raise notice '  PASS  % (%)', label, got;
end $$;

do $$
declare
  u uuid; r record; s record; p record; v bigint; n numeric; c integer;
begin
  -- 1. signup trigger provisions users + credits
  insert into auth.users (email) values ('lab@example.com') returning id into u;
  perform assert_eq((select count(*)::int from public.users where id=u), 1, 'trigger created users row');
  perform assert_eq((select balance_tokens from credits where user_id=u), 0::bigint, 'starts at zero balance');

  -- 2. reserve on an empty account is refused, not an error
  select * into r from fn_reserve_credits(u, 5000, 'pdf-1');
  perform assert_eq(r.ok, false, 'reserve refused with no credit');

  -- 3. a payment credits the account
  insert into payments (user_id, razorpay_order_id, amount_inr) values (u, 'order_A', 10.00);
  select * into p from fn_credit_payment('order_A', 'pay_A', 10.00, 9000);
  perform assert_eq(p.ok, true, 'payment credited');
  perform assert_eq(p.already_credited, false, 'first credit is not a replay');
  perform assert_eq((select balance_tokens from credits where user_id=u), 9000::bigint, 'balance is 9000 after Rs10');

  -- 4. webhook replay must NOT double-credit
  select * into p from fn_credit_payment('order_A', 'pay_A', 10.00, 9000);
  perform assert_eq(p.already_credited, true, 'replay detected');
  perform assert_eq((select balance_tokens from credits where user_id=u), 9000::bigint, 'replay did not double-credit');

  -- 5. unknown order is refused rather than crediting someone
  select * into p from fn_credit_payment('order_NEVER_CREATED', 'pay_X', 500, 450000);
  perform assert_eq(p.ok, false, 'unknown order refused');

  -- 6. reserve holds tokens without spending them
  select * into r from fn_reserve_credits(u, 3000, 'pdf-2');
  perform assert_eq(r.ok, true, 'reserve succeeded');
  perform assert_eq(r.available_tokens, 6000::bigint, 'available drops to 6000');
  perform assert_eq((select balance_tokens from credits where user_id=u), 9000::bigint, 'balance untouched by hold');
  perform assert_eq((select reserved_tokens from credits where user_id=u), 3000::bigint, 'reserved is 3000');

  -- 7. settle charges the ACTUAL usage, not the estimate
  select * into s from fn_settle_hold(r.hold_id, 'success', 1200, 300, 1500, 0.31, 0.0035, 900, 'claude-haiku-4-5', null);
  perform assert_eq(s.already_settled, false, 'first settle');
  perform assert_eq(s.new_balance_tokens, 7500::bigint, 'charged 1500 actual, not 3000 estimate');
  perform assert_eq((select reserved_tokens from credits where user_id=u), 0::bigint, 'hold released');
  perform assert_eq((select count(*)::int from usage_log where user_id=u and status='success'), 1, 'usage_log row written');

  -- 8. settling twice must not double-charge
  select * into s from fn_settle_hold(r.hold_id, 'success', 1200, 300, 1500, 0.31, 0.0035, 900, 'claude-haiku-4-5', null);
  perform assert_eq(s.already_settled, true, 'second settle is a no-op');
  perform assert_eq((select balance_tokens from credits where user_id=u), 7500::bigint, 'no double charge');

  -- 9. a failed call charges nothing but is still logged
  select * into r from fn_reserve_credits(u, 2000, 'pdf-3');
  select * into s from fn_settle_hold(r.hold_id, 'failed', 0, 0, 0, 0, 0, 900, 'claude-haiku-4-5', 'API timeout');
  perform assert_eq(s.new_balance_tokens, 7500::bigint, 'failed call charged nothing');
  perform assert_eq((select count(*)::int from usage_log where user_id=u and status='failed'), 1, 'failure logged');
  perform assert_eq((select reserved_tokens from credits where user_id=u), 0::bigint, 'hold released on failure');

  -- 10. overshoot clamps at zero instead of going negative
  select * into r from fn_reserve_credits(u, 7000, 'pdf-4');
  select * into s from fn_settle_hold(r.hold_id, 'success', 90000, 5000, 95000, 20, 0.22, 900, 'claude-haiku-4-5', null);
  perform assert_eq(s.new_balance_tokens, 0::bigint, 'overshoot clamps to zero');
  perform assert_eq((select count(*)::int from credits where user_id=u and balance_tokens < 0), 0, 'balance never negative');

  -- 11. stale holds are recoverable after a crash
  insert into payments (user_id, razorpay_order_id, amount_inr) values (u, 'order_B', 10.00);
  perform fn_credit_payment('order_B', 'pay_B', 10.00, 9000);
  select * into r from fn_reserve_credits(u, 4000, 'pdf-crash');
  update credit_holds set expires_at = now() - interval '1 hour' where id = r.hold_id;
  select fn_expire_stale_holds() into c;
  perform assert_eq(c, 1, 'one stale hold expired');
  perform assert_eq((select reserved_tokens from credits where user_id=u), 0::bigint, 'stranded tokens returned');

  -- 12. platform spend accumulates
  perform fn_record_platform_spend('2026-08', 0.0035, 0.31);
  perform fn_record_platform_spend('2026-08', 0.0040, 0.35);
  select fn_platform_spend('2026-08') into n;
  perform assert_eq(n, 0.007500::numeric, 'platform spend accumulates');
  perform assert_eq((select request_count from platform_usage where period='2026-08'), 2::bigint, 'request count');

  raise notice '';
  raise notice 'ALL SEQUENTIAL TESTS PASSED';
end $$;
