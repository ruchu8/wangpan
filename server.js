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
  // 检查是否是获取已回复留言总数的特殊请求
  if (req.query.action === 'replied-count') {
    let client;
    try {
      client = await storage.pool.connect();
      
      // 获取已回复留言的总数
      const countResult = await client.query('SELECT COUNT(*) as count FROM comments WHERE reply IS NOT NULL AND reply != \'\'');
      const repliedCount = parseInt(countResult.rows[0].count);
      
      return res.json({ count: repliedCount });
    } catch (error) {
      console.error('Error fetching replied comments count:', error);
      res.status(500).json({ error: 'Failed to fetch replied comments count: ' + error.message });
    } finally {
      if (client) {
        client.release();
      }
    }
  }
  
  // 检查是否是获取待回复留言总数的特殊请求
  else if (req.query.action === 'pending-count') {
    let client;
    try {
      client = await storage.pool.connect();
      
      // 获取待回复留言的总数（没有回复的留言）
      const countResult = await client.query('SELECT COUNT(*) as count FROM comments WHERE reply IS NULL OR reply = \'\'');
      const pendingCount = parseInt(countResult.rows[0].count);
      
      return res.json({ count: pendingCount });
    } catch (error) {
      console.error('Error fetching pending comments count:', error);
      res.status(500).json({ error: 'Failed to fetch pending comments count: ' + error.message });
    } finally {
      if (client) {
        client.release();
      }
    }
  }
  
  let client;
  try {
    client = await storage.pool.connect();
    
    // 获取分页参数
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 8;
    const offset = (page - 1) * limit;
    
    // 检查是否有认证头，如果有且是管理员，则返回所有留言（包括未审核的），并显示完整联系方式和内容
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const adminTokenResult = await client.query('SELECT token FROM admin_token LIMIT 1');
      const adminToken = adminTokenResult.rows.length > 0 ? adminTokenResult.rows[0].token : null;
      
      if (adminToken && token === adminToken) {
        // 管理员访问，返回分页留言，包括未审核的，并显示完整联系方式和内容
        const countResult = await client.query('SELECT COUNT(*) as count FROM comments');
        const totalComments = parseInt(countResult.rows[0].count);
        
        const commentsResult = await client.query(
          'SELECT * FROM comments ORDER BY date DESC LIMIT $1 OFFSET $2',
          [limit, offset]
        );
        
        return res.json({
          comments: commentsResult.rows,
          totalPages: Math.ceil(totalComments / limit),
          currentPage: page,
          totalComments: totalComments
        });
      }
    }
    
    // 普通用户访问（前台），返回分页留言，对联系方式和未审核留言的内容进行隐私保护处理
    const countResult = await client.query('SELECT COUNT(*) as count FROM comments');
    const totalComments = parseInt(countResult.rows[0].count);
    
    const commentsResult = await client.query(
      'SELECT * FROM comments ORDER BY date DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    
    // 对留言进行隐私保护处理
    const processedComments = commentsResult.rows.map(comment => {
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
            // 邮箱显示前2位+**+后2位@域名，如123456@qq.com显示为12**56@qq.com
            const start = localPart.substring(0, 2);
            const end = localPart.substring(localPart.length - 2);
            const maskedLocalPart = `${start}**${end}`;
            maskedContactInfo = `${maskedLocalPart}@${domain}`;
          }
        } else {
          // 如果是QQ号或微信号
          if (contactInfo.length > 3) {
            // QQ/微信隐藏规则：显示前3位和后3位，5位数显示前2位和后2位
            if (contactInfo.length === 5) {
              // 5位数显示前2位和后2位
              const start = contactInfo.substring(0, 2);
              const end = contactInfo.substring(contactInfo.length - 2);
              maskedContactInfo = `${start}**${end}`;
            } else {
              // 其他长度显示前3位和后3位
              const start = contactInfo.substring(0, 3);
              const end = contactInfo.substring(contactInfo.length - 3);
              maskedContactInfo = `${start}**${end}`;
            }
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
    
    res.json({
      comments: processedComments,
      totalPages: Math.ceil(totalComments / limit),
      currentPage: page,
      totalComments: totalComments
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments: ' + error.message });
  } finally {
    if (client) {
      client.release();
    }
  }
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
  const { id, approved, reply, content } = req.body;
  
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
  
  // 更新评论内容（如果提供了新的内容）
  if (content !== undefined) {
    comments[commentIndex].content = content;
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
  const { username, password } = req.body;
  
  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  // 获取管理员凭证
  const adminCredentials = await storage.get('admin_credentials');
  
  // 如果没有管理员凭证，创建默认的
  if (!adminCredentials) {
    const defaultCredentials = {
      username: 'admin',
      password: 'admin123'
    };
    await storage.set('admin_credentials', defaultCredentials);
    
    // 如果用户名字段为空，使用默认用户名
    const userToCheck = username || 'admin';
    
    // 验证密码
    if (password === 'admin123' && userToCheck === 'admin') {
      const adminToken = await storage.get('admin_token') || 'default_admin_token';
      return res.json({ 
        success: true, 
        token: adminToken,
        message: 'Login successful' 
      });
    } else {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }
  }
  
  // 如果用户名字段为空，使用存储的用户名
  const userToCheck = username || adminCredentials.username;
  
  // 验证用户名和密码
  if (userToCheck === adminCredentials.username && password === adminCredentials.password) {
    const adminToken = await storage.get('admin_token') || 'default_admin_token';
    return res.json({ 
      success: true, 
      token: adminToken,
      message: 'Login successful' 
    });
  } else {
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid credentials' 
    });
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

// 添加处理 PUT 请求的路由，用于更新文件
app.put('/api/files', async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  const adminToken = await storage.get('admin_token');
  
  if (!adminToken || token !== adminToken) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { index, file } = req.body;
  
  if (index === undefined || !file) {
    return res.status(400).json({ error: 'Index and file data are required' });
  }

  let files = await storage.get('files') || [];
  
  if (index < 0 || index >= files.length) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  files[index] = file;
  const result = await storage.set('files', files);
  
  if (result) {
    // 修复：返回更新后的文件数据
    res.json({ message: 'File updated successfully', file: files[index] });
  } else {
    res.status(500).json({ error: 'Failed to update file data' });
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
  console.log(`服务器正在运行，端口: ${PORT}`);
});
