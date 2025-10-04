// Vercel Serverless Function for fixing comments table structure
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
      console.log('Comments table fix request received');
      
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
      
      // 检查comments表是否存在
      console.log('Checking comments table...');
      const commentsResult = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'comments'
      `;
      
      if (commentsResult.length === 0) {
        console.log('❌ Comments table does not exist, creating it...');
        // 创建comments表
        await sql`
          CREATE TABLE comments (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            content TEXT NOT NULL,
            date TEXT NOT NULL,
            approved BOOLEAN DEFAULT false,
            ip TEXT,
            reply TEXT
          )
        `;
        console.log('✅ Comments table created');
        return res.status(200).json({
          success: true,
          message: 'Comments table created successfully'
        });
      }
      
      console.log('✅ Comments table exists');
      
      // 检查表结构
      try {
        console.log('Checking comments table structure...');
        const columnsResult = await sql`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'comments'
        `;
        
        const columns = columnsResult.map(row => ({
          name: row.column_name,
          type: row.data_type
        }));
        
        console.log('Comments table columns:', columns);
        
        // 检查必需的列是否存在
        const requiredColumns = ['id', 'name', 'content', 'date', 'approved', 'ip', 'reply'];
        const existingColumns = columns.map(col => col.name);
        const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
        
        if (missingColumns.length > 0) {
          console.log('❌ Comments table is missing required columns:', missingColumns);
          
          // 添加缺失的列
          for (const column of missingColumns) {
            if (column === 'ip') {
              await sql`ALTER TABLE comments ADD COLUMN ip TEXT`;
              console.log('✅ Added ip column');
            } else if (column === 'reply') {
              await sql`ALTER TABLE comments ADD COLUMN reply TEXT`;
              console.log('✅ Added reply column');
            } else if (column === 'approved') {
              await sql`ALTER TABLE comments ADD COLUMN approved BOOLEAN DEFAULT false`;
              console.log('✅ Added approved column');
            }
          }
          
          return res.status(200).json({ 
            success: true,
            message: `Comments table fixed, added missing columns: ${missingColumns.join(', ')}`,
            addedColumns: missingColumns
          });
        } else {
          console.log('✅ Comments table structure is correct');
          return res.status(200).json({
            success: true,
            message: 'Comments table structure is correct',
            tableColumns: columns
          });
        }
      } catch (structureError) {
        console.error('❌ Error checking comments table structure:', structureError);
        return res.status(500).json({ 
          error: 'Error checking comments table structure',
          message: structureError.message
        });
      }
    } catch (error) {
      console.error('❌ Comments table fix error:', error);
      return res.status(500).json({ 
        error: 'Comments table fix failed',
        message: error.message,
        stack: error.stack
      });
    }
  } else if (req.method === 'GET') {
    return res.status(200).json({ 
      message: 'Send a POST request to this endpoint to fix comments table structure' 
    });
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
};