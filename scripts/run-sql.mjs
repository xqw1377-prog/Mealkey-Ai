import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import pg from 'pg';

const client = new pg.Client({
  host: 'aws-0-ap-southeast-2.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.gwnkfwtvckxnofoiwypn',
  password: 'wangxinquan6066',
  ssl: { rejectUnauthorized: false },
  prepare: false
});

try {
  await client.connect();
  console.log('Connected!');

  const sqlPath = join(process.cwd(), 'apps', 'web', 'supabase-init-utf8.sql');
  let sql = readFileSync(sqlPath, 'utf8');
  
  // Remove BOM
  if (sql.charCodeAt(0) === 0xFEFF) {
    sql = sql.slice(1);
    console.log('Removed BOM');
  }
  
  console.log(`SQL length: ${sql.length}`);

  // Execute
  console.log('Executing...');
  await client.query(sql);
  console.log('SUCCESS!');

  const res = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
  console.log(`Tables: ${res.rows.length}`);
  res.rows.forEach(r => console.log(`  ${r.tablename}`));

} catch (e) {
  console.error('Error:', e.message);
} finally {
  await client.end();
}
