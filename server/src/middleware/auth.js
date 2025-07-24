const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    console.log('Auth middleware - Token received:', token ? 'Yes' : 'No');

    if (!token) {
      console.log('Auth middleware - No token provided');
      throw new Error();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    console.log('Auth middleware - Decoded user:', { userId: decoded.userId, role: decoded.role });
    next();
  } catch (error) {
    console.log('Auth middleware - Error:', error.message);
    res.status(401).json({ error: '認証が必要です' });
  }
};

const managerOnly = (req, res, next) => {
  if (req.userRole !== 'manager') {
    return res.status(403).json({ error: 'マネージャー権限が必要です' });
  }
  next();
};

module.exports = { authMiddleware, managerOnly };