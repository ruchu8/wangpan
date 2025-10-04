// Vercel Serverless Function for authentication
const { neon } = require('@neondatabase/serverless');

// 初始化 Neon PostgreSQL 客户端
const sql = neon(process.env.DATABASE_URL);

// 创建数据库表（如果不存在）
async function initializeDatabase() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS admin_credentials (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    
    await sql`
      CREATE TABLE IF NOT EXISTS admin_tokens (
        id SERIAL PRIMARY KEY,
        token TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    
    // 检查是否有管理员凭证，如果没有则创建默认的
    const result = await sql`SELECT * FROM admin_credentials LIMIT 1`;
    if (result.length === 0) {
      // 创建默认管理员凭证
      await sql`INSERT INTO admin_credentials (username, password) VALUES ('admin', 'admin123')`;
    }
    
    // 检查是否有管理员令牌，如果没有则创建一个默认的
    const tokenResult = await sql`SELECT * FROM admin_tokens LIMIT 1`;
    if (tokenResult.length === 0) {
      // 创建默认管理员令牌
      await sql`INSERT INTO admin_tokens (token) VALUES ('default_admin_token')`;
    }
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
}

// 初始化数据库
initializeDatabase();

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
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      // 获取管理员凭证
      const adminCredentialsResult = await sql`SELECT * FROM admin_credentials LIMIT 1`;
      
      if (adminCredentialsResult.length === 0) {
        return res.status(500).json({ error: 'Admin credentials not initialized' });
      }
      
      const adminCredentials = adminCredentialsResult[0];
      const adminTokenResult = await sql`SELECT * FROM admin_tokens LIMIT 1`;
      
      if (adminTokenResult.length === 0) {
        return res.status(500).json({ error: 'Admin token not initialized' });
      }
      
      const adminToken = adminTokenResult[0].token;
      
      if (username === adminCredentials.username && password === adminCredentials.password) {
        return res.status(200).json({ 
          success: true, 
          token: adminToken,
          message: 'Login successful' 
        });
      } else {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid credentials' 
        });
      }
    } catch (error) {
      console.error('Authentication error:', error);
      return res.status(500).json({ error: 'Authentication failed' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
};