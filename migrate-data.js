const mysql = require('mysql2/promise');
const { Pool } = require('pg');

const mysqlConfig = {
  host: 'muanamayelecom01.mysql.domeneshop.no',
  user: 'muanamayelecom01',
  password: '0rotte-Sloss-fjott-ropt',
  database: 'muanamayelecom01',
};

const pgPool = new Pool({
  connectionString: 'postgres://postgres.wwzjavzqxczmtrqwwnxt:gceYrUniNJEnJvSy@aws-1-eu-north-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false },
});

async function run() {
  console.log('Connecting to MySQL...');
  const mysqlConn = await mysql.createConnection(mysqlConfig);
  const pg = await pgPool.connect();

  try {
    // 1. Migrate users
    console.log('\n=== Migrating users ===');
    const [users] = await mysqlConn.query('SELECT * FROM users ORDER BY id');
    console.log(`  Found ${users.length} users in MySQL`);

    for (const u of users) {
      try {
        await pg.query(
          `INSERT INTO users (id, full_name, email, phone, country_code, profession, neighborhood, role, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
          [u.id, u.full_name, u.email, u.phone, u.country_code, u.profession, u.neighborhood, u.role || 'user', u.created_at, u.updated_at]
        );
      } catch (e) {
        console.log(`  SKIP user ${u.id} (${u.full_name}): ${e.message.slice(0, 80)}`);
      }
    }
    // Reset sequence
    if (users.length > 0) {
      const maxId = Math.max(...users.map(u => u.id));
      await pg.query(`SELECT setval('users_id_seq', $1, true)`, [maxId]);
    }
    const { rows: uCount } = await pg.query('SELECT COUNT(*) as c FROM users');
    console.log(`  Migrated: ${uCount[0].c} users`);

    // 2. Migrate categories (map old IDs to new)
    console.log('\n=== Migrating categories ===');
    const [cats] = await mysqlConn.query('SELECT * FROM categories ORDER BY id');
    console.log(`  Found ${cats.length} categories in MySQL`);

    // Clear existing and re-insert with same IDs
    await pg.query('DELETE FROM categories');
    for (const c of cats) {
      await pg.query(
        `INSERT INTO categories (id, name, description, created_at) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING`,
        [c.id, c.name, c.description, c.created_at]
      );
    }
    if (cats.length > 0) {
      const maxId = Math.max(...cats.map(c => c.id));
      await pg.query(`SELECT setval('categories_id_seq', $1, true)`, [maxId]);
    }
    const { rows: cCount } = await pg.query('SELECT COUNT(*) as c FROM categories');
    console.log(`  Migrated: ${cCount[0].c} categories`);

    // 3. Migrate questions
    console.log('\n=== Migrating questions ===');
    const [questions] = await mysqlConn.query('SELECT * FROM questions ORDER BY id');
    console.log(`  Found ${questions.length} questions in MySQL`);

    let qInserted = 0;
    for (const q of questions) {
      try {
        // Options might be a string or already parsed
        const options = typeof q.options === 'string' ? q.options : JSON.stringify(q.options);
        await pg.query(
          `INSERT INTO questions (id, category_id, question, options, correct_answer, difficulty, is_active, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
          [q.id, q.category_id, q.question, options, q.correct_answer, q.difficulty || 'medium', q.is_active !== false && q.is_active !== 0, q.created_at, q.updated_at]
        );
        qInserted++;
      } catch (e) {
        console.log(`  SKIP question ${q.id}: ${e.message.slice(0, 80)}`);
      }
    }
    if (questions.length > 0) {
      const maxId = Math.max(...questions.map(q => q.id));
      await pg.query(`SELECT setval('questions_id_seq', $1, true)`, [maxId]);
    }
    console.log(`  Migrated: ${qInserted} questions`);

    // 4. Migrate quiz_sessions
    console.log('\n=== Migrating quiz sessions ===');
    const [sessions] = await mysqlConn.query('SELECT * FROM quiz_sessions ORDER BY id');
    console.log(`  Found ${sessions.length} sessions in MySQL`);

    let sInserted = 0;
    for (const s of sessions) {
      try {
        await pg.query(
          `INSERT INTO quiz_sessions (id, user_id, started_at, ended_at, time_taken, total_questions, correct_answers, wrong_answers, score, total_points, percentage, is_completed)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (id) DO NOTHING`,
          [s.id, s.user_id, s.started_at, s.ended_at, s.time_taken || 0, s.total_questions || 20, s.correct_answers || 0, s.wrong_answers || 0, s.score || 0, s.total_points || 0, s.percentage || 0, s.is_completed ? true : false]
        );
        sInserted++;
      } catch (e) {
        console.log(`  SKIP session ${s.id}: ${e.message.slice(0, 80)}`);
      }
    }
    if (sessions.length > 0) {
      const maxId = Math.max(...sessions.map(s => s.id));
      await pg.query(`SELECT setval('quiz_sessions_id_seq', $1, true)`, [maxId]);
    }
    console.log(`  Migrated: ${sInserted} sessions`);

    // 5. Migrate quiz_answers
    console.log('\n=== Migrating quiz answers ===');
    const [answers] = await mysqlConn.query('SELECT * FROM quiz_answers ORDER BY id');
    console.log(`  Found ${answers.length} answers in MySQL`);

    let aInserted = 0;
    for (const a of answers) {
      try {
        await pg.query(
          `INSERT INTO quiz_answers (id, session_id, question_id, selected_answer, is_correct, answered_at)
           VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
          [a.id, a.session_id, a.question_id, a.selected_answer, a.is_correct ? true : false, a.answered_at]
        );
        aInserted++;
      } catch (e) {
        // Skip silently (FK violations if session/question was skipped)
      }
    }
    if (answers.length > 0) {
      const maxId = Math.max(...answers.map(a => a.id));
      await pg.query(`SELECT setval('quiz_answers_id_seq', $1, true)`, [maxId]);
    }
    console.log(`  Migrated: ${aInserted} answers`);

    // 6. Migrate quiz_settings
    console.log('\n=== Migrating quiz settings ===');
    const [settings] = await mysqlConn.query('SELECT * FROM quiz_settings WHERE id = 1');
    if (settings.length > 0) {
      const s = settings[0];
      await pg.query(
        `UPDATE quiz_settings SET time_limit=$1, is_open=$2, schedule_enabled=$3, schedule_days=$4,
         schedule_start_time=$5, schedule_end_time=$6, schedule_timezone=$7 WHERE id=1`,
        [s.time_limit, s.is_open ? true : false, s.schedule_enabled ? true : false,
         s.schedule_days || null, s.schedule_start_time || null, s.schedule_end_time || null,
         s.schedule_timezone || 'Africa/Kinshasa']
      );
      console.log('  Settings migrated');
    }

    // 7. Migrate site_content
    console.log('\n=== Migrating site content ===');
    const [content] = await mysqlConn.query('SELECT * FROM site_content ORDER BY id');
    console.log(`  Found ${content.length} content items in MySQL`);

    // Update existing by section+key
    let scUpdated = 0;
    for (const c of content) {
      const res = await pg.query(
        'UPDATE site_content SET content_value = $1 WHERE section = $2 AND content_key = $3',
        [c.content_value, c.section, c.content_key]
      );
      if (res.rowCount > 0) scUpdated++;
    }
    console.log(`  Updated: ${scUpdated} content items`);

    console.log('\n=== Migration complete! ===');
  } finally {
    await mysqlConn.end();
    pg.release();
    await pgPool.end();
  }
}

run().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
