const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

// 创建 Express 应用
const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.'));

// 模拟 Redis 存储
let storage = {
  comments: [],
  files: [],
  admin_credentials: { username: 'admin', password: 'admin123' },
  admin_token: 'test-token'
};

// API 路由
app.get('/api/comments', (req, res) => {
  res.json(storage.comments);
});

app.post('/api/comments', (req, res) => {
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

  storage.comments.push(newComment);
  res.status(201).json(newComment);
});

app.put('/api/comments', (req, res) => {
  const { id, approved, reply } = req.body;
  
  if (!id) {
    return res.status(400).json({ error: 'Comment ID is required' });
  }

  const commentIndex = storage.comments.findIndex(comment => comment.id === id);
  
  if (commentIndex === -1) {
    return res.status(404).json({ error: 'Comment not found' });
  }
  
  // 更新评论状态或回复
  if (approved !== undefined) {
    storage.comments[commentIndex].approved = approved;
  }
  
  if (reply !== undefined) {
    storage.comments[commentIndex].reply = reply;
  }
  
  res.json(storage.comments[commentIndex]);
});

app.delete('/api/comments', (req, res) => {
  const { id } = req.body;
  
  if (!id) {
    return res.status(400).json({ error: 'Comment ID is required' });
  }

  const initialLength = storage.comments.length;
  storage.comments = storage.comments.filter(comment => comment.id !== id);
  
  if (storage.comments.length === initialLength) {
    return res.status(404).json({ error: 'Comment not found' });
  }
  
  res.json({ message: 'Comment deleted successfully' });
});

app.post('/api/auth', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  if (username === storage.admin_credentials.username && password === storage.admin_credentials.password) {
    return res.json({ 
      success: true, 
      token: storage.admin_token,
      message: 'Login successful' 
    });
  } else {
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid credentials' 
    });
  }
});

app.get('/api/files', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  if (!storage.admin_token || token !== storage.admin_token) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  res.json(storage.files);
});

app.post('/api/files', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  if (!storage.admin_token || token !== storage.admin_token) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const newFile = req.body;
  
  if (!newFile || !newFile.name || !newFile.type) {
    return res.status(400).json({ error: 'Invalid file data' });
  }

  storage.files.push(newFile);
  res.status(201).json(newFile);
});

app.put('/api/files', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  if (!storage.admin_token || token !== storage.admin_token) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { index, file } = req.body;
  
  if (index === undefined || !file) {
    return res.status(400).json({ error: 'Invalid update data' });
  }

  if (index < 0 || index >= storage.files.length) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  storage.files[index] = file;
  res.json(file);
});

app.delete('/api/files', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  if (!storage.admin_token || token !== storage.admin_token) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { index } = req.body;
  
  if (index === undefined) {
    return res.status(400).json({ error: 'Invalid delete request' });
  }

  if (index < 0 || index >= storage.files.length) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  storage.files.splice(index, 1);
  res.json({ message: 'File deleted successfully' });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser to view the application`);
});