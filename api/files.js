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
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        url TEXT,
        note TEXT,
        children JSONB DEFAULT '[]',
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
      // 创建默认管理员令牌（在实际应用中，应该通过环境变量或安全的方式设置）
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
      const result = await sql`SELECT * FROM files ORDER BY id`;
      const files = result.map(row => ({
        id: row.id,
        name: row.name,
        type: row.type,
        url: row.url,
        note: row.note,
        children: row.children || [],
        expanded: false
      }));
      
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

        // 插入新文件到数据库
        const result = await sql`
          INSERT INTO files (name, type, url, note, children)
          VALUES (${newFile.name}, ${newFile.type}, ${newFile.url || null}, ${newFile.note || null}, ${JSON.stringify(newFile.children || [])})
          RETURNING *
        `;
        
        return res.status(201).json(result[0]);
      } catch (error) {
        console.error('Failed to add file:', error);
        return res.status(500).json({ error: 'Failed to add file: ' + error.message });
      }
    } else if (req.method === 'PUT') {
      try {
        const { index, file, filesList } = req.body;
        
        // 如果提供了 filesList，则替换整个文件列表（用于导入功能）
        if (filesList && Array.isArray(filesList) && filesList.length > 0) {
          // 验证文件列表
          if (!filesList.every(f => f && f.name && f.type)) {
            return res.status(400).json({ error: 'Invalid files list: each file must have name and type' });
          }
          
          // 清空现有文件
          await sql`DELETE FROM files`;
          
          // 插入新文件列表
          for (const f of filesList) {
            await sql`
              INSERT INTO files (name, type, url, note, children)
              VALUES (${f.name}, ${f.type}, ${f.url || null}, ${f.note || null}, ${JSON.stringify(f.children || [])})
            `;
          }
          
          return res.status(200).json({ message: 'Files list updated successfully', count: filesList.length });
        }
        
        // 如果提供了 filesList 但是空数组，则清空文件列表
        if (filesList && Array.isArray(filesList) && filesList.length === 0) {
          await sql`DELETE FROM files`;
          return res.status(200).json({ message: 'Files list cleared successfully', count: 0 });
        }
        
        // 否则，更新单个文件（原有功能）
        if (index === undefined || !file) {
          return res.status(400).json({ error: 'Invalid update data' });
        }

        // 获取所有文件
        const result = await sql`SELECT * FROM files ORDER BY id`;
        const files = result.map(row => ({
          id: row.id,
          name: row.name,
          type: row.type,
          url: row.url,
          note: row.note,
          children: row.children || []
        }));
        
        if (index < 0 || index >= files.length) {
          return res.status(404).json({ error: 'File not found' });
        }
        
        // 更新文件
        const fileId = files[index].id;
        await sql`
          UPDATE files 
          SET name = ${file.name}, type = ${file.type}, url = ${file.url || null}, 
              note = ${file.note || null}, children = ${JSON.stringify(file.children || [])}
          WHERE id = ${fileId}
        `;
        
        // 获取更新后的文件
        const updatedResult = await sql`SELECT * FROM files WHERE id = ${fileId}`;
        return res.status(200).json(updatedResult[0]);
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

        // 获取所有文件
        const result = await sql`SELECT * FROM files ORDER BY id`;
        const files = result.map(row => ({
          id: row.id,
          name: row.name,
          type: row.type,
          url: row.url,
          note: row.note,
          children: row.children || []
        }));
        
        if (index < 0 || index >= files.length) {
          return res.status(404).json({ error: 'File not found' });
        }
        
        // 删除文件
        const fileId = files[index].id;
        await sql`DELETE FROM files WHERE id = ${fileId}`;
        
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
