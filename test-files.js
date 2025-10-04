require('dotenv').config();
const { Client } = require('@neondatabase/serverless');

async function testFiles() {
  const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_uQK81FdVvOjX@ep-bold-mode-a1z19z94-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
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