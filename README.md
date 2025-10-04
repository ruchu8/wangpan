# 如初的网盘 - 传奇补丁资源站

一个现代化的文件分享网站，专注于传奇游戏补丁资源。

## 项目特点

### 🎨 现代化设计
- 使用 Bootstrap 5 框架构建响应式界面
- 美观的渐变背景和动画效果
- 专业的卡片式布局
- 优雅的悬.hover效果和过渡动画

### 📁 文件管理
- 直观的文件列表展示
- 支持文件夹展开/折叠
- 根据文件类型显示不同图标
- 文件备注和日期显示
- 实时搜索功能

### 💬 留言系统
- 用户友好的留言表单
- 留言分页功能
- 联系方式隐私保护
- 管理员回复功能

### 🚀 用户体验
- 平滑滚动效果
- 返回顶部按钮
- 响应式设计，适配各种设备
- 加载动画和状态提示

## 技术栈

- **前端框架**: Bootstrap 5
- **图标库**: Bootstrap Icons
- **动画库**: Animate.css
- **后端**: Node.js, Express
- **数据存储**: PostgreSQL (通过 Neon DB)

## 安装与运行

1. 克隆仓库
```bash
git clone https://github.com/ruchu8/wangpan.git
cd wangpan
```

2. 安装依赖
```bash
npm install
```

3. 启动开发服务器
```bash
npm run dev
```

4. 访问 http://localhost:3000 查看网站

## 部署到 Vercel

### 环境变量配置

在 Vercel 控制台的 Environment Variables 设置中添加以下环境变量：

| 名称 | 值 |
|------|-----|
| POSTGRES_URL | `postgresql://neondb_owner:npg_uQK81FdVvOjX@ep-bold-mode-a1z19z94-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require` |

详细部署说明请参考 [VERCEL_DEPLOYMENT_INSTRUCTIONS.md](VERCEL_DEPLOYMENT_INSTRUCTIONS.md)

### Vercel部署后问题诊断

如果部署后出现无法留言或无法登录后台的问题，请按以下步骤进行诊断：

1. **检查环境变量**：
   确保在Vercel项目设置中正确配置了`POSTGRES_URL`环境变量。

2. **测试数据库连接**：
   访问 `https://你的域名/api/test-db` 来测试数据库连接状态。

3. **手动初始化数据库**：
   如果表结构有问题，可以访问 `https://你的域名/api/init-db` 并发送POST请求来手动初始化数据库。

4. **检查Vercel函数日志**：
   在Vercel控制台的"Functions"部分查看[api/auth.js](file:///c:/Users/Administrator/Desktop/test/api/auth.js)和[api/comments.js](file:///c:/Users/Administrator/Desktop/test/api/comments.js)的日志。

### 常见问题及解决方案

#### 数据库连接字符串格式错误
如果遇到类似以下错误：
```
Database connection string provided to `neon()` is not a valid URL
```

这通常是由于环境变量值前后有空格或其他不可见字符导致的。请检查：
1. Vercel控制台中的环境变量配置是否正确
2. 环境变量值前后不应有空格

#### 数据库表未正确初始化
如果登录或留言功能不正常，可能是数据库表未正确初始化：
1. 访问 `https://你的域名/api/init-db` 并发送POST请求
2. 等待初始化完成后再测试功能

#### 文件管理功能异常
如果遇到"加载文件列表失败: HTTP error! status: 500"或"保存文件失败: Unexpected token"等错误：

1. 测试文件API：访问 `https://你的域名/api/test-files-api` 检查文件API状态
2. 检查Vercel函数日志中[api/files.js](file:///c:/Users/Administrator/Desktop/test/api/files.js)的错误信息
3. 确保数据库表结构正确（files表应该存在且包含data字段）

#### 文件数据格式错误
如果遇到"Unexpected token 'o', "[object Obj"... is not valid JSON"错误：

1. 这表示数据库中的文件数据格式不正确
2. 访问 `https://你的域名/api/fix-files-data` 并发送POST请求来修复数据格式
3. 等待修复完成后重新测试文件管理功能

#### 留言提交问题
如果遇到"Failed to add comment: column "ip" of relation "comments" does not exist"错误：

1. 这表示comments表结构不正确，缺少ip列
2. 访问 `https://你的域名/api/fix-comments-table` 并发送POST请求来修复表结构
3. 等待修复完成后重新测试留言功能

#### 后台添加子文件问题
如果后台无法添加子文件：

1. 确保已正确登录后台管理系统
2. 检查认证令牌是否有效
3. 使用测试页面 [test-add-file.html](file:///c:/Users/Administrator/Desktop/test/test-add-file.html) 来诊断问题

### 默认管理员凭据

- 用户名：`admin`
- 密码：`admin123`

## 项目结构

```
wangpan/
├── api/                 # API 路由
│   ├── auth.js
│   ├── comments.js
│   ├── files.js
│   ├── fix-comments-table.js
│   ├── fix-files-data.js
│   ├── init-db.js
│   ├── test-db.js
│   └── test-files-api.js
├── index.html           # 主页面
├── style.css            # 自定义样式
├── script.js            # 前端脚本
├── server.js            # 服务器入口
├── package.json         # 项目配置
└── README.md            # 项目说明
```

## 功能说明

### 文件列表
- 展示网站上的所有文件和文件夹
- 点击文件夹可以展开/折叠查看内容
- 每个文件都有对应的图标，便于识别
- 支持文件备注和创建日期显示

### 搜索功能
- 在文件列表页面顶部有搜索框
- 支持实时搜索，输入时自动过滤文件
- 搜索结果会高亮显示匹配的文件名

### 留言板
- 用户可以留下联系方式和留言内容
- 支持三种联系方式：QQ、微信、邮箱
- 留言需要管理员审核后才会公开显示
- 管理员可以对留言进行回复

### 响应式设计
- 适配桌面、平板和手机等不同设备
- 在小屏幕设备上自动调整布局
- 导航栏在小屏幕上会折叠为汉堡菜单

## 自定义

### 修改网站标题和描述
编辑 `index.html` 文件中的 `<title>` 和 `<meta description>` 标签。

### 更改主题颜色
编辑 `style.css` 文件中的 `:root` 部分，修改 CSS 变量。

### 添加新的文件类型图标
在 `script.js` 文件的 `renderFileList` 函数中扩展 `switch` 语句，添加新的文件类型和对应的图标类名。

## 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目。

## 许可证

ISC