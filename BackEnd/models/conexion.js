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
    trustServerCertificate: true,
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
      console.log(`Conexión exitosa a la base de datos: ${config.database} en ${config.server}`);
      return pool;
    } catch (err) {
      console.error(`Error de conexión a la base de datos ${config.database} en ${config.server}:`, err.message);
      console.log(`Reintentando en ${retryInterval / 1000} segundos...`);
      await new Promise(resolve => setTimeout(resolve, retryInterval));
    }
  }
};

// Conexión a las bases de datos con manejo de promesas
poolPromiseGestiones = connectWithRetry(DBGESTIONES).catch(err => console.error('Fallo permanente en DBGESTIONES:', err));
poolPromiseMaestros = connectWithRetry(DBMAESTROS).catch(err => console.error('Fallo permanente en DBMAESTROS:', err));
poolPromiseRecaudo = connectWithRetry(DBRECAUDO).catch(err => console.error('Fallo permanente en DBRECAUDO:', err));
poolPromisePrevision = connectWithRetry(DBPREVISION).catch(err => console.error('Fallo permanente en DBPREVISION:', err));
poolPromiseAgenda = connectWithRetry(DBAGENDA).catch(err => console.error('Fallo permanente en DBAGENDA:', err));

module.exports = {
  sql,
  poolPromiseGestiones,
  poolPromiseMaestros,
  poolPromiseRecaudo,
  poolPromisePrevision,
  poolPromiseAgenda
};