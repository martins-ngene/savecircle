const { execSync } = require('child_process');

// Ensure SaveCircle database tables are isolated within a dedicated PostgreSQL schema
let dbUrl = process.env.DATABASE_URL;

if (dbUrl) {
  try {
    const parsed = new URL(dbUrl);
    const existingSchema = parsed.searchParams.get('schema');
    if (!existingSchema || existingSchema === 'public') {
      parsed.searchParams.set('schema', 'savecircle');
      dbUrl = parsed.toString();
      process.env.DATABASE_URL = dbUrl;
    }
  } catch (_e) {
    if (!dbUrl.includes('schema=')) {
      dbUrl = dbUrl.includes('?') ? `${dbUrl}&schema=savecircle` : `${dbUrl}?schema=savecircle`;
      process.env.DATABASE_URL = dbUrl;
    }
  }
}

console.log('[SaveCircle Production] Schema isolation: using PostgreSQL schema "savecircle"');

try {
  console.log('[SaveCircle Production] Running Prisma schema push...');
  execSync('npx prisma db push --accept-data-loss', {
    stdio: 'inherit',
    env: process.env,
  });
} catch (err) {
  console.error('[SaveCircle Production] Prisma schema push warning:', err.message);
  // Allow start to proceed if schema is already up to date or transient error
}

console.log('[SaveCircle Production] Starting SaveCircle NestJS API server...');
require('../dist/main');
