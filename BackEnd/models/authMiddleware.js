const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const token = req.cookies.authToken; // Lee el token de las cookies

    if (!token) return res.status(401).json({ error: 'Acceso denegado. No hay token.' });

    jwt.verify(token, 'MicroApps_Funeraria3467*', (err, user) => {
        if (err) return res.status(403).json({ error: 'Token inválido o expirado.' });

        req.user = user;  // Almacena la información del usuario en la solicitud
        next();  // Pasa al siguiente middleware
    });
};


module.exports = authenticateToken;

