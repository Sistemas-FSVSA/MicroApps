const session = require('express-session');

const sessionMiddleware = session({
  secret: 'MicroApps_Funeraria3467*',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 10 // 30 minutos
  }
});

// Este Set guarda los IDs de usuarios con sesión activa
const activeUsers = new Set();

const getSessionCount = (req, res) => {
  res.json({ activos: activeUsers.size });
};

const getSessionUsers = (req, res) => {
  res.json(Array.from(activeUsers));
};


module.exports = {
  sessionMiddleware,
  getSessionCount,
  getSessionUsers,
  activeUsers
};
