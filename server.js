require('dotenv').config(); // 加载环境变量
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const storage = require('./postgres-storage'); // 引入 PostgreSQL 存储模块
const fs = require('fs');

// 创建 Express 应用
const app = express();
const PORT = process.env.PORT || 3001; // 更改端口号为3001

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.'));

// API 路由
app.get('/api/comments', async (req, res) => {
  let comments = await storage.get('comments') || [];
  
  // 获取分页参数
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  
  // 检查是否有认证头，如果有且是管理员，则返回所有留言（包括未审核的），并显示完整联系方式和内容
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const adminToken = await storage.get('admin_token');
    
    if (adminToken && token === adminToken) {
      // 管理员访问，返回所有留言，包括未审核的，并显示完整联系方式和内容
      const paginatedComments = comments.slice(startIndex, endIndex);
      return res.json({
        comments: paginatedComments,
        totalPages: Math.ceil(comments.length / limit),
        currentPage: page,
        totalComments: comments.length
      });
    }
  }
  
  // 普通用户访问（前台），返回所有留言（包括未审核的），但对联系方式和未审核留言的内容进行隐私保护处理
  const processedComments = comments.map(comment => {
    // 创建评论副本以避免修改原始数据
    const commentCopy = { ...comment };
    
    // 对联系方式进行隐私保护处理
    if (commentCopy.name && commentCopy.name.includes(':')) {
      const [contactType, contactInfo] = commentCopy.name.split(':', 2);
      // 对联系方式进行部分隐藏处理
      let maskedContactInfo = contactInfo;
      
      // 如果是邮箱
      if (contactInfo.includes('@')) {
        const [localPart, domain] = contactInfo.split('@');
        if (localPart.length > 2) {
          // 隐藏邮箱前缀中间部分
          const maskedLocalPart = localPart.substring(0, 2) + '**' + localPart.substring(localPart.length - 1);
          maskedContactInfo = `${maskedLocalPart}@${domain}`;
        }
      } else {
        // 如果是QQ号或微信号
        if (contactInfo.length > 3) {
          // 隐藏中间部分
          const start = contactInfo.substring(0, 2);
          const end = contactInfo.substring(contactInfo.length - 2);
          maskedContactInfo = `${start}**${end}`;
        }
      }
      
      commentCopy.name = `${contactType}: ${maskedContactInfo}`;
    }
    
    // 对未审核留言的内容进行隐藏处理
    if (!commentCopy.approved) {
      commentCopy.content = "此留言不公开，管理员回复后才能公开留言";
    }
    
    return commentCopy;
  });
  
  // 分页处理
  const paginatedComments = processedComments.slice(startIndex, endIndex);
  
  res.json({
    comments: paginatedComments,
    totalPages: Math.ceil(processedComments.length / limit),
    currentPage: page,
    totalComments: processedComments.length
  });
});

app.post('/api/comments', async (req, res) => {
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

  let comments = await storage.get('comments') || [];
  comments.push(newComment);
  
  const result = await storage.set('comments', comments);
  if (result) {
    res.status(201).json(newComment);
  } else {
    res.status(500).json({ error: 'Failed to save comment data' });
  }
});

app.put('/api/comments', async (req, res) => {
  const { id, approved, reply } = req.body;
  
  if (!id) {
    return res.status(400).json({ error: 'Comment ID is required' });
  }

  let comments = await storage.get('comments') || [];
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
  
  const result = await storage.set('comments', comments);
  if (result) {
    res.json(comments[commentIndex]);
  } else {
    res.status(500).json({ error: 'Failed to update comment data' });
  }
});

app.delete('/api/comments', async (req, res) => {
  const { id } = req.body;
  
  if (!id) {
    return res.status(400).json({ error: 'Comment ID is required' });
  }

  let comments = await storage.get('comments') || [];
  const initialLength = comments.length;
  comments = comments.filter(comment => comment.id !== id);
  
  if (comments.length === initialLength) {
    return res.status(404).json({ error: 'Comment not found' });
  }
  
  const result = await storage.set('comments', comments);
  if (result) {
    res.json({ message: 'Comment deleted successfully' });
  } else {
    res.status(500).json({ error: 'Failed to delete comment data' });
  }
});

app.post('/api/auth', async (req, res) => {
  const { password } = req.body;
  
  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  // 生成或验证管理员令牌
  let adminToken = await storage.get('admin_token');
  
  if (!adminToken) {
    // 如果没有管理员令牌，则使用提供的密码创建一个
    adminToken = password;
    await storage.set('admin_token', adminToken);
  }

  if (password === adminToken) {
    res.json({ token: adminToken });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

// 文件管理 API（需要认证）
app.get('/api/files', async (req, res) => {
  // 公开文件列表API，无需认证
  const files = await storage.get('files') || [];
  res.json(files);
});

app.post('/api/files', async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  const adminToken = await storage.get('admin_token');
  
  if (!adminToken || token !== adminToken) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { file } = req.body;
  
  if (!file) {
    return res.status(400).json({ error: 'File data is required' });
  }

  let files = await storage.get('files') || [];
  files.push(file);
  
  const result = await storage.set('files', files);
  if (result) {
    res.status(201).json({ message: 'File added successfully', index: files.length - 1 });
  } else {
    res.status(500).json({ error: 'Failed to save file data' });
  }
});

app.delete('/api/files', async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  const adminToken = await storage.get('admin_token');
  
  if (!adminToken || token !== adminToken) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { index } = req.body;
  
  if (index === undefined) {
    return res.status(400).json({ error: 'Invalid delete request' });
  }

  let files = await storage.get('files') || [];
  
  if (index < 0 || index >= files.length) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  files.splice(index, 1);
  const result = await storage.set('files', files);
  
  if (result) {
    res.json({ message: 'File deleted successfully' });
  } else {
    res.status(500).json({ error: 'Failed to delete file data' });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser to view the application`);
});