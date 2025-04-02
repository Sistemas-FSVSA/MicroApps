const fs = require("fs");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const { exec } = require("child_process");
const { PDFDocument } = require("pdf-lib");
const { promisify } = require("util");
const path = require("path");
const tmp = require("tmp");

const libreOfficePath = `"C:\\Program Files\\LibreOffice\\program\\soffice.exe"`;
const templatePath = path.join(__dirname, "../../documents/evaluacionservicio.docx");

const execAsync = promisify(exec);

const generarImpresionPQRS = async (req, res) => {
    try {
        const content = fs.readFileSync(templatePath, "binary");
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip);

        doc.render({
            nombreResponsable: req.body.titular || "No especificado",
            ccResponsable: req.body.cc || "No especificado",
            direccionResponsable: req.body.direccion || "No especificado",
            telefonoResponsable: req.body.telefono || "No especificado",
            afiliado: req.body.afiliado === "false" ? "No Afiliado" : "Si Afiliado",
            numeroContrato: req.body.contrato || "No especificado",
            nombreFallecido: req.body.nombreFallecido || "No especificado",
            fechaFallecimiento: req.body.fechaFallecimiento || "No especificado",
            numeroServicio: req.body.numeroServicio || "No especificado",
            funcionario: req.body.funcionario || "No especificado",
            reclamo: req.body.reclamo || "No especificado",
            dia: req.body.dia || "--",
            mes: req.body.mes || "--",
            year: req.body.year || "----"
        });
             

        const wordBuffer = doc.getZip().generate({ type: "nodebuffer" });
        const tempWordFile = tmp.fileSync({ postfix: ".docx" });
        fs.writeFileSync(tempWordFile.name, wordBuffer);

        const tempPdfFile = tempWordFile.name.replace(".docx", ".pdf");
        await execAsync(`${libreOfficePath} --headless --convert-to pdf "${tempWordFile.name}" --outdir "${path.dirname(tempPdfFile)}"`);

        let pdfBytes = fs.readFileSync(tempPdfFile);

         // 🔹 Verificar si la firma existe en req.file
         if (req.file) {
            try {
                const pdfDoc = await PDFDocument.load(pdfBytes);
                const image = await pdfDoc.embedPng(req.file.buffer); // ⚡ Leer desde buffer en memoria
                const pages = pdfDoc.getPages();
                const firstPage = pages[pages.length - 1];

                firstPage.drawImage(image, { x: 80, y: 100, width: 120, height: 50 });
                pdfBytes = await pdfDoc.save();
            } catch (error) {
                console.error("⚠️ Error al insertar la firma:", error);
            }
        }

        res.setHeader("Content-Disposition", 'attachment; filename="pqrs.pdf"');
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Length", pdfBytes.length);
        res.send(Buffer.from(pdfBytes));

    } catch (error) {
        console.error("❌ Error procesando la solicitud:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};

module.exports = { generarImpresionPQRS };
