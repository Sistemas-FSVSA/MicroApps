const url = window.env.API_URL;

document.addEventListener('DOMContentLoaded', function () {
  initAgenda();
});

document.getElementById('btnRegresar').addEventListener('click', () => {
    window.location.href = '/';
});


document.getElementById("horaInicio").addEventListener("change", function () {
  let [h, m] = this.value.split(":").map(Number);
  let redondeo = Math.round(m / 15) * 15;
  if (redondeo === 60) { h = (h + 1) % 24; redondeo = 0; }
  this.value = String(h).padStart(2, "0") + ":" + String(redondeo).padStart(2, "0");
});

document.getElementById("horaFin").addEventListener("change", function () {
  let [h, m] = this.value.split(":").map(Number);
  let redondeo = Math.round(m / 15) * 15;
  if (redondeo === 60) { h = (h + 1) % 24; redondeo = 0; }
  this.value = String(h).padStart(2, "0") + ":" + String(redondeo).padStart(2, "0");
});

function initAgenda() {

  const calendarEl = document.getElementById('calendar');

  const calendar = new FullCalendar.Calendar(calendarEl, {
    locale: 'es',
    timeZone: 'UTC-5',
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
    events: async function (fetchInfo, successCallback, failureCallback) {
      try {
        const fechaActual = new Date(fetchInfo.start);
        const mes = fechaActual.getMonth() + 2; // según tu lógica actual
        const data = await getReservaciones(mes);

        if (Array.isArray(data)) {
          const eventos = data.map(evento => ({
            id: evento.reservacionId,
            title: evento.usuario, // título visible en el calendario
            start: evento.inicioReservacion, // inicio en ISO
            end: evento.finReservacion, // fin en ISO
            extendedProps: {
              correo: evento.correo,
              dependencia: evento.dependencia,
              detalles: evento.detallesReservacion,
              horaInicioOriginal: evento.horaInicio,
              horaFinOriginal: evento.horaFin
            }
          }));

          successCallback(eventos);
        } else {
          successCallback([]);
        }
      } catch (error) {
        console.error('Error al cargar eventos:', error);
        failureCallback(error);
      }
    },
    dateClick: function (info) {
      const fechaSeleccionada = document.querySelector('#fechaSeleccionada');
      if (fechaSeleccionada) {
        fechaSeleccionada.value = info.dateStr;

      } else {
        console.error('No se encontró el campo #fechaSeleccionada');
      }
      const modal = new bootstrap.Modal(document.getElementById('reservaModal'));
      modal.show();
    },
    eventClick: function (info) {
      const ev = info.event;
      // Obtener detalles correctamente
      const detalles = ev.extendedProps.detalles || ev.extendedProps.detallesReservacion || '';
      const usuario = ev.extendedProps.usuario || '';
      const correo = ev.extendedProps.correo || '';
      const dependencia = ev.extendedProps.dependencia || '';


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

  // Función para cargar dependencias con la nueva estructura
  async function cargarDependencias() {
    try {
      const dependencias = await getDependencias();

      const select = document.getElementById('dependencia');
      if (!select) {
        console.error('❌ No se encontró el <select> #dependencia');
        return;
      }

      // Limpiar opciones existentes
      select.innerHTML = '<option value="">Selecciona una dependencia</option>';

      // Verificar si dependencias es un array
      if (!Array.isArray(dependencias)) {
        select.innerHTML = '<option value="">Error: formato de datos inválido</option>';
        return;
      }

      if (dependencias.length === 0) {
        select.innerHTML = '<option value="">No hay dependencias disponibles</option>';
        return;
      }

      // Agregar cada dependencia al select
      dependencias.forEach(dep => {
        // Verificar que el objeto tenga las propiedades esperadas
        if (dep.iddependencia && dep.nombre) {
          const option = document.createElement('option');
          option.value = dep.iddependencia;
          option.textContent = dep.nombre;
          select.appendChild(option);
        }
      });

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

  // ✅ AGREGAR EVENT LISTENERS PARA LIMPIAR EL FORMULARIO AL CERRAR EL MODAL
  const reservaModal = document.getElementById('reservaModal');
  if (reservaModal) {
    // Evento cuando el modal se oculta completamente
    reservaModal.addEventListener('hidden.bs.modal', function () {
      console.log('🧹 Modal cerrado - Limpiando formulario automáticamente');
      limpiarFormularioCompleto();
    });

    // Evento adicional para cuando se inicia el proceso de cerrado
    reservaModal.addEventListener('hide.bs.modal', function () {
      console.log('🚪 Cerrando modal de reservación...');
    });
  } else {
    console.error('❌ No se encontró el modal #reservaModal');
  }

  // Actualización automática cada 5 minutos
  setInterval(() => {
    console.log('Actualizando eventos automáticamente...');
    calendar.refetchEvents();
  }, 5 * 60 * 1000);

  calendar.render();

  // 🔹 ✅ MANEJO DEL FORMULARIO CON VALIDACIÓN MEJORADA DE CONFLICTOS
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

        // ✅ VALIDACIONES BÁSICAS
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

        // ✅ CONFIRMACIÓN FINAL
        const confirmacion = await Swal.fire({
          icon: 'question',
          title: '¿Estás seguro de realizar la reservación?',
          html: `
            <div class="text-start">
              <p><strong>Fecha:</strong> ${fechaSeleccionada}</p>
              <p><strong>Horario:</strong> ${convertirA12Horas(horaInicio)} - ${convertirA12Horas(horaFin)}</p>
              <p><strong>Usuario:</strong> ${fd.get('usuario')}</p>
            </div>
          `,
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
          text: 'Verificando disponibilidad y guardando',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        const horaInicioStr = horaInicio.length === 5 ? `${horaInicio}:00` : horaInicio;
        const horaFinStr = horaFin.length === 5 ? `${horaFin}:00` : horaFin;

        const reservacionData = {
          usuario: fd.get('usuario'),
          correo: fd.get('correo'),
          dependencia: parseInt(dependenciaId),
          fechaReservacion: fechaSeleccionada,
          horaInicio: horaInicioStr,
          horaFin: horaFinStr,
          detallesReservacion: fd.get('detallesReservacion') || ''
        };

        console.log('Datos enviados:', reservacionData);

        // ✅ Crear reservación con manejo mejorado de conflictos
        const result = await crearReservacion(reservacionData);

        if (result.success) {
          // Cerrar modal
          const modal = bootstrap.Modal.getInstance(document.getElementById('reservaModal'));
          if (modal) {
            modal.hide();
          }

          // El formulario se limpiará automáticamente al cerrar el modal
          // form.reset(); // Ya no es necesario aquí

          // Refrescar calendario
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
        }

      } catch (error) {
        console.error('Error en la solicitud:', error);
        // El error específico ya se maneja en crearReservacion()
        // Solo logeamos aquí para debugging

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

async function getReservaciones(mes) {
  try {
    const response = await fetch(`${url}/api/agenda/obtenerReservaciones/${mes}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error al obtener reservaciones:', error);
    throw error;
  }
}

async function crearReservacion(reservacionData) {
  try {
    // ✅ Validación de campos obligatorios
    if (!reservacionData.usuario || !reservacionData.correo || !reservacionData.dependencia ||
      !reservacionData.fechaReservacion || !reservacionData.horaInicio || !reservacionData.horaFin) {
      throw new Error('Faltan campos obligatorios');
    }

    const response = await fetch(`${url}/api/agenda/guardarReservacion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reservacionData)
    });

    // ✅ Manejo específico de errores de conflicto
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        // Si no es JSON, usar texto plano
        const errorText = await response.text();
        throw new Error(`Error HTTP ${response.status}: ${errorText}`);
      }

      // ✅ Manejo específico para conflictos de horario
      if (errorData.error === 'HORARIO_NO_DISPONIBLE' && errorData.conflicto) {
        await Swal.fire({
          icon: 'error',
          title: 'Horario no disponible',
          html: `
            <div class="text-center">
              <p class="mb-3">El horario seleccionado se solapa con otra reservación existente.</p>
              <div class="mb-2">
                <strong>Horario solicitado:</strong><br>
                ${convertirA12Horas(reservacionData.horaInicio.substring(0, 5))} - ${convertirA12Horas(reservacionData.horaFin.substring(0, 5))}
              </div>
              <div class="mb-2">
                <strong>Horario ocupado:</strong><br>
                ${convertirA12Horas(errorData.conflicto.horaInicio)} - ${convertirA12Horas(errorData.conflicto.horaFin)}
              </div>
              <div class="mb-3">
                <strong>Reservado por:</strong> ${errorData.conflicto.usuario}
              </div>
              <p class="text-muted small">Selecciona un horario diferente</p>
            </div>
          `,
          confirmButtonColor: '#6c757d',
          confirmButtonText: 'Entendido'
        });

        // Lanzar error específico para que el formulario no se procese
        throw new Error('CONFLICTO_HORARIO');
      }

      // ✅ Otros errores del servidor
      throw new Error(errorData.message || errorData.error || `Error HTTP ${response.status}`);
    }

    // ✅ Respuesta exitosa
    const result = await response.json();
    return result;

  } catch (error) {
    console.error('❌ Error al crear reservación:', error.message);

    // No mostrar SweetAlert si ya se mostró el conflicto específico
    if (error.message !== 'CONFLICTO_HORARIO') {
      await Swal.fire({
        icon: 'error',
        title: 'Error al crear reservación',
        text: error.message,
        confirmButtonColor: '#d33'
      });
    }

    throw error;
  }
}

async function getDependencias() {
  try {
    const response = await fetch(`${url}/api/agenda/obtenerDependencias`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
    }

    const dependencias = await response.json();
    return dependencias;
  } catch (error) {
    console.error('❌ Error cargando dependencias:', error);
    throw error;
  }
}

function convertirA12Horas(hora24) {
  if (!hora24) return '';

  const [horas, minutos] = hora24.split(':');
  const horasNum = parseInt(horas);
  const periodo = horasNum >= 12 ? 'PM' : 'AM';
  const horas12 = horasNum === 0 ? 12 : horasNum > 12 ? horasNum - 12 : horasNum;

  return `${horas12}:${minutos} ${periodo}`;
}


function limpiarFormularioCompleto() {
  const form = document.getElementById('reservaForm');
  if (form) {
    // Resetear el formulario
    form.reset();

    // Limpiar específicamente cada campo por si el reset no funciona completamente
    const campos = [
      'usuario',
      'correo',
      'dependencia',
      'horaInicio',
      'horaFin',
      'detallesReservacion',
      'fechaSeleccionada'
    ];

    campos.forEach(campo => {
      const elemento = document.getElementById(campo);
      if (elemento) {
        if (elemento.type === 'select-one') {
          elemento.selectedIndex = 0; // Seleccionar la primera opción
        } else {
          elemento.value = '';
        }

        // Remover clases de validación
        elemento.classList.remove('is-valid', 'is-invalid');
      }
    });

    // Limpiar cualquier mensaje de validación personalizado
    const invalidFeedbacks = form.querySelectorAll('.invalid-feedback');
    invalidFeedbacks.forEach(feedback => {
      feedback.style.display = 'none';
    });

    console.log('✅ Formulario limpiado completamente');
  }
}