const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testUnifiedAuth() {
  console.log('Testing unified authentication (using database credentials):');
  
  try {
    // 测试1: 使用正确的用户名和密码
    console.log('\n1. Testing with correct username and password (admin/admin123):');
    const response1 = await fetch('http://localhost:3001/api/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      }),
    });

    const data1 = await response1.json();
    console.log('Status:', response1.status);
    console.log('Response:', data1);
    
    // 测试2: 只使用密码（应该也能工作）
    console.log('\n2. Testing with only password (admin123):');
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
    
    // 测试3: 使用错误的密码
    console.log('\n3. Testing with incorrect password:');
    const response3 = await fetch('http://localhost:3001/api/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'wrong-password'
      }),
    });

    const data3 = await response3.json();
    console.log('Status:', response3.status);
    console.log('Response:', data3);
    
    // 测试4: 使用错误的用户名
    console.log('\n4. Testing with incorrect username:');
    const response4 = await fetch('http://localhost:3001/api/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'wrong-user',
        password: 'admin123'
      }),
    });

    const data4 = await response4.json();
    console.log('Status:', response4.status);
    console.log('Response:', data4);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testUnifiedAuth();