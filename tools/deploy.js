import { spawnSync } from 'node:child_process';
import { normalize } from 'node:path';

import pkgJson from '../package.json' with { type: 'json' };
import appInfo from '../assets/appinfo.json' with { type: 'json' };
import launcherInfo from '../launcher/appinfo.json' with { type: 'json' };

for (const app of [appInfo, launcherInfo]) {
  const result = spawnSync(
    normalize('./node_modules/.bin/ares-install'),
    [normalize(`./${app.id}_${pkgJson.version}_all.ipk`)],
    { stdio: 'inherit', shell: true }
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
}
