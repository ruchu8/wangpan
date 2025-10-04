require('dotenv').config(); // 加载环境变量
const { Client } = require('@neondatabase/serverless');

// 数据库配置
// 优先使用 VERCEL 环境变量，然后是 POSTGRES_URL，最后是 DATABASE_URL
const DATABASE_URL = process.env.POSTGRES_URL || process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_uQK81FdVvOjX@ep-bold-mode-a1z19z94-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

if (!DATABASE_URL) {
  console.error('Database URL not found in environment variables');
  throw new Error('Database URL not found in environment variables');
}

console.log('Using database URL:', DATABASE_URL.substring(0, 50) + '...'); // 只显示前50个字符以保护隐私

// 创建数据库表的函数
async function initializeDatabase() {
  const client = new Client(DATABASE_URL);
  try {
    await client.connect();
    
    // 创建 comments 表
    await client.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        content TEXT NOT NULL,
        date TEXT NOT NULL,
        approved BOOLEAN DEFAULT false,
        reply TEXT
      )
    `);
    
    // 创建 files 表
    await client.query(`
      CREATE TABLE IF NOT EXISTS files (
        id SERIAL PRIMARY KEY,
        data JSONB NOT NULL
      )
    `);
    
    // 创建 admin_credentials 表
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_credentials (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL,
        password TEXT NOT NULL
      )
    `);
    
    // 创建 admin_token 表
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_token (
        id SERIAL PRIMARY KEY,
        token TEXT NOT NULL
      )
    `);
    
    // 插入默认管理员凭证（如果不存在）
    const adminResult = await client.query('SELECT COUNT(*) FROM admin_credentials');
    if (parseInt(adminResult.rows[0].count) === 0) {
      await client.query(
        'INSERT INTO admin_credentials (username, password) VALUES ($1, $2)',
        ['admin', 'admin123']
      );
    }
    
    // 插入默认管理员令牌（如果不存在）
    const tokenResult = await client.query('SELECT COUNT(*) FROM admin_token');
    if (parseInt(tokenResult.rows[0].count) === 0) {
      await client.query(
        'INSERT INTO admin_token (token) VALUES ($1)',
        ['test-token']
      );
    }
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    await client.end();
  }
}

// 获取指定键的值
async function get(key) {
  const client = new Client(DATABASE_URL);
  try {
    await client.connect();
    
    switch (key) {
      case 'comments':
        const commentsResult = await client.query('SELECT * FROM comments ORDER BY date DESC');
        return commentsResult.rows;
      
      case 'files':
        const filesResult = await client.query('SELECT data FROM files LIMIT 1');
        if (filesResult.rows.length > 0) {
          // 检查 data 是否已经是对象，如果是则直接返回，否则解析 JSON
          const data = filesResult.rows[0].data;
          if (typeof data === 'string') {
            try {
              const parsedData = JSON.parse(data);
              console.log('Files get result (parsed):', parsedData);
              return parsedData;
            } catch (parseError) {
              console.error('Error parsing files data:', parseError);
              return [];
            }
          } else {
            console.log('Files get result (direct):', data);
            return data || [];
          }
        }
        return [];
      
      case 'admin_credentials':
        const adminCredentialsResult = await client.query('SELECT username, password FROM admin_credentials LIMIT 1');
        return adminCredentialsResult.rows.length > 0 ? {
          username: adminCredentialsResult.rows[0].username,
          password: adminCredentialsResult.rows[0].password
        } : null;
      
      case 'admin_token':
        const adminTokenResult = await client.query('SELECT token FROM admin_token LIMIT 1');
        return adminTokenResult.rows.length > 0 ? adminTokenResult.rows[0].token : null;
      
      default:
        return null;
    }
  } catch (error) {
    console.error(`Error getting ${key}:`, error);
    return null;
  } finally {
    await client.end();
  }
}

// 设置指定键的值
async function set(key, value) {
  const client = new Client(DATABASE_URL);
  try {
    await client.connect();
    
    switch (key) {
      case 'comments':
        // 先删除所有评论，然后重新插入
        await client.query('DELETE FROM comments');
        for (const comment of value) {
          await client.query(
            'INSERT INTO comments (id, name, content, date, approved, reply) VALUES ($1, $2, $3, $4, $5, $6)',
            [comment.id, comment.name, comment.content, comment.date, comment.approved || false, comment.reply || null]
          );
        }
        return true;
      
      case 'files':
        // 直接更新文件数据（只存储一个记录，包含所有文件）
        await client.query('DELETE FROM files');
        const jsonData = JSON.stringify(value);
        console.log('Storing files data:', jsonData);
        const result = await client.query('INSERT INTO files (data) VALUES ($1) RETURNING *', [jsonData]);
        console.log('Files set result:', result);
        return true;
      
      case 'admin_credentials':
        await client.query('UPDATE admin_credentials SET username = $1, password = $2 WHERE id = 1', 
          [value.username, value.password]);
        return true;
      
      case 'admin_token':
        await client.query('UPDATE admin_token SET token = $1 WHERE id = 1', [value]);
        return true;
      
      default:
        return false;
    }
  } catch (error) {
    console.error(`Error setting ${key}:`, error);
    return false;
  } finally {
    await client.end();
  }
}

// 检查键是否存在
async function exists(key) {
  const value = await get(key);
  return value !== undefined && value !== null;
}

// 删除指定键
async function del(key) {
  const client = new Client(DATABASE_URL);
  try {
    await client.connect();
    
    switch (key) {
      case 'comments':
        await client.query('DELETE FROM comments');
        return true;
      
      case 'files':
        await client.query('DELETE FROM files');
        return true;
      
      case 'admin_credentials':
        await client.query('DELETE FROM admin_credentials');
        return true;
      
      case 'admin_token':
        await client.query('DELETE FROM admin_token');
        return true;
      
      default:
        return false;
    }
  } catch (error) {
    console.error(`Error deleting ${key}:`, error);
    return false;
  } finally {
    await client.end();
  }
}

// 初始化数据库
initializeDatabase();

module.exports = {
  get,
  set,
  exists,
  del
};