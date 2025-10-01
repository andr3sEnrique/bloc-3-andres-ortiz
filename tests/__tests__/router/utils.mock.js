// Mock para utils.js
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const token = req.cookies?.token;
  
  if (!token) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Token invalide' });
      }
      req.user = user;
      next();
    });
  } catch (error) {
    return res.status(403).json({ error: 'Token invalide' });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Accès refusé. Droits administrateur requis.' });
  }
};

module.exports = {
  authenticateToken,
  isAdmin
};
