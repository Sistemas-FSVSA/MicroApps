const { poolPromiseGestiones, sql } = require('../../models/conexion');

const guardarVale = async (req, res) => {
    const { encargado, valor, motivo, fecha, idusuario, placa, permiso } = req.body;

    if (!encargado || !valor || !motivo || !fecha || !idusuario || !placa || !permiso) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    const pool = await poolPromiseGestiones;
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        const request = new sql.Request(transaction);
        request.input('idusuariovale', sql.Int, encargado);
        request.input('valor', sql.Int, valor);
        request.input('motivo', sql.VarChar(sql.MAX), motivo);
        request.input('fechavale', sql.DateTime, fecha);
        request.input('idusuario', sql.Int, idusuario);
        request.input('placa', sql.VarChar(50), placa);
        request.input('permiso', sql.VarChar(50), permiso);

        await request.query(`
            INSERT INTO vale (idusuariovale, valor, motivo, fechavale, idusuario, fechagenerado, placa, categoria)
            VALUES (@idusuariovale, @valor, @motivo, @fechavale, @idusuario, GETDATE(), @placa, @permiso)
        `);

        await transaction.commit();

        res.status(201).json({ message: 'Vale registrado exitosamente' });

    } catch (error) {
        await transaction.rollback();
        console.error('Error al registrar vale:', error);
        res.status(500).json({ error: 'Error en la base de datos' });
    }
};

module.exports = { guardarVale };

