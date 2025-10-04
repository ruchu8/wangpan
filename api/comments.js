// Vercel Serverless Function for comment management
const { neon } = require('@neondatabase/serverless');

// 初始化 Neon PostgreSQL 客户端
const sql = neon(process.env.DATABASE_URL);

// 创建数据库表（如果不存在）
async function initializeDatabase() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        content TEXT NOT NULL,
        date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
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
    try {
      // 获取分页参数
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      
      // 获取评论总数
      const countResult = await sql`SELECT COUNT(*) FROM comments`;
      const totalComments = parseInt(countResult[0].count);
      
      // 获取分页评论
      const commentsResult = await sql`
        SELECT * FROM comments 
        ORDER BY date DESC 
        LIMIT ${limit} OFFSET ${offset}
      `;
      
      // 转换评论格式
      const comments = commentsResult.map(row => ({
        id: row.id.toString(),
        name: row.name,
        content: row.content,
        date: row.date.toISOString(),
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
    } catch (error) {
      console.error('Failed to fetch comments:', error);
      return res.status(500).json({ error: 'Failed to fetch comments' });
    }
  } else if (req.method === 'POST') {
    try {
      const { name, content } = req.body;
      
      if (!name || !content) {
        return res.status(400).json({ error: 'Name and content are required' });
      }

      const newComment = {
        id: Date.now().toString(),
        name,
        content,
        date: new Date().toISOString(),
        approved: false,
        ip: req.body.ip || '未知'
      };

      // 获取现有评论或初始化为空数组
      let comments = await redis.get('comments') || [];
      
      // 确保 comments 是数组
      if (!Array.isArray(comments)) {
        comments = [];
      }
      
      comments.push(newComment);
      
      await redis.set('comments', comments);
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
      const adminToken = await redis.get('admin_token');
      
      if (!adminToken || token !== adminToken) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      const { id, approved, reply, commentsList } = req.body;
      
      // 如果提供了 commentsList，则替换整个评论列表（用于导入功能）
      if (commentsList && Array.isArray(commentsList) && commentsList.length > 0) {
        // 验证评论列表
        if (!commentsList.every(c => c && c.id && c.name && c.content)) {
          return res.status(400).json({ error: 'Invalid comments list: each comment must have id, name and content' });
        }
        
        await redis.set('comments', commentsList);
        return res.status(200).json({ message: 'Comments list updated successfully', count: commentsList.length });
      }
      
      // 如果提供了 commentsList 但是空数组，则清空评论列表
      if (commentsList && Array.isArray(commentsList) && commentsList.length === 0) {
        await redis.set('comments', []);
        return res.status(200).json({ message: 'Comments list cleared successfully', count: 0 });
      }
      
      if (!id) {
        return res.status(400).json({ error: 'Comment ID is required' });
      }

      let comments = await redis.get('comments') || [];
      
      // 确保 comments 是数组
      if (!Array.isArray(comments)) {
        comments = [];
      }
      
      const commentIndex = comments.findIndex(comment => comment.id === id);
      
      if (commentIndex === -1) {
        return res.status(404).json({ error: 'Comment not found' });
      }
      
      // 更新评论状态或回复
      if (approved !== undefined) {
        comments[commentIndex].approved = approved;
      }
      
      if (reply !== undefined) {
        comments[commentIndex].reply = reply;
      }
      
      await redis.set('comments', comments);
      
      return res.status(200).json(comments[commentIndex]);
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
      const adminToken = await redis.get('admin_token');
      
      if (!adminToken || token !== adminToken) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      const { id } = req.body;
      
      if (!id) {
        return res.status(400).json({ error: 'Comment ID is required' });
      }

      let comments = await redis.get('comments') || [];
      
      // 确保 comments 是数组
      if (!Array.isArray(comments)) {
        comments = [];
      }
      
      const filteredComments = comments.filter(comment => comment.id !== id);
      
      if (filteredComments.length === comments.length) {
        return res.status(404).json({ error: 'Comment not found' });
      }
      
      await redis.set('comments', filteredComments);
      
      return res.status(200).json({ message: 'Comment deleted successfully' });
    } catch (error) {
      console.error('Failed to delete comment:', error);
      return res.status(500).json({ error: 'Failed to delete comment' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
};
