// Keep Homebrew metadata tied to the exact packaged artifact, including size/hash.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const pkg = require('../package.json');
const app = require('../assets/appinfo.json');
const root = path.join(__dirname, '..');
const filename = `${app.id}_${pkg.version}_all.ipk`;
const binary = fs.readFileSync(path.join(root, filename));
const repository = pkg.repository.replace(/^github:/, '');
const cdn = `https://cdn.jsdelivr.net/gh/${repository}@main`;
const description =
  'Unofficial YouTube fork with lightweight glass styling and music-first browsing. Playback formats depend on the TV and video.';
const catalog = {
  packages: [
    {
      id: app.id,
      title: app.title,
      iconUri: `${cdn}/assets/largeIcon.png`,
      manifest: {
        id: app.id,
        version: pkg.version,
        type: app.type,
        title: app.title,
        appDescription: description,
        iconUri: `${cdn}/assets/largeIcon.png`,
        sourceUrl: `https://github.com/${repository}`,
        rootRequired: false,
        ipkUrl: `${cdn}/${filename}`,
        ipkHash: {
          sha256: crypto.createHash('sha256').update(binary).digest('hex')
        },
        ipkSize: binary.length
      },
      shortDescription: 'Glass-inspired YouTube with music-first browsing.'
    }
  ]
};
const target = path.join(root, 'apps.json');
const output = JSON.stringify(catalog, null, 2) + '\n';
if (process.argv.includes('--check')) {
  if (fs.readFileSync(target, 'utf8') !== output) {
    throw new Error(
      'apps.json does not match the current package. Run pnpm catalog after packaging.'
    );
  }
  console.info('Homebrew version, URL, size and SHA-256 match the IPK.');
} else {
  fs.writeFileSync(target, output);
  console.info(`Updated apps.json for ${filename}`);
}
