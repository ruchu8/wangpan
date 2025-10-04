// Vercel Serverless Function for fixing files data
const { neon } = require('@neondatabase/serverless');

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    try {
      console.log('Files data fix request received');
      
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
          error: 'Database URL not found in environment variables'
        });
      }

      console.log('Using database URL:', databaseUrl.substring(0, 30) + '...');
      const sql = neon(databaseUrl);
      
      // 测试数据库连接
      console.log('Testing database connection...');
      const versionResult = await sql`SELECT version()`;
      console.log('✅ Database connection successful');
      
      // 检查files表是否存在
      console.log('Checking files table...');
      const filesResult = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'files'
      `;
      
      if (filesResult.length === 0) {
        console.log('❌ Files table does not exist');
        return res.status(500).json({ 
          error: 'Files table does not exist'
        });
      }
      
      console.log('✅ Files table exists');
      
      // 检查表中的数据
      try {
        console.log('Checking files data...');
        const result = await sql`SELECT id, data FROM files`;
        
        if (result.length === 0) {
          console.log('No data found in files table, creating default data...');
          // 创建默认数据
          await sql`INSERT INTO files (data) VALUES (${JSON.stringify([])})`;
          console.log('✅ Default files data created');
          return res.status(200).json({
            success: true,
            message: 'Default files data created successfully'
          });
        }
        
        // 修复所有行的数据
        let fixedCount = 0;
        for (const row of result) {
          const id = row.id;
          const data = row.data;
          
          console.log(`Checking row ${id}:`, typeof data, data);
          
          // 如果data不是字符串，或者不是有效的JSON，我们需要修复它
          if (typeof data !== 'string') {
            console.log(`Fixing row ${id} - data is not a string`);
            await sql`UPDATE files SET data = ${JSON.stringify([])} WHERE id = ${id}`;
            fixedCount++;
          } else {
            try {
              // 尝试解析JSON
              JSON.parse(data);
              console.log(`Row ${id} data is valid JSON`);
            } catch (parseError) {
              console.log(`Fixing row ${id} - data is invalid JSON:`, data);
              // 如果解析失败，设置为空数组
              await sql`UPDATE files SET data = ${JSON.stringify([])} WHERE id = ${id}`;
              fixedCount++;
            }
          }
        }
        
        console.log(`✅ Fixed ${fixedCount} rows`);
        
        return res.status(200).json({
          success: true,
          message: `Files data fixed successfully, ${fixedCount} rows updated`,
          rowsChecked: result.length,
          rowsFixed: fixedCount
        });
      } catch (dataError) {
        console.error('❌ Error checking files data:', dataError);
        return res.status(500).json({ 
          error: 'Error checking files data',
          message: dataError.message
        });
      }
    } catch (error) {
      console.error('❌ Files data fix error:', error);
      return res.status(500).json({ 
        error: 'Files data fix failed',
        message: error.message,
        stack: error.stack
      });
    }
  } else if (req.method === 'GET') {
    return res.status(200).json({ 
      message: 'Send a POST request to this endpoint to fix files data' 
    });
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
};