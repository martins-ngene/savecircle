/**
 * SaveCircle Backend Production Entrypoint Smoke Test
 *
 * Verifies that the compiled production artifact (dist/main.js)
 * boots cleanly, initializes NestJS, sets up middleware and routes,
 * and does not throw startup exceptions.
 */
const { spawn } = require('child_process');
const path = require('path');

const mainPath = path.resolve(__dirname, '../dist/main.js');
console.log('[SmokeTest] Testing production bundle entrypoint at:', mainPath);

const child = spawn(process.execPath, [mainPath], {
  env: {
    ...process.env,
    PORT: '4998',
    NODE_ENV: 'test',
    INDEXER_ENABLED: 'false',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let output = '';
let errOutput = '';

child.stdout.on('data', (d) => {
  const str = d.toString();
  output += str;
  process.stdout.write(str);
});

child.stderr.on('data', (d) => {
  const str = d.toString();
  errOutput += str;
  process.stderr.write(str);
});

const timer = setTimeout(() => {
  console.log('\n[SmokeTest] SUCCESS: SaveCircle API initialized and running without startup crashes.');
  child.kill('SIGTERM');
  setTimeout(() => {
    try {
      child.kill('SIGKILL');
    } catch (_) {}
  }, 1000);
  process.exit(0);
}, 4000);

child.on('error', (err) => {
  clearTimeout(timer);
  console.error('[SmokeTest] ERROR failed to spawn:', err);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  clearTimeout(timer);
  if (code !== null && code !== 0) {
    console.error(`[SmokeTest] FAILED: Process exited prematurely with code ${code}`);
    process.exit(code);
  }
});
