const { poolPromiseGestiones, sql } = require('../../models/conexion');

const generarReporte = async (req, res) => {
    try {
        let { fechaInicio, fechaFin, dependencias, tipoReporte } = req.body;
        const pool = await poolPromiseGestiones;

        // Validaciones iniciales
        if (!fechaInicio || !fechaFin || !dependencias || !tipoReporte) {
            return res.status(400).json({ error: "Todos los campos son obligatorios" });
        }

        // Convertir fechas a formato SQL
        fechaInicio = new Date(fechaInicio).toISOString().split('T')[0];
        fechaFin = new Date(fechaFin).toISOString().split('T')[0];

        // Construcción de la consulta base
        let queryBase = `
            SELECT v.idusuariovale, u.identificacion, u.nombres, u.apellidos, v.valor, v.fechagenerado, v.fechavale, v.categoria
            FROM vale v
            JOIN usuariosvale u ON v.idusuariovale = u.idusuariovale
            WHERE CONVERT(DATE, v.fechavale) BETWEEN @fechaInicio AND @fechaFin
        `;

        // Filtro de dependencias
        if (!dependencias.includes('all')) {
            queryBase += ` AND v.categoria IN (${dependencias.map((_, i) => `@dep${i}`).join(', ')})`;
        }

        let request = pool.request()
            .input('fechaInicio', sql.Date, fechaInicio)
            .input('fechaFin', sql.Date, fechaFin);

        // Agregar dependencias como parámetros
        if (!dependencias.includes('all')) {
            dependencias.forEach((dep, i) => {
                request = request.input(`dep${i}`, sql.VarChar, dep);
            });
        }

        // Ejecución de la consulta
        const result = await request.query(queryBase);
        const datos = result.recordset;

        // Procesar la información según el tipo de reporte
        if (tipoReporte === "1") {  // Reporte General (Totalizado por encargado)
            const totalizado = datos.reduce((acc, item) => {
                const clave = item.idusuariovale;
                if (!acc[clave]) {
                    acc[clave] = {
                        identificacion: item.identificacion,
                        nombres: item.nombres,
                        apellidos: item.apellidos,
                        totalValor: 0
                    };
                }
                acc[clave].totalValor += item.valor;
                return acc;
            }, {});

            // Convertir objeto en array para respuesta
            return res.json({ reporte: Object.values(totalizado) });
        } else if (tipoReporte === "2") {
            return res.json({ reporte: datos });
        } else {
            return res.status(400).json({ error: "Tipo de reporte no válido" });
        }

    } catch (err) {
        console.error("Error generando el reporte:", err);
        res.status(500).json({ error: "Hubo un error en el servidor, inténtalo de nuevo." });
    }
};

module.exports = { generarReporte };
