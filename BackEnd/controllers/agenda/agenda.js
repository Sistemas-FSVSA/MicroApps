const agendaModel = require('../../models/agendaModel');

async function getEventos(req, res) {
    try {
        console.log('=== GET EVENTOS ===');
        const reservaciones = await agendaModel.getReservaciones();
        console.log('Reservaciones obtenidas del modelo:', reservaciones.length);
        
        if (!Array.isArray(reservaciones)) {
            console.error('getReservaciones no retornó un array:', typeof reservaciones);
            return res.status(500).json({ error: 'Error en formato de datos del servidor' });
        }
        
        // Usar Map para eliminar duplicados basados en ID único
        const eventosMap = new Map();
        
        reservaciones.forEach((r, index) => {
            console.log(`Procesando reservación ${index + 1}:`, {
                id: r.reservacionId,
                usuario: r.usuario,
                dependencia: r.dependencia,
                fecha: r.fechaReservacion,
                horaInicio: r.horaInicio,
                horaFin: r.horaFin,
                detalles: r.detallesReservacion
            });
            
            // Validar datos requeridos
            if (!r.reservacionId || !r.usuario || !r.dependencia || !r.fechaReservacion) {
                console.warn('Reservación con datos incompletos:', r);
                return;
            }
            
            // Formatear fecha SIN conversión de zona horaria
            let fechaFormateada;
            try {
                if (r.fechaReservacion instanceof Date) {
                    // Usar UTC para evitar conversiones de zona horaria
                    const año = r.fechaReservacion.getUTCFullYear();
                    const mes = String(r.fechaReservacion.getUTCMonth() + 1).padStart(2, '0');
                    const dia = String(r.fechaReservacion.getUTCDate()).padStart(2, '0');
                    fechaFormateada = `${año}-${mes}-${dia}`;
                } else {
                    // Si es string, usar directamente sin crear Date
                    fechaFormateada = String(r.fechaReservacion).split('T')[0];
                }
            } catch (error) {
                console.error('Error formateando fecha:', r.fechaReservacion, error);
                return;
            }
            
            // Asegurar formato de horas SIN conversión - Mantener formato original
            const horaInicio = r.horaInicio || '00:00:00';
            const horaFin = r.horaFin || '23:59:59';
            
            // Construir fechas ISO completas para el calendario (sin zona horaria)
            const fechaHoraInicio = `${fechaFormateada}T${horaInicio}-05:00`;
const fechaHoraFin = `${fechaFormateada}T${horaFin}-05:00`;

            
            const evento = {
                id: String(r.reservacionId),
                title: `${r.usuario} - ${r.dependencia}`,
                start: fechaHoraInicio,
                end: fechaHoraFin,
                extendedProps: {
                    detalles: r.detallesReservacion || '',
                    usuario: r.usuario,
                    correo: r.correo,
                    dependencia: r.dependencia,
                    horaInicioOriginal: r.horaInicio,
                    horaFinOriginal: r.horaFin
                }
            };
            
            // Solo agregar si no existe (evita duplicados por ID)
            if (!eventosMap.has(r.reservacionId)) {
                eventosMap.set(r.reservacionId, evento);
                console.log(`✅ Evento agregado: ID ${r.reservacionId} - ${fechaHoraInicio} a ${fechaHoraFin}`);
                console.log(`   Detalles: "${r.detallesReservacion}"`);
            } else {
                console.log(`❌ Evento duplicado ignorado: ID ${r.reservacionId}`);
            }
        });
        
        const eventos = Array.from(eventosMap.values());
        
        console.log(`=== RESULTADO FINAL ===`);
        console.log(`Eventos únicos generados: ${eventos.length} de ${reservaciones.length} reservaciones`);
        
        res.json(eventos);
        
    } catch (error) {
        console.error('❌ Error al obtener eventos:', error);
        res.status(500).json({ 
            error: 'Error al obtener eventos del servidor',
            details: error.message 
        });
    }
}

async function nuevaReservacion(req, res) {
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

async function listarReservaciones(req, res) {
    try {
        console.log('📋 Listando todas las reservaciones...');
        const data = await agendaModel.getReservaciones();
        console.log(`✅ ${data.length} reservaciones obtenidas`);
        res.json(data);
    } catch (error) {
        console.error('❌ Error en listarReservaciones:', error);
        res.status(500).json({ 
            error: 'Error obteniendo reservaciones',
            details: error.message 
        });
    }
}

// 🔹 FUNCIÓN AUXILIAR PARA CONVERTIR HORAS A MINUTOS
function convertirAMinutos(hora) {
    const partes = hora.split(':');
    const horas = parseInt(partes[0]);
    const minutos = parseInt(partes[1]);
    return (horas * 60) + minutos;
}

// 🔹 FUNCIÓN DE PRUEBA PARA VERIFICAR CONEXIÓN
async function testConnection(req, res) {
    try {
        const result = await agendaModel.testConnection();
        res.json(result);
    } catch (error) {
        console.error('❌ Error de conexión:', error);
        res.status(500).json({ 
            error: 'Error de conexión a la base de datos',
            details: error.message 
        });
    }
}

module.exports = {
    getEventos,
    nuevaReservacion,
    listarReservaciones,
    testConnection
};