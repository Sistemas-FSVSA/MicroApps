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

  // Ordenar gestionesData por idplanillatramite de manera descendente
  const gestionesOrdenadas = [...gestionesData].sort((a, b) => b.idplanillatramite - a.idplanillatramite);

  // Si la tabla ya fue inicializada, limpiamos y actualizamos
  if ($.fn.DataTable.isDataTable(tablaId)) {
    const tabla = $(tablaId).DataTable();
    tabla.clear();

    gestionesOrdenadas.forEach((gestion) => {
      tabla.row.add([
        gestion.idplanillatramite || "",
        gestion.nombre || "Sin nombre",
        gestion.cedula || "Sin cédula",
        formatFecha(gestion.fecha),
        gestion.nombreTramite || "Sin gestión",
        `<button class="btn btn-danger btn-sm" onclick="borrarGestion(${gestion.idplanillatramite})">Borrar</button>`
      ]);
    });

    tabla.draw();
  } else {
    // Si no está inicializada, la creamos con la data
    $(tablaId).DataTable({
      data: gestionesOrdenadas.map(gestion => [
        gestion.idplanillatramite || "",
        gestion.nombre || "Sin nombre",
        gestion.cedula || "Sin cédula",
        formatFecha(gestion.fecha),
        gestion.nombreTramite || "Sin gestión",
        `<button class="btn btn-danger btn-sm" onclick="borrarGestion(${gestion.idplanillatramite})">Borrar</button>`
      ]),
      columns: [
        { title: "ID" },
        { title: "Nombre" },
        { title: "Cédula" },
        { title: "Fecha" },
        { title: "Gestión" },
        { title: "Acción", orderable: false }
      ],
      order: [[0, 'desc']], // Ordenar por la primera columna (ID) descendente
      language: {
        url: 'https://cdn.datatables.net/plug-ins/1.13.4/i18n/es-MX.json'
      },
      responsive: true
    });
  }
}

// Ejemplo de función para borrar (debes implementarla acorde a tu backend)
function borrarGestion(idplanillatramite) {
  if (confirm("¿Está seguro de borrar esta gestión?")) {
    fetch(`${url}/api/recaudo/borrarGestion/${idplanillatramite}`, {
      method: "DELETE",
      credentials: "include"
    })
      .then(res => {
        if (res.ok) {
          Mensaje('success', 'Exito!', 'Gestión borrada exitosamente.', true, false);
          obtenerGestiones();
        } else {
          alert("Error al borrar la gestión.");
        }
      })
      .catch(err => {
        console.error("Error al borrar la gestión:", err);
      });
  }
}

