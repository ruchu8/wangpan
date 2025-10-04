require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

async function fixDatabase() {
  console.log('Fixing database structure...');
  
  // 优先使用 VERCEL 环境变量，然后是 POSTGRES_URL，最后是 DATABASE_URL
  const databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ Database URL not found in environment variables');
    return;
  }
  
  console.log('Using database URL:', databaseUrl.substring(0, 30) + '...');
  
  const sql = neon(databaseUrl);

  try {
    // 重新创建表结构以确保一致性
    console.log('Recreating table structures...');
    
    // 创建管理员凭证表
    await sql`
      CREATE TABLE IF NOT EXISTS admin_credentials (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✅ admin_credentials table ensured');
    
    // 创建管理员令牌表
    await sql`
      CREATE TABLE IF NOT EXISTS admin_tokens (
        id SERIAL PRIMARY KEY,
        token TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✅ admin_tokens table ensured');
    
    // 创建留言表
    await sql`
      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        content TEXT NOT NULL,
        date TEXT NOT NULL,
        approved BOOLEAN DEFAULT false,
        ip TEXT,
        reply TEXT
      )
    `;
    console.log('✅ comments table ensured');
    
    // 确保默认管理员凭证存在
    const adminCredResult = await sql`SELECT COUNT(*) as count FROM admin_credentials`;
    if (parseInt(adminCredResult[0].count) === 0) {
      await sql`INSERT INTO admin_credentials (username, password) VALUES ('admin', 'admin123')`;
      console.log('✅ Default admin credentials created');
    } else {
      console.log('✅ Admin credentials already exist');
    }
    
    // 确保默认管理员令牌存在
    const adminTokenResult = await sql`SELECT COUNT(*) as count FROM admin_tokens`;
    if (parseInt(adminTokenResult[0].count) === 0) {
      await sql`INSERT INTO admin_tokens (token) VALUES ('default_admin_token')`;
      console.log('✅ Default admin token created');
    } else {
      console.log('✅ Admin token already exists');
    }
    
    console.log('✅ Database fix completed successfully');
  } catch (error) {
    console.error('❌ Database fix failed:', error.message);
    console.error('Error stack:', error.stack);
  }
}

fixDatabase();