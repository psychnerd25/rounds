// Platform-sized exports from the imagegen masters. No generative edits here.
const Jimp = require('jimp-compact');
const path = require('node:path');
const directory = path.join(__dirname, '../assets/brand');
(async () => {
  const master = await Jimp.read(path.join(directory, 'rounds-master.png'));
  await master.clone().resize(1024, 1024, Jimp.RESIZE_BICUBIC).writeAsync(path.join(directory, 'rounds-icon.png'));
  await master.clone().resize(64, 64, Jimp.RESIZE_BICUBIC).writeAsync(path.join(directory, 'rounds-favicon.png'));
  const foreground = await Jimp.read(path.join(directory, 'rounds-foreground-master.png'));
  // Fit the supplied transparent mark within Android's central 66/108 safe zone.
  const inset = foreground.clone().resize(920, 920, Jimp.RESIZE_BICUBIC);
  const adaptive = new Jimp(1024, 1024, 0x00000000).composite(inset, 52, 52);
  await adaptive.writeAsync(path.join(directory, 'rounds-adaptive.png'));
  const monochrome = adaptive.clone();
  monochrome.scan(0, 0, 1024, 1024, function(x, y, offset) {
    this.bitmap.data[offset] = this.bitmap.data[offset + 1] = this.bitmap.data[offset + 2] = 255;
  });
  await monochrome.writeAsync(path.join(directory, 'rounds-monochrome.png'));
  await foreground.clone().resize(1024, 1024, Jimp.RESIZE_BICUBIC).writeAsync(path.join(directory, 'rounds-splash.png'));
  console.log('Exported icon, favicon, adaptive foreground, monochrome mask and splash mark.');
})().catch(error => { console.error(error); process.exitCode = 1; });
