// 全局变量，用于缓存数据库连接状态
let dbInitialized = false;
let sql = null;
let databaseUrl = null;

// 初始化 Neon PostgreSQL 客户端
// 优先使用 VERCEL 环境变量，然后是 POSTGRES_URL，最后是 DATABASE_URL
function initializeDatabaseConnection() {
  if (databaseUrl !== null) {
    return true; // 已经初始化过了
  }
  
  databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;

  // 清理数据库URL，移除可能的空格和其他无效字符
  if (databaseUrl) {
    databaseUrl = databaseUrl.trim();
  }

  if (!databaseUrl) {
    return false;
  }
  
  // 验证URL格式
  try {
    new URL(databaseUrl);
  } catch (urlError) {
    console.error('Database URL format is invalid:', databaseUrl);
    return false;
  }
  
  return true;
}

// 创建数据库表（如果不存在）
async function initializeDatabase() {
  try {
    // 确保数据库连接已初始化
    if (!initializeDatabaseConnection() || !databaseUrl) {
      throw new Error('Database URL not found in environment variables');
    }
    
    if (!sql) {
      const { neon } = require('@neondatabase/serverless');
      sql = neon(databaseUrl);
    }
    
    // 创建留言表（使用新的语法确保表结构正确）
    await sql`
      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        content TEXT NOT NULL,
        date TEXT NOT NULL,
        approved BOOLEAN DEFAULT false,
        ip TEXT,
        reply TEXT,
        reply_date TEXT
      )
    `;
    
    // 检查现有表结构并修复（如果需要）
    try {
      // 尝试添加缺失的列
      try {
        await sql`ALTER TABLE comments ADD COLUMN ip TEXT`;
      } catch (e) {
        // 列可能已经存在，忽略错误
      }
      
      try {
        await sql`ALTER TABLE comments ADD COLUMN reply TEXT`;
      } catch (e) {
        // 列可能已经存在，忽略错误
      }
      
      try {
        await sql`ALTER TABLE comments ADD COLUMN approved BOOLEAN DEFAULT false`;
      } catch (e) {
        // 列可能已经存在，忽略错误
      }
      
      try {
        await sql`ALTER TABLE comments ADD COLUMN reply_date TEXT`;
      } catch (e) {
        // 列可能已经存在，忽略错误
      }
    } catch (alterError) {
      console.warn('Table alteration warning:', alterError);
    }
    
    dbInitialized = true;
    return true;
  } catch (error) {
    console.error('Database initialization error:', error);
    return false;
  }
}

// 确保数据库已初始化
async function ensureDatabaseInitialized() {
  if (!dbInitialized) {
    dbInitialized = await initializeDatabase();
  }
  return dbInitialized;
}

// 联系方式隐私保护函数
function maskContactInfo(contactInfo) {
  if (!contactInfo) return contactInfo;
  
  // 如果是邮箱
  if (contactInfo.includes('@')) {
    const [localPart, domain] = contactInfo.split('@');
    if (localPart.length <= 2) {
      return contactInfo; // 太短无法隐藏
    }
    // 邮箱显示前2位+**+后2位@域名，如123456@qq.com显示为12**56@qq.com
    const start = localPart.substring(0, 2);
    const end = localPart.substring(localPart.length - 2);
    const maskedLocalPart = `${start}**${end}`;
    return `${maskedLocalPart}@${domain}`;
  }
  
  // 如果是QQ号或微信号
  if (contactInfo.length <= 3) {
    return contactInfo; // 太短无法隐藏
  }
  
  // QQ/微信隐藏规则：显示前3位和后3位，5位数显示前2位和后2位
  if (contactInfo.length === 5) {
    // 5位数显示前2位和后2位
    const start = contactInfo.substring(0, 2);
    const end = contactInfo.substring(contactInfo.length - 2);
    return `${start}**${end}`;
  } else {
    // 其他长度显示前3位和后3位
    const start = contactInfo.substring(0, 3);
    const end = contactInfo.substring(contactInfo.length - 3);
    return `${start}**${end}`;
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

  // Handle different HTTP methods
  if (req.method === 'GET') {
    // 检查是否是获取已回复留言总数的特殊请求
    if (req.query.action === 'replied-count') {
      try {
        // 确保数据库已初始化（只在第一次请求时初始化）
        const isDbReady = await ensureDatabaseInitialized();
        if (!isDbReady) {
          return res.status(500).json({ error: 'Database initialization failed' });
        }
        
        // 确保数据库连接已初始化
        if (!sql) {
          const { neon } = require('@neondatabase/serverless');
          sql = neon(databaseUrl);
        }
        
        // 获取已回复留言的总数
        const countResult = await sql`SELECT COUNT(*) as count FROM comments WHERE reply IS NOT NULL AND reply != ''`;
        const repliedCount = parseInt(countResult[0].count);
        
        return res.status(200).json({ count: repliedCount });
      } catch (error) {
        console.error('❌ Failed to fetch replied comments count:', error);
        return res.status(500).json({ error: 'Failed to fetch replied comments count: ' + error.message });
      }
    }
    
    try {
      // 确保数据库已初始化（只在第一次请求时初始化）
      const isDbReady = await ensureDatabaseInitialized();
      if (!isDbReady) {
        return res.status(500).json({ error: 'Database initialization failed' });
      }
      
      // 确保数据库连接已初始化
      if (!sql) {
        const { neon } = require('@neondatabase/serverless');
        sql = neon(databaseUrl);
      }
      
      // 获取分页参数
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 8; // 修改为每页显示8条
      const offset = (page - 1) * limit;
      
      // 检查是否有认证头，如果有且是管理员，则返回所有留言（包括未审核的）
      const authHeader = req.headers.authorization;
      let isAdmin = false;
      let adminToken = null;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        // 验证令牌是否有效
        const adminTokenResult = await sql`SELECT * FROM admin_tokens WHERE token = ${token}`;
        console.log('Admin token verification result:', adminTokenResult.length);
        if (adminTokenResult.length > 0) {
          isAdmin = true;
          adminToken = token;
        }
      }
      
      if (isAdmin && adminToken) {
        console.log('Admin access to comments');
        // 管理员访问，返回所有留言，包括未审核的，并显示完整联系方式和内容
        const countResult = await sql`SELECT COUNT(*) as count FROM comments`;
        const totalComments = parseInt(countResult[0].count);
        
        const commentsResult = await sql`
          SELECT * FROM comments 
          ORDER BY date DESC 
          LIMIT ${limit} OFFSET ${offset}
        `;
        
        // 转换评论格式
        const comments = commentsResult.map(row => ({
          id: row.id,
          name: row.name,
          content: row.content,
          date: row.date,
          approved: row.approved,
          ip: row.ip || '未知',
          reply: row.reply,
          reply_date: row.reply_date
        }));
        
        // 计算总页数
        const totalPages = Math.ceil(totalComments / limit);
        
        // 返回分页结果
        return res.status(200).json({
          comments,
          currentPage: page,
          totalPages,
          totalComments
        });
      } else {
        console.log('Public access to comments');
        // 普通用户访问（前台），返回分页留言，对联系方式和未审核留言的内容进行隐私保护处理
        // 优化：直接在数据库查询时进行分页，而不是获取所有数据再分页
        
        // 先获取总留言数
        const countResult = await sql`SELECT COUNT(*) as count FROM comments`;
        const totalComments = parseInt(countResult[0].count);
        
        // 直接查询分页数据
        const commentsResult = await sql`
          SELECT * FROM comments 
          ORDER BY date DESC 
          LIMIT ${limit} OFFSET ${offset}
        `;
        
        // 转换评论格式并进行隐私保护处理
        const processedComments = commentsResult.map(row => {
          // 创建评论副本以避免修改原始数据
          const commentCopy = {
            id: row.id,
            name: row.name,
            content: row.content,
            date: row.date,
            approved: row.approved,
            ip: row.ip || '未知',
            reply: row.reply,
            reply_date: row.reply_date
          };
          
          // 对联系方式进行隐私保护处理
          if (commentCopy.name && commentCopy.name.includes(':')) {
            const [contactType, contactInfo] = commentCopy.name.split(':', 2);
            // 对联系方式进行部分隐藏处理
            const maskedContactInfo = maskContactInfo(contactInfo);
            commentCopy.name = `${contactType}: ${maskedContactInfo}`;
          }
          
          // 对未审核留言的内容进行隐藏处理
          if (!commentCopy.approved) {
            commentCopy.content = "此留言不公开，管理员回复后才能公开留言";
          }
          
          return commentCopy;
        });
        
        // 计算总页数
        const totalPages = Math.ceil(totalComments / limit);
        
        // 返回分页结果
        return res.status(200).json({
          comments: processedComments,
          currentPage: page,
          totalPages,
          totalComments
        });
      }
    } catch (error) {
      console.error('❌ Failed to fetch comments:', error);
      return res.status(500).json({ error: 'Failed to fetch comments: ' + error.message });
    }
  } else if (req.method === 'POST') {
    try {
      console.log('Comments POST request received');
      
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
      
      const { name, content, ip } = req.body;
      console.log('New comment submission:', { name, content });
      
      if (!name || !content) {
        return res.status(400).json({ error: 'Name and content are required' });
      }
      
      // 验证联系方式长度（至少5个字符）
      // name 格式为 "联系方式类型:联系方式"，例如 "QQ:123456"
      if (name && name.includes(':')) {
        const [contactType, contactInfo] = name.split(':', 2);
        if (!contactInfo || contactInfo.trim().length <= 5) {
          return res.status(400).json({ error: '联系方式至少需要5个字符' });
        }
        
        // 如果是QQ，验证是否为纯数字
        if (contactType === 'QQ' && !/^\d+$/.test(contactInfo.trim())) {
          return res.status(400).json({ error: 'QQ号码必须为纯数字' });
        }
      }
      
      // 验证留言内容长度（至少3个字）
      if (!content || content.trim().length <= 3) {
        return res.status(400).json({ error: '留言内容至少需要3个字' });
      }

      const newComment = {
        id: Date.now().toString(),
        name,
        content,
        date: new Date().toISOString(),
        approved: false,
        ip: ip || '未知'
      };

      // 插入新评论到数据库
      await sql`
        INSERT INTO comments (id, name, content, date, approved, ip)
        VALUES (${newComment.id}, ${newComment.name}, ${newComment.content}, ${newComment.date}, ${newComment.approved}, ${newComment.ip})
      `;
      
      return res.status(201).json(newComment);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to add comment: ' + error.message });
    }
  } else if (req.method === 'PUT') {
    try {
      console.log('Comments PUT request received');
      
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
      
      // Authentication check for admin operations
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const token = authHeader.split(' ')[1];
      // 验证令牌是否有效
      const adminTokenResult = await sql`SELECT * FROM admin_tokens WHERE token = ${token}`;
      
      if (adminTokenResult.length === 0) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      const { id, approved, reply, content } = req.body;
      
      if (!id) {
        return res.status(400).json({ error: 'Comment ID is required' });
      }

      // 检查评论是否存在
      const commentResult = await sql`SELECT * FROM comments WHERE id = ${id}`;
      if (commentResult.length === 0) {
        return res.status(404).json({ error: 'Comment not found' });
      }
      
      // 更新评论状态或回复
      if (approved !== undefined) {
        await sql`
          UPDATE comments 
          SET approved = ${approved}
          WHERE id = ${id}
        `;
        console.log('✅ Comment approval status updated');
      }
      
      // 更新评论内容（如果提供了新的内容）
      if (content !== undefined) {
        await sql`
          UPDATE comments 
          SET content = ${content}
          WHERE id = ${id}
        `;
        console.log('✅ Comment content updated');
      }
      
      if (reply !== undefined) {
        // 获取当前时间作为回复时间
        const replyDate = new Date().toISOString();
        
        // 首先获取原始评论数据，确保保留IP地址
        const originalComment = await sql`SELECT ip FROM comments WHERE id = ${id}`;
        const originalIP = originalComment[0].ip;
        
        // 确保IP地址不为空
        const ipToSave = originalIP || '未知';
        
        // 更新评论，确保保留原始IP地址，但不修改IP字段
        await sql`
          UPDATE comments 
          SET reply = ${reply}, reply_date = ${replyDate}
          WHERE id = ${id}
        `;
        
        // 验证更新后的评论
        const updatedComment = await sql`SELECT ip FROM comments WHERE id = ${id}`;
      }
      
      // 获取更新后的评论
      const updatedResult = await sql`SELECT * FROM comments WHERE id = ${id}`;
      const updatedComment = {
        id: updatedResult[0].id,
        name: updatedResult[0].name,
        content: updatedResult[0].content,
        date: updatedResult[0].date,
        approved: updatedResult[0].approved,
        ip: updatedResult[0].ip, // 直接使用IP地址，不使用 || '未知'，因为IP地址应该已经存在
        reply: updatedResult[0].reply,
        reply_date: updatedResult[0].reply_date || null // 如果reply_date为null，则显示为null
      };
      
      return res.status(200).json(updatedComment);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to update comment: ' + error.message });
    }
  } else if (req.method === 'DELETE') {
    try {
      console.log('Comments DELETE request received');
      
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
      
      // Authentication check for admin operations
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const token = authHeader.split(' ')[1];
      // 验证令牌是否有效
      const adminTokenResult = await sql`SELECT * FROM admin_tokens WHERE token = ${token}`;
      
      if (adminTokenResult.length === 0) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      const { id } = req.body;
      
      if (!id) {
        return res.status(400).json({ error: 'Comment ID is required' });
      }

      // 检查评论是否存在
      const commentResult = await sql`SELECT * FROM comments WHERE id = ${id}`;
      if (commentResult.length === 0) {
        return res.status(404).json({ error: 'Comment not found' });
      }
      
      // 删除评论
      await sql`DELETE FROM comments WHERE id = ${id}`;
      
      return res.status(200).json({ message: 'Comment deleted successfully' });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to delete comment: ' + error.message });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
};
