// CommonJS entry point required by LiteSpeed's managed Node loader; application is ESM.
const path = require('node:path');
const fs = require('node:fs');
const envFile = path.resolve(__dirname, '../.env');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
const runtimeFile = path.resolve(__dirname, '../.env.runtime');
if (fs.existsSync(runtimeFile)) process.loadEnvFile(runtimeFile);
process.env.NODE_ENV = 'production';
process.env.ADMIN_WEB_DIST = path.join(__dirname, 'web');
process.env.UPLOADS_DIR ??= path.resolve(__dirname, '../uploads');
import('./api/index.js').catch(() => { console.error('LYNE_START_FAILED'); process.exitCode = 1; });
