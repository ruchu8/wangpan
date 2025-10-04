require('dotenv').config();
const { Client } = require('@neondatabase/serverless');

async function testFiles() {
  // 优先使用 VERCEL 环境变量，然后是 POSTGRES_URL，最后是 DATABASE_URL
  const DATABASE_URL = process.env.POSTGRES_URL || process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_uQK81FdVvOjX@ep-bold-mode-a1z19z94-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
  
  if (!DATABASE_URL) {
    console.error('Database URL not found in environment variables');
    return;
  }
  
  console.log('Using database URL:', DATABASE_URL.substring(0, 50) + '...'); // 只显示前50个字符以保护隐私
  
  const client = new Client(DATABASE_URL);

  try {
    await client.connect();
    console.log('Connected to database');

    // 查询 files 表
    const filesResult = await client.query('SELECT data FROM files LIMIT 1');
    if (filesResult.rows.length > 0) {
      const data = filesResult.rows[0].data;
      console.log('Files data from database:', data);
      
      // 如果是字符串，尝试解析
      if (typeof data === 'string') {
        try {
          const parsedData = JSON.parse(data);
          console.log('Parsed files data:', parsedData);
        } catch (error) {
          console.error('Error parsing files data:', error);
        }
      } else {
        console.log('Files data (direct):', data);
      }
    } else {
      console.log('No files data found');
    }

  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await client.end();
  }
}

testFiles();