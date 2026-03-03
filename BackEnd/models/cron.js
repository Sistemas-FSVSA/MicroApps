const cron = require("node-cron");
const { envioRecordatorios } = require("../controllers/agenda/envioRecordatorios");

// 🔹 Ejecutar cada minuto
cron.schedule("* * * * *", async () => {
  await envioRecordatorios();
});