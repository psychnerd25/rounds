const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Jimp = require('jimp-compact');
const root = path.join(__dirname, '..');
(async () => {
  const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'))).expo;
  const icon = await Jimp.read(path.join(root, app.icon));
  assert.equal(icon.bitmap.width, 1024); assert.equal(icon.bitmap.height, 1024);
  for (let i = 3; i < icon.bitmap.data.length; i += 4) assert.equal(icon.bitmap.data[i], 255, 'Store icon must be opaque');
  assert.equal(app.ios.icon, app.icon, 'iOS must use the Rounds icon');
  for (const name of ['foregroundImage', 'monochromeImage']) {
    const layer = await Jimp.read(path.join(root, app.android.adaptiveIcon[name]));
    assert.equal(layer.bitmap.width, 1024); assert.equal(layer.bitmap.height, 1024);
    let pixels = 0;
    layer.scan(0, 0, 1024, 1024, function(x, y, index) {
      if (this.bitmap.data[index + 3] > 10) {
        pixels++;
        assert.ok(x >= 199 && x <= 824 && y >= 199 && y <= 824, `${name} exceeds the 66/108 safe zone`);
        if (name === 'monochromeImage') assert.deepEqual([...this.bitmap.data.subarray(index, index + 3)], [255, 255, 255]);
      }
    });
    assert.ok(pixels > 1000, 'Icon layer must contain a visible mark');
    assert.equal(layer.bitmap.data[3], 0, 'Adaptive layer must be transparent around the mark');
  }
  const splash = app.plugins.find(p => Array.isArray(p) && p[0] === 'expo-splash-screen')[1];
  const mark = await Jimp.read(path.join(root, splash.image));
  assert.equal(mark.bitmap.width, 1024); assert.equal(mark.bitmap.height, 1024);
  assert.equal(mark.bitmap.data[3], 0);
  const favicon = await Jimp.read(path.join(root, app.web.favicon));
  assert.equal(favicon.bitmap.width, 64); assert.equal(favicon.bitmap.height, 64);
  console.log('Brand checks passed: opaque 1024px store icon, safe adaptive layers, monochrome alpha mask, transparent splash and favicon.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
