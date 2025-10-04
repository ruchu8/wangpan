// Vercel Serverless Function for file management
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
    // GET 请求不需要身份验证，公开访问文件列表
    try {
      const files = await redis.get('files') || [];
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
    const adminToken = await redis.get('admin_token');
    
    if (!adminToken || token !== adminToken) {
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

        let files = await redis.get('files') || [];
        
        // 确保 files 是数组
        if (!Array.isArray(files)) {
          files = [];
        }
        
        files.push(newFile);
        
        await redis.set('files', files);
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

        let files = await redis.get('files') || [];
        
        // 确保 files 是数组
        if (!Array.isArray(files)) {
          files = [];
        }
        
        if (index < 0 || index >= files.length) {
          return res.status(404).json({ error: 'File not found' });
        }
        
        files[index] = file;
        await redis.set('files', files);
        
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

        let files = await redis.get('files') || [];
        
        // 确保 files 是数组
        if (!Array.isArray(files)) {
          files = [];
        }
        
        if (index < 0 || index >= files.length) {
          return res.status(404).json({ error: 'File not found' });
        }
        
        files.splice(index, 1);
        await redis.set('files', files);
        
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