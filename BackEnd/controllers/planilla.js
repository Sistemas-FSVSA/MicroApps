//IMPORTANCIO LIBRERIA MSSQL Y CONEXION BASE DE DATOS
const { poolPromiseGestiones, sql } = require('../models/conexion');

// FUNCIÓN PARA VERIFICAR SI UN USUARIO LOGUEADO TIENE PLANILLAS GUARDADAS
const getPlanilla = async (req, res = response) => {
    // Extraer el idusuario de los parámetros de la solicitud
    const { idusuario } = req.params;

    // Registrar en consola el inicio de la función y el idusuario recibido
    //console.log(`Inicio de la función getPlanilla con idusuario: ${idusuario}`);

    try {
        // Obtener una conexión al pool de la base de datos
        const pool = await poolPromiseGestiones;

        // Ejecutar la consulta para obtener las planillas en estado "GUARDADO" para el usuario especificado
        const resultPlanillas = await pool.request()
            .input('idusuario', sql.Int, idusuario) // Parámetro: id del usuario
            .input('estado', sql.VarChar, 'GUARDADO') // Parámetro: estado de la planilla
            .query('SELECT * FROM planillas WHERE idusuario = @idusuario AND estado = @estado ORDER BY fechainicio ASC');

        // Obtener el conjunto de resultados de la consulta
        const data = resultPlanillas.recordset;

        // Verificar si se encontraron planillas para el usuario
        if (data.length > 0) {
            // Extraer el id de la primera planilla encontrada
            const idplanilla = data[0].idplanilla;

            // Log exitoso: planilla encontrada
 //           console.log(`Función getPlanilla exitosa: Planilla encontrada para idusuario ${idusuario}.`);

            // Enviar respuesta indicando que hay una planilla guardada
            res.json({ tienePlanillaGuardada: true, idplanilla });
        } else {
            // Log exitoso: no se encontraron planillas
   //         console.log(`Función getPlanilla exitosa: No hay planillas guardadas para idusuario ${idusuario}.`);

            // Enviar respuesta indicando que no hay planillas guardadas
            res.json({ tienePlanillaGuardada: false });
        }
    } catch (error) {
        // Log de error en caso de fallo durante la operación
     //   console.error(`Error en la función getPlanilla para idusuario ${idusuario}:`, error.message);

        // Responder al cliente con un mensaje de error
        res.status(500).json({ error: 'Error al obtener las planillas' });
    }
};


// FUNCIÓN PARA OBTENER TODAS LAS PLANILLAS EN ESTADO "CERRADO"
const getPlanillas = async (req, res = response) => {
    // Log inicial para indicar que la función ha comenzado


    try {
        // Obtener una conexión al pool de la base de datos
        const pool = await poolPromiseGestiones;

        // Ejecutar la consulta para obtener las planillas en estado "CERRADO" y los datos relacionados del usuario
        const resultPlanillas = await pool.request()
            .input('estado', sql.VarChar, 'CERRADO') // Parámetro para filtrar por estado "CERRADO"
            .query(`SELECT 
                        p.idplanilla, 
                        p.fechainicio, 
                        p.idusuario, 
                        p.estado, 
                        p.fechacierre, 
                        u.identificacion, 
                        u.nombres, 
                        u.apellidos 
                    FROM planillas p 
                    INNER JOIN usuarios u ON p.idusuario = u.idusuario 
                    WHERE p.estado = @estado`);

        // Obtener los datos del conjunto de resultados
        const data = resultPlanillas.recordset;

        // Enviar la respuesta con los datos obtenidos
        res.json(data);
    } catch (error) {
        // Log de error en caso de fallo
        console.error('Error en la función getPlanillas:', error.message);

        // Responder al cliente con un mensaje de error
        res.status(500).json({ error: 'Error al obtener las planillas' });
    }
};


// FUNCIÓN PARA OBTENER PLANILLAS FILTRADAS POR RANGO DE FECHAS
const getPlanillasFiltro = async (req, res = response) => {
    // Log de inicio de la función

    // Obtener los parámetros de fechaInicio y fechaFin desde la query del request
    const { fechaInicio, fechaFin } = req.query;

    try {
        // Log para mostrar los parámetros recibidos

        // Validación de parámetros obligatorios: fechaInicio y fechaFin
        if (!fechaInicio || !fechaFin) {
            console.error('Error: Los parámetros fechaInicio y fechaFin son obligatorios.');
            return res.status(400).json({ error: 'Los parámetros fechaInicio y fechaFin son obligatorios' });
        }

        // Obtener una conexión al pool de base de datos
        const pool = await poolPromiseGestiones;

        // Ejecutar la consulta SQL para obtener los datos filtrados por las fechas y el estado "APROBADO"
        const resultPlanillas = await pool.request()
            .input('estado', sql.VarChar, 'APROBADO')  // Filtro por el estado "APROBADO"
            .input('fechaInicio', sql.Date, fechaInicio)  // Parámetro de fecha de inicio
            .input('fechaFin', sql.Date, fechaFin)  // Parámetro de fecha de fin
            .query(`
                SELECT 
                    u.idusuario,  
                    u.identificacion AS documento, 
                    u.nombres, 
                    u.apellidos,  
                    SUM(dp.valor + ISNULL(st.subtramiteTotal, 0)) + ISNULL(MAX(p.valorajuste), 0) AS valorTotal
                FROM planillas p
                INNER JOIN usuarios u ON p.idusuario = u.idusuario  
                INNER JOIN detalleplanilla dp ON p.idplanilla = dp.idplanilla 
                LEFT JOIN (
                    SELECT iddetalleplanilla, SUM(valor) AS subtramiteTotal  
                    FROM subtramitesplanilla
                    GROUP BY iddetalleplanilla
                ) st ON dp.iddetalleplanilla = st.iddetalleplanilla 
                WHERE p.estado = @estado  
                AND CONVERT(DATE, p.fechaaprobada) BETWEEN @fechaInicio AND @fechaFin  
                GROUP BY u.idusuario, u.identificacion, u.nombres, u.apellidos 
            `);

        // Obtener los datos resultantes de la consulta
        const data = resultPlanillas.recordset;


        // Responder al cliente con los datos obtenidos
        res.json(data);
    } catch (error) {
        // Log de error si algo falla en el proceso
        console.error('Error en la función getPlanillasFiltro:', error.message);

        // Enviar una respuesta de error al cliente
        res.status(500).json({ error: 'Error al obtener las planillas' });
    }
};

// FUNCIÓN PARA CERRAR UNA PLANILLA POR ID
const cerrarPlanilla = async (req, res = response) => {
    // Obtener el idplanilla desde los parámetros de la URL
    const { idplanilla } = req.params;

    try {
        // Obtener una conexión al pool de base de datos
        const pool = await poolPromiseGestiones;

        // Ejecutar la consulta SQL para actualizar el estado de la planilla a "CERRADO" y registrar la fecha de cierre
        const result = await pool.request()
            .input('idplanilla', sql.Int, idplanilla)  // Recibimos el idplanilla desde la URL
            .input('estado', sql.VarChar, 'CERRADO')  // El nuevo estado de la planilla es "CERRADO"
            .query(`
                UPDATE planillas
                SET estado = @estado,
                    fechacierre = GETDATE() 
                WHERE idplanilla = @idplanilla  
            `);

        // Verificar si la actualización fue exitosa
        if (result.rowsAffected[0] > 0) {
            // Si se actualizó alguna fila, la planilla se cerró correctamente
            console.log(`Función cerrarPlanilla exitosa: La planilla con id ${idplanilla} se cerró correctamente.`);
            res.status(200).json({ success: true, message: 'Planilla cerrada exitosamente.' });
        } else {
            // Si no se encontró la planilla o ya estaba cerrada
            console.warn(`Función cerrarPlanilla: No se encontró una planilla con id ${idplanilla} o ya está cerrada.`);
            res.status(404).json({ success: false, message: 'Planilla no encontrada o ya cerrada.' });
        }
    } catch (error) {
        // En caso de error, se captura el error y se envía una respuesta con el mensaje de error
        console.error(`Error en la función cerrarPlanilla para idplanilla ${idplanilla}:`, error.message);
        res.status(500).json({ success: false, message: 'Error al cerrar la planilla.' });
    }
};

// FUNCIÓN PARA APROBAR UNA PLANILLA
const aprobarPlanilla = async (req, res = response) => {
    // Obtener el idplanilla desde los parámetros de la URL
    const { idplanilla } = req.params;
    // Obtener los detalles del ajuste desde el cuerpo de la solicitud
    const { ajuste } = req.body;

    try {
        // Establecer conexión con la base de datos
        const pool = await poolPromiseGestiones;

        // Realizar la actualización del estado, el ajuste, la fecha de aprobación y limpiar campos de rechazo
        const result = await pool.request()
            .input('idplanilla', sql.Int, idplanilla) // Recibimos el idplanilla desde la URL
            .input('idusuario', sql.Int, ajuste.idusuario) // Recibimos el id del usuario que aprueba la planilla
            .input('estado', sql.VarChar, 'APROBADO') // Establecemos el nuevo estado de la planilla como "APROBADO"
            .input('valorajuste', sql.Decimal(18, 2), ajuste.valor || 0) // Si no se proporciona un valor, lo predeterminamos a 0
            .input('motivoajuste', sql.VarChar, ajuste.motivo || '') // Si no se proporciona un motivo, lo predeterminamos a un string vacío
            .query(`
                UPDATE planillas
                SET estado = @estado, 
                    usuarioaprobo = @idusuario,
                    valorajuste = @valorajuste,
                    motivoajuste = @motivoajuste, 
                    fechaaprobada = GETDATE(),
                    usuariorechazo = NULL, -- Limpiar campo de usuario de rechazo
                    motivorechazo = NULL  -- Limpiar campo de motivo de rechazo
                WHERE idplanilla = @idplanilla
            `);

        // Verificamos si la actualización fue exitosa
        if (result.rowsAffected[0] > 0) {
            // Si se actualizó alguna fila, significa que la planilla fue aprobada correctamente
            res.status(200).json({ success: true, message: 'Planilla aprobada exitosamente.' });
        } else {
            // Si no se encontró la planilla o ya estaba aprobada
            console.warn(`Función aprobarPlanilla: No se encontró una planilla con id ${idplanilla} o ya está aprobada.`);
            res.status(404).json({ success: false, message: 'Planilla no encontrada o ya aprobada.' });
        }
    } catch (error) {
        // En caso de error, se captura el error y se devuelve un mensaje detallado
        console.error(`Error en la función aprobarPlanilla para idplanilla ${idplanilla}:`, error.message);
        res.status(500).json({ success: false, message: 'Error al aprobar la planilla.' });
    }
};


// FUNCIÓN PARA RECHAZAR UNA PLANILLA
const rechazarPlanilla = async (req, res = response) => {
    // Obtener el idplanilla desde los parámetros de la URL
    const { idplanilla } = req.params;
    const { motivo } = req.body; // Obtener el motivo del rechazo desde el cuerpo de la solicitud
    const { idusuario } = req.body; // Obtener el motivo del rechazo desde el cuerpo de la solicitud


    try {
        // Validar que el motivo esté presente
        if (!motivo || motivo.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'El motivo del rechazo es obligatorio.'
            });
        }

        // Establecer conexión con la base de datos
        const pool = await poolPromiseGestiones;

        // Realizar la actualización del estado de la planilla y almacenar el motivo
        const result = await pool.request()
            .input('idplanilla', sql.Int, idplanilla)  // Recibimos el idplanilla desde la URL
            .input('estado', sql.VarChar, 'GUARDADO')  // Establecemos el nuevo estado como "GUARDADO"
            .input('motivorechazo', sql.VarChar, motivo)  // Recibimos el motivo desde el cuerpo
            .input('idusuario', sql.VarChar, idusuario)  
            .query(`
                UPDATE planillas
                SET estado = @estado, motivorechazo = @motivorechazo, usuariorechazo = @idusuario
                WHERE idplanilla = @idplanilla
            `);

        // Verificamos si la actualización fue exitosa
        if (result.rowsAffected[0] > 0) {
            console.log(`Función rechazarPlanilla exitosa: La planilla con id ${idplanilla} fue rechazada.`);
            res.status(200).json({ success: true, message: 'Planilla rechazada exitosamente.' });
        } else {
            console.warn(`Función rechazarPlanilla: No se encontró una planilla con id ${idplanilla} o ya fue rechazada.`);
            res.status(404).json({ success: false, message: 'Planilla no encontrada o ya rechazada.' });
        }
    } catch (error) {
        console.error(`Error en la función rechazarPlanilla para idplanilla ${idplanilla}:`, error.message);
        res.status(500).json({ success: false, message: 'Error al rechazar la planilla.' });
    }
};


// FUNCIÓN PARA PAGAR PLANILLAS POR RANGO DE FECHAS
const pagarPlanillasPorFechas = async (req, res = response) => {
    // Recibe las fechas de inicio, fin, el estado y el idusuario desde el cuerpo de la solicitud
    const { fechaInicio, fechaFin, estado, idusuario } = req.body;

    try {
        // Establecer conexión con la base de datos
        const pool = await poolPromiseGestiones;

        // Validar que se enviaron las fechas necesarias
        if (!fechaInicio || !fechaFin) {
            // Si falta alguno de los parámetros obligatorios, devolver error 400
            console.warn('Faltan parámetros obligatorios: fechaInicio o fechaFin.');
            return res.status(400).json({
                success: false,
                message: 'Se requiere fechaInicio y fechaFin para realizar la operación.',
            });
        }

        // Realizar la actualización de las planillas cuyo fechaprobada está dentro del rango de fechas proporcionado
        const result = await pool.request()
            .input('fechaInicio', sql.Date, fechaInicio)  // Fecha de inicio para el rango
            .input('fechaFin', sql.Date, fechaFin)  // Fecha de fin para el rango
            .input('estado', sql.VarChar, estado || 'PAGADO')  // Estado de las planillas, predeterminado a "PAGADO"
            .input('idusuario', sql.Int, idusuario)  // ID del usuario que realiza el pago
            .query(`
                UPDATE planillas
                SET estado = @estado,
                    usuariopago = @idusuario, 
                    fechapagada = GETDATE() 
                WHERE CONVERT(DATE, fechaaprobada) BETWEEN @fechaInicio AND @fechaFin 
            `);

        // Verificar si alguna fila fue actualizada
        if (result.rowsAffected[0] > 0) {
            // Si se actualizan planillas, informar el número de planillas actualizadas
            console.log(`Función pagarPlanillasPorFechas exitosa: ${result.rowsAffected[0]} planilla(s) actualizada(s).`);
            res.status(200).json({
                success: true,
                message: `Planillas actualizadas correctamente. Total: ${result.rowsAffected[0]}`,
            });
        } else {
            // Si no se encontraron planillas dentro del rango de fechas, devolver un error 404
            console.warn(`No se encontraron planillas en el rango de fechas: ${fechaInicio} - ${fechaFin}.`);
            res.status(404).json({
                success: false,
                message: 'No se encontraron planillas en el rango de fechas proporcionado.',
            });
        }
    } catch (error) {
        // Si ocurre un error durante el proceso, capturarlo y devolver un mensaje de error con el código 500
        console.error('Error en la función pagarPlanillasPorFechas:', error.message);
        res.status(500).json({
            success: false,
            message: 'Ocurrió un error al actualizar las planillas. Por favor, inténtalo de nuevo.',
        });
    }
};





module.exports = { getPlanilla, cerrarPlanilla, getPlanillas, aprobarPlanilla, rechazarPlanilla, getPlanillasFiltro, pagarPlanillasPorFechas };
