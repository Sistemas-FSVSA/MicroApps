const { poolPromise, sql } = require('../../models/conexion');

const obtenerPQRS = async (req, res) => {
    try {
        const { idpqrs } = req.body;
        const pool = await poolPromise;
        let request = pool.request();

        if (idpqrs) {
            // Si llega idpqrs, obtener información completa de todas las tablas relacionadas
            request.input('idpqrs', sql.Int, idpqrs);

            const queryPQRS = `
                SELECT 
                    p.idpqrs, 
                    p.fechapqrs, 
                    p.afiliado, 
                    p.contrato, 
                    p.idtipoplan, 
                    t.nombre AS nombre_plan,  -- Se agrega el nombre del plan
                    p.servicio, 
                    p.detalle, 
                    p.idtipopqrs,
                    p.idusuario, 
                    d.titular, 
                    d.identificacion AS cc, 
                    d.direccion, 
                    d.telefono, 
                    d.fechafallecimiento, 
                    d.fallecido, 
                    u.nombres + ' ' + u.apellidos AS usuario_nombre,  -- Nombre del usuario que creó el PQRS
                    p.usuariocerro, 
                    uc.nombres + ' ' + uc.apellidos AS usuario_cerro_nombre,  -- Nombre del usuario que cerró el PQRS
                    p.fechacierre
                FROM pqrs p
                LEFT JOIN datospqrs d ON p.idpqrs = d.idpqrs
                LEFT JOIN usuarios u ON p.idusuario = u.idusuario  -- Usuario que creó el PQRS
                LEFT JOIN usuarios uc ON p.usuariocerro = uc.idusuario  -- Usuario que cerró el PQRS
                LEFT JOIN tipoplan t ON p.idtipoplan = t.idtipoplan
                WHERE p.idpqrs = @idpqrs;
            `;


            const queryGestionPQRS = `
                SELECT * FROM gestionpqrs WHERE idpqrs = @idpqrs;
            `;

            const queryAnotacionesPQRS = `
                SELECT * FROM anotacionespqrs WHERE idpqrs = @idpqrs;
            `;

            // Ejecutar todas las consultas en paralelo
            const [resultPQRS, resultGestionPQRS, resultAnotacionesPQRS] = await Promise.all([
                request.query(queryPQRS),
                request.query(queryGestionPQRS),
                request.query(queryAnotacionesPQRS),
            ]);

            res.json({
                pqrs: resultPQRS.recordset[0] || null, // Si no hay resultados, devolver null
                gestionpqrs: resultGestionPQRS.recordset[0] || null,
                anotacionespqrs: resultAnotacionesPQRS.recordset || []
            });

        } else {
            // Si NO llega idpqrs, obtener solo información básica de PQRS
            const query = `
                SELECT 
                    p.idpqrs, p.fechapqrs, d.titular, p.contrato, p.servicio,
                    u.nombres + ' ' + u.apellidos AS usuario_nombre, p.estado
                FROM pqrs p
                LEFT JOIN datospqrs d ON p.idpqrs = d.idpqrs
                LEFT JOIN usuarios u ON p.idusuario = u.idusuario;
            `;

            const result = await request.query(query);
            res.json(result.recordset);
        }

    } catch (error) {
        console.error('Error al obtener PQRS:', error);
        res.status(500).json({ error: 'Error al obtener PQRS' });
    }
};


module.exports = { obtenerPQRS };
