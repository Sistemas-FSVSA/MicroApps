const { poolPromise, sql } = require('../../models/conexion');
const fs = require("fs");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const { exec } = require("child_process");
const { promisify } = require("util");
const path = require("path");
const tmp = require("tmp");

const libreOfficePath = `"C:\\Program Files\\LibreOffice\\program\\soffice.exe"`;
const templatePath = path.join(__dirname, "../../documents/ordencompra.docx");
const execAsync = promisify(exec);

const generarOrdenCompra = async (req, res) => {
    const { idorden, usuario } = req.body;
    if (!idorden) return res.status(400).json({ error: "idorden es requerido" });

    try {
        const pool = await poolPromise;

        // 1. Obtener información de la orden y proveedor
        const result = await pool.request().query(`
            SELECT 
                o.idorden, o.fecha, o.estado, o.tipo, o.idusuario, o.factura, o.aprobado,
                p.nombre AS proveedor
            FROM orden o
            LEFT JOIN proveedorescompras p ON o.idproveedor = p.idproveedor
            WHERE o.idorden = ${idorden}
        `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: "Orden no encontrada" });
        }

        const orden = result.recordset[0];

        // 2. Obtener detalles de la orden
        const detallesResult = await pool.request().query(`
            SELECT d.iddetalleorden, d.cantidad, d.valor, i.nombre, i.descripcion
            FROM detalleorden d
            INNER JOIN items i ON d.iditem = i.iditem
            WHERE d.idorden = ${idorden}
        `);

        let totalGeneral = 0;

        const detalles = detallesResult.recordset.map(item => {
            const subtotal = item.cantidad * item.valor;
            totalGeneral += subtotal;

            return {
                item: item.nombre || item.descripcion || "Item sin nombre",
                cantidad: item.cantidad.toString(),
                vu: `$${item.valor.toFixed(2)}`,
                vt: `$${subtotal.toFixed(2)}`
            };
        });

        // 3. Formatear fecha
        const fecha = new Date(orden.fecha);
        const dia = fecha.getDate().toString().padStart(2, "0");
        const mes = (fecha.getMonth() + 1).toString().padStart(2, "0");
        const year = fecha.getFullYear();

        // 4. Generar documento Word
        const content = fs.readFileSync(templatePath, "binary");
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: false
        });

        doc.render({
            proveedor: orden.proveedor || "No especificado",
            usuario: req.body.usuario || "Desconocido",
            idorden: orden.idorden.toString(),
            vtg: `$${totalGeneral.toFixed(2)}`,
            factura: orden.factura || "No especificada",
            aprobado: orden.aprobado || "No especificada",
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
        res.setHeader("Content-Disposition", `attachment; filename="orden_${idorden}.pdf"`);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Length", pdfBuffer.length);
        res.send(pdfBuffer);

    } catch (error) {
        console.error("❌ Error procesando la solicitud:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};

module.exports = { generarOrdenCompra };
