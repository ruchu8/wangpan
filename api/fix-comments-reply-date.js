// Vercel Serverless Function for ensuring reply_date column exists in comments table
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
      console.log('Comments reply_date fix request received');
      
      // 初始化 Neon PostgreSQL 客户端
      let databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
      
      // 清理数据库URL
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
        console.log('❌ Comments table does not exist');
        return res.status(404).json({
          error: 'Comments table does not exist'
        });
      }
      
      console.log('✅ Comments table exists');
      
      // 检查reply_date列是否存在
      console.log('Checking reply_date column...');
      const columnsResult = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'comments' AND column_name = 'reply_date'
      `;
      
      if (columnsResult.length === 0) {
        console.log('❌ reply_date column does not exist, adding it...');
        await sql`ALTER TABLE comments ADD COLUMN reply_date TEXT`;
        console.log('✅ reply_date column added');
        
        // 更新现有回复的记录，设置reply_date
        console.log('Updating existing replies with reply_date...');
        const updateResult = await sql`
          UPDATE comments 
          SET reply_date = date 
          WHERE reply IS NOT NULL AND reply_date IS NULL
        `;
        console.log(`✅ Updated ${updateResult.length} existing replies with reply_date`);
        
        return res.status(200).json({ 
          success: true,
          message: 'reply_date column added and existing replies updated',
          addedColumn: 'reply_date',
          updatedReplies: updateResult.length
        });
      } else {
        console.log('✅ reply_date column already exists');
        return res.status(200).json({
          success: true,
          message: 'reply_date column already exists',
          columnExists: true
        });
      }
    } catch (error) {
      console.error('❌ Comments reply_date fix error:', error);
      return res.status(500).json({ 
        error: 'Comments reply_date fix failed',
        message: error.message,
        stack: error.stack
      });
    }
  } else if (req.method === 'GET') {
    return res.status(200).json({ 
      message: 'Send a POST request to this endpoint to ensure reply_date column exists' 
    });
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
};
