// Vercel Serverless Function for authentication
const { kv } = require('@vercel/kv');

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      // Check if admin credentials exist, if not create default ones
      const adminExists = await kv.exists('admin_credentials');
      
      if (!adminExists) {
        await kv.set('admin_credentials', {
          username: 'admin',
          password: 'admin123' // In production, use hashed passwords
        });
        
        // Generate a random token for API authentication
        const token = Math.random().toString(36).substring(2, 15) + 
                     Math.random().toString(36).substring(2, 15);
        await kv.set('admin_token', token);
      }
      
      const adminCredentials = await kv.get('admin_credentials');
      const adminToken = await kv.get('admin_token');
      
      if (username === adminCredentials.username && password === adminCredentials.password) {
        return res.status(200).json({ 
          success: true, 
          token: adminToken,
          message: 'Login successful' 
        });
      } else {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid credentials' 
        });
      }
    } catch (error) {
      console.error('Authentication error:', error);
      return res.status(500).json({ error: 'Authentication failed' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
};