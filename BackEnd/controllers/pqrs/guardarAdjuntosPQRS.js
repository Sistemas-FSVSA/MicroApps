const { poolPromise, sql } = require('../../models/conexion');
const path = require('path');
const fs = require('fs');

const MAX_SIZE = 10 * 1024 * 1024 * 1024; // 10GB en bytes

const guardarAdjuntosPQRS = async (req, res) => {
    let archivosGuardados = [];

    try {
        const { idpqrs, idusuario } = req.body;

        if (!idpqrs || !idusuario) {
            return res.status(400).json({ error: "Faltan datos requeridos: idpqrs o idusuario." });
        }

        const adjuntos = req.files?.["adjuntos[]"] || []; 
        if (adjuntos.length === 0) {
            return res.status(400).json({ error: "No se recibieron archivos adjuntos." });
        }

        // Calcular el tamaño total de los archivos
        const totalSize = adjuntos.reduce((acc, file) => acc + file.size, 0);
        if (totalSize > MAX_SIZE) {
            return res.status(400).json({ error: "Los archivos adjuntos superan el tamaño máximo de 10GB." });
        }

        const pool = await poolPromise;
        const transaction = pool.transaction();
        await transaction.begin();

        for (let file of adjuntos) {
            const request = transaction.request();
            const fileUrl = file.path;
            const fileSize = file.size;
            const fileType = path.extname(file.originalname).substring(1).toLowerCase();

            let tipo = 'otro';
            if (['jpg', 'jpeg', 'png', 'gif'].includes(fileType)) tipo = 'imagen';
            else if (fileType === 'pdf') tipo = 'pdf';
            else if (['xlsx', 'xls'].includes(fileType)) tipo = 'excel';
            else if (['docx', 'doc'].includes(fileType)) tipo = 'word';

            archivosGuardados.push(fileUrl);

            await request
                .input('idpqrs', sql.Int, idpqrs)
                .input('nombre', sql.NVarChar, file.originalname)
                .input('url', sql.NVarChar, fileUrl)
                .input('tipo', sql.NVarChar, tipo)
                .input('size', sql.BigInt, fileSize)
                .input('idusuario', sql.Int, idusuario)
                .query(`
                    INSERT INTO adjuntospqrs (idpqrs, nombre, url, fecha, tipo, size, idusuario) 
                    VALUES (@idpqrs, @nombre, @url, GETDATE(), @tipo, @size, @idusuario)
                `);
        }

        await transaction.commit();
        return res.status(200).json({ message: "Todos los archivos se almacenaron correctamente." });

    } catch (error) {
        console.error("Error en guardarAdjuntosPQRS:", error);

        if (archivosGuardados.length > 0) {
            archivosGuardados.forEach((archivo) => {
                if (fs.existsSync(archivo)) {
                    fs.unlinkSync(archivo); // Borrar el archivo subido
                }
            });
        }

        return res.status(500).json({ error: "Error al guardar los archivos. La operación ha sido revertida." });
    }
};

module.exports = { guardarAdjuntosPQRS };