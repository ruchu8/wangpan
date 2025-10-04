require('dotenv').config();
const { Client } = require('@neondatabase/serverless');

async function testDatabaseConnection() {
  // 优先使用 VERCEL 环境变量，然后是 POSTGRES_URL，最后是 DATABASE_URL
  const DATABASE_URL = process.env.POSTGRES_URL || process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_uQK81FdVvOjX@ep-bold-mode-a1z19z94-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
  
  console.log('Testing database connection...');
  console.log('Database URL:', DATABASE_URL ? DATABASE_URL.substring(0, 30) + '...' : 'Not found');
  
  if (!DATABASE_URL) {
    console.error('❌ Database URL not found in environment variables');
    return;
  }
  
  const client = new Client(DATABASE_URL);

  try {
    await client.connect();
    console.log('✅ Connected to database successfully');
    
    // 测试查询
    const result = await client.query('SELECT version()');
    console.log('✅ Database version:', result.rows[0].version);
    
    // 测试表查询
    try {
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      console.log('✅ Available tables:', tablesResult.rows.map(row => row.table_name).join(', '));
    } catch (tableError) {
      console.log('⚠️  Could not query tables:', tableError.message);
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  } finally {
    await client.end();
    console.log('Disconnected from database');
  }
}

testDatabaseConnection();