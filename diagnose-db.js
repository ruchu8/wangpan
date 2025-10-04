// Vercel Serverless Function for database diagnosis
const { neon } = require('@neondatabase/serverless');

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    try {
      // 初始化 Neon PostgreSQL 客户端
      // 优先使用 VERCEL 环境变量，然后是 POSTGRES_URL，最后是 DATABASE_URL
      const databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
      
      if (!databaseUrl) {
        return res.status(500).json({ 
          error: 'Database URL not found in environment variables',
          envVars: {
            POSTGRES_URL: process.env.POSTGRES_URL ? 'SET' : 'NOT SET',
            DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET'
          }
        });
      }

      const sql = neon(databaseUrl);
      
      // 测试数据库连接
      const versionResult = await sql`SELECT version()`;
      
      // 检查表是否存在
      const tablesResult = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `;
      
      const tableNames = tablesResult.map(row => row.table_name);
      
      // 检查每个表的数据
      const tableData = {};
      
      if (tableNames.includes('admin_credentials')) {
        try {
          const result = await sql`SELECT COUNT(*) as count FROM admin_credentials`;
          tableData.admin_credentials = result[0].count;
        } catch (error) {
          tableData.admin_credentials = 'Error: ' + error.message;
        }
      }
      
      if (tableNames.includes('admin_tokens')) {
        try {
          const result = await sql`SELECT COUNT(*) as count FROM admin_tokens`;
          tableData.admin_tokens = result[0].count;
        } catch (error) {
          tableData.admin_tokens = 'Error: ' + error.message;
        }
      }
      
      if (tableNames.includes('comments')) {
        try {
          const result = await sql`SELECT COUNT(*) as count FROM comments`;
          tableData.comments = result[0].count;
        } catch (error) {
          tableData.comments = 'Error: ' + error.message;
        }
      }
      
      return res.status(200).json({
        success: true,
        databaseUrl: databaseUrl.substring(0, 30) + '...',
        databaseVersion: versionResult[0].version,
        tables: tableNames,
        tableData: tableData,
        envVars: {
          POSTGRES_URL: process.env.POSTGRES_URL ? 'SET' : 'NOT SET',
          DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET'
        }
      });
    } catch (error) {
      console.error('Database diagnosis error:', error);
      return res.status(500).json({ 
        error: 'Database diagnosis failed',
        message: error.message,
        stack: error.stack
      });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
};