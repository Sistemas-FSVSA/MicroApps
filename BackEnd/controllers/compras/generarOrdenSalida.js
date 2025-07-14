const { poolPromiseGestiones, sql } = require('../../models/conexion');
const fs = require("fs");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const { exec } = require("child_process");
const { promisify } = require("util");
const path = require("path");
const tmp = require("tmp");

const libreOfficePath = `"C:\\Program Files\\LibreOffice\\program\\soffice.exe"`;
const templatePath = path.join(__dirname, "../../documents/ordensalida.docx");
const execAsync = promisify(exec);

const generarOrdenSalida = async (req, res) => {
    const { idpedido, usuario } = req.body;
    if (!idpedido) return res.status(400).json({ error: "idpedido es requerido" });

    try {
        const pool = await poolPromiseGestiones;

        // 1. Obtener información de la orden y proveedor
        const result = await pool.request().query(`
            SELECT 
                p.idpedido,
                p.fechapedido,
                p.estado,
                p.idusuarioaprobo,
                d.nombre AS nombreDependencia,
                p.fechaentrega,
                u.nombres,
                u.apellidos
            FROM pedidos p
            LEFT JOIN dependencias d ON p.iddependencia = d.iddependencia
            LEFT JOIN usuarios u ON p.idusuariorecibio = u.idusuario
            WHERE p.idpedido = ${idpedido}
        `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: "Orden no encontrada" });
        }

        const pedido = result.recordset[0];

        // 2. Obtener detalles de la orden
        const detallesResult = await pool.request().query(`
            SELECT 
                dp.iddetallepedido,
                dp.cantidad,
                dp.fechasolicitud,
                dp.estado,
                i.nombre AS nombreItem,
                i.descripcion
            FROM detallepedido dp
            INNER JOIN items i ON dp.iditem = i.iditem
            WHERE dp.idpedido = ${idpedido}
        `);

        const detalles = detallesResult.recordset.map(item => ({
            item: item.nombreItem || "Item sin nombre",
            cantidad: item.cantidad.toString(),
        }));

        // 3. Formatear fecha
        const fecha = new Date(pedido.fechapedido);
        const dia = fecha.getDate().toString().padStart(2, "0");
        const mes = (fecha.getMonth() + 1).toString().padStart(2, "0");
        const year = fecha.getFullYear();

        // 3.1 Formatear fechaentrega (si existe)
        let fechaEntregaFormateada = "No especificada";
        if (pedido.fechaentrega) {
            const fechaEntrega = new Date(pedido.fechaentrega);
            const diaEntrega = fechaEntrega.getDate() .toString().padStart(2, "0");
            const mesEntrega = (fechaEntrega.getMonth() + 1).toString().padStart(2, "0");
            const yearEntrega = fechaEntrega.getFullYear();
            fechaEntregaFormateada = `${diaEntrega}/${mesEntrega}/${yearEntrega}`;
        }

        // 4. Generar documento Word
        const content = fs.readFileSync(templatePath, "binary");
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: false
        });

        doc.render({
            dependencia: pedido.nombreDependencia || "No especificado",
            usuario: req.body.usuario || "Desconocido",
            idpedido: pedido.idpedido.toString(),
            fecharecibido: fechaEntregaFormateada,
            recibido: pedido.nombres && pedido.apellidos ? `${pedido.nombres} ${pedido.apellidos}` : "No especificado",
            dia,
            mes,
            year,
            items: detalles
        });


        const wordBuffer = doc.getZip().generate({ type: "nodebuffer" });

        // 5. Convertir a PDF
        const tempWordFile = tmp.fileSync({ postfix: ".docx" });
        fs.writeFileSync(tempWordFile.name, wordBuffer);

        const tempPdfFile = tempWordFile.name.replace(".docx", ".pdf");
        await execAsync(`${libreOfficePath} --headless --convert-to pdf "${tempWordFile.name}" --outdir "${path.dirname(tempPdfFile)}"`);

        const pdfBuffer = fs.readFileSync(tempPdfFile);

        // 6. Enviar al frontend
        res.setHeader("Content-Disposition", `attachment; filename="orden_${idpedido}.pdf"`);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Length", pdfBuffer.length);
        res.send(pdfBuffer);

    } catch (error) {
        console.error("❌ Error procesando la solicitud:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};

module.exports = { generarOrdenSalida };
