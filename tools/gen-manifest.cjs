#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');

const outfile = process.argv[2];
if (!outfile) throw new Error('Usage: gen-manifest <outfile>');

const appinfo = require('../assets/appinfo.json');
const pkgJson = require('../package.json');
const ipkfile = `${appinfo.id}_${pkgJson.version}_all.ipk`;
const ipkhash = crypto
  .createHash('sha256')
  .update(fs.readFileSync(ipkfile))
  .digest('hex');

fs.writeFileSync(
  outfile,
  JSON.stringify({
    id: appinfo.id,
    version: pkgJson.version,
    type: appinfo.type,
    title: appinfo.title,
    iconUri: `https://cdn.jsdelivr.net/gh/${pkgJson.repository.replace(/^github:/, '')}@main/assets/largeIcon.png`,
    sourceUrl: `https://github.com/${pkgJson.repository.replace(/^github:/, '')}`,
    rootRequired: false,
    ipkUrl: ipkfile,
    ipkSize: fs.statSync(ipkfile).size,
    ipkHash: {
      sha256: ipkhash
    }
  })
);
