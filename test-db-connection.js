require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

async function testDatabaseConnection() {
  console.log('Testing database connection and table structure...');
  
  // 优先使用 VERCEL 环境变量，然后是 POSTGRES_URL，最后是 DATABASE_URL
  const databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ Database URL not found in environment variables');
    return;
  }
  
  console.log('Using database URL:', databaseUrl.substring(0, 30) + '...');
  
  const sql = neon(databaseUrl);

  try {
    // 测试数据库连接
    console.log('Testing connection...');
    const versionResult = await sql`SELECT version()`;
    console.log('✅ Connected to database successfully');
    console.log('Database version:', versionResult[0].version);
    
    // 检查表是否存在
    console.log('Checking tables...');
    const tablesResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    const tableNames = tablesResult.map(row => row.table_name);
    console.log('✅ Available tables:', tableNames.join(', '));
    
    // 检查特定表结构
    if (tableNames.includes('admin_credentials')) {
      console.log('Checking admin_credentials table structure...');
      const adminCredColumns = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'admin_credentials'
      `;
      console.log('admin_credentials columns:', adminCredColumns.map(c => `${c.column_name} (${c.data_type})`));
    }
    
    if (tableNames.includes('admin_tokens')) {
      console.log('Checking admin_tokens table structure...');
      const adminTokenColumns = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'admin_tokens'
      `;
      console.log('admin_tokens columns:', adminTokenColumns.map(c => `${c.column_name} (${c.data_type})`));
    }
    
    if (tableNames.includes('comments')) {
      console.log('Checking comments table structure...');
      const commentsColumns = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'comments'
      `;
      console.log('comments columns:', commentsColumns.map(c => `${c.column_name} (${c.data_type})`));
    }
    
    // 检查数据
    console.log('Checking data...');
    try {
      const adminCredResult = await sql`SELECT * FROM admin_credentials LIMIT 1`;
      console.log('admin_credentials data:', adminCredResult.length > 0 ? 'Exists' : 'Empty');
    } catch (error) {
      console.log('admin_credentials table may not exist or is empty');
    }
    
    try {
      const adminTokenResult = await sql`SELECT * FROM admin_tokens LIMIT 1`;
      console.log('admin_tokens data:', adminTokenResult.length > 0 ? 'Exists' : 'Empty');
    } catch (error) {
      console.log('admin_tokens table may not exist or is empty');
    }
    
    try {
      const commentsResult = await sql`SELECT COUNT(*) as count FROM comments`;
      console.log('comments count:', commentsResult[0].count);
    } catch (error) {
      console.log('comments table may not exist or is empty');
    }
    
    console.log('✅ Database test completed successfully');
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.error('Error stack:', error.stack);
  }
}

testDatabaseConnection();