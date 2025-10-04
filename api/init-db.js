// Vercel Serverless Function for manual database initialization
const { neon } = require('@neondatabase/serverless');

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    try {
      console.log('Manual database initialization request received');
      
      // 初始化 Neon PostgreSQL 客户端
      // 优先使用 VERCEL 环境变量，然后是 POSTGRES_URL，最后是 DATABASE_URL
      const databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
      
      if (!databaseUrl) {
        console.error('❌ Database URL not found in environment variables');
        return res.status(500).json({ 
          error: 'Database URL not found in environment variables'
        });
      }

      console.log('Using database URL:', databaseUrl.substring(0, 30) + '...');
      const sql = neon(databaseUrl);
      
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
      
      // 检查是否有管理员凭证，如果没有则创建默认的
      const result = await sql`SELECT COUNT(*) as count FROM admin_credentials`;
      if (parseInt(result[0].count) === 0) {
        // 创建默认管理员凭证
        await sql`INSERT INTO admin_credentials (username, password) VALUES ('admin', 'admin123')`;
        console.log('✅ Default admin credentials created');
      } else {
        console.log('✅ Admin credentials already exist');
      }
      
      // 检查是否有管理员令牌，如果没有则创建一个默认的
      const tokenResult = await sql`SELECT COUNT(*) as count FROM admin_tokens`;
      if (parseInt(tokenResult[0].count) === 0) {
        // 创建默认管理员令牌
        await sql`INSERT INTO admin_tokens (token) VALUES ('default_admin_token')`;
        console.log('✅ Default admin token created');
      } else {
        console.log('✅ Admin token already exists');
      }
      
      console.log('✅ Database initialization completed successfully');
      return res.status(200).json({
        success: true,
        message: 'Database initialization completed successfully'
      });
    } catch (error) {
      console.error('❌ Database initialization error:', error);
      return res.status(500).json({ 
        error: 'Database initialization failed',
        message: error.message
      });
    }
  } else if (req.method === 'GET') {
    return res.status(200).json({ 
      message: 'Send a POST request to this endpoint to manually initialize the database tables' 
    });
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
};