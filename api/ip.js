// Vercel Serverless Function for getting client IP
module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Handle GET request
  if (req.method === 'GET') {
    try {
      // 获取客户端IP地址
      // 优先级：X-Forwarded-For > X-Real-IP > req.connection.remoteAddress > req.socket.remoteAddress
      let ip = req.headers['x-forwarded-for'] || 
               req.headers['x-real-ip'] || 
               req.connection.remoteAddress || 
               req.socket.remoteAddress;
      
      // 如果IP是IPv6格式且包含::ffff:，则转换为IPv4格式
      if (ip && ip.includes('::ffff:')) {
        ip = ip.split('::ffff:')[1];
      }
      
      // 如果IP是IPv6本地地址（如::1），则使用本地回环地址
      if (ip === '::1') {
        ip = '127.0.0.1';
      }
      
      // 如果IP是IPv6格式且不是本地地址，则转换为IPv4格式
      if (ip && ip.includes(':') && !ip.includes('::ffff:')) {
        // 尝试提取IPv4部分
        const ipv4Match = ip.match(/:(\d+\.\d+\.\d+\.\d+)$/);
        if (ipv4Match) {
          ip = ipv4Match[1];
        }
      }
      
      // 返回IP地址
      return res.status(200).json({ ip });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to get client IP' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
};
