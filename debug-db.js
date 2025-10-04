require('dotenv').config();
const { Client } = require('pg');

async function debugDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // 查询 files 表
    const filesResult = await client.query('SELECT * FROM files');
    console.log('Files table data:', filesResult.rows);

    // 查询 comments 表
    const commentsResult = await client.query('SELECT * FROM comments');
    console.log('Comments table data:', commentsResult.rows);

    // 查询 admin_credentials 表
    const adminCredentialsResult = await client.query('SELECT * FROM admin_credentials');
    console.log('Admin credentials table data:', adminCredentialsResult.rows);

    // 查询 admin_token 表
    const adminTokenResult = await client.query('SELECT * FROM admin_token');
    console.log('Admin token table data:', adminTokenResult.rows);

  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await client.end();
  }
}

debugDatabase();