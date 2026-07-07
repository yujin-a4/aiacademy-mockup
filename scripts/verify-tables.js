require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { Client } = require('pg');
async function main() {
  const client = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const res = await client.query("select table_name from information_schema.tables where table_schema='public' order by table_name");
  console.log(res.rows.map((r) => r.table_name).join('\n'));
  await client.end();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
