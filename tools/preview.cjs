// Local integration fixture using the production user script; no YouTube login.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
/** @type {Record<string, [string, string]>} */
const routes = {
  '/': ['tests/fixtures/player.html', 'text/html'],
  '/userScript.js': ['dist/webOSUserScripts/userScript.js', 'text/javascript']
};
http
  .createServer((req, res) => {
    const route = routes[req.url?.split('?')[0] || '/'];
    if (!route) {
      res.writeHead(404).end();
      return;
    }
    res.setHeader('Content-Type', route[1]);
    fs.createReadStream(path.join(root, route[0])).pipe(res);
  })
  .listen(4173, '127.0.0.1', () =>
    console.info('Integration fixture: http://127.0.0.1:4173')
  );
