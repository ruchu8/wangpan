const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testLocalAuth() {
  console.log('Testing local authentication (using server.js):');
  
  try {
    // 测试1: 使用 admin_token 的值作为密码
    console.log('\n1. Testing with admin_token value (test-token):');
    const response1 = await fetch('http://localhost:3001/api/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        password: 'test-token'
      }),
    });

    const data1 = await response1.json();
    console.log('Status:', response1.status);
    console.log('Response:', data1);
    
    // 测试2: 使用 admin_credentials 中的密码
    console.log('\n2. Testing with admin_credentials password (admin123):');
    const response2 = await fetch('http://localhost:3001/api/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        password: 'admin123'
      }),
    });

    const data2 = await response2.json();
    console.log('Status:', response2.status);
    console.log('Response:', data2);
    
    // 测试3: 使用用户名和密码的方式（模拟 Vercel API）
    console.log('\n3. Testing with username and password (Vercel API style):');
    const response3 = await fetch('http://localhost:3001/api/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      }),
    });

    const data3 = await response3.json();
    console.log('Status:', response3.status);
    console.log('Response:', data3);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testLocalAuth();