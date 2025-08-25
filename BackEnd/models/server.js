require('dotenv').config(); // Carga las variables del .env

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
    this.port = process.env.PORT || 4201; // Usa 4201 como fallback

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
  }

  middlewares() {
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",")
      : [];

    this.app.use(
      cors({
        origin: function (origin, callback) {
          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error("Origen no permitido por CORS"));
          }
        },
        methods: ["POST", "GET", "PUT", "DELETE", "PATCH"],
        credentials: true,
      })
    );

    this.app.use(cookieParser());
    this.app.use(express.json());

    // Comenta temporalmente sessionMiddleware para depurar
    // this.app.use(sessionMiddleware);

    // Carpeta "uploads"
    this.app.use(
      "/uploads",
      express.static("\\\\" + process.env.UPLOAD_PATH)
    );
  }

  routes() {
    try {
      this.app.use(this.indexPath, require("../routes/index"));
      this.app.use(this.planillaPath, require("../routes/planilla"));
      this.app.use(this.gestionplanillaPath, require("../routes/gestionplanilla"));
      this.app.use(this.gestionUsuarioPath, require("../routes/gestionusuario"));
      this.app.use(this.pqrsPath, require("../routes/pqrs"));
      this.app.use(this.valesPath, require("../routes/vales"));
      this.app.use(this.comprasPath, require("../routes/compras"));
      this.app.use(this.recaudoPath, require("../routes/recaudo"));
      this.app.use(this.agendaPath, require("../routes/agenda"));
    } catch (error) {
      console.error('Error cargando rutas:', error);
    }
  }

  listen() {
    this.app.listen(this.port, () => {
      console.log(`Escuchando desde http://localhost:${this.port}`);
      console.log(`Archivos estáticos disponibles en http://localhost:${this.port}/uploads`);
    }).on('error', (err) => {
      console.error('Error al iniciar el servidor:', err.message);
    });
  }
}

const server = new Server();
server.listen(); // Asegúrate de llamar a listen() al final