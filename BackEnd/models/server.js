const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");

const {
  sessionMiddleware,
  getSessionCount,
  getSessionUsers,
} = require("../models/sessionMiddleware");

class Server {
  constructor() {
    this.app = express();
    this.port = process.env.PORT;

    // Rutas principales
    this.indexPath = "/api/index";
    this.planillaPath = "/api/planilla";
    this.gestionplanillaPath = "/api/gestionplanilla";
    this.gestionUsuarioPath = "/api/gestionusuario";
    this.pqrsPath = "/api/pqrs";
    this.valesPath = "/api/vales";
    this.comprasPath = "/api/compras";
    this.recaudoPath = "/api/recaudo";
    this.agendaPath = "/api/agenda";

    // Middlewares y rutas
    this.middlewares();
    this.routes();

    // Ruta especial para ver usuarios conectados
    this.app.get("/api/online", getSessionCount); // 👈 Añádela aquí si quieres
    this.app.get("/api/activeusers", getSessionUsers); // 👈 Añádela aquí si quieres
  }

  middlewares() {
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",")
      : [];

    this.app.use(
      cors({
        origin: function (origin, callback) {
          // Permitir solicitudes sin origen (como Postman o herramientas locales)
          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error("Origen no permitido por CORS"));
          }
        },
        methods: ["POST", "GET", "PUT", "DELETE", "PATCH"],
        credentials: true, // Habilita el envío de cookies y credenciales
      })
    );

    this.app.use(cookieParser());
    this.app.use(express.json());

    // 👇 Aquí van los middlewares de sesión
    this.app.use(sessionMiddleware);

    // Servir la carpeta "uploads" como estática
    this.app.use(
      '/uploads',
      express.static('\\\\' + process.env.UPLOAD_PATH)
    );
  }

  routes() {
    this.app.use(this.indexPath, require("../routes/index"));
    this.app.use(this.planillaPath, require("../routes/planilla"));
    this.app.use(this.gestionplanillaPath,require("../routes/gestionplanilla"));
    this.app.use(this.gestionUsuarioPath, require("../routes/gestionusuario"));
    this.app.use(this.pqrsPath, require("../routes/pqrs"));
    this.app.use(this.valesPath, require("../routes/vales"));
    this.app.use(this.comprasPath, require("../routes/compras"));
    this.app.use(this.recaudoPath, require("../routes/recaudo"));
    this.app.use(this.agendaPath, require("../routes/agenda"));
  }


  listen() {
    this.app.listen(this.port, () => {
      console.log(`Escuchando desde http://localhost:${this.port}`),
        console.log(
          `Archivos estáticos disponibles en http://localhost:${this.port}/uploads`
        );
    });
  }
}

module.exports = Server;