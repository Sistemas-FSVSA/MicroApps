const Server = require('./models/server');
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const agendaRoutes = require('./routes/agenda');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/agenda', agendaRoutes);

module.exports = app;
