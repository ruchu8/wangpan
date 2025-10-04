require('dotenv').config();
const { Client } = require('pg');

async function fixDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // 查询 files 表中的当前数据
    const filesResult = await client.query('SELECT * FROM files');
    console.log('Current files data:', filesResult.rows);

    // 如果数据格式不正确，修复它
    if (filesResult.rows.length > 0) {
      // 删除现有的数据
      await client.query('DELETE FROM files');
      
      // 插入正确的数据格式
      const correctData = [];
      await client.query('INSERT INTO files (data) VALUES ($1)', [JSON.stringify(correctData)]);
      
      console.log('Fixed files table data');
    }

    // 再次查询确认
    const fixedFilesResult = await client.query('SELECT * FROM files');
    console.log('Fixed files table data:', fixedFilesResult.rows);

  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await client.end();
  }
}

fixDatabase();