// Vercel Serverless Function for enhanced file management
const { neon } = require('@neondatabase/serverless');

// 初始化 Neon PostgreSQL 客户端
// 优先使用 VERCEL 环境变量，然后是 POSTGRES_URL，最后是 DATABASE_URL
let databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;

// 清理数据库URL，移除可能的空格和其他无效字符
if (databaseUrl) {
  databaseUrl = databaseUrl.trim();
}

if (!databaseUrl) {
  // 不立即抛出错误，而是在处理请求时再检查
}

let sql;

// 创建数据库表（如果不存在）
async function initializeDatabase() {
  try {
    // 确保数据库连接已初始化
    if (!databaseUrl) {
      throw new Error('Database URL not found in environment variables');
    }
    
    // 验证URL格式
    try {
      new URL(databaseUrl);
    } catch (urlError) {
      throw new Error('Database URL format is invalid: ' + databaseUrl);
    }
    
    if (!sql) {
      sql = neon(databaseUrl);
    }
    
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
    const result = await sql`SELECT COUNT(*) as count FROM admin_tokens`;
    if (parseInt(result[0].count) === 0) {
      // 创建默认管理员令牌
      await sql`INSERT INTO admin_tokens (token) VALUES ('default_admin_token')`;
    } else {
    }
    
    // 检查是否有文件数据，如果没有则创建一个空数组
    const filesResult = await sql`SELECT COUNT(*) as count FROM files`;
    if (parseInt(filesResult[0].count) === 0) {
      // 创建默认文件数据
      await sql`INSERT INTO files (data) VALUES (${JSON.stringify([])})`;
    } else {
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

// 确保数据库已初始化
let dbInitialized = false;
async function ensureDatabaseInitialized() {
  if (!dbInitialized) {
    dbInitialized = await initializeDatabase();
  }
  return dbInitialized;
}

// 安全地解析数据库中的数据
function safeParseData(data) {
  try {
    // 如果data已经是对象，直接返回
    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
      // 如果是单个对象，包装成数组
      return [data];
    }
    
    // 如果data是数组，直接返回
    if (Array.isArray(data)) {
      return data;
    }
    
    // 如果data是字符串，尝试解析JSON
    if (typeof data === 'string') {
      // 检查是否是"[object Object]"这样的字符串
      if (data.startsWith('[object') && data.endsWith(']')) {
        return [];
      }
      
      // 尝试解析JSON
      try {
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch (parseError) {
        return [];
      }
    }
    
    // 其他情况返回空数组
    return [];
  } catch (error) {
    return [];
  }
}

// 获取文件列表
async function getFiles() {
  try {
    const result = await sql`SELECT data FROM files LIMIT 1`;
    let files = [];
    
    if (result.length > 0) {
      files = safeParseData(result[0].data);
    }
    
    return files;
  } catch (error) {
    throw new Error('Failed to fetch files: ' + error.message);
  }
}

// 保存文件列表
async function saveFiles(files) {
  try {
    // 更新文件数据
    await sql`DELETE FROM files`;
    await sql`INSERT INTO files (data) VALUES (${JSON.stringify(files)})`;
    return true;
  } catch (error) {
    throw new Error('Failed to save files: ' + error.message);
  }
}

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

  try {
    // 确保数据库已初始化
    const isDbReady = await ensureDatabaseInitialized();
    if (!isDbReady) {
      return res.status(500).json({ error: 'Database initialization failed' });
    }
    
    // 确保数据库连接已初始化
    if (!databaseUrl) {
      return res.status(500).json({ error: 'Database URL not found in environment variables' });
    }
    
    // 验证URL格式
    try {
      new URL(databaseUrl);
    } catch (urlError) {
      return res.status(500).json({ 
        error: 'Database URL format is invalid',
        url: databaseUrl,
        message: urlError.message
      });
    }
    
    if (!sql) {
      sql = neon(databaseUrl);
    }

    // 其他请求需要身份验证
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const adminTokenResult = await sql`SELECT * FROM admin_tokens WHERE token = ${token}`;
    
    if (adminTokenResult.length === 0) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Handle different HTTP methods
    if (req.method === 'GET') {
      // 获取文件夹内的文件列表
      const { folderIndex } = req.query;
      
      try {
        const files = await getFiles();
        
        if (folderIndex !== undefined) {
          const index = parseInt(folderIndex);
          if (index >= 0 && index < files.length && files[index].type === 'folder') {
            return res.status(200).json(files[index].children || []);
          } else {
            return res.status(404).json({ error: 'Folder not found' });
          }
        } else {
          return res.status(200).json(files);
        }
      } catch (error) {
        return res.status(500).json({ error: error.message });
      }
    } else if (req.method === 'POST') {
      // 添加文件到文件夹
      const { folderIndex, file } = req.body;
      
      if (folderIndex === undefined || !file) {
        return res.status(400).json({ error: 'Invalid request data' });
      }
      
      try {
        const files = await getFiles();
        const index = parseInt(folderIndex);
        
        if (index < 0 || index >= files.length || files[index].type !== 'folder') {
          return res.status(404).json({ error: 'Folder not found' });
        }
        
        // 确保children数组存在
        if (!files[index].children) {
          files[index].children = [];
        }
        
        // 添加文件到文件夹
        files[index].children.push(file);
        
        // 保存更新后的文件列表
        await saveFiles(files);
        
        return res.status(201).json(file);
      } catch (error) {
        return res.status(500).json({ error: error.message });
      }
    } else if (req.method === 'PUT') {
      // 更新文件夹内的文件
      const { folderIndex, fileIndex, file } = req.body;
      
      if (folderIndex === undefined || fileIndex === undefined || !file) {
        return res.status(400).json({ error: 'Invalid request data' });
      }
      
      try {
        const files = await getFiles();
        const fIndex = parseInt(folderIndex);
        const index = parseInt(fileIndex);
        
        if (fIndex < 0 || fIndex >= files.length || files[fIndex].type !== 'folder') {
          return res.status(404).json({ error: 'Folder not found' });
        }
        
        if (!files[fIndex].children || index < 0 || index >= files[fIndex].children.length) {
          return res.status(404).json({ error: 'File not found' });
        }
        
        // 更新文件
        files[fIndex].children[index] = file;
        
        // 保存更新后的文件列表
        await saveFiles(files);
        
        return res.status(200).json(file);
      } catch (error) {
        return res.status(500).json({ error: error.message });
      }
    } else if (req.method === 'DELETE') {
      // 从文件夹中删除文件
      const { folderIndex, fileIndex } = req.body;
      
      if (folderIndex === undefined || fileIndex === undefined) {
        return res.status(400).json({ error: 'Invalid request data' });
      }
      
      try {
        const files = await getFiles();
        const fIndex = parseInt(folderIndex);
        const index = parseInt(fileIndex);
        
        if (fIndex < 0 || fIndex >= files.length || files[fIndex].type !== 'folder') {
          return res.status(404).json({ error: 'Folder not found' });
        }
        
        if (!files[fIndex].children || index < 0 || index >= files[fIndex].children.length) {
          return res.status(404).json({ error: 'File not found' });
        }
        
        // 删除文件
        files[fIndex].children.splice(index, 1);
        
        // 保存更新后的文件列表
        await saveFiles(files);
        
        return res.status(200).json({ message: 'File deleted successfully' });
      } catch (error) {
        return res.status(500).json({ error: error.message });
      }
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Unexpected error: ' + error.message });
  }
};