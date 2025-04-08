const { poolPromise, sql } = require('../../models/conexion');

const registrarEncargado = async (req, res) => {
    try {
        const { encargados } = req.body;

        if (!Array.isArray(encargados) || encargados.length === 0) {
            return res.status(400).json({ message: 'El array de encargados es requerido y no puede estar vacío' });
        }

        const pool = await poolPromise;

        for (const encargado of encargados) {
            const { documento, nombres, apellidos, placa, categoria } = encargado;

            if (!documento || !nombres || !apellidos) {
                return res.status(400).json({ message: 'Todos los encargados deben tener documento, nombres y apellidos' });
            }

            // Insertar encargado en la base de datos
            const result = await pool
                .request()
                .input('documento', sql.VarChar, documento)
                .input('nombres', sql.VarChar, nombres)
                .input('apellidos', sql.VarChar, apellidos)
                .input('categoria', sql.VarChar, categoria)
                .input('estado', sql.Bit, true)
                .query("INSERT INTO usuariosvale (identificacion, nombres, apellidos, categoria, estado) OUTPUT INSERTED.idusuariovale VALUES (@documento, @nombres, @apellidos, @categoria, @estado)");

            const idUsuarioVale = result.recordset[0].idusuariovale;

            // Insertar placas asociadas
            if (Array.isArray(placa) && placa.length > 0) {
                for (const p of placa) {
                    await pool
                        .request()
                        .input('idusuariovale', sql.Int, idUsuarioVale)
                        .input('placa', sql.VarChar, p)
                        .query("INSERT INTO placas (idusuariovale, placa) VALUES (@idusuariovale, @placa)");
                }
            }
        }

        res.status(201).json({ message: 'Encargados registrados exitosamente' });
    } catch (error) {
        console.error('Error al registrar encargados:', error);
        res.status(500).json({ error: 'Error en la base de datos' });
    }
};

module.exports = { registrarEncargado };
