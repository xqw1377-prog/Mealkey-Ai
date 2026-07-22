import { readFileSync } from 'fs';
import { join } from 'path';

const SQL_URL = "postgresql://postgres:wangxinquan6066@db.gwnkfwtvckxnofoiwypn.supabase.co:5432/postgres?sslmode=require";

async function main() {
  // Dynamic import of pg from apps/web node_modules
  const { Client } = await import('pg');
  
  const client = new Client({
    connectionString: SQL_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to Supabase...');
    await client.connect();
    console.log('Connected!');

    // Read the SQL file
    const sqlPath = join(process.cwd(), 'apps', 'web', 'supabase-init.sql');
    const sql = readFileSync(sqlPath, 'utf8');
    console.log(`SQL file loaded: ${sql.length} chars`);

    // Execute the SQL
    console.log('Executing SQL...');
    await client.query(sql);
    console.log('SQL executed successfully!');

    // Verify tables
    const res = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
    console.log(`Tables created: ${res.rows.length}`);
    res.rows.forEach(r => console.log(`  - ${r.tablename}`));

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await client.end();
  }
}

main();
