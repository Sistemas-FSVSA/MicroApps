const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ruta absoluta al NAS montado (unidad de red)
const uploadDir = path.join('\\\\192.168.1.153\\MicroApps', 'uploads');

// Verificamos si el NAS está montado y accesible
if (!fs.existsSync(uploadDir)) {
    console.error("⚠️ La carpeta de destino no existe o el NAS no está conectado:", uploadDir);
    // ⚠️ No creamos el directorio aquí porque no podemos asumir permisos de escritura en NAS
}

// ⚡ Almacenamiento en disco para adjuntos
const diskStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        fs.access(uploadDir, fs.constants.W_OK, (err) => {
            if (err) {
                console.error("❌ NAS no disponible para escritura:", err.message);
                return cb(new Error("Servidor de imágenes offline"), null);
            }
            cb(null, uploadDir);
        });
    },
    filename: function (req, file, cb) {
        const uniqueName = Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
        const extension = path.extname(file.originalname);
        cb(null, uniqueName + extension);
    }
});

// ⚡ Almacenamiento en memoria para la firma
const memoryStorage = multer.memoryStorage();

const uploadFields = multer({
    storage: diskStorage,
}).fields([
    { name: "adjuntos[]" },
]);

const uploadFirma = multer({
    storage: memoryStorage,
    limits: { fileSize: 5 * 1024 * 1024 }
}).single("firma");

module.exports = { uploadFields, uploadFirma };
