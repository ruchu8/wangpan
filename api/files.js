// Vercel Serverless Function for file management
const { neon } = require('@neondatabase/serverless');

// 初始化 Neon PostgreSQL 客户端
const sql = neon(process.env.DATABASE_URL);

// 创建数据库表（如果不存在）
async function initializeDatabase() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS files (
        id SERIAL PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    
    await sql`
      CREATE TABLE IF NOT EXISTS admin_tokens (
        id SERIAL PRIMARY KEY,
        token TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    
    // 检查是否有管理员令牌，如果没有则创建一个默认的
    const result = await sql`SELECT * FROM admin_tokens LIMIT 1`;
    if (result.length === 0) {
      // 创建默认管理员令牌
      await sql`INSERT INTO admin_tokens (token) VALUES ('default_admin_token')`;
    }
    
    // 检查是否有文件数据，如果没有则创建一个空数组
    const filesResult = await sql`SELECT * FROM files LIMIT 1`;
    if (filesResult.length === 0) {
      // 创建默认文件数据
      await sql`INSERT INTO files (data) VALUES ($1)`, [JSON.stringify([])];
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
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Handle different HTTP methods
  if (req.method === 'GET') {
    // GET 请求不需要身份验证，公开访问文件列表
    try {
      const result = await sql`SELECT data FROM files LIMIT 1`;
      const files = result.length > 0 ? JSON.parse(result[0].data) : [];
      
      return res.status(200).json(files);
    } catch (error) {
      console.error('Failed to fetch files:', error);
      return res.status(500).json({ error: 'Failed to fetch files' });
    }
  } else {
    // 其他请求（POST, PUT, DELETE）需要身份验证
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const adminTokenResult = await sql`SELECT * FROM admin_tokens WHERE token = ${token}`;
    
    if (adminTokenResult.length === 0) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Handle POST, PUT, DELETE methods
    if (req.method === 'POST') {
      try {
        const newFile = req.body;
        
        // 验证文件数据
        if (!newFile || !newFile.name || !newFile.type) {
          return res.status(400).json({ error: 'Invalid file data: name and type are required' });
        }

        // 获取现有文件数据
        const result = await sql`SELECT data FROM files LIMIT 1`;
        let files = result.length > 0 ? JSON.parse(result[0].data) : [];
        
        // 确保 files 是数组
        if (!Array.isArray(files)) {
          files = [];
        }
        
        files.push(newFile);
        
        // 更新文件数据
        await sql`DELETE FROM files`;
        await sql`INSERT INTO files (data) VALUES (${JSON.stringify(files)})`;
        
        return res.status(201).json(newFile);
      } catch (error) {
        console.error('Failed to add file:', error);
        return res.status(500).json({ error: 'Failed to add file: ' + error.message });
      }
    } else if (req.method === 'PUT') {
      try {
        const { index, file } = req.body;
        
        if (index === undefined || !file) {
          return res.status(400).json({ error: 'Invalid update data' });
        }

        // 获取现有文件数据
        const result = await sql`SELECT data FROM files LIMIT 1`;
        let files = result.length > 0 ? JSON.parse(result[0].data) : [];
        
        // 确保 files 是数组
        if (!Array.isArray(files)) {
          files = [];
        }
        
        if (index < 0 || index >= files.length) {
          return res.status(404).json({ error: 'File not found' });
        }
        
        // 更新文件
        files[index] = file;
        
        // 更新文件数据
        await sql`DELETE FROM files`;
        await sql`INSERT INTO files (data) VALUES (${JSON.stringify(files)})`;
        
        return res.status(200).json(file);
      } catch (error) {
        console.error('Failed to update file:', error);
        return res.status(500).json({ error: 'Failed to update file' });
      }
    } else if (req.method === 'DELETE') {
      try {
        const { index } = req.body;
        
        if (index === undefined) {
          return res.status(400).json({ error: 'Invalid delete request' });
        }

        // 获取现有文件数据
        const result = await sql`SELECT data FROM files LIMIT 1`;
        let files = result.length > 0 ? JSON.parse(result[0].data) : [];
        
        // 确保 files 是数组
        if (!Array.isArray(files)) {
          files = [];
        }
        
        if (index < 0 || index >= files.length) {
          return res.status(404).json({ error: 'File not found' });
        }
        
        // 删除文件
        files.splice(index, 1);
        
        // 更新文件数据
        await sql`DELETE FROM files`;
        await sql`INSERT INTO files (data) VALUES (${JSON.stringify(files)})`;
        
        return res.status(200).json({ message: 'File deleted successfully' });
      } catch (error) {
        console.error('Failed to delete file:', error);
        return res.status(500).json({ error: 'Failed to delete file' });
      }
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  }
};