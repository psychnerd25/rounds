const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const root = path.join(__dirname, '..');
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function readPng(filename) {
  const source = fs.readFileSync(filename);
  assert.ok(source.subarray(0, 8).equals(signature), `${filename} must be a PNG`);
  let offset = 8, width, height, bitDepth, colorType, interlace, transparentChunk = false;
  const idat = [];
  while (offset < source.length) {
    const length = source.readUInt32BE(offset);
    const type = source.toString('ascii', offset + 4, offset + 8);
    const data = source.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      bitDepth = data[8]; colorType = data[9]; interlace = data[12];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'tRNS') transparentChunk = true;
    offset += 12 + length;
    if (type === 'IEND') break;
  }
  assert.ok(width && height && idat.length, `${filename} has an invalid PNG structure`);
  assert.equal(bitDepth, 8, `${filename} must use 8-bit PNG channels`);
  assert.equal(interlace, 0, `${filename} must be non-interlaced`);
  const channels = ({0: 1, 2: 3, 4: 2, 6: 4})[colorType];
  assert.ok(channels, `${filename} uses an unsupported PNG color type`);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const pixels = Buffer.alloc(stride * height);
  let input = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[input++];
    for (let x = 0; x < stride; x++) {
      const value = raw[input++];
      const left = x >= channels ? pixels[y * stride + x - channels] : 0;
      const up = y ? pixels[(y - 1) * stride + x] : 0;
      const upLeft = y && x >= channels ? pixels[(y - 1) * stride + x - channels] : 0;
      let decoded;
      if (filter === 0) decoded = value;
      else if (filter === 1) decoded = value + left;
      else if (filter === 2) decoded = value + up;
      else if (filter === 3) decoded = value + Math.floor((left + up) / 2);
      else if (filter === 4) decoded = value + paeth(left, up, upLeft);
      else throw new Error(`${filename} has an unsupported PNG filter`);
      pixels[y * stride + x] = decoded & 255;
    }
  }
  return { width, height, colorType, channels, pixels, transparentChunk };
}

function alphaAt(image, pixelIndex) {
  if (image.colorType === 6) return image.pixels[pixelIndex * 4 + 3];
  if (image.colorType === 4) return image.pixels[pixelIndex * 2 + 1];
  return image.transparentChunk ? 0 : 255;
}

function rgbAt(image, pixelIndex) {
  if (image.colorType === 6 || image.colorType === 2) {
    const base = pixelIndex * image.channels;
    return [image.pixels[base], image.pixels[base + 1], image.pixels[base + 2]];
  }
  const base = pixelIndex * image.channels;
  const value = image.pixels[base];
  return [value, value, value];
}

(() => {
  const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'))).expo;
  const icon = readPng(path.join(root, app.icon));
  assert.equal(icon.width, 1024); assert.equal(icon.height, 1024);
  for (let i = 0; i < icon.width * icon.height; i++)
    assert.equal(alphaAt(icon, i), 255, 'Store icon must be fully opaque');
  assert.equal(app.ios.icon, app.icon, 'iOS must use the Rounds icon');

  for (const name of ['foregroundImage', 'monochromeImage']) {
    const layer = readPng(path.join(root, app.android.adaptiveIcon[name]));
    assert.equal(layer.width, 1024); assert.equal(layer.height, 1024);
    let visible = 0;
    for (let y = 0; y < layer.height; y++) for (let x = 0; x < layer.width; x++) {
      const index = y * layer.width + x;
      if (alphaAt(layer, index) > 10) {
        visible++;
        assert.ok(x >= 199 && x <= 824 && y >= 199 && y <= 824, `${name} exceeds the adaptive-icon safe zone`);
        if (name === 'monochromeImage') assert.deepEqual(rgbAt(layer, index), [255, 255, 255]);
      }
    }
    assert.ok(visible > 1000, `${name} must contain a visible mark`);
    assert.equal(alphaAt(layer, 0), 0, `${name} must be transparent around the mark`);
  }

  const splashConfig = app.plugins.find(p => Array.isArray(p) && p[0] === 'expo-splash-screen')?.[1];
  assert.ok(splashConfig?.image, 'Splash image must be configured');
  const splash = readPng(path.join(root, splashConfig.image));
  assert.equal(splash.width, 1024); assert.equal(splash.height, 1024);
  assert.equal(alphaAt(splash, 0), 0, 'Splash mark must be transparent around the artwork');

  const favicon = readPng(path.join(root, app.web.favicon));
  assert.equal(favicon.width, 64); assert.equal(favicon.height, 64);
  console.log('Brand checks passed: opaque 1024px iOS icon, valid adaptive layers, transparent splash and 64px favicon.');
})();
