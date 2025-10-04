require('dotenv').config(); // 加载环境变量
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const storage = require('./postgres-storage'); // 引入 PostgreSQL 存储模块
const fs = require('fs');

// 创建日志函数
function logToFile(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync('server.log', logMessage);
}

// 创建 Express 应用
const app = express();
const PORT = process.env.PORT || 3001; // 更改端口号为3001

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.'));

// API 路由
app.get('/api/comments', async (req, res) => {
  logToFile('GET /api/comments called');
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
      logToFile(`Returning ${paginatedComments.length} comments to admin`);
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
  
  logToFile(`Returning ${paginatedComments.length} comments to user`);
  res.json({
    comments: paginatedComments,
    totalPages: Math.ceil(processedComments.length / limit),
    currentPage: page,
    totalComments: processedComments.length
  });
});

app.post('/api/comments', async (req, res) => {
  logToFile('POST /api/comments called');
  const { name, content } = req.body;
  
  if (!name || !content) {
    logToFile('Invalid request: name or content missing');
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
    logToFile(`Comment created with ID: ${newComment.id}`);
    res.status(201).json(newComment);
  } else {
    logToFile('Failed to save comment');
    res.status(500).json({ error: 'Failed to save comment data' });
  }
});

app.put('/api/comments', async (req, res) => {
  logToFile('PUT /api/comments called');
  const { id, approved, reply } = req.body;
  
  if (!id) {
    logToFile('Invalid request: comment ID missing');
    return res.status(400).json({ error: 'Comment ID is required' });
  }

  let comments = await storage.get('comments') || [];
  const commentIndex = comments.findIndex(comment => comment.id === id);
  
  if (commentIndex === -1) {
    logToFile(`Comment not found with ID: ${id}`);
    return res.status(404).json({ error: 'Comment not found' });
  }
  
  // 更新评论状态或回复
  if (approved !== undefined) {
    comments[commentIndex].approved = approved;
    logToFile(`Comment ${id} approved status updated to: ${approved}`);
  }
  
  if (reply !== undefined) {
    comments[commentIndex].reply = reply;
    logToFile(`Comment ${id} reply updated`);
  }
  
  const result = await storage.set('comments', comments);
  if (result) {
    logToFile(`Comment ${id} updated successfully`);
    res.json(comments[commentIndex]);
  } else {
    logToFile(`Failed to update comment ${id}`);
    res.status(500).json({ error: 'Failed to update comment data' });
  }
});

app.delete('/api/comments', async (req, res) => {
  logToFile('DELETE /api/comments called');
  const { id } = req.body;
  
  if (!id) {
    logToFile('Invalid request: comment ID missing');
    return res.status(400).json({ error: 'Comment ID is required' });
  }

  let comments = await storage.get('comments') || [];
  const initialLength = comments.length;
  comments = comments.filter(comment => comment.id !== id);
  
  if (comments.length === initialLength) {
    logToFile(`Comment not found with ID: ${id}`);
    return res.status(404).json({ error: 'Comment not found' });
  }
  
  const result = await storage.set('comments', comments);
  if (result) {
    logToFile(`Comment ${id} deleted successfully`);
    res.json({ message: 'Comment deleted successfully' });
  } else {
    logToFile(`Failed to delete comment ${id}`);
    res.status(500).json({ error: 'Failed to delete comment data' });
  }
});

app.post('/api/auth', async (req, res) => {
  logToFile('POST /api/auth called');
  const { username, password } = req.body;
  
  if (!username || !password) {
    logToFile('Invalid request: username or password missing');
    return res.status(400).json({ error: 'Username and password are required' });
  }

  // 检查管理员凭证是否存在，如果不存在则创建默认凭证
  let adminCredentials = await storage.get('admin_credentials');
  let adminToken = await storage.get('admin_token');
  
  if (!adminCredentials) {
    adminCredentials = { username: 'admin', password: 'admin123' };
    await storage.set('admin_credentials', adminCredentials);
    adminToken = 'test-token';
    await storage.set('admin_token', adminToken);
    logToFile('Default admin credentials created');
  }

  if (username === adminCredentials.username && password === adminCredentials.password) {
    logToFile('Admin login successful');
    return res.json({ 
      success: true, 
      token: adminToken,
      message: 'Login successful' 
    });
  } else {
    logToFile('Admin login failed: invalid credentials');
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid credentials' 
    });
  }
});

app.get('/api/files', async (req, res) => {
  logToFile('GET /api/files called');
  // GET 请求不需要身份验证，公开访问文件列表
  const files = await storage.get('files') || [];
  logToFile(`Returning ${files.length} files`);
  res.json(files);
});

app.post('/api/files', async (req, res) => {
  logToFile('POST /api/files called');
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logToFile('Unauthorized access attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  const adminToken = await storage.get('admin_token');
  
  if (!adminToken || token !== adminToken) {
    logToFile('Invalid token');
    return res.status(401).json({ error: 'Invalid token' });
  }

  const newFile = req.body;
  
  // 验证文件数据
  if (!newFile || !newFile.name || !newFile.type) {
    logToFile('Invalid file data: name or type missing');
    return res.status(400).json({ error: 'Invalid file data: name and type are required' });
  }

  // 确保文件夹有正确的结构
  if (newFile.type === 'folder') {
    if (!newFile.children) {
      newFile.children = [];
    }
    if (newFile.expanded === undefined) {
      newFile.expanded = false;
    }
  }

  let files = await storage.get('files') || [];
  logToFile(`Current files before adding: ${JSON.stringify(files)}`);
  files.push(newFile);
  logToFile(`Files after adding new file: ${JSON.stringify(files)}`);
  
  const result = await storage.set('files', files);
  logToFile(`Storage set result: ${result}`);
  
  if (result) {
    logToFile(`File created successfully: ${newFile.name}`);
    res.status(201).json(newFile);
  } else {
    logToFile('Failed to save file data');
    res.status(500).json({ error: 'Failed to save file data' });
  }
});

app.put('/api/files', async (req, res) => {
  logToFile('PUT /api/files called');
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logToFile('Unauthorized access attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  const adminToken = await storage.get('admin_token');
  
  if (!adminToken || token !== adminToken) {
    logToFile('Invalid token');
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { index, file } = req.body;
  
  if (index === undefined || !file) {
    logToFile('Invalid update data: index or file missing');
    return res.status(400).json({ error: 'Invalid update data' });
  }

  let files = await storage.get('files') || [];
  
  if (index < 0 || index >= files.length) {
    logToFile(`File not found at index: ${index}`);
    return res.status(404).json({ error: 'File not found' });
  }
  
  files[index] = file;
  const result = await storage.set('files', files);
  
  if (result) {
    logToFile(`File at index ${index} updated successfully`);
    res.json(file);
  } else {
    logToFile(`Failed to update file at index ${index}`);
    res.status(500).json({ error: 'Failed to update file data' });
  }
});

app.delete('/api/files', async (req, res) => {
  logToFile('DELETE /api/files called');
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logToFile('Unauthorized access attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  const adminToken = await storage.get('admin_token');
  
  if (!adminToken || token !== adminToken) {
    logToFile('Invalid token');
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { index } = req.body;
  
  if (index === undefined) {
    logToFile('Invalid delete request: index missing');
    return res.status(400).json({ error: 'Invalid delete request' });
  }

  let files = await storage.get('files') || [];
  
  if (index < 0 || index >= files.length) {
    logToFile(`File not found at index: ${index}`);
    return res.status(404).json({ error: 'File not found' });
  }
  
  files.splice(index, 1);
  const result = await storage.set('files', files);
  
  if (result) {
    logToFile(`File at index ${index} deleted successfully`);
    res.json({ message: 'File deleted successfully' });
  } else {
    logToFile(`Failed to delete file at index ${index}`);
    res.status(500).json({ error: 'Failed to delete file data' });
  }
});

// 启动服务器
app.listen(PORT, () => {
  const message = `Server is running on http://localhost:${PORT}`;
  console.log(message);
  logToFile(message);
  console.log(`Open http://localhost:${PORT} in your browser to view the application`);
  logToFile(`Open http://localhost:${PORT} in your browser to view the application`);
});