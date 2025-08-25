require('dotenv').config();
const sql = require('mssql');

const dbConfig = {
  user: process.env.DBAGENDA_USER,
  password: process.env.DBAGENDA_PASSWORD,
  server: process.env.DBAGENDA_SERVER,
  database: process.env.DBAGENDA_DATABASE,
  options: {
    encrypt: false, // SQL Server en LAN normalmente no usa SSL
    trustServerCertificate: true
  }
};

module.exports = dbConfig;
