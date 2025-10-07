const storage = require('./postgres-storage');

async function updateAdminToken() {
  try {
    console.log('Updating admin token to admin123...');
    const result = await storage.set('admin_token', 'admin123');
    console.log('Update result:', result);
    
    // 验证更新
    const newToken = await storage.get('admin_token');
    console.log('New admin token in database:', newToken);
  } catch (error) {
    console.error('Error updating admin token:', error);
  }
}

updateAdminToken();