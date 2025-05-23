import express from 'express';
import exphbs from 'express-handlebars';
import path from 'path';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url'; // Para manejar rutas
import * as dotenv from 'dotenv'; // Importa dotenv como un módulo
dotenv.config(); // Carga las variables de entorno

const app = express();



// Configuración de rutas y directorios
const __filename = fileURLToPath(import.meta.url); // Ruta del archivo actual
const __dirname = path.dirname(__filename); // Directorio del archivo actual

// Configuración del motor de plantillas
app.engine('hbs', exphbs.engine({ extname: '.hbs', defaultLayout: 'main' }));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Middleware
app.use(cookieParser());
app.use(express.json());

// Clave secreta para el token JWT
const secretKey = process.env.JWT_SECRET;

// Define las rutas públicas (sin protección)
const publicRoutes = [ '/', '/config.js', '/generarnovedad' ];

// Middleware global para proteger rutas privadas
app.use((req, res, next) => {
    const token = req.cookies.authToken;

    // Permite el acceso sin token a rutas públicas
    if (publicRoutes.includes(req.path)) {
        // Si el usuario está en '/' (login) y tiene un token válido, redirigir a '/inicio'
        if (req.path === '/' && token) {
            return jwt.verify(token, secretKey, (err) => {
                if (!err) {
                    return res.redirect('/inicio');
                }
                next();
            });
        }
        return next();
    }

    // Validar el token para rutas privadas
    if (!token) {
        return res.redirect('/'); // Redirige al login si no hay token
    }

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return res.redirect('/'); // Redirige si el token no es válido
        }
        req.user = decoded; // Almacena la información del token decodificado
        next(); // Continúa al siguiente middleware o controlador
    });
});


// Rutas Publicas
app.get('/', (req, res) => { res.render('index', { layout: false }); });

// Rutas Publicas
app.get('/generarnovedad', (req, res) => { res.render('recaudo/generarnovedad', { layout: false }); });

//Rutas Privadas
app.get("/inicio", (req, res) => {
    if (req.xhr) {
        return res.render("inicio", { layout: false }); // Solo la vista
    }
    res.render("inicio");
});

app.get("/mapa", (req, res) => {
    if (req.xhr) {
        return res.render("mapa", { layout: false }); // Solo la vista
    }
    res.render("mapa");
});

app.get("/usuarios/usuarios", (req, res) => {
    if (req.xhr) {
        return res.render("usuarios/usuarios", { layout: false }); // Solo la vista
    }
    res.render("usuarios/usuarios");
});

app.get("/usuarios/usuario/", (req, res) => {
    if (req.xhr) {
        return res.render("usuarios/usuario", { layout: false }); // Solo la vista
    }
    res.render("usuarios/usuario");
});

app.get("/tramites/planilla/", (req, res) => {
    if (req.xhr) {
        return res.render("tramites/planilla", { layout: false }); // Solo la vista
    }
    res.render("tramites/planilla");
});

app.get("/tramites/nuevaplanilla/", (req, res) => {
    if (req.xhr) {
        return res.render("tramites/nuevaplanilla", { layout: false }); // Solo la vista
    }
    res.render("tramites/nuevaplanilla");
});

app.get("/tramites/edicionplanilla/", (req, res) => {
    if (req.xhr) {
        return res.render("tramites/edicionplanilla", { layout: false }); // Solo la vista
    }
    res.render("tramites/edicionplanilla");
});

app.get("/tramites/resumenplanilla/", (req, res) => {
    if (req.xhr) {
        return res.render("tramites/resumenplanilla", { layout: false }); // Solo la vista
    }
    res.render("tramites/resumenplanilla");
});

app.get("/tramites/planillaspendientes/", (req, res) => {
    if (req.xhr) {
        return res.render("tramites/planillaspendientes", { layout: false }); // Solo la vista
    }
    res.render("tramites/planillaspendientes");
});

app.get("/tramites/contabilizarplanillas/", (req, res) => {
    if (req.xhr) {
        return res.render("tramites/contabilizarplanillas", { layout: false }); // Solo la vista
    }
    res.render("tramites/contabilizarplanillas");
});

app.get("/tramites/edicionpendiente/", (req, res) => {
    if (req.xhr) {
        return res.render("tramites/edicionpendiente", { layout: false }); // Solo la vista
    }
    res.render("tramites/edicionpendiente");
});

app.get("/pqrs/formulariopqrs", (req, res) => {
    if (req.xhr) {
        return res.render("pqrs/formulariopqrs", { layout: false }); // Solo la vista
    }
    res.render("pqrs/formulariopqrs");
});

app.get("/pqrs/consultarpqrs", (req, res) => {
    if (req.xhr) {
        return res.render("pqrs/consultarpqrs", { layout: false }); // Solo la vista
    }
    res.render("pqrs/consultarpqrs");
});

app.get("/pqrs/gestionpqrs", (req, res) => {
    if (req.xhr) {
        return res.render("pqrs/gestionpqrs", { layout: false }); // Solo la vista
    }
    res.render("pqrs/gestionpqrs");
});

app.get("/vales/vales", (req, res) => {
    if (req.xhr) {
        return res.render("vales/vales", { layout: false }); // Solo la vista
    }
    res.render("vales/vales");
});

app.get("/vales/reportevales", (req, res) => {
    if (req.xhr) {
        return res.render("vales/reportevales", { layout: false }); // Solo la vista
    }
    res.render("vales/reportevales");
});

app.get("/compras/pedidos", (req, res) => {
    if (req.xhr) {
        return res.render("compras/pedidos", { layout: false }); // Solo la vista
    }
    res.render("compras/pedidos");
});

app.get("/compras/nuevopedido", (req, res) => {
    if (req.xhr) {
        return res.render("compras/nuevopedido", { layout: false }); // Solo la vista
    }
    res.render("compras/nuevopedido");
});

app.get("/compras/continuarpedido", (req, res) => {
    if (req.xhr) {
        return res.render("compras/continuarpedido", { layout: false }); // Solo la vista
    }
    res.render("compras/continuarpedido");
});

app.get("/compras/aprobarpedido", (req, res) => {
    if (req.xhr) {
        return res.render("compras/aprobarpedido", { layout: false }); // Solo la vista
    }
    res.render("compras/aprobarpedido");
});

app.get("/compras/revisarpedido", (req, res) => {
    if (req.xhr) {
        return res.render("compras/revisarpedido", { layout: false }); // Solo la vista
    }
    res.render("compras/revisarpedido");
});

app.get("/compras/ordenes", (req, res) => {
    if (req.xhr) {
        return res.render("compras/ordenes", { layout: false }); // Solo la vista
    }
    res.render("compras/ordenes");
});

app.get("/compras/itemsolicitados", (req, res) => {
    if (req.xhr) {
        return res.render("compras/itemsolicitados", { layout: false }); // Solo la vista
    }
    res.render("compras/itemsolicitados");
});

app.get("/compras/relacionarorden", (req, res) => {
    if (req.xhr) {
        return res.render("compras/relacionarorden", { layout: false }); // Solo la vista
    }
    res.render("compras/relacionarorden");
});

app.get("/compras/registrocompras", (req, res) => {
    if (req.xhr) {
        return res.render("compras/registrocompras", { layout: false }); // Solo la vista
    }
    res.render("compras/registrocompras");
});

app.get("/recaudo/novedadesrecaudo", (req, res) => {
    if (req.xhr) {
        return res.render("recaudo/novedadesrecaudo", { layout: false }); // Solo la vista
    }
    res.render("recaudo/novedadesrecaudo");
});

app.get("/config.js", (req, res) => {
    res.setHeader("Content-Type", "application/javascript");
  
    const host = req.headers.host; // Obtiene la URL de origen
    let apiUrl;
  
    if (host.includes(process.env.FRONTEND_HOST)) {
      apiUrl = process.env.API_URL_HOST;
    } else if (host.includes(process.env.FRONTEND_IP)) {
      apiUrl = process.env.API_URL_IP;
    } else {
      apiUrl = process.env.API_URL_IP; // Fallback si no hay coincidencias
    }
  
    res.send(`window.env = { API_URL: "${apiUrl}" };`);
  });
  
  // Iniciar el servidor
  const PORT = process.env.PORT;
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
  
