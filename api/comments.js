// Vercel Serverless Function for comment management
const { neon } = require('@neondatabase/serverless');

// 初始化 Neon PostgreSQL 客户端
// 优先使用 VERCEL 环境变量，然后是 POSTGRES_URL，最后是 DATABASE_URL
const databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('Database URL not found in environment variables');
  throw new Error('Database URL not found in environment variables');
}
const sql = neon(databaseUrl);

// 创建数据库表（如果不存在）
async function initializeDatabase() {
  try {
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
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
}

// 初始化数据库
initializeDatabase();

// 联系方式隐私保护函数
function maskContactInfo(contactInfo) {
  if (!contactInfo) return contactInfo;
  
  // 如果是邮箱
  if (contactInfo.includes('@')) {
    const [localPart, domain] = contactInfo.split('@');
    if (localPart.length <= 2) {
      return contactInfo; // 太短无法隐藏
    }
    // 隐藏邮箱前缀中间部分
    const maskedLocalPart = localPart.substring(0, 2) + '**' + localPart.substring(localPart.length - 1);
    return `${maskedLocalPart}@${domain}`;
  }
  
  // 如果是QQ号或微信号
  if (contactInfo.length <= 3) {
    return contactInfo; // 太短无法隐藏
  }
  
  // 隐藏中间部分
  const start = contactInfo.substring(0, 2);
  const end = contactInfo.substring(contactInfo.length - 2);
  return `${start}**${end}`;
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
    try {
      // 获取分页参数
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      
      // 检查是否有认证头，如果有且是管理员，则返回所有留言（包括未审核的）
      const authHeader = req.headers.authorization;
      let isAdmin = false;
      let adminToken = null;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const adminTokenResult = await sql`SELECT * FROM admin_tokens WHERE token = ${token}`;
        if (adminTokenResult.length > 0) {
          isAdmin = true;
          adminToken = token;
        }
      }
      
      if (isAdmin && adminToken) {
        // 管理员访问，返回所有留言，包括未审核的，并显示完整联系方式和内容
        const countResult = await sql`SELECT COUNT(*) FROM comments`;
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
          reply: row.reply
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
        // 普通用户访问（前台），返回所有留言（包括未审核的），但对联系方式和未审核留言的内容进行隐私保护处理
        const commentsResult = await sql`
          SELECT * FROM comments 
          ORDER BY date DESC
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
            reply: row.reply
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
        
        // 获取分页参数
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        
        // 分页处理
        const paginatedComments = processedComments.slice(startIndex, endIndex);
        
        // 计算总页数
        const totalPages = Math.ceil(processedComments.length / limit);
        
        // 返回分页结果
        return res.status(200).json({
          comments: paginatedComments,
          currentPage: page,
          totalPages,
          totalComments: processedComments.length
        });
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
      return res.status(500).json({ error: 'Failed to fetch comments' });
    }
  } else if (req.method === 'POST') {
    try {
      const { name, content, ip } = req.body;
      
      if (!name || !content) {
        return res.status(400).json({ error: 'Name and content are required' });
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
      console.error('Failed to add comment:', error);
      return res.status(500).json({ error: 'Failed to add comment' });
    }
  } else if (req.method === 'PUT') {
    try {
      // Authentication check for admin operations
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const token = authHeader.split(' ')[1];
      const adminTokenResult = await sql`SELECT * FROM admin_tokens WHERE token = ${token}`;
      
      if (adminTokenResult.length === 0) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      const { id, approved, reply } = req.body;
      
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
      }
      
      if (reply !== undefined) {
        await sql`
          UPDATE comments 
          SET reply = ${reply}
          WHERE id = ${id}
        `;
      }
      
      // 获取更新后的评论
      const updatedResult = await sql`SELECT * FROM comments WHERE id = ${id}`;
      const updatedComment = {
        id: updatedResult[0].id,
        name: updatedResult[0].name,
        content: updatedResult[0].content,
        date: updatedResult[0].date,
        approved: updatedResult[0].approved,
        ip: updatedResult[0].ip || '未知',
        reply: updatedResult[0].reply
      };
      
      return res.status(200).json(updatedComment);
    } catch (error) {
      console.error('Failed to update comment:', error);
      return res.status(500).json({ error: 'Failed to update comment' });
    }
  } else if (req.method === 'DELETE') {
    try {
      // Authentication check for admin operations
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const token = authHeader.split(' ')[1];
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
      console.error('Failed to delete comment:', error);
      return res.status(500).json({ error: 'Failed to delete comment' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
};