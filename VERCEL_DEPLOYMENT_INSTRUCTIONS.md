# Vercel 部署说明

## 问题描述
部署失败错误信息：
```
Deployment failed — Environment Variable "DATABASE_URL" references Secret "database_url", which does not exist.
```

## 解决方案

### 1. 在 Vercel 控制台配置环境变量

1. 登录 [Vercel 控制台](https://vercel.com/dashboard)
2. 选择你的项目
3. 点击 "Settings" 选项卡
4. 在左侧菜单中选择 "Environment Variables"
5. 添加以下环境变量：

| 名称 | 值 |
|------|-----|
| POSTGRES_URL | `postgresql://neondb_owner:npg_uQK81FdVvOjX@ep-bold-mode-a1z19z94-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require` |
| DATABASE_URL | `postgresql://neondb_owner:npg_uQK81FdVvOjX@ep-bold-mode-a1z19z94-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require` |

### 2. 删除错误的密钥引用

确保在 Vercel 项目的环境变量设置中没有指向不存在密钥 "@database_url" 的引用。

### 3. 重新部署

1. 在 Vercel 控制台中，点击 "Deployments" 选项卡
2. 点击 "Redeploy" 按钮
3. 选择 "Redeploy with existing Build Cache" 选项

## 代码说明

项目代码已经更新，现在会优先使用 `POSTGRES_URL` 环境变量，如果不存在则使用 `DATABASE_URL` 环境变量。

```javascript
// 初始化 Neon PostgreSQL 客户端
const databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('Database URL not found in environment variables');
  throw new Error('Database URL not found in environment variables');
}
const sql = neon(databaseUrl);
```

## 本地开发

在本地开发时，项目会从 `.env` 文件读取环境变量。确保 `.env` 文件包含正确的数据库连接字符串。