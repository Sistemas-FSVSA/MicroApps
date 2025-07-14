document.addEventListener("DOMContentLoaded", function () {
  inicializarNominaRecaudo();
});


function inicializarNominaRecaudo() {
  obtenerRecaudadores()
  cargarFechaModal()
  obtenerTramites();
  obtenerGestiones()
}

function cargarFechaModal() {
  var fechaInput = document.getElementById('fechaHora');
  if (fechaInput) {
    var today = new Date();
    var yyyy = today.getFullYear();
    var mm = String(today.getMonth() + 1).padStart(2, '0');
    var dd = String(today.getDate()).padStart(2, '0');
    fechaInput.value = yyyy + '-' + mm + '-' + dd;
  }
}

async function obtenerRecaudadores() {
  try {
    const respuesta = await fetch(`${url}/api/recaudo/obtenerRecaudadores`);
    if (!respuesta.ok) throw new Error("Error al obtener recaudadores");
    const recaudadores = await respuesta.json();

    // Ordenar los recaudadores alfabéticamente por nombre
    recaudadores.sort((a, b) => a.nombre.localeCompare(b.nombre));

    const selectRecaudadores = document.getElementById("recaudador");
    if (selectRecaudadores) {
      // Opción por defecto "SELECCIONAR" obligatoria
      selectRecaudadores.innerHTML = `<option value="" selected disabled>Seleccionar</option>`;
      recaudadores.forEach((recaudador) => {
        const option = document.createElement("option");
        option.value = recaudador.idrecaudador;
        option.textContent = recaudador.nombre;
        option.setAttribute("data-cedula", recaudador.cedula);

        // Si la cédula está vacía, nula o sin info, deshabilitar la opción
        if (
          recaudador.cedula === null ||
          recaudador.cedula === undefined ||
          recaudador.cedula.trim() === ""
        ) {
          option.disabled = true;
          option.textContent += " (Sin cédula)";
        }

        selectRecaudadores.appendChild(option);
      });
    }
  } catch (error) {
    console.error("Error al cargar los recaudadores:", error);
    alert("Error al cargar los recaudadores. Intente de nuevo.");
  }
}

async function obtenerTramites() {
  try {
    const respuesta = await fetch(`${url}/api/recaudo/obtenerTramites`);
    if (!respuesta.ok) throw new Error("Error al obtener los tramites");
    const tramites = await respuesta.json();

    // Ordenar los recaudadores alfabéticamente por nombre
    tramites.sort((a, b) => a.nombre.localeCompare(b.nombre));

    const selectTramites = document.getElementById("tipoTramite");
    if (selectTramites) {
      // Opción por defecto "SELECCIONAR" obligatoria
      selectTramites.innerHTML = `<option value="" selected disabled>Seleccionar</option>`;
      tramites.forEach((tramite) => {
        const option = document.createElement("option");
        option.value = tramite.idtramite;
        option.textContent = tramite.nombre;
        selectTramites.appendChild(option);
      });
    }
  } catch (error) {
    console.error("Error al cargar los tramites:", error);
    alert("Error al cargar los tramites. Intente de nuevo.");
  }
}

function registrarGestion() {
  // Obtener el recaudador seleccionado
  const selectRecaudador = document.getElementById("recaudador");
  const recaudadorOption = selectRecaudador.options[selectRecaudador.selectedIndex];
  const idrecaudador = recaudadorOption.value;
  const cedula = recaudadorOption.getAttribute("data-cedula");
  const nombre = recaudadorOption.textContent;

  // Obtener el tipo de trámite seleccionado
  const selectTramite = document.getElementById("tipoTramite");
  const idtramite = selectTramite.value;

  // Obtener la fecha seleccionada
  const fechaInput = document.getElementById("fechaHora");
  const fecha = fechaInput.value;

  // Obtener el idusuario del localStorage
  const idusuario = localStorage.getItem("idusuario");

  const data = {
    cedula: cedula,
    idrecaudador: idrecaudador,
    idtramite: idtramite,
    fecha: fecha,
    nombre: nombre,
    idusuario: idusuario
  };

  fetch(`${url}/api/recaudo/guardarTramite`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data),
    credentials: "include"
  })
    .then(res => {
      if (res.ok) {
        Mensaje('success', 'Exito!', 'Gestion registrada exitosamente.', true, false);
        // Resetear los campos del modal
        selectRecaudador.selectedIndex = 0;
        selectTramite.selectedIndex = 0;
        cargarFechaModal();
        obtenerGestiones();
      } else {
        console.error("Error al registrar trámite.");
      }
    })
    .catch(err => {
      console.error("Error en la petición:", err);
    });
}

let gestionesData = []; // Variable global para mantener los datos

function obtenerGestiones() {
  fetch(`${url}/api/recaudo/obtenerGestiones`, {
    method: "GET",
    credentials: "include"
  })
    .then(res => res.json())
    .then(data => {
      gestionesData = data; // Guardamos los datos globalmente
      renderizarGestionesTabla(); // Llamamos la función de renderizado
    })
    .catch(err => {
      console.error("Error al obtener las gestiones:", err);
    });
}

function renderizarGestionesTabla() {
  const tablaId = '#gestiones';

  // Ordenar por ID descendente
  const gestionesOrdenadas = [...gestionesData].sort((a, b) => b.idplanillatramite - a.idplanillatramite);

  if ($.fn.DataTable.isDataTable(tablaId)) {
    const tabla = $(tablaId).DataTable();
    tabla.clear();

    gestionesOrdenadas.forEach((gestion) => {
      const esActiva = !!gestion.estado; // Asegura booleano
      const estadoTexto = esActiva ? "Activo" : "Anulado";

      const accionHtml = esActiva
        ? `<button class="btn btn-fsvsaoff" onclick="borrarGestion(${gestion.idplanillatramite})"><i class="fa fa-trash mr-1"></i>Eliminar</button>`
        : `<button class="btn btn-fsvsaon" title="Trámite anulado" onclick="mostrarInfoAnulacion('${gestion.motivo}', '${gestion.usuarioAnulo}')"><i class="fa fa-bell mr-1"></i>Información</button>`;

      tabla.row.add([
        gestion.idplanillatramite || "",
        gestion.nombre || "Sin nombre",
        gestion.cedula || "Sin cédula",
        formatFecha(gestion.fecha),
        gestion.nombreTramite || "Sin gestión",
        estadoTexto,
        accionHtml
      ]);
    });

    tabla.draw();
  } else {
    $(tablaId).DataTable({
      data: gestionesOrdenadas.map(gestion => {
        const esActiva = !!gestion.estado;
        const estadoTexto = esActiva ? "Activo" : "Anulado";
        const accionHtml = esActiva
          ? `<button class="btn btn-fsvsaoff" onclick="borrarGestion(${gestion.idplanillatramite})"><i class="fa fa-trash mr-1"></i>Eliminar</button>`
          : `<button class="btn btn-fsvsaon" title="Trámite anulado" onclick="mostrarInfoAnulacion('${gestion.motivo}', '${gestion.usuarioAnulo}')"><i class="fa fa-bell mr-1"></i>Información</button>`;

        return [
          gestion.idplanillatramite || "",
          gestion.nombre || "Sin nombre",
          gestion.cedula || "Sin cédula",
          formatFecha(gestion.fecha),
          gestion.nombreTramite || "Sin gestión",
          estadoTexto,
          accionHtml
        ];
      }),
      columns: [
        { title: "ID" },
        { title: "Nombre" },
        { title: "Cédula" },
        { title: "Fecha" },
        { title: "Gestión" },
        { title: "Estado" },
        { title: "Acción", orderable: false }
      ],
      order: [[0, 'desc']],
      language: {
        url: 'https://cdn.datatables.net/plug-ins/1.13.4/i18n/es-MX.json'
      },
      responsive: true
    });
  }
}

function mostrarInfoAnulacion(motivo, usuario) {
  Swal.fire({
    icon: 'info',
    title: 'Información de Anulación',
    html: `
      <p><strong>Motivo:</strong> ${motivo}</p>
      <p><strong>Anulado por:</strong> ${usuario}</p>
    `,
    confirmButtonText: 'Cerrar',
    customClass: {
      confirmButton: 'swal-confirm-button'
    }
  });
}

async function borrarGestion(idplanillatramite) {
  const confirmar = await Mensaje(
    'warning',
    '¿Está seguro de anular esta gestión?',
    'Esta acción no se puede deshacer.',
    false,
    true
  );

  if (confirmar) {
    const { value: motivo } = await Swal.fire({
      title: 'Motivo de anulación',
      input: 'text',
      inputLabel: 'Por favor ingrese el motivo',
      inputPlaceholder: 'Ej: Error en los datos',
      inputValidator: (value) => {
        if (!value) {
          return 'Debe ingresar un motivo de anulación.';
        }
      },
      showCancelButton: true,
      confirmButtonText: 'Anular',
      cancelButtonText: 'Cancelar',
      customClass: {
        confirmButton: 'swal-confirm-button',
        cancelButton: 'swal-cancel-button'
      }
    });

    if (motivo) {
      // Obtener el idusuario desde localStorage
      const idusuario = localStorage.getItem('idusuario');

      if (!idusuario) {
        Mensaje('error', 'Error', 'No se encontró el ID del usuario en localStorage.', false, false);
        return;
      }

      // Enviar al backend
      fetch(`${url}/api/recaudo/anularTramite`, {
        method: "POST", // <-- CAMBIADO a POST
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          idplanillatramite,
          motivo,
          idusuario: parseInt(idusuario)
        })
      })
        .then(res => {
          if (res.ok) {
            Mensaje('success', 'Éxito', 'Gestión anulada exitosamente.', true, false);
            obtenerGestiones();
          } else {
            Mensaje('error', 'Error', 'No se pudo anular la gestión.', false, false);
          }
        })
        .catch(err => {
          console.error("Error al anular la gestión:", err);
          Mensaje('error', 'Error', 'Error de conexión con el servidor.', false, false);
        });
    }
  }
}

function generarNomina() {
  // Capturar las fechas desde y hasta del modal
  const fechaDesdeInput = document.getElementById('fechaDesde');
  const fechaHastaInput = document.getElementById('fechaHasta');
  const fechaDesde = fechaDesdeInput ? fechaDesdeInput.value : '';
  const fechaHasta = fechaHastaInput ? fechaHastaInput.value : '';

  // Validar que ambas fechas sean obligatorias
  if (!fechaDesde || !fechaHasta) {
    Mensaje('error', 'Campos obligatorios', 'Debe ingresar ambas fechas (Desde y Hasta).', false, false);
    return;
  }

  // Enviar fechas al backend para generar la nómina
  fetch(`${url}/api/recaudo/generarNomina`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify({
      fechaDesde,
      fechaHasta
    })
  })
    .then(res => res.json())
    .then(data => {
      // Procesar la respuesta del backend
      console.log('Respuesta de generarNomina:', data);
      Mensaje('success', 'Éxito', 'Nómina generada correctamente.', true, false);
      // Aquí puedes agregar lógica adicional si lo necesitas
    })
    .catch(err => {
      console.error("Error al generar la nómina:", err);
      Mensaje('error', 'Error', 'No se pudo generar la nómina.', false, false);
    });

  // Aquí puedes continuar con la lógica para generar la nómina
}


