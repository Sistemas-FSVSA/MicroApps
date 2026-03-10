document.getElementById('btnRegresarInicio').addEventListener('click', () => {
  window.location.href = '/';
});

// ─── Restricciones Sala Unidad de Duelo (salaId = 3) ──────────────────────
// 1. Todos los viernes de 10:00 AM a 12:00 PM
// 2. Todos los sábados de 10:00 AM a 12:00 PM
// 3. Todos los últimos jueves del mes de 1:00 PM a 5:00 PM

function getUltimoJuevesDelMes(anio, mes) {
  // mes: 0-indexed (JavaScript)
  const ultimoDia = new Date(anio, mes + 1, 0); // último día del mes
  const diaSemana = ultimoDia.getDay(); // 0=Dom, 4=Jue
  const diff = (diaSemana >= 4) ? diaSemana - 4 : diaSemana + 3;
  const ultimoJueves = new Date(anio, mes, ultimoDia.getDate() - diff);
  return ultimoJueves;
}

function getHoraActualEnMinutos() {
  const ahora = new Date();
  return ahora.getHours() * 60 + ahora.getMinutes();
}

/**
 * Verifica si actualmente la Sala Unidad de Duelo está bloqueada.
 * Devuelve un objeto { bloqueada: boolean, mensaje: string }
 */
function verificarRestriccionUnidadDuelo() {
  const ahora     = new Date();
  const diaSemana = ahora.getDay(); // 0=Dom, 1=Lun, ..., 4=Jue, 5=Vie, 6=Sáb
  const horaMin   = ahora.getHours() * 60 + ahora.getMinutes();

  const HORA_10_00 = 10 * 60;       // 600 min
  const HORA_12_00 = 12 * 60;       // 720 min
  const HORA_13_00 = 13 * 60;       // 780 min
  const HORA_17_00 = 17 * 60;       // 1020 min

  // Regla 1: Todos los viernes de 10:00 AM a 12:00 PM
  if (diaSemana === 5 && horaMin >= HORA_10_00 && horaMin < HORA_12_00) {
    return {
      bloqueada: true,
      titulo: 'Sala no disponible',
      mensaje: 'La Sala de Juntas Unidad de Duelo <strong>no está disponible los viernes de 10:00 AM a 12:00 PM</strong>.<br><br>Por favor intenta en otro horario.'
    };
  }

  // Regla 2: Todos los sábados de 10:00 AM a 12:00 PM
  if (diaSemana === 6 && horaMin >= HORA_10_00 && horaMin < HORA_12_00) {
    return {
      bloqueada: true,
      titulo: 'Sala no disponible',
      mensaje: 'La Sala de Juntas Unidad de Duelo <strong>no está disponible los sábados de 10:00 AM a 12:00 PM</strong>.<br><br>Por favor intenta en otro horario.'
    };
  }

  // Regla 3: Último jueves del mes de 1:00 PM a 5:00 PM
  if (diaSemana === 4 && horaMin >= HORA_13_00 && horaMin < HORA_17_00) {
    const ultimoJueves = getUltimoJuevesDelMes(ahora.getFullYear(), ahora.getMonth());
    const esUltimoJueves =
      ahora.getDate()     === ultimoJueves.getDate()  &&
      ahora.getMonth()    === ultimoJueves.getMonth() &&
      ahora.getFullYear() === ultimoJueves.getFullYear();

    if (esUltimoJueves) {
      return {
        bloqueada: true,
        titulo: 'Sala no disponible',
        mensaje: 'La Sala de Juntas Unidad de Duelo <strong>no está disponible el último jueves del mes de 1:00 PM a 5:00 PM</strong>.<br><br>Por favor intenta en otro horario.'
      };
    }
  }

  return { bloqueada: false };
}

// ─── Click en cards ────────────────────────────────────────────────────────
document.querySelectorAll('.sala-card').forEach(card => {
  card.addEventListener('click', () => {
    const salaId     = card.dataset.salaId;
    const salaNombre = card.dataset.salaNombre;

    // Verificar restricción solo para Sala Unidad de Duelo (id = 3)
    if (salaId === '3') {
      const restriccion = verificarRestriccionUnidadDuelo();

      if (restriccion.bloqueada) {
        Swal.fire({
          icon: 'warning',
          title: restriccion.titulo,
          html: restriccion.mensaje,
          confirmButtonColor: '#6c757d',
          confirmButtonText: 'Entendido'
        });
        return; // No navegar
      }
    }

    sessionStorage.setItem('salaId', salaId);
    sessionStorage.setItem('salaNombre', salaNombre);
    window.location.href = '/agenda';
  });
});