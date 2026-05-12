const url = window.env.API_URL;

// ─── Leer sala seleccionada desde sessionStorage ───────────────────────────
const salaId = sessionStorage.getItem('salaId');
const salaNombre = sessionStorage.getItem('salaNombre');

document.addEventListener('DOMContentLoaded', function () {
  if (!salaId) {
    window.location.href = '/seleccion-sala';
    return;
  }

  const tituloSala = document.getElementById('tituloSala');
  if (tituloSala) tituloSala.textContent = salaNombre;

  initAgenda();
});

document.getElementById('btnRegresar').addEventListener('click', () => {
  window.location.href = '/seleccion-sala';
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

// ─── Restricciones Sala Unidad de Duelo (salaId = 3) ──────────────────────
// 1. Todos los viernes de 10:00 AM a 12:00 PM
// 2. Todos los sábados de 10:00 AM a 12:00 PM
// 3. Todos los últimos jueves del mes de 1:00 PM a 5:00 PM
// 4. Todos los martes de 2:00 PM a 5:00 PM

function getUltimoJuevesDelMes(anio, mes) {
  // mes: 0-indexed (JavaScript)
  const ultimoDia = new Date(anio, mes + 1, 0);
  const diaSemana = ultimoDia.getDay();
  const diff = (diaSemana >= 4) ? diaSemana - 4 : diaSemana + 3;
  return new Date(anio, mes, ultimoDia.getDate() - diff);
}

function timeToMinutes(horaStr) {
  const [h, m] = horaStr.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Verifica si un DÍA completo está totalmente bloqueado para Unidad de Duelo.
 * Se usa en dateClick para impedir abrir el modal directamente.
 * @param {string} fechaStr - "YYYY-MM-DD"
 * @returns {{ bloqueado: boolean, titulo?: string, mensaje?: string }}
 */
function verificarDiaBloqueadoUnidadDuelo(fechaStr) {
  const [anio, mes, dia] = fechaStr.split('-').map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  const diaSemana = fecha.getDay();

  // Viernes → bloqueo 10:00-12:00 (horario parcial, se avisa pero deja entrar)
  // Sábado  → bloqueo 10:00-12:00 (horario parcial, se avisa pero deja entrar)
  // Último jueves → bloqueo 13:00-17:00 (se bloquea el día directamente)
  // Martes  → bloqueo 14:00-17:00 (horario parcial, se avisa pero deja entrar)

  // Último jueves: bloquear acceso completo al modal
  if (diaSemana === 4) {
    const ultimoJueves = getUltimoJuevesDelMes(anio, mes - 1);
    if (dia === ultimoJueves.getDate()) {
      return {
        bloqueado: true,
        titulo: 'Día no disponible',
        mensaje: 'La Sala de Juntas Unidad de Duelo <strong>no permite reservaciones el último jueves del mes de 1:00 PM a 5:00 PM</strong>.<br><br>Por favor selecciona otro día u horario fuera de ese rango.'
      };
    }
  }

  return { bloqueado: false };
}

/**
 * Verifica si una reservación en la Sala Unidad de Duelo viola las restricciones.
 * Se usa en el submit del formulario para validar el horario exacto ingresado.
 * @param {string} fechaStr       - "YYYY-MM-DD"
 * @param {string} horaInicioStr  - "HH:MM" o "HH:MM:SS"
 * @param {string} horaFinStr     - "HH:MM" o "HH:MM:SS"
 * @returns {{ bloqueada: boolean, mensaje?: string }}
 */
function verificarRestriccionReservacion(fechaStr, horaInicioStr, horaFinStr) {
  const [anio, mes, dia] = fechaStr.split('-').map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  const diaSemana = fecha.getDay();

  const inicioRes = timeToMinutes(horaInicioStr);
  const finRes = timeToMinutes(horaFinStr);

  function seSolapa(inicioBloqueo, finBloqueo) {
    return inicioRes < finBloqueo && finRes > inicioBloqueo;
  }

  const HORA_10_00 = 10 * 60;
  const HORA_12_00 = 12 * 60;
  const HORA_13_00 = 13 * 60;
  const HORA_14_00 = 14 * 60;
  const HORA_17_00 = 17 * 60;

  // Regla 1: Viernes 10:00 - 12:00
  if (diaSemana === 5 && seSolapa(HORA_10_00, HORA_12_00)) {
    return {
      bloqueada: true,
      mensaje: 'La Sala de Juntas Unidad de Duelo <strong>no permite reservaciones los viernes de 10:00 AM a 12:00 PM</strong>.<br><br>Por favor selecciona un horario diferente.'
    };
  }

  // Regla 2: Sábado 10:00 - 12:00
  if (diaSemana === 6 && seSolapa(HORA_10_00, HORA_12_00)) {
    return {
      bloqueada: true,
      mensaje: 'La Sala de Juntas Unidad de Duelo <strong>no permite reservaciones los sábados de 10:00 AM a 12:00 PM</strong>.<br><br>Por favor selecciona un horario diferente.'
    };
  }

  // Regla 3: Último jueves del mes 13:00 - 17:00
  if (diaSemana === 4 && seSolapa(HORA_13_00, HORA_17_00)) {
    const ultimoJueves = getUltimoJuevesDelMes(anio, mes - 1);
    if (dia === ultimoJueves.getDate()) {
      return {
        bloqueada: true,
        mensaje: 'La Sala de Juntas Unidad de Duelo <strong>no permite reservaciones el último jueves del mes de 1:00 PM a 5:00 PM</strong>.<br><br>Por favor selecciona un horario diferente.'
      };
    }
  }

  // Regla 4: Viernes de 14:00 - 17:00
  if (diaSemana === 5 && seSolapa(HORA_14_00, HORA_17_00)) {
    return {
      bloqueada: true,
      mensaje: 'La Sala de Juntas Unidad de Duelo <strong>no permite reservaciones los viernes de 2:00 PM a 5:00 PM</strong>.<br><br>Por favor selecciona un horario diferente.'
    };
  }


  return { bloqueada: false };
}

/**
 * Verifica si una reservación en la Sala Mercadeo viola las restricciones.
 * Regla: No se permiten reservaciones antes de las 10:00 AM.
 * @param {string} horaInicioStr  - "HH:MM" o "HH:MM:SS"
 * @param {string} horaFinStr     - "HH:MM" o "HH:MM:SS"
 * @returns {{ bloqueada: boolean, mensaje?: string }}
 */
function verificarRestriccionMercadeo(horaInicioStr, horaFinStr) {
  const inicioRes = timeToMinutes(horaInicioStr);
  const finRes = timeToMinutes(horaFinStr);
  const HORA_10_00 = 10 * 60;

  // Si el inicio O el fin caen antes de las 10:00 AM → bloqueado
  if (inicioRes < HORA_10_00 || finRes <= HORA_10_00) {
    return {
      bloqueada: true,
      mensaje: 'La Sala de Juntas Mercadeo <strong>no permite reservaciones antes de las 10:00 AM</strong>.<br><br>Por favor selecciona un horario a partir de las 10:00 AM.'
    };
  }

  return { bloqueada: false };
}

// ─── INIT AGENDA ───────────────────────────────────────────────────────────
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

    // 🔹 No permitir seleccionar días pasados
    selectAllow: function (selectInfo) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      today.setDate(today.getDate() - 1);
      const start = new Date(selectInfo.start);
      start.setHours(0, 0, 0, 0);
      return start.getTime() >= today.getTime();
    },

    // 🔹 Estilo visual para días pasados
    dayCellDidMount: function (info) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      today.setDate(today.getDate() - 1);
      const cellDate = new Date(info.date);
      cellDate.setHours(0, 0, 0, 0);
      if (cellDate.getTime() < today.getTime()) {
        info.el.style.backgroundColor = "#f5f5f5";
        info.el.style.opacity = "0.6";
        info.el.style.pointerEvents = "none";
      }
    },

    // ─── Carga de eventos desde el endpoint real ───────────────────────
    events: async function (fetchInfo, successCallback, failureCallback) {
      try {
        const fechaActual = new Date(fetchInfo.start);
        const mes = ((fechaActual.getMonth() + 2) % 12) || 12;

        const data = await getReservaciones(mes, salaId);

        if (Array.isArray(data)) {
          const eventos = data.map(evento => ({
            id: evento.reservacionId,
            title: evento.usuario,
            start: evento.inicioReservacion,
            end: evento.finReservacion,
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

    // 🔹 dateClick: para Unidad de Duelo, verificar si el día está bloqueado
    //    antes de abrir el modal. Restricciones de horario parcial se validan
    //    al momento del submit.
    dateClick: function (info) {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const limite = new Date(hoy);
      limite.setDate(limite.getDate() - 1);
      if (info.date < limite) return;



      // ── Bloqueo por día completo (solo Unidad de Duelo) ──────────────
      if (salaId === '3') {
        const fechaSeleccionada = document.querySelector('#fechaSeleccionada');
        if (fechaSeleccionada) {
          fechaSeleccionada.value = info.dateStr;
        } else {
          console.error('No se encontró el campo #fechaSeleccionada');
          return;
        }
      }

      const fechaSeleccionada = document.querySelector('#fechaSeleccionada');
      if (fechaSeleccionada) {
        fechaSeleccionada.value = info.dateStr;
      } else {
        console.error('No se encontró el campo #fechaSeleccionada');
        return;
      }

      new bootstrap.Modal(document.getElementById('reservaModal')).show();
    },

    eventClick: function (info) {
      const ev = info.event;
      const detalles = ev.extendedProps.detalles || ev.extendedProps.detallesReservacion || '';
      const usuario = ev.extendedProps.usuario || '';
      const correo = ev.extendedProps.correo || '';
      const dependencia = ev.extendedProps.dependencia || '';

      const formatoHora12 = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Bogota'
      };

      let startTime, endTime;

      if (ev.extendedProps.horaInicioOriginal && ev.extendedProps.horaFinOriginal) {
        startTime = ev.extendedProps.horaInicioOriginal;
        endTime = ev.extendedProps.horaFinOriginal;
      } else {
        startTime = ev.start ? ev.start.toLocaleTimeString('es-CO', formatoHora12) : '';
        endTime = ev.end ? ev.end.toLocaleTimeString('es-CO', formatoHora12) : '';
      }

      const contenido = `
        <div class="mb-3">
            <strong>${ev.title}</strong>
        </div>
        <div class="mb-2">
            <strong>Horario:</strong> ${startTime} - ${endTime}
        </div>
        ${usuario ? `<div class="mb-2"><strong>Usuario:</strong> ${usuario}</div>` : ''}
        ${correo ? `<div class="mb-2"><strong>Correo:</strong> ${correo}</div>` : ''}
        ${dependencia ? `<div class="mb-2"><strong>Dependencia:</strong> ${dependencia}</div>` : ''}
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
      const startTime = info.event.extendedProps.horaInicioOriginal || '';
      const endTime = info.event.extendedProps.horaFinOriginal || '';
      let tooltipText = `${startTime} - ${endTime}`;
      if (detalles) tooltipText += `\n${detalles}`;
      info.el.setAttribute('title', tooltipText);
    }
  });

  // ─── Cargar dependencias ───────────────────────────────────────────────
  async function cargarDependencias() {
    try {
      const dependencias = await getDependencias();
      const select = document.getElementById('dependencia');
      if (!select) return;

      select.innerHTML = '<option value="">Selecciona una dependencia</option>';

      if (!Array.isArray(dependencias)) {
        select.innerHTML = '<option value="">Error: formato de datos inválido</option>';
        return;
      }
      if (dependencias.length === 0) {
        select.innerHTML = '<option value="">No hay dependencias disponibles</option>';
        return;
      }

      dependencias.forEach(dep => {
        if (dep.iddependencia && dep.nombre) {
          const option = document.createElement('option');
          option.value = dep.iddependencia;
          option.textContent = dep.nombre;
          select.appendChild(option);
        }
      });

    } catch (error) {
      console.error('❌ Error cargando dependencias:', error);
      const select = document.getElementById('dependencia');
      if (select) select.innerHTML = '<option value="">❌ Error cargando dependencias</option>';
      Swal.fire({ icon: 'error', title: 'Error al cargar dependencias', text: error.message, confirmButtonColor: '#d33' });
    }
  }

  cargarDependencias();

  const reservaModal = document.getElementById('reservaModal');
  if (reservaModal) {
    reservaModal.addEventListener('hidden.bs.modal', limpiarFormularioCompleto);
  }

  setInterval(() => { calendar.refetchEvents(); }, 5 * 60 * 1000);

  calendar.render();

  // ─── Submit del formulario ────────────────────────────────────────────
  const form = document.getElementById('reservaForm');
  if (!form) { console.error('No se encontró el formulario #reservaForm'); return; }

  let enviandoFormulario = false;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (enviandoFormulario) return;

    try {
      const fd = new FormData(form);
      const fechaSeleccionada = document.querySelector('#fechaSeleccionada').value;
      const horaInicio = fd.get('horaInicio');
      const horaFin = fd.get('horaFin');
      const dependenciaId = fd.get('dependencia');

      // ─── Validaciones básicas ────────────────────────────────────────
      if (!fechaSeleccionada) {
        Swal.fire({ icon: 'warning', title: 'Fecha requerida', text: 'Debe seleccionar una fecha válida', confirmButtonColor: '#3085d6' });
        return;
      }
      if (!fd.get('usuario') || !fd.get('correo') || !dependenciaId) {
        Swal.fire({ icon: 'warning', title: 'Campos obligatorios', text: 'Todos los campos obligatorios deben ser completados', confirmButtonColor: '#3085d6' });
        return;
      }
      if (!horaInicio || !horaFin) {
        Swal.fire({ icon: 'warning', title: 'Horarios requeridos', text: 'Debe especificar hora de inicio y fin', confirmButtonColor: '#3085d6' });
        return;
      }
      if (horaFin <= horaInicio) {
        Swal.fire({ icon: 'error', title: 'Error de horarios', text: 'La hora de finalización debe ser mayor que la hora de inicio', confirmButtonColor: '#d33' });
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fd.get('correo'))) {
        Swal.fire({ icon: 'error', title: 'Correo inválido', text: 'Por favor ingrese un correo electrónico válido', confirmButtonColor: '#d33' });
        return;
      }

      // ─── Validar restricciones de horario (Sala Mercadeo) ───────────
      if (salaId === '2') {
        const restriccion = verificarRestriccionMercadeo(horaInicio, horaFin);
        if (restriccion.bloqueada) {
          Swal.fire({
            icon: 'warning',
            title: 'Horario no permitido',
            html: restriccion.mensaje,
            confirmButtonColor: '#6c757d',
            confirmButtonText: 'Entendido'
          });
          return;
        }
      }

      // ─── Validar restricciones de horario (Sala Unidad de Duelo) ────
      if (salaId === '3') {
        const restriccion = verificarRestriccionReservacion(fechaSeleccionada, horaInicio, horaFin);
        if (restriccion.bloqueada) {
          Swal.fire({
            icon: 'warning',
            title: 'Horario no permitido',
            html: restriccion.mensaje,
            confirmButtonColor: '#6c757d',
            confirmButtonText: 'Entendido'
          });
          return;
        }
      }

      // ─── Confirmación ────────────────────────────────────────────────
      const confirmacion = await Swal.fire({
        icon: 'question',
        title: '¿Estás seguro de realizar la reservación?',
        html: `
          <div class="text-start">
            <p><strong>Sala:</strong> ${salaNombre}</p>
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

      if (!confirmacion.isConfirmed) return;

      enviandoFormulario = true;

      Swal.fire({
        title: 'Creando reservación...',
        text: 'Verificando disponibilidad y guardando',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
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
        detallesReservacion: fd.get('detallesReservacion') || '',
        tipo: salaId
      };

      const result = await crearReservacion(reservacionData);

      if (result.success) {
        bootstrap.Modal.getInstance(document.getElementById('reservaModal'))?.hide();
        setTimeout(() => { calendar.refetchEvents(); }, 500);
        Swal.fire({ icon: 'success', title: '¡Reservación exitosa!', text: result.message || 'La reservación se ha creado correctamente', confirmButtonColor: '#28a745' });
      }

    } catch (error) {
      console.error('Error en la solicitud:', error);
    } finally {
      setTimeout(() => { enviandoFormulario = false; }, 1000);
    }
  });
}

// ─── API calls ─────────────────────────────────────────────────────────────

async function getReservaciones(mes, tipo) {
  try {
    const response = await fetch(`${url}/api/agenda/obtenerReservaciones/${mes}/${tipo}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Error al obtener reservaciones:', error);
    throw error;
  }
}

async function crearReservacion(reservacionData) {
  try {
    if (!reservacionData.usuario || !reservacionData.correo || !reservacionData.dependencia ||
      !reservacionData.fechaReservacion || !reservacionData.horaInicio || !reservacionData.horaFin) {
      throw new Error('Faltan campos obligatorios');
    }

    const response = await fetch(`${url}/api/agenda/guardarReservacion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reservacionData)
    });

    if (!response.ok) {
      let errorData;
      try { errorData = await response.json(); }
      catch { throw new Error(`Error HTTP ${response.status}`); }

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
              <div class="mb-3"><strong>Reservado por:</strong> ${errorData.conflicto.usuario}</div>
              <p class="text-muted small">Selecciona un horario diferente</p>
            </div>
          `,
          confirmButtonColor: '#6c757d',
          confirmButtonText: 'Entendido'
        });
        throw new Error('CONFLICTO_HORARIO');
      }

      throw new Error(errorData.message || errorData.error || `Error HTTP ${response.status}`);
    }

    return await response.json();

  } catch (error) {
    console.error('❌ Error al crear reservación:', error.message);
    if (error.message !== 'CONFLICTO_HORARIO') {
      await Swal.fire({ icon: 'error', title: 'Error al crear reservación', text: error.message, confirmButtonColor: '#d33' });
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
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
    return await response.json();
  } catch (error) {
    console.error('❌ Error cargando dependencias:', error);
    throw error;
  }
}

// ─── Utilidades ────────────────────────────────────────────────────────────
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
  if (!form) return;
  form.reset();
  ['usuario', 'correo', 'dependencia', 'horaInicio', 'horaFin', 'detallesReservacion', 'fechaSeleccionada'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.type === 'select-one' ? el.selectedIndex = 0 : (el.value = '');
    el.classList.remove('is-valid', 'is-invalid');
  });
  form.querySelectorAll('.invalid-feedback').forEach(f => { f.style.display = 'none'; });
  console.log('✅ Formulario limpiado completamente');
}