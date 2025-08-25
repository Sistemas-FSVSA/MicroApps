document.addEventListener('DOMContentLoaded', initAgenda);

function getLocalISOString(fecha, hora) {
  const [year, month, day] = fecha.split('-');
  const [hh, mm] = hora.split(':');
  const date = new Date(year, month - 1, day, hh, mm);
  const tzOffset = -date.getTimezoneOffset();
  const sign = tzOffset >= 0 ? '+' : '-';
  const pad = n => String(Math.floor(Math.abs(n))).padStart(2, '0');
  const offset = `${sign}${pad(tzOffset / 60)}:${pad(tzOffset % 60)}`;
  return `${fecha}T${hora}${offset}`;
}

function initAgenda() {
  const calendarEl = document.getElementById('calendar');
  if (!calendarEl) {
    console.error('No se encontró el calendario #calendar');
    return;
  }

  const calendar = new FullCalendar.Calendar(calendarEl, {
    locale: 'es',
    timeZone: 'local', // Cambiar de 'America/Bogota' a 'local' para evitar conversiones automáticas
    buttonText: {
      today: 'Hoy',
      month: 'Mes',
      week: 'Semana',
      day: 'Día',
      list: 'Lista'
    },
    eventTimeFormat: {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      meridiem: 'short'
    },
    slotLabelFormat: {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      meridiem: 'short'
    },
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
    },
    selectable: true,
    events: function (fetchInfo, successCallback, failureCallback) {
      console.log('Cargando eventos desde el servidor...');
      fetch('http://192.168.1.28:4201/api/agenda/eventos', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
        .then(response => {
          console.log('Response status:', response.status);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          console.log('Datos de eventos cargados:', data);
          if (Array.isArray(data)) {
            const ahora = new Date();
            const eventosUnicos = new Map();

            data.forEach(evento => {
              const valido = evento.id && evento.title && evento.start;
              if (!valido) {
                console.warn('Evento inválido encontrado:', evento);
                return;
              }

              const fechaFin = new Date(evento.end || evento.start);
              const noExpirado = fechaFin > ahora;

              if (!noExpirado) {
                console.log('Evento expirado filtrado:', evento.title, fechaFin);
                return;
              }

              if (!eventosUnicos.has(evento.id)) {
                eventosUnicos.set(evento.id, evento);
              }
            });

            const eventosValidos = Array.from(eventosUnicos.values());
            console.log(`Eventos únicos válidos y no expirados: ${eventosValidos.length} de ${data.length}`);
            successCallback(eventosValidos);
          } else {
            console.error('La respuesta no es un array válido:', data);
            successCallback([]);
          }
        })
        .catch(error => {
          console.error('Error al cargar eventos:', error);
          failureCallback(error);
        });
    },
    dateClick: function (info) {
      const fechaSeleccionada = document.querySelector('#fechaSeleccionada');
      if (fechaSeleccionada) {
        fechaSeleccionada.value = info.dateStr;
        console.log('Fecha seleccionada:', info.dateStr);
      } else {
        console.error('No se encontró el campo #fechaSeleccionada');
      }
      const modal = new bootstrap.Modal(document.getElementById('reservaModal'));
      modal.show();
    },
    eventClick: function (info) {
      const ev = info.event;
      console.log('🔍 Evento clickeado:', ev);
      console.log('🔍 ExtendedProps:', ev.extendedProps);

      // Obtener detalles correctamente
      const detalles = ev.extendedProps.detalles || ev.extendedProps.detallesReservacion || '';
      const usuario = ev.extendedProps.usuario || '';
      const correo = ev.extendedProps.correo || '';
      const dependencia = ev.extendedProps.dependencia || '';

      console.log('🔍 Detalles extraídos:', detalles);

      // Mostrar horas SIN conversión de zona horaria
      const formatoHora12 = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Bogota'
      };

      // Usar las horas originales si están disponibles
      let startTime, endTime;

      if (ev.extendedProps.horaInicioOriginal && ev.extendedProps.horaFinOriginal) {
        // Usar las horas originales de la base de datos
        const [horaI, minI] = ev.extendedProps.horaInicioOriginal.split(':');
        const [horaF, minF] = ev.extendedProps.horaFinOriginal.split(':');

        // Crear objetos Date temporales solo para formatear
        const tempStart = new Date();
        tempStart.setHours(parseInt(horaI), parseInt(minI), 0);
        const tempEnd = new Date();
        tempEnd.setHours(parseInt(horaF), parseInt(minF), 0);

        startTime = tempStart.toLocaleTimeString('es-CO', formatoHora12);
        endTime = tempEnd.toLocaleTimeString('es-CO', formatoHora12);
      } else {
        // Fallback a las fechas del evento
        startTime = ev.start ? ev.start.toLocaleTimeString('es-CO', formatoHora12) : '';
        endTime = ev.end ? ev.end.toLocaleTimeString('es-CO', formatoHora12) : '';
      }

      // Construir contenido con todos los detalles
      const contenido = `
        <div class="mb-3">
            <strong> ${ev.title}</strong>
        </div>
        <div class="mb-2">
            <strong>Horario:</strong> ${startTime} - ${endTime}
        </div>
        ${usuario ? `
        <div class="mb-2">
            <strong>Usuario:</strong> ${usuario}
        </div>` : ''}
        ${correo ? `
        <div class="mb-2">
            <strong>Correo:</strong> ${correo}
        </div>` : ''}
        ${dependencia ? `
        <div class="mb-2">
            <strong>Dependencia:</strong> ${dependencia}
        </div>` : ''}
        ${detalles ? `
        <div class="mb-2">
            <strong>Detalles:</strong><br>
            <div class="ps-3 border-start border-2 border-secondary ms-2">
                ${detalles}
            </div>
        </div>` : `
        <div class="mb-2 text-muted">
            <em>Sin detalles adicionales</em>
        </div>`}
      `;

      document.getElementById('detalleTitulo').innerHTML = contenido;
      new bootstrap.Modal(document.getElementById('detalleModal')).show();

      console.log('✅ Modal de detalles mostrado');
    },
    eventDidMount: function (info) {
      const detalles = info.event.extendedProps.detalles;

      const formatoHora12 = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Bogota'
      };

      const startTime = info.event.start ? info.event.start.toLocaleTimeString('es-CO', formatoHora12) : '';
      const endTime = info.event.end ? info.event.end.toLocaleTimeString('es-CO', formatoHora12) : '';

      let tooltipText = `${startTime} - ${endTime}`;
      if (detalles) {
        tooltipText += `\n${detalles}`;
      }

      info.el.setAttribute('title', tooltipText);
    }
  });

  // Función corregida para cargar dependencias
  async function cargarDependencias() {
    try {
      console.log('🔄 Cargando dependencias...');
      const resp = await fetch('http://192.168.1.28:4201/api/agenda/dependencias');

      if (!resp.ok) {
        throw new Error(`HTTP error! status: ${resp.status} - ${resp.statusText}`);
      }

      const dependencias = await resp.json();
      console.log('✅ Dependencias recibidas:', dependencias);

      const select = document.getElementById('dependencia');
      if (!select) {
        console.error('❌ No se encontró el <select> #dependencia');
        return;
      }

      // Limpiar opciones existentes
      select.innerHTML = '<option value="">Selecciona una dependencia</option>';

      // Verificar si dependencias es un array
      if (!Array.isArray(dependencias)) {
        console.error('❌ Las dependencias no son un array:', dependencias);
        select.innerHTML = '<option value="">Error: formato de datos inválido</option>';
        return;
      }

      if (dependencias.length === 0) {
        console.warn('⚠️ No se encontraron dependencias');
        select.innerHTML = '<option value="">No hay dependencias disponibles</option>';
        return;
      }

      // Agregar cada dependencia al select
      dependencias.forEach(dep => {
        console.log('Procesando dependencia:', dep);

        // Verificar que el objeto tenga las propiedades esperadas
        if (dep.iddependencia && dep.nombre) {
          const option = document.createElement('option');
          option.value = dep.iddependencia;
          option.textContent = dep.nombre;
          select.appendChild(option);
          console.log(`✅ Dependencia agregada: ${dep.iddependencia} - ${dep.nombre}`);
        } else {
          console.warn('⚠️ Dependencia con formato incorrecto:', dep);
        }
      });

      console.log(`✅ Total: ${dependencias.length} dependencias cargadas correctamente`);

    } catch (error) {
      console.error('❌ Error cargando dependencias:', error);
      // Mostrar mensaje de error al usuario
      const select = document.getElementById('dependencia');
      if (select) {
        select.innerHTML = '<option value="">❌ Error cargando dependencias</option>';
      }
      // SweetAlert para error de dependencias
      Swal.fire({
        icon: 'error',
        title: 'Error al cargar dependencias',
        text: error.message,
        confirmButtonColor: '#d33'
      });
    }
  }

  // Cargar dependencias al inicializar
  cargarDependencias();

  // Actualización automática cada 5 minutos
  setInterval(() => {
    console.log('Actualizando eventos automáticamente...');
    calendar.refetchEvents();
  }, 5 * 60 * 1000);

  calendar.render();

  // Manejo del formulario
  const form = document.getElementById('reservaForm');
  if (form) {
    let enviandoFormulario = false;

    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      if (enviandoFormulario) {
        console.log('Ya se está procesando una reservación, ignorando...');
        return;
      }

      try {
        const fd = new FormData(form);
        const fechaSeleccionada = document.querySelector('#fechaSeleccionada').value;

        const horaInicio = fd.get('horaInicio');
        const horaFin = fd.get('horaFin');
        const dependenciaId = fd.get('dependencia');

        // Validaciones con SweetAlert
        if (!fechaSeleccionada) {
          Swal.fire({
            icon: 'warning',
            title: 'Fecha requerida',
            text: 'Debe seleccionar una fecha válida',
            confirmButtonColor: '#3085d6'
          });
          return;
        }

        if (!fd.get('usuario') || !fd.get('correo') || !dependenciaId) {
          Swal.fire({
            icon: 'warning',
            title: 'Campos obligatorios',
            text: 'Todos los campos obligatorios deben ser completados',
            confirmButtonColor: '#3085d6'
          });
          return;
        }

        if (!horaInicio || !horaFin) {
          Swal.fire({
            icon: 'warning',
            title: 'Horarios requeridos',
            text: 'Debe especificar hora de inicio y fin',
            confirmButtonColor: '#3085d6'
          });
          return;
        }

        if (horaFin <= horaInicio) {
          Swal.fire({
            icon: 'error',
            title: 'Error de horarios',
            text: 'La hora de finalización debe ser mayor que la hora de inicio',
            confirmButtonColor: '#d33'
          });
          return;
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(fd.get('correo'))) {
          Swal.fire({
            icon: 'error',
            title: 'Correo inválido',
            text: 'Por favor ingrese un correo electrónico válido',
            confirmButtonColor: '#d33'
          });
          return;
        }

        // Confirmación antes de enviar la reservación
        const confirmacion = await Swal.fire({
          icon: 'question',
          title: '¿Estás seguro de realizar la reservación?',
          text: `Fecha: ${fechaSeleccionada} | Horario: ${horaInicio} - ${horaFin}`,
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
          confirmButtonText: 'Sí, crear reservación',
          cancelButtonText: 'Cancelar'
        });

        if (!confirmacion.isConfirmed) {
          return;
        }

        enviandoFormulario = true;

        // Mostrar loading
        Swal.fire({
          title: 'Creando reservación...',
          text: 'Por favor espere',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        const horaInicioStr = horaInicio.length === 5 ? `${horaInicio}:00` : horaInicio;
        const horaFinStr = horaFin.length === 5 ? `${horaFin}:00` : horaFin;

        // Crear las fechas sin conversión de zona horaria - enviar como texto plano
        const fechaHoraInicio = `${fechaSeleccionada}T${horaInicio}:00`;
        const fechaHoraFin = `${fechaSeleccionada}T${horaFin}:00`;

        const body = {
          usuario: fd.get('usuario'),
          correo: fd.get('correo'),
          dependencia: parseInt(dependenciaId),
          fechaReservacion: fechaSeleccionada,
          start: fechaHoraInicio,
          end: fechaHoraFin,
          horaInicio: horaInicioStr,
          horaFin: horaFinStr,
          detallesReservacion: fd.get('detallesReservacion') || ''  // ✅ CORREGIDO
        };

        console.log('Datos enviados:', body);

        const resp = await fetch('http://192.168.1.28:4201/api/agenda', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        const responseData = await resp.json();
        console.log('Respuesta del servidor:', responseData);

        if (resp.ok && responseData.success) {
          const modal = bootstrap.Modal.getInstance(document.getElementById('reservaModal'));
          if (modal) {
            modal.hide();
          }

          form.reset();

          setTimeout(() => {
            console.log('Refrescando eventos después de crear reservación...');
            calendar.refetchEvents();
          }, 500);

          // SweetAlert de éxito
          Swal.fire({
            icon: 'success',
            title: '¡Reservación exitosa!',
            text: 'La reservación se ha creado correctamente',
            confirmButtonColor: '#28a745'
          });
        } else {
          const errorMsg = responseData.error || responseData.message || 'Error desconocido';
          Swal.fire({
            icon: 'error',
            title: 'Error al guardar',
            text: `Error guardando reservación: ${errorMsg}`,
            confirmButtonColor: '#d33'
          });
        }
      } catch (error) {
        console.error('Error en la solicitud:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error de conexión',
          text: `Error de conexión: ${error.message}`,
          confirmButtonColor: '#d33'
        });
      } finally {
        setTimeout(() => {
          enviandoFormulario = false;
        }, 1000);
      }
    });
  } else {
    console.error('No se encontró el formulario #reservaForm');
  }
}