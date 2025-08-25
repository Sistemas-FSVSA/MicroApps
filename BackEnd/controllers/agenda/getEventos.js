const { poolPromiseAgenda, sql } = require('../models/conexion');

const getEventos = async (req, res) => {
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

module.exports = { getEventos };