const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '..', 'backend', '.env');
const content = fs.readFileSync(envPath, 'utf8');
const match = content.match(/^\s*DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/m);
if (!match) {
  console.error('NO_DATABASE_URL');
  process.exit(1);
}

const client = new Client({ connectionString: match[1] });
client
  .connect()
  .then(() => client.query('SELECT 1 AS ok'))
  .then((r) => {
    console.log('DB_OK', JSON.stringify(r.rows[0]));
    return client.end();
  })
  .catch((e) => {
    console.error('DB_FAIL', e.message);
    process.exit(1);
  });
