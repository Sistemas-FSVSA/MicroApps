const { poolPromiseAgenda, sql } = require('../../models/conexion');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const { DateTime } = require('luxon');

const templateConfirmacionPath = path.join(__dirname, '../../templates/confirmacionagenda.html');

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

        return { transporter: nodemailer.createTransport(config), correo };
    } catch (error) {
        console.error("❌ Error obteniendo la configuración de correo:", error);
        return null;
    }
}

const guardarReservacion = async (req, res) => {
    const pool = await poolPromiseAgenda;
    const transaction = new sql.Transaction(pool);

    try {
        const data = req.body;

        await transaction.begin();

        // 🔹 Validar hora inicio < hora fin
        const [horaI, minI] = data.horaInicio.split(':');
        const [horaF, minF] = data.horaFin.split(':');
        if ((parseInt(horaF) * 60 + parseInt(minF)) <= (parseInt(horaI) * 60 + parseInt(minI))) {
            return res.status(400).json({ error: 'La hora de finalización debe ser mayor que la hora de inicio' });
        }

        const inicioStr = `${data.fechaReservacion} ${data.horaInicio}`;
        const finStr = `${data.fechaReservacion} ${data.horaFin}`;

        // 🔹 Insertar reservación
        const requestInsert = new sql.Request(transaction);
        await requestInsert
            .input('usuario', sql.NVarChar(100), data.usuario.trim())
            .input('correo', sql.NVarChar(150), data.correo.trim().toLowerCase())
            .input('iddependencia', sql.Int, data.dependencia)
            .input('inicioStr', sql.NVarChar(19), inicioStr)
            .input('finStr', sql.NVarChar(19), finStr)
            .input('detallesReservacion', sql.NVarChar(sql.MAX), data.detallesReservacion || null)
            .query(`
                INSERT INTO datosreservacion (usuario, correo, iddependencia, inicioReservacion, finReservacion, detallesReservacion)
                VALUES (
                  @usuario, 
                  @correo, 
                  @iddependencia, 
                  CONVERT(datetime2, @inicioStr, 120), 
                  CONVERT(datetime2, @finStr, 120), 
                  @detallesReservacion
                );
            `);

        const requestGetData = new sql.Request(transaction);
        const result = await requestGetData
            .input('usuario', sql.NVarChar(100), data.usuario.trim())
            .input('correo', sql.NVarChar(150), data.correo.trim().toLowerCase())
            .input('iddependencia', sql.Int, data.dependencia)
            .input('inicioStr', sql.NVarChar(19), inicioStr)
            .query(`
                SELECT TOP 1 id, inicioReservacion, finReservacion
                FROM datosreservacion 
                WHERE usuario = @usuario 
                  AND correo = @correo 
                  AND iddependencia = @iddependencia
                  AND FORMAT(inicioReservacion, 'yyyy-MM-dd HH:mm:ss') = @inicioStr
                ORDER BY id DESC
            `);

        if (result.recordset.length === 0) {
            return res.status(500).json({ error: 'No se pudo recuperar la reservación recién creada' });
        }

        await transaction.commit();

        res.json({
            success: true,
            message: 'Reservación creada correctamente',
            reservacion: result.recordset[0]
        });

        (async () => {
            const emailConfig = await getEmailConfig();
            const { transporter, correo } = emailConfig;

            const templateSource = fs.readFileSync(templateConfirmacionPath, 'utf-8');
            const template = handlebars.compile(templateSource);

            const htmlContent = template({
                usuario: data.usuario,
                correo: data.correo,
                dependencia: data.nombreDependencia || data.dependencia,
                fechareservacion: DateTime.fromISO(data.fechaReservacion).setZone('America/Bogota').toFormat('dd/MM/yyyy'),
                horainicio: DateTime.fromFormat(data.horaInicio, "HH:mm:ss").toFormat("h:mma"),
                horafin: DateTime.fromFormat(data.horaFin, "HH:mm:ss").toFormat("h:mma"),
                observaciones: data.detallesReservacion || "Sin observaciones"
            });

            try {
                await transporter.sendMail({
                    from: correo,
                    to: data.correo,
                    subject: "Confirmación de Reservación",
                    html: htmlContent
                });
              
            } catch (err) {
                console.error("❌ Error al enviar correo de confirmación:", err);
            }
        })();

    } catch (error) {
        try {
            if (transaction && transaction.isolationLevel) {
                await transaction.rollback();
            }
        } catch (_) { }

        return res.status(500).json({
            error: 'Error creando reservación',
            details: error.message
        });
    }
};

module.exports = { guardarReservacion };
