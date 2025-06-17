const sql = require("mssql");

// Configuración para la primera base de datos
const config1 = {
  user: process.env.DB1_USER,
  password: process.env.DB1_PASSWORD,
  server: process.env.DB1_SERVER,
  database: process.env.DB1_DATABASE,
  options: {
    encrypt: false,
    enableArithAbort: true
  }
};

// Configuración para la segunda base de datos
const config2 = {
  user: process.env.DB2_USER,
  password: process.env.DB2_PASSWORD,
  server: process.env.DB2_SERVER,
  port: parseInt(process.env.DB2_PORT),
  database: process.env.DB2_DATABASE,
  options: {
    encrypt: false,
    enableArithAbort: true
  }
};

// Configuración para la segunda base de datos
const config3 = {
  user: process.env.DB3_USER,
  password: process.env.DB3_PASSWORD,
  server: process.env.DB3_SERVER,
  database: process.env.DB3_DATABASE,
  options: {
    encrypt: false,
    enableArithAbort: true
  }
};

// Crear las conexiones
let poolPromise = null;
let poolPromise2 = null;
let poolPromise3 = null;

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
poolPromise = connectWithRetry(config1);

// Conexión a la segunda base de datos
poolPromise2 = connectWithRetry(config2);

// Conexión a la segunda base de datos
poolPromise3 = connectWithRetry(config3);

module.exports = {
  sql,
  poolPromise,
  poolPromise2,
  poolPromise3
};
