document.addEventListener("DOMContentLoaded", function () {
  inicializarNominaRecaudo();
});


function inicializarNominaRecaudo() {
  obtenerRecaudadores();
  //cargarFechaModal();
  obtenerTramites();
  obtenerGestiones();
  cargarRecaudadoresFaltantes(); // 👈 aquí se llama
}


async function cargarRecaudadoresFaltantes() {
  try {
    const response = await fetch(`${url}/api/recaudo/obtenerFaltaRecaudador`, {
      method: "GET",
      credentials: "include" // 👈 Esto envía cookies de sesión u otras credenciales
    });

    if (!response.ok) throw new Error("Error en la respuesta del servidor");

    const faltantes = await response.json();

    const badge = document.getElementById("badgeFaltantes");
    const lista = document.getElementById("listaRecaudadoresFaltantes");

    // Mostrar cantidad en badge
    if (faltantes.length > 0) {
      badge.textContent = faltantes.length;
      badge.style.display = "inline-block";
    } else {
      badge.style.display = "none";
    }

    // Limpiar lista y renderizar
    lista.innerHTML = "";
    faltantes.forEach((rec, index) => {
      const li = document.createElement("li");
      li.className = "list-group-item";

      const checkboxId = `recaudadorCheck${index}`;

      const label = document.createElement("label");
      label.className = "form-check-label d-flex align-items-center w-100";
      label.setAttribute("for", checkboxId);
      label.style.cursor = "pointer";
      label.style.gap = "0.75rem";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "form-check-input styled-checkbox";
      checkbox.id = checkboxId;

      const span = document.createElement("span");
      span.textContent = rec.nombre;
      span.className = "flex-grow-1";

      label.appendChild(checkbox);
      label.appendChild(span);
      li.appendChild(label);
      lista.appendChild(li);

      // ✅ Escuchar selección y confirmar
      checkbox.addEventListener("change", async (e) => {
        if (e.target.checked) {
          const confirmado = await Mensaje(
            "warning",
            "Confirmar asistencia",
            `¿Estás segura? Esta acción quitará a "${rec.nombre}" de la lista por hoy.`,
            false,
            true
          );

          if (confirmado) {
            confirmarAsistencia(rec.idrecaudador);
            li.remove(); // Eliminar visualmente de la lista
          } else {
            checkbox.checked = false; // Si cancela, desmarca el check
          }
        }
      });
    });




  } catch (error) {
    console.error("Error al cargar recaudadores faltantes:", error);
  }
}

async function confirmarAsistencia(idrecaudador) {
  try {

    // Ejemplo de petición POST (ajústala a tu ruta y backend)
    await fetch(`${url}/api/recaudo/confirmarAsistencia`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ idrecaudador })
    });

    await cargarRecaudadoresFaltantes(); // Recargar lista de faltantes
  } catch (error) {
    console.error("Error al confirmar asistencia:", error);
    await Mensaje("error", "Error", "No se pudo registrar la asistencia.");
  }
}


// function cargarFechaModal() {
//   var fechaInput = document.getElementById('fechaHora');
//   if (fechaInput) {
//     var today = new Date();
//     var yyyy = today.getFullYear();
//     var mm = String(today.getMonth() + 1).padStart(2, '0');
//     var dd = String(today.getDate()).padStart(2, '0');
//     fechaInput.value = yyyy + '-' + mm + '-' + dd;
//   }
// }

async function obtenerRecaudadores() {
  try {
    const respuesta = await fetch(`${url}/api/recaudo/obtenerRecaudadores`);
    if (!respuesta.ok) throw new Error("Error al obtener recaudadores");
    const recaudadores = await respuesta.json();

    // Filtrar solo los recaudadores con estado true
    const recaudadoresActivos = recaudadores.filter((r) => r.estado === true);

    // Ordenar los recaudadores alfabéticamente por nombre
    recaudadoresActivos.sort((a, b) => a.nombre.localeCompare(b.nombre));

    const selectRecaudadores = document.getElementById("recaudador");
    if (selectRecaudadores) {
      // Opción por defecto "SELECCIONAR" obligatoria
      selectRecaudadores.innerHTML = `<option value="" selected disabled>Seleccionar</option>`;
      recaudadoresActivos.forEach((recaudador) => {
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

    // Filtrar solo los trámites con estado true
    const tramitesActivos = tramites.filter((t) => t.estado === true);

    // Ordenar los recaudadores alfabéticamente por nombre
    tramitesActivos.sort((a, b) => a.nombre.localeCompare(b.nombre));

    const selectTramites = document.getElementById("tipoTramite");
    if (selectTramites) {
      // Opción por defecto "SELECCIONAR" obligatoria
      selectTramites.innerHTML = `<option value="" selected disabled>Seleccionar</option>`;
      tramitesActivos.forEach((tramite) => {
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
  const selectRecaudador = document.getElementById("recaudador");
  const recaudadorOption = selectRecaudador.options[selectRecaudador.selectedIndex];
  const idrecaudador = recaudadorOption.value;
  const cedula = recaudadorOption.getAttribute("data-cedula");
  const nombre = recaudadorOption.textContent;
  const cantidad = document.getElementById("cantidad").value;
  const selectTramite = document.getElementById("tipoTramite");
  const idtramite = selectTramite.value;
  const fecha = document.getElementById("fechaHora").value;
  const idusuario = localStorage.getItem("idusuario");

  const data = {
    cedula, idrecaudador, idtramite, fecha, nombre, idusuario, cantidad
  };

  // Validar que cantidad sea un valor numérico y mayor que cero
  if (isNaN(cantidad) || cantidad === "" || Number(cantidad) <= 0) {
    Mensaje('error', 'Cantidad inválida', 'Ingrese una cantidad numérica válida.', false, false);
    return;
  }
  // 👉 Guardar recaudador actualmente seleccionado en el filtro de tabla
  const filtro = document.getElementById("filtroRecaudador");
  const nombreSeleccionado = filtro.value;

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
        Mensaje('success', 'Éxito!', 'Gestión registrada exitosamente.', true, false);
        selectRecaudador.selectedIndex = 0;
        selectTramite.selectedIndex = 0;
        document.getElementById("cantidad").value = ""; // Limpiar input cantidad
        cargarFechaModal();

        //  Llama a obtenerGestiones con la selección previa
        obtenerGestiones(nombreSeleccionado);
        cargarRecaudadoresFaltantes();
      } else {
        console.error("Error al registrar trámite.");
      }
    })
    .catch(err => {
      console.error("Error en la petición:", err);
    });
}

let gestionesData = []; // Variable global para mantener los datos

function obtenerGestiones(nombreSeleccionado = null) {
  fetch(`${url}/api/recaudo/obtenerGestiones`, {
    method: "GET",
    credentials: "include"
  })
    .then(res => res.json())
    .then(data => {
      gestionesData = data;

      const select = document.getElementById("filtroRecaudador");

      // ✅ Reemplazar opciones manteniendo la seleccion previa
      const nombresUnicos = [...new Set(gestionesData.map(g => g.nombre).filter(Boolean))];
      nombresUnicos.sort();

      select.innerHTML = '<option value="">-- Selecciona un recaudador --</option>';
      nombresUnicos.forEach(nombre => {
        const option = document.createElement("option");
        option.value = nombre;
        option.textContent = nombre;
        select.appendChild(option);
      });

      // ✅ Restaurar valor seleccionado si se indicó uno
      if (nombreSeleccionado) {
        select.value = nombreSeleccionado;
      }

      // ✅ Filtrar automáticamente por el valor actual
      filtrarGestionesPorRecaudador();
    })
    .catch(err => {
      console.error("Error al obtener las gestiones:", err);
    });
}

function filtrarGestionesPorRecaudador() {
  const seleccion = document.getElementById("filtroRecaudador").value;
  if (!seleccion) {
    renderizarGestionesTabla([]); // Vacía
    return;
  }

  const filtradas = gestionesData.filter(g => g.nombre === seleccion);
  renderizarGestionesTabla(filtradas);
}

function renderizarGestionesTabla(gestionesParaMostrar = []) {
  const tablaId = '#gestiones';

  // Ordenar por ID descendente
  const gestionesOrdenadas = [...gestionesParaMostrar].sort((a, b) => b.idplanillatramite - a.idplanillatramite);

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
  const fechaDesde = document.getElementById('fechaDesde')?.value || '';
  const fechaHasta = document.getElementById('fechaHasta')?.value || '';

  if (!fechaDesde || !fechaHasta) {
    Mensaje('error', 'Campos obligatorios', 'Debe ingresar ambas fechas.', false, false);
    return;
  }

  showSpinner(); // Mostrar spinner

  fetch(`${url}/api/recaudo/generarNomina`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify({ fechaDesde, fechaHasta })
  })
    .then(res => res.json())
    .then(data => {
      if (!data.resumen || !Array.isArray(data.resumen)) {
        throw new Error("Respuesta inválida del servidor");
      }

      // Generar ambos Excel
      generarExcelResumen(data.resumen);
      generarExcelPlanillas(data.resumen);

      Mensaje('success', 'Éxito', 'Nómina generada correctamente.', true, false);
    })
    .catch(err => {
      console.error("Error al generar la nómina:", err);
      Mensaje('error', 'Error', 'No se pudo generar la nómina.', false, false);
    })
    .finally(() => {
      hideSpinner(); // Ocultar spinner al final
    });
}

function generarExcelResumen(resumen) {
  const encabezados = Object.keys(resumen[0] || {});
  const datos = [encabezados];

  resumen.forEach(vendedor => {
    const fila = encabezados.map(key => vendedor[key]);
    datos.push(fila);
  });

  const ws = XLSX.utils.aoa_to_sheet(datos);

  // Aplicar formato moneda a columnas monetarias
  encabezados.forEach((key, colIndex) => {
    const isMonetario = key.startsWith("Pago") || key.toLowerCase().includes("valor") || key.toLowerCase().includes("monto");

    if (isMonetario) {
      for (let rowIndex = 1; rowIndex < datos.length; rowIndex++) {
        const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
        if (ws[cellRef]) {
          ws[cellRef].t = 'n';
          ws[cellRef].z = '"$"#,##0.00'; // Formato de moneda COP
        }
      }
    }
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "ResumenNomina");

  XLSX.writeFile(wb, `Resumen_Nomina_${new Date().toISOString().split('T')[0]}.xlsx`);
}

function generarExcelPlanillas(resumen) {
  const fechaActual = new Date();

  // ---- Helpers de período y fecha ----
  const year = fechaActual.getFullYear();
  const month = fechaActual.getMonth() + 1; // 1-12
  const day = fechaActual.getDate();        // 1-31

  const periodo = String(month).padStart(2, '0'); // "01".."12"

  // Último día del mes actual (día 0 del mes siguiente)
  const ultimoDiaMes = new Date(year, month, 0).getDate();

  // Regla de quincena para la FECHA
  const diaCorte = day <= 15 ? 15 : ultimoDiaMes;

  // Formato DD/MM/YYYY
  const fechaCorte = `${String(diaCorte).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;

  const datos = [
    [
      'Cédula Empleado',
      'Código Concepto',
      'Código Centro de Costos',
      'Código Concepto Referencia',
      'Horas',
      'Valor',
      'Período',
      'Fecha',
      'Salario',
      'Unidades Producidas',
      'Es Prestación',
      'Número Préstamo',
      'Días mes 1',
      'Días mes 2',
      'Fecha Inicio',
      'Base',
      'Fecha Final Vacación',
    ],
  ];

  resumen.forEach(item => {
    const total =
      (item.PagoMesHumanos || 0) +
      (item.PagoMesMascotas || 0) +
      (item.PagoAnualidadHumanos || 0) +
      (item.PagoAnualidadMascotas || 0) +
      (item.PagoMesSeguro || 0);

    const gestionesPago = Object.entries(item)
      .filter(([k, v]) =>
        k.startsWith("Pago") &&
        typeof v === "number" &&
        !k.includes("PagoMes") &&
        !k.includes("PagoAnualidad") &&
        !k.includes("PagoMesSeguro")
      )
      .reduce((acc, [_, val]) => acc + val, 0);

    const valorFinal = total + gestionesPago;

    datos.push([
      item.Vendedor,   // Cédula Empleado (ajusta si corresponde a otro campo)
      '074',           // Código Concepto
      '018',           // Código Centro de Costos
      '',              // Código Concepto Referencia
      '',              // Horas
      valorFinal,      // Valor
      periodo,         // Período -> "MM"
      fechaCorte,      // Fecha -> "DD/MM/YYYY" (15 o último día del mes)
      '', '', '', '', '', '', '', '', ''
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(datos);

  // Fuerza a que 'Período' y 'Fecha' se queden como texto en Excel (evita interpretaciones)
  // Recorremos columna G (Período, índice 6) y H (Fecha, índice 7) para poner formato texto
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = 1; R <= range.e.r; R++) { // desde la fila 1 (después de encabezados)
    const addrPeriodo = XLSX.utils.encode_cell({ r: R, c: 6 });
    const addrFecha = XLSX.utils.encode_cell({ r: R, c: 7 });
    if (ws[addrPeriodo]) ws[addrPeriodo].t = 's';
    if (ws[addrFecha]) ws[addrFecha].t = 's';
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Planilla");

  // Nombre de archivo con fecha ISO (YYYY-MM-DD)
  const nombre = `Planilla_Nomina_${fechaActual.toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, nombre);
}





