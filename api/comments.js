// Vercel Serverless Function for comment management
const { Redis } = require('@upstash/redis');

// 初始化 Redis 客户端
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

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
      const comments = await redis.get('comments') || [];
      return res.status(200).json(comments);
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
        approved: false
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

      const { id, approved, reply } = req.body;
      
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