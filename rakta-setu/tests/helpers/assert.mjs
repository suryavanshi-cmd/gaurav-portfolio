let failures = 0;

export function check(label, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failures += 1;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `  — got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
}

export function summary(suite) {
  console.log(`\n${failures === 0 ? `✅ ${suite}: all passed` : `❌ ${suite}: ${failures} FAILURE(S)`}\n`);
  process.exit(failures === 0 ? 0 : 1);
}
