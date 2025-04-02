const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// ⚡ Almacenamiento para adjuntos (SE GUARDA EN DISCO)
const diskStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueName = Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
        const extension = path.extname(file.originalname);
        cb(null, uniqueName + extension);
    }
});

// ⚡ Almacenamiento para la firma (SOLO EN MEMORIA)
const memoryStorage = multer.memoryStorage();

const uploadFields = multer({
    storage: diskStorage, // ✅ Por defecto, los adjuntos se guardan en disco
}).fields([
    { name: "adjuntos[]" }, // ✅ Adjuntos en disco
]);

const uploadFirma = multer({
    storage: memoryStorage, // ✅ La firma solo se guarda en memoria
    limits: { fileSize: 5 * 1024 * 1024 } // 🔹 Límite de 5MB para la firma
}).single("firma");

module.exports = { uploadFields, uploadFirma };
