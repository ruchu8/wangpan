// Vercel Serverless Function for testing files API
const { neon } = require('@neondatabase/serverless');

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    try {
      console.log('Files API test request received');
      
      // 初始化 Neon PostgreSQL 客户端
      // 优先使用 VERCEL 环境变量，然后是 POSTGRES_URL，最后是 DATABASE_URL
      let databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
      
      // 清理数据库URL，移除可能的空格和其他无效字符
      if (databaseUrl) {
        databaseUrl = databaseUrl.trim();
        console.log('Using database URL:', databaseUrl.substring(0, 50) + '...');
      }
      
      // 验证URL格式
      try {
        new URL(databaseUrl);
        console.log('✅ Database URL format is valid');
      } catch (urlError) {
        console.error('❌ Database URL format is invalid:', databaseUrl);
        return res.status(500).json({ 
          error: 'Database URL format is invalid',
          url: databaseUrl,
          message: urlError.message
        });
      }
      
      if (!databaseUrl) {
        console.error('❌ Database URL not found in environment variables');
        return res.status(500).json({ 
          error: 'Database URL not found in environment variables',
          envVars: {
            POSTGRES_URL: process.env.POSTGRES_URL ? 'SET' : 'NOT SET',
            DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET'
          }
        });
      }

      console.log('Using database URL:', databaseUrl.substring(0, 30) + '...');
      const sql = neon(databaseUrl);
      
      // 测试数据库连接
      console.log('Testing database connection...');
      const versionResult = await sql`SELECT version()`;
      console.log('✅ Database connection successful');
      
      // 检查所有表
      console.log('Checking all tables...');
      const tablesResult = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `;
      
      const tableNames = tablesResult.map(row => row.table_name);
      console.log('✅ Available tables:', tableNames);
      
      // 检查files表是否存在
      console.log('Checking files table...');
      if (!tableNames.includes('files')) {
        console.log('❌ Files table does not exist');
        return res.status(500).json({ 
          error: 'Files table does not exist',
          availableTables: tableNames
        });
      }
      
      console.log('✅ Files table exists');
      
      // 检查表结构
      try {
        console.log('Checking files table structure...');
        const columnsResult = await sql`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'files'
        `;
        
        const columns = columnsResult.map(row => ({
          name: row.column_name,
          type: row.data_type
        }));
        
        console.log('Files table columns:', columns);
        
        // 检查必需的列是否存在
        const requiredColumns = ['id', 'data'];
        const missingColumns = requiredColumns.filter(col => !columns.some(c => c.name === col));
        
        if (missingColumns.length > 0) {
          console.log('❌ Files table is missing required columns:', missingColumns);
          return res.status(500).json({ 
            error: 'Files table is missing required columns',
            missingColumns: missingColumns,
            tableColumns: columns
          });
        }
      } catch (structureError) {
        console.error('❌ Error checking files table structure:', structureError);
        return res.status(500).json({ 
          error: 'Error checking files table structure',
          message: structureError.message
        });
      }
      
      // 检查表中的数据
      try {
        console.log('Checking files data...');
        const result = await sql`SELECT data FROM files LIMIT 1`;
        const files = result.length > 0 ? JSON.parse(result[0].data) : [];
        console.log('✅ Files data retrieved successfully');
        
        return res.status(200).json({
          success: true,
          message: 'Files API is working correctly',
          databaseVersion: versionResult[0].version,
          availableTables: tableNames,
          filesCount: files.length,
          sampleData: files.slice(0, 3) // 只返回前3个文件作为示例
        });
      } catch (dataError) {
        console.error('❌ Error retrieving files data:', dataError);
        return res.status(500).json({ 
          error: 'Error retrieving files data',
          message: dataError.message
        });
      }
    } catch (error) {
      console.error('❌ Files API test error:', error);
      return res.status(500).json({ 
        error: 'Files API test failed',
        message: error.message,
        stack: error.stack
      });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
};