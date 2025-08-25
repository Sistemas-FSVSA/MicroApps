const sql = require("mssql");

// Configuración para la base de datos de gestiones
const DBGESTIONES = {
  user: process.env.DBGESTIONES_USER,
  password: process.env.DBGESTIONES_PASSWORD,
  server: process.env.DBGESTIONES_SERVER,
  database: process.env.DBGESTIONES_DATABASE,
  options: {
    encrypt: false,
    enableArithAbort: true
  }
};

// Configuración para la base de datos de maestros
const DBMAESTROS = {
  user: process.env.DBMAESTROS_USER,
  password: process.env.DBMAESTROS_PASSWORD,
  server: process.env.DBMAESTROS_SERVER,
  port: parseInt(process.env.DBMAESTROS_PORT),
  database: process.env.DBMAESTROS_DATABASE,
  options: {
    encrypt: false,
    enableArithAbort: true
  }
};

// Configuración para la base de datos de recaudo
const DBRECAUDO = {
  user: process.env.DBRECAUDO_USER,
  password: process.env.DBRECAUDO_PASSWORD,
  server: process.env.DBRECAUDO_SERVER,
  database: process.env.DBRECAUDO_DATABASE,
  options: {
    encrypt: false,
    enableArithAbort: true
  }
};

// Configuración para la base de datos de previsión
const DBPREVISION = {
  user: process.env.DBPREVISION_USER,
  password: process.env.DBPREVISION_PASSWORD,
  server: process.env.DBPREVISION_SERVER,
  port: parseInt(process.env.DBPREVISION_PORT),
  database: process.env.DBPREVISION_DATABASE,
  options: {
    encrypt: false,
    enableArithAbort: true
  }
};

// Configuración para la base de datos de agenda
const DBAGENDA = {
  user: process.env.DBAGENDA_USER,
  password: process.env.DBAGENDA_PASSWORD,
  server: process.env.DBAGENDA_SERVER,
  database: process.env.DBAGENDA_DATABASE,
  options: {
    encrypt: false,
    enableArithAbort: true
  }
};

// Crear las conexiones
let poolPromiseGestiones = null;
let poolPromiseMaestros = null;
let poolPromiseRecaudo = null;
let poolPromisePrevision = null;
let poolPromiseAgenda = null;

const connectWithRetry = async (config, retryInterval = 5000) => {
  while (true) {
    try {
      const pool = await new sql.ConnectionPool(config).connect();
      console.log(`Conectado a la base de datos: ${config.database}`);
      return pool;
    } catch (err) {
      console.log(`Error de conexión a la base de datos: ${err}. Reintentando en ${retryInterval / 1000} segundos...`);
      await new Promise(resolve => setTimeout(resolve, retryInterval));
    }
  }
};

// Conexión a la primera base de datos
poolPromiseGestiones = connectWithRetry(DBGESTIONES);

// Conexión a la segunda base de datos
poolPromiseMaestros = connectWithRetry(DBMAESTROS);

// Conexión a la segunda base de datos
poolPromiseRecaudo = connectWithRetry(DBRECAUDO);

// Conexión a la segunda base de datos
poolPromisePrevision = connectWithRetry(DBPREVISION);

// Conexión a la segunda base de datos
poolPromiseAgenda = connectWithRetry(DBAGENDA);

module.exports = {
  sql,
  poolPromiseGestiones,
  poolPromiseMaestros,
  poolPromiseRecaudo, 
  poolPromisePrevision,
  poolPromiseAgenda,
};