# 网盘应用

## 本地开发

### 安装依赖
```bash
npm install
```

### 启动本地服务器
```bash
npm run dev
```

或者直接运行:
```bash
node server.js
```

服务器将在 http://localhost:3001 启动（注意：端口已更改为3001以避免冲突）

## 后台管理
- 默认用户名: admin
- 默认密码: admin123

## 功能说明
1. 文件管理: 可以添加、编辑、删除文件和文件夹
2. 留言系统: 用户可以留言，管理员可以审核和回复
3. 文件名自动添加时间戳: 所有文件和文件夹名称会自动添加 YYYYMMDD 格式的时间戳

## 技术栈
- 前端: HTML, CSS, JavaScript, Bootstrap
- 后端: Node.js, Express
- 数据库: Upstash Redis (生产环境) / 内存存储 (本地开发)
- 部署: Vercel

## 注意事项
- 本地开发时使用内存存储，数据不会持久化
- 生产环境部署时需要配置 Upstash Redis 环境变量