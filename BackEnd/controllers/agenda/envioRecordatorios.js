// controllers/agenda/envioRecordatorios.js
const { poolPromiseAgenda, sql } = require('../../models/conexion');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const { DateTime } = require('luxon');

const templateRecordatorioPath = path.join(__dirname, '../../templates/recordatorioagenda.html');

async function getEmailConfig() {
  try {
    const pool = await poolPromiseAgenda;
    const result = await pool.request()
      .query("SELECT TOP 1 proveedor, correo, acceso FROM configemail WHERE estado = 1");

    if (result.recordset.length === 0) return null;

    const { proveedor, correo, acceso } = result.recordset[0];

    let config;
    if (proveedor.toLowerCase() === "gmail" || proveedor.toLowerCase() === "google") {
      config = {
        service: 'gmail',
        auth: { user: correo, pass: acceso }
      };
    } else if (proveedor.toLowerCase() === "outlook") {
      config = {
        host: "smtp.office365.com",
        port: 587,
        secure: false,
        auth: { user: correo, pass: acceso }
      };
    } else {
      return null;
    }

    const transporter = nodemailer.createTransport(config);
    return { transporter, correo };
  } catch (error) {
    console.error("❌ Error obteniendo la configuración de correo:", error);
    return null;
  }
}

const envioRecordatorios = async () => {
  const pool = await poolPromiseAgenda;

  try {
    // Hora del sistema en UTC-5 (bondad del usuario)
    const now = DateTime.now().setZone('UTC-5');

    const query = `
      SELECT id, usuario, correo,
             CONVERT(varchar(19), inicioReservacion, 120) AS inicioStr,
             CONVERT(varchar(19), finReservacion, 120) AS finStr,
             detallesReservacion
      FROM datosreservacion
      WHERE CAST(inicioReservacion AS DATE) = CAST(GETDATE() AS DATE)
        AND recordado = 0
    `;

    const result = await pool.request().query(query);

    if (!result.recordset || result.recordset.length === 0) {
      return;
    }


    const emailConfig = await getEmailConfig();
    const { transporter, correo } = emailConfig;

    const templateSource = fs.readFileSync(templateRecordatorioPath, 'utf-8');
    const template = handlebars.compile(templateSource);

    for (let reserva of result.recordset) {
      const inicio = DateTime.fromFormat(reserva.inicioStr, 'yyyy-LL-dd HH:mm:ss', { zone: 'UTC-5' });
      const fin = DateTime.fromFormat(reserva.finStr, 'yyyy-LL-dd HH:mm:ss', { zone: 'UTC-5' });


      // Diferencia respecto a NOW (ambos en UTC-5)
      const diffMinRaw = inicio.diff(now, 'minutes').toObject().minutes;
      const diffMin = Math.round(diffMinRaw);

      // Enviar solo si faltan entre 0 y 15 minutos
      if (diffMin >= 0 && diffMin <= 15) {
        const htmlContent = template({
          usuario: reserva.usuario,
          correo: reserva.correo,
          fechareservacion: inicio.toFormat('dd/MM/yyyy'),
          horainicio: inicio.toFormat('h:mma'),
          horafin: fin.isValid ? fin.toFormat('h:mma') : '',
          observaciones: reserva.detallesReservacion || "Sin observaciones"
        });

        try {
          await transporter.sendMail({
            from: correo,
            to: reserva.correo,
            subject: "Recordatorio de Reservación",
            html: htmlContent
          });

          // Marcar como recordado (1)
          await pool.request()
            .input("id", sql.Int, reserva.id)
            .query("UPDATE datosreservacion SET recordado = 1 WHERE id = @id");

        } catch (err) {
          console.error(`❌ Error enviando o actualizando recordatorio (id=${reserva.id}):`, err);
        }
      } else {
      }
    }

  } catch (error) {
    console.error("❌ Error en envioRecordatorios:", error);
  }
};

module.exports = { envioRecordatorios };
