const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: '認証が必要です' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    res.status(401).json({ error: '認証が必要です' });
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.userRole)) {
      return res.status(403).json({ error: 'この操作を行う権限がありません' });
    }
    next();
  };
};

const adminOnly = requireRole('admin');
const managerOrAdmin = requireRole('site_manager', 'admin');
const expertOrAbove = requireRole('expert', 'site_manager', 'admin');

module.exports = { authMiddleware, requireRole, adminOnly, managerOrAdmin, expertOrAbove };
