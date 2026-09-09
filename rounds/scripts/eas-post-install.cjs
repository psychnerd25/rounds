const { spawnSync } = require('node:child_process');

function run(args) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (process.env.EAS_BUILD_PROFILE === 'production') {
  run(['scripts/check-brand.cjs']);
  console.log('Production build: brand checks passed. Content is loaded from the public Firestore catalog.');
}

// Optional stricter editorial/release audit for future use. It is deliberately
// not part of the normal App Store/Play Store build because the current product
// uses the simple five-field content workflow.
if (process.env.ROUNDS_RELEASE_CHECK === '1') {
  run(['--experimental-strip-types', 'scripts/check-production.mjs']);
}
