const fs = require("fs");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const { exec } = require("child_process");
const { PDFDocument } = require("pdf-lib");
const { promisify } = require("util");
const path = require("path");
const tmp = require("tmp");

const libreOfficePath = `"C:\\Program Files\\LibreOffice\\program\\soffice.exe"`;
const templatePath = path.join(__dirname, "../../documents/ordencompra.docx");

const execAsync = promisify(exec);

const generarOrdenCompra = async (req, res) => {
    try {
        const content = fs.readFileSync(templatePath, "binary");
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip);

        doc.render({
            provedor: req.body.titular || "No especificado",
            usuario: req.body.cc || "No especificado",
            idorden: req.body.direccion || "No especificado",
            dia: req.body.dia || "--",
            mes: req.body.mes || "--",
            year: req.body.year || "----"
        });
             

        const wordBuffer = doc.getZip().generate({ type: "nodebuffer" });
        const tempWordFile = tmp.fileSync({ postfix: ".docx" });
        fs.writeFileSync(tempWordFile.name, wordBuffer);

        const tempPdfFile = tempWordFile.name.replace(".docx", ".pdf");
        await execAsync(`${libreOfficePath} --headless --convert-to pdf "${tempWordFile.name}" --outdir "${path.dirname(tempPdfFile)}"`);

        res.setHeader("Content-Disposition", 'attachment; filename="pqrs.pdf"');
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Length", pdfBytes.length);
        res.send(Buffer.from(pdfBytes));

    } catch (error) {
        console.error("❌ Error procesando la solicitud:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};

module.exports = { generarOrdenCompra };
