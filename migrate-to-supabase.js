const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: 'postgres://postgres.wwzjavzqxczmtrqwwnxt:gceYrUniNJEnJvSy@aws-1-eu-north-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    // Run schema
    console.log('=== Running schema migration ===');
    const schema = fs.readFileSync('./supabase-schema.sql', 'utf8');

    // Split by semicolons but handle $$ blocks
    const statements = [];
    let current = '';
    let inDollarBlock = false;

    for (const line of schema.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('--') || trimmed === '') {
        continue;
      }

      if (trimmed.includes('$$')) {
        const count = (trimmed.match(/\$\$/g) || []).length;
        if (count % 2 === 1) inDollarBlock = !inDollarBlock;
      }

      current += line + '\n';

      if (!inDollarBlock && trimmed.endsWith(';')) {
        statements.push(current.trim());
        current = '';
      }
    }
    if (current.trim()) statements.push(current.trim());

    for (const stmt of statements) {
      try {
        await client.query(stmt);
        // Show first 80 chars
        const preview = stmt.replace(/\s+/g, ' ').slice(0, 80);
        console.log('  OK:', preview + (stmt.length > 80 ? '...' : ''));
      } catch (err) {
        const preview = stmt.replace(/\s+/g, ' ').slice(0, 80);
        console.log('  SKIP:', preview, '-', err.message.slice(0, 100));
      }
    }

    // Verify tables
    console.log('\n=== Verifying tables ===');
    const { rows } = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    console.log('Tables:', rows.map(r => r.table_name).join(', '));

    // Check counts
    for (const table of ['users', 'categories', 'questions', 'quiz_settings', 'site_content']) {
      const { rows } = await client.query(`SELECT COUNT(*) as c FROM ${table}`);
      console.log(`  ${table}: ${rows[0].c} rows`);
    }

  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
