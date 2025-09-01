const { poolPromiseGestiones, sql } = require('../../models/conexion');

const obtenerDependencias = async (req, res) => {
    try {
        const pool = await poolPromiseGestiones;
        const idusuario = req.query.idusuario || req.params.idusuario;

        let query = `
            SELECT 
                d.iddependencia,
                d.nombre AS dependencia,
                d.estado AS estadoDependencia,
                s.idsubdependencia,
                s.nombre AS subdependencia,
                s.estado AS estadoSubdependencia
            FROM dependencias d
            LEFT JOIN subdependencias s ON d.iddependencia = s.iddependencia
        `;

        // Si llega idusuario, filtrar solo sus dependencias
        if (idusuario) {
            query += `
                INNER JOIN usuariocompras u 
                    ON d.iddependencia = u.iddependencia
                WHERE u.idusuario = @idusuario
            `;
        }

        query += ` ORDER BY d.iddependencia, s.idsubdependencia`;

        const request = pool.request();
        if (idusuario) {
            request.input('idusuario', sql.Int, idusuario);
        }

        const result = await request.query(query);

        // Reorganizar en formato JSON anidado:
        const dependenciasMap = {};

        result.recordset.forEach(row => {
            if (!dependenciasMap[row.iddependencia]) {
                dependenciasMap[row.iddependencia] = {
                    iddependencia: row.iddependencia,
                    nombre: row.dependencia,
                    estado: row.estadoDependencia,
                    subdependencias: []
                };
            }

            if (row.idsubdependencia) {
                dependenciasMap[row.iddependencia].subdependencias.push({
                    idsubdependencia: row.idsubdependencia,
                    nombre: row.subdependencia,
                    estado: row.estadoSubdependencia
                });
            }
        });

        res.json(Object.values(dependenciasMap));
    } catch (error) {
        console.error('Error al obtener dependencias:', error);
        res.status(500).json({ error: 'Error al obtener dependencias', detalle: error.message });
    }
};

module.exports = { obtenerDependencias };

