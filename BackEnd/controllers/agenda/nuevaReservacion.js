const { poolPromiseAgenda, sql } = require('../../models/conexion');

const nuevaReservacion = async (req, res) => {
    console.log('=== NUEVA RESERVACIÓN ===');
    console.log('Datos recibidos en el controlador:', JSON.stringify(req.body, null, 2));
    
    try {
        const { usuario, correo, dependencia, fechaReservacion, horaInicio, horaFin, detallesReservacion } = req.body;

        // 🔹 VALIDACIONES BÁSICAS CON MENSAJES DETALLADOS
        const camposFaltantes = [];
        if (!usuario || usuario.trim() === '') camposFaltantes.push('usuario');
        if (!correo || correo.trim() === '') camposFaltantes.push('correo');
        if (!dependencia) camposFaltantes.push('dependencia');
        if (!fechaReservacion) camposFaltantes.push('fechaReservacion');
        if (!horaInicio) camposFaltantes.push('horaInicio');
        if (!horaFin) camposFaltantes.push('horaFin');

        if (camposFaltantes.length > 0) {
            console.error('❌ Campos faltantes:', camposFaltantes);
            return res.status(400).json({ 
                error: `Faltan los siguientes campos obligatorios: ${camposFaltantes.join(', ')}`,
                campos_faltantes: camposFaltantes,
                datos_recibidos: req.body
            });
        }

        // 🔹 VALIDAR QUE DEPENDENCIA SEA UN NÚMERO VÁLIDO
        const dependenciaId = parseInt(dependencia);
        if (isNaN(dependenciaId) || dependenciaId <= 0) {
            console.error('❌ Dependencia inválida:', dependencia);
            return res.status(400).json({ 
                error: `El ID de dependencia '${dependencia}' no es un número válido`,
                valor_recibido: dependencia
            });
        }

        // 🔹 VALIDAR FORMATO DE FECHA
        const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!fechaRegex.test(fechaReservacion)) {
            console.error('❌ Formato de fecha inválido:', fechaReservacion);
            return res.status(400).json({ 
                error: `Formato de fecha inválido: '${fechaReservacion}'. Use YYYY-MM-DD`,
                ejemplo: '2025-12-31'
            });
        }

        // 🔹 VALIDAR FORMATO DE HORAS
        const horaRegex = /^\d{2}:\d{2}(:\d{2})?$/;
        if (!horaRegex.test(horaInicio)) {
            console.error('❌ Formato de hora inicio inválido:', horaInicio);
            return res.status(400).json({ 
                error: `Formato de hora de inicio inválido: '${horaInicio}'. Use HH:MM o HH:MM:SS`,
                ejemplo: '14:30:00'
            });
        }
        
        if (!horaRegex.test(horaFin)) {
            console.error('❌ Formato de hora fin inválido:', horaFin);
            return res.status(400).json({ 
                error: `Formato de hora de fin inválido: '${horaFin}'. Use HH:MM o HH:MM:SS`,
                ejemplo: '16:30:00'
            });
        }

        // 🔹 VALIDAR QUE HORA FIN SEA MAYOR QUE HORA INICIO
        const horaInicioMinutos = convertirAMinutos(horaInicio);
        const horaFinMinutos = convertirAMinutos(horaFin);
        
        if (horaFinMinutos <= horaInicioMinutos) {
            console.error('❌ Hora fin debe ser mayor que hora inicio:', {horaInicio, horaFin});
            return res.status(400).json({ 
                error: `La hora de fin (${horaFin}) debe ser posterior a la hora de inicio (${horaInicio})`
            });
        }

        // 🔹 VALIDAR EMAIL CON REGEX MÁS ESTRICTO
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(correo)) {
            console.error('❌ Email inválido:', correo);
            return res.status(400).json({ 
                error: `Formato de correo electrónico inválido: '${correo}'`,
                ejemplo: 'usuario@example.com'
            });
        }

        // 🔹 PREPARAR DATOS LIMPIOS - FORMATO ISO PARA EVITAR CONVERSIONES
        const datosReservacion = {
            usuario: usuario.trim(),
            correo: correo.trim().toLowerCase(),
            dependencia: dependenciaId,
            fechaReservacion,
            horaInicio: horaInicio.length === 5 ? horaInicio + ':00' : horaInicio,
            horaFin: horaFin.length === 5 ? horaFin + ':00' : horaFin,
            detallesReservacion: detallesReservacion ? detallesReservacion.trim() : null
        };

        console.log('✅ Datos validados y procesados:', datosReservacion);

        // 🔹 LLAMAR AL MODELO
        const result = await agendaModel.crearReservacion(datosReservacion);
        
        console.log('✅ Reservación creada exitosamente:', result);
        res.status(201).json({
            ...result,
            message: 'Reservación creada correctamente'
        });
        
    } catch (error) {
        console.error('❌ Error en nuevaReservacion:', {
            message: error.message,
            stack: error.stack,
            body: req.body
        });
        
        // 🔹 MANEJO ESPECÍFICO DE ERRORES DEL MODELO
        if (error.message.includes('conflicto') || error.message.includes('Ya existe')) {
            return res.status(409).json({ 
                error: 'Conflicto de horarios',
                details: error.message,
                tipo: 'conflicto_horario'
            });
        }
        
        if (error.message.includes('dependencia') && (error.message.includes('existe') || error.message.includes('inactiva'))) {
            return res.status(400).json({ 
                error: 'Dependencia no válida',
                details: error.message,
                tipo: 'dependencia_invalida'
            });
        }

        if (error.message.includes('fechas pasadas')) {
            return res.status(400).json({ 
                error: 'Fecha inválida',
                details: error.message,
                tipo: 'fecha_pasada'
            });
        }

        if (error.message.includes('campos obligatorios')) {
            return res.status(400).json({ 
                error: 'Datos incompletos',
                details: error.message,
                tipo: 'validacion'
            });
        }
        
        // Error genérico del servidor
        res.status(500).json({ 
            error: 'Error interno del servidor al crear reservación',
            details: error.message,
            tipo: 'error_servidor'
        });
    }
}

module.exports = { nuevaReservacion };