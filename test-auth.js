const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testAuth() {
  try {
    // 测试正确的密码
    console.log('Testing with correct password:');
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
    
    // 测试错误的密码
    console.log('\nTesting with incorrect password:');
    const response2 = await fetch('http://localhost:3001/api/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        password: 'wrong-password'
      }),
    });

    const data2 = await response2.json();
    console.log('Status:', response2.status);
    console.log('Response:', data2);
  } catch (error) {
    console.error('Error:', error);
  }
}

testAuth();