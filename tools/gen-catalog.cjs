// Keep Homebrew metadata tied to the exact packaged artifact, including size/hash.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const pkg = require('../package.json');
const app = require('../assets/appinfo.json');
const root = path.join(__dirname, '..');
const filename = `${app.id}_${pkg.version}_all.ipk`;
const repository = pkg.repository.replace(/^github:/, '');
const cdn = `https://cdn.jsdelivr.net/gh/${repository}@main`;
const description =
  'Unofficial YouTube fork with a transparent Green-button settings panel, ad controls, picture framing/zoom, native HDR preference and sleep timer. HDR and resolution depend on the video and TV.';
/** @param {{id: string, title: string, type: string}} info
 * @param {string} text
 * @param {string} shortDescription */
function packageEntry(info, text, shortDescription) {
  const ipk = `${info.id}_${pkg.version}_all.ipk`;
  const bytes = fs.readFileSync(path.join(root, ipk));
  return {
    id: info.id,
    title: info.title,
    iconUri: `${cdn}/assets/largeIcon.png`,
    manifest: {
      id: info.id,
      version: pkg.version,
      type: info.type,
      title: info.title,
      appDescription: text,
      iconUri: `${cdn}/assets/largeIcon.png`,
      sourceUrl: `https://github.com/${repository}`,
      rootRequired: false,
      ipkUrl: `${cdn}/${ipk}`,
      ipkHash: {
        sha256: crypto.createHash('sha256').update(bytes).digest('hex')
      },
      ipkSize: bytes.length
    },
    shortDescription
  };
}
const launcher = require('../launcher/appinfo.json');
const catalog = {
  packages: [
    packageEntry(
      app,
      description,
      'Glass settings with audio/TV shortcuts, ad controls and picture zoom.'
    ),
    packageEntry(
      launcher,
      'Adds a separate LG Home icon that opens your existing YouTube Extended player. Install the player first. No video engine or settings are replaced.',
      'LG Home icon for the installed YouTube Extended player.'
    )
  ]
};
const target = path.join(root, 'apps.json');
const versionTarget = path.join(root, `apps-${pkg.version}.json`);
const output = JSON.stringify(catalog, null, 2) + '\n';
if (process.argv.includes('--check')) {
  if (fs.readFileSync(target, 'utf8') !== output) {
    throw new Error(
      'apps.json does not match the current package. Run pnpm catalog after packaging.'
    );
  }
  if (fs.readFileSync(versionTarget, 'utf8') !== output) {
    throw new Error(
      'Version-specific Homebrew feed does not match apps.json. Run pnpm catalog.'
    );
  }
  console.info('Homebrew version, URL, size and SHA-256 match the IPK.');
} else {
  fs.writeFileSync(target, output);
  fs.writeFileSync(versionTarget, output);
  console.info(`Updated apps.json for ${filename}`);
}
