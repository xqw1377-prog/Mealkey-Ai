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
  
  // Test simple query
  const r1 = await client.query('SELECT 1 as test');
  console.log('Test query:', r1.rows);
  
  // Check existing tables
  const r2 = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
  console.log('Existing tables:', r2.rows.length);
  
  // Try a simple CREATE TABLE
  await client.query('CREATE TABLE IF NOT EXISTS _test_conn (id int)');
  console.log('CREATE TABLE worked!');
  await client.query('DROP TABLE IF EXISTS _test_conn');
  console.log('DROP TABLE worked!');
  
} catch (e) {
  console.error('Error:', e.message);
} finally {
  await client.end();
}
