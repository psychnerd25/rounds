const { spawnSync } = require('node:child_process');
if (process.env.EAS_BUILD_PROFILE === 'production' || process.env.ROUNDS_RELEASE_CHECK === '1') {
  for (const args of [['scripts/check-brand.cjs'], ['--experimental-strip-types', 'scripts/check-production.mjs']]) {
    const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
} else console.log('Internal/development build: production publication checks are not applied.');
