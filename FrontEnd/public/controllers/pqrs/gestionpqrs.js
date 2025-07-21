document.addEventListener("DOMContentLoaded", () => {
    inicializarGestionPQRS();
});

// Función para obtener parámetros de la URL
function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        idpqrs: params.get("idpqrs"),
    };
}

async function inicializarGestionPQRS() {
    fetchPQRSData(); // Obtener datos PQRS antes de cargar selects
    fetchPQRSExtra();



    const tabAnotaciones = document.getElementById("tabAnotaciones");
    const tabDocumentos = document.getElementById("tabDocumentos");
    const contAnotaciones = document.getElementById("contenedorAnotaciones");
    const contDocumentos = document.getElementById("contenedorDocumentos");

    // Mostrar inicialmente el contenedor de anotaciones
    contAnotaciones.style.display = "flex";
    contDocumentos.style.display = "none";

    tabAnotaciones.addEventListener("click", function (event) {
        event.preventDefault();
        contAnotaciones.style.display = "flex";
        contDocumentos.style.display = "none";
        tabAnotaciones.classList.add("active");
        tabDocumentos.classList.remove("active");
    });

    tabDocumentos.addEventListener("click", function (event) {
        event.preventDefault();
        contAnotaciones.style.display = "none";
        contDocumentos.style.display = "flex";
        tabAnotaciones.classList.remove("active");
        tabDocumentos.classList.add("active");
    });


    // Agregar evento al botón
    document.getElementById("guardarAnotacion").addEventListener("click", guardarAnotacion);
    document.getElementById("guardarAdjuntos").addEventListener("click", guardarAdjuntosData);

    document.getElementById("btnGuardar").addEventListener("click", function () {
        enviarDatosPQRS("EN_PROGRESO");
    });

    document.getElementById("btnAbrir").addEventListener("click", async function () {
        const confirmacion = await Mensaje("warning", "¿Estas seguro?", "¿Está seguro de Abrir esta PQRS?", false, true);
        if (confirmacion) {
            actualizarEstadoPQRS("EN_PROGRESO");
        }
    });

    document.getElementById("btnFinalizar").addEventListener("click", async function () {
        const confirmacion = await Mensaje("warning", "¿Estas seguro?", "¿Está seguro de finalizar esta PQRS?", false, true);
        if (confirmacion) {
            enviarDatosPQRS("FINALIZADO");
        }
    });

    document.getElementById("informacion").addEventListener("click", async function () {
        const data = await fetchPQRSData(); // Llamar la función que obtiene los datos

        if (data && data.pqrs) {
            const usuarioCerro = data.pqrs.usuario_cerro_nombre || "No disponible";
            const fechaCierre = data.pqrs.fechacierre ? new Date(data.pqrs.fechacierre).toLocaleString() : "No disponible";

            Swal.fire({
                icon: "info",
                title: "Información de Cierre",
                html: `<b>Usuario que cerró:</b> ${usuarioCerro} <br> <b>Fecha de cierre:</b> ${fechaCierre}`,
                confirmButtonText: "Aceptar",
                customClass: {
                    confirmButton: 'swal-confirm-button', // Clase para el botón Aceptar
                    cancelButton: 'swal-cancel-button' // Clase para el botón Cancelar
                }
            });
        } else {
            Swal.fire({
                icon: "warning",
                title: "Sin datos",
                text: "Aun no se ha cerrado la gestion.",
                confirmButtonText: "Aceptar",
                customClass: {
                    confirmButton: 'swal-confirm-button', // Clase para el botón Aceptar
                    cancelButton: 'swal-cancel-button' // Clase para el botón Cancelar
                }
            });
        }
    });

    document.getElementById('fuente').addEventListener('change', function () {
        const idFuente = this.value; // Capturar el id de la fuente seleccionada

        if (!idFuente) {
            // Si no hay selección válida, limpiar el select de subfuentes
            document.getElementById('detallefuente').innerHTML = '<option value="">Seleccionar</option>';
            return;
        }

        // Llamada al backend para obtener los subfuentes de la fuente seleccionada
        fetch(`${url}/api/pqrs/obtenerSubfuentes/${idFuente}`, {
            credentials: 'include'
        })
            .then(response => response.json())
            .then(data => {
                // Filtrar solo los activos
                const subfuentes = data.subfuentes
                    .filter(item => item.estado === true)
                    .sort((a, b) => a.nombre.localeCompare(b.nombre));

                const selectDetalle = document.getElementById('detallefuente');
                selectDetalle.innerHTML = ''; // Limpiar opciones previas

                // Opción por defecto
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = 'Seleccionar';
                selectDetalle.appendChild(defaultOption);

                // Agregar opciones dinámicas
                subfuentes.forEach(subfuente => {
                    const option = document.createElement('option');
                    option.value = subfuente.idsubfuente; // Suponiendo que "idsubfuente" es el ID
                    option.textContent = subfuente.nombre;
                    selectDetalle.appendChild(option);
                });
            })
            .catch(error => console.error(`Error al obtener los subfuentes:`, error));
    });

}

async function actualizarEstadoPQRS(estado) {
    const { idpqrs } = getQueryParams();
    const idusuario = JSON.parse(localStorage.getItem("idusuario"));

    if (!idpqrs || !idusuario || !estado) {
        Mensaje("error", "Error", "Faltan datos para actualizar el estado.", true, false);
        return;
    }

    const dataPQRS = {
        idpqrs,
        estado,
        idusuario,
    };

    try {
        const response = await fetch(`${url}/api/pqrs/actualizarEstadoPQRS`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify(dataPQRS)
        });

        if (!response.ok) {
            throw new Error("Error al actualizar el PQRS");
        }

        // Actualizar la URL sin recargar la página
        const newUrl = `${window.location.pathname}?idpqrs=${idpqrs}`;
        history.replaceState(null, "", newUrl);

        // Llamar nuevamente a las funciones de carga de datos
        await fetchPQRSData();
        await fetchPQRSExtra();
        await cargarPermisosGestionPQRS();

        Mensaje("success", "Éxito", "Gestión actualizada exitosamente.", true, false);

    } catch (error) {
        console.error("Error al actualizar PQRS:", error);
        Mensaje("error", "Error", "No fue posible guardar la gestión.", true, false);
    }
}

// Función para obtener datos del PQRS desde el backend
async function fetchPQRSData() {
    const { idpqrs } = getQueryParams();

    try {
        const response = await fetch(`${url}/api/pqrs/obtenerPQRS`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ idpqrs })
        });

        const data = await response.json();

        fetchOptions(`${url}/api/pqrs/obtenerProcesos`, 'proceso', 'data', 'idtipoproceso', data?.gestionpqrs?.idtipoproceso);
        fetchOptions(`${url}/api/pqrs/obtenerFuentes`, 'fuente', 'data', 'idfuentepqrs', data?.gestionpqrs?.idfuentepqrs);
        fetchOptions(`${url}/api/pqrs/obtenerPlanes`, 'plan', 'data', 'idtipoplan', data?.pqrs?.idtipoplan);
        fetchOptions(`${url}/api/pqrs/obtenerTiposPQRS`, 'tipopqrs', 'data', 'idtipopqrs', data?.pqrs?.idtipopqrs);

        renderizarFormulario(data);
        renderizarGestion(data);
        cargarPermisosGestionPQRS(data);
        return data; // Devolver datos para usarlos en la carga de selects

    } catch (error) {
        console.error("Error al obtener los datos del PQRS:", error);
        return null;
    }
}

async function fetchPQRSExtra() {
    const { idpqrs } = getQueryParams();

    try {
        const [anotacionesResponse, adjuntosResponse] = await Promise.all([
            fetch(`${url}/api/pqrs/obtenerAnotaciones`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ idpqrs })
            }),
            fetch(`${url}/api/pqrs/obtenerAdjuntos`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ idpqrs })
            })
        ]);

        const anotacionesData = await anotacionesResponse.json();
        const adjuntosData = await adjuntosResponse.json();

        renderizarAnotaciones(anotacionesData);
        renderizarAdjuntos(adjuntosData);

        return { anotaciones: anotacionesData, adjuntos: adjuntosData };
    } catch (error) {
        console.error("Error al obtener las anotaciones o adjuntos del PQRS:", error);
        return null;
    }
}

function renderizarAdjuntos(data) {
    const contenedorAdjuntos = document.querySelector(".docs-content");
    contenedorAdjuntos.innerHTML = ""; // Limpiar contenido previo

    if (!data || !data.adjuntos || data.adjuntos.length === 0) {
        contenedorAdjuntos.innerHTML = "<div class='text-muted'>No hay documentos adjuntos.</div>";
        return;
    }

    data.adjuntos.forEach(adjunto => {
        const card = document.createElement("div");
        card.classList.add("card", "p-2", "mb-2", "d-flex", "justify-content-between", "align-items-center");

        // Aplicar la función formatFechaHora
        const fechaFormateada = formatFechaHora(adjunto.fecha);

        // Construcción del contenido del adjunto
        card.innerHTML = `
        <div><strong>${adjunto.nombre}</strong></div> 
        <div class="d-flex justify-content-between align-items-center w-100">
            <div class="text-right text-muted" style="font-size: 0.85rem;">${fechaFormateada}</div>
            <a href="${url}/${adjunto.url.replace(/\\/g, '/')}" target="_blank" rel="noopener noreferrer">
                <button class="btn btn-fsvsaon btn-sm">
                    <i class="fas fa-eye"></i>
                </button>
            </a>
        </div>
    `;

        contenedorAdjuntos.appendChild(card);
    });
}

// Función para renderizar las anotaciones en el contenedor correspondiente
function renderizarAnotaciones(data) {
    const contenedorAnotaciones = document.querySelector(".notes-content");
    contenedorAnotaciones.innerHTML = ""; // Limpiar contenido previo

    if (!data || !data.anotaciones || data.anotaciones.length === 0) {
        contenedorAnotaciones.innerHTML = "<div class='text-muted'>No hay anotaciones registradas.</div>";
        return;
    }

    data.anotaciones.forEach(anotacion => {
        const card = document.createElement("div");
        card.classList.add("card", "p-2", "mb-2");

        // Aplicar la función formatFechaHora
        const fechaFormateada = formatFechaHora(anotacion.fecha);

        // Construcción del contenido de la anotación
        card.innerHTML = `
            <div><strong>${anotacion.usuario}</strong></div> 
            <div>${anotacion.anotacion}</div>
            <div class="text-right text-muted" style="font-size: 0.85rem;">${fechaFormateada}</div>
        `;

        contenedorAnotaciones.appendChild(card);
    });
}

// Función para llenar el formulario con los datos obtenidos
function renderizarFormulario(data) {
    const pqrs = data.pqrs;

    document.getElementById("title").innerText = `Gestión PQRS # ${pqrs.idpqrs}`;
    document.getElementById("fechaQueja").innerText = pqrs.fechapqrs
        ? new Date(pqrs.fechapqrs).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" })
        : "Sin fecha";

    document.getElementById("titular").value = pqrs.titular || "";
    document.getElementById("cc").value = pqrs.cc || "";
    document.getElementById("direccion").value = pqrs.direccion || "";
    document.getElementById("telefono").value = pqrs.telefono || "";
    document.getElementById("afiliado").value = pqrs.afiliado ? "true" : "false";
    document.getElementById("contrato").value = pqrs.contrato || "";
    document.getElementById("plan").value =
        pqrs.afiliado && !pqrs.nombre_plan ? "Otros" : pqrs.nombre_plan || "";

    document.getElementById("numeroServicio").value = pqrs.servicio || "";
    document.getElementById("nombreFallecido").value = pqrs.fallecido || "";
    document.getElementById("fechaFallecimiento").value = pqrs.fechafallecimiento ? pqrs.fechafallecimiento.split("T")[0] : "";
    document.getElementById("reclamo").value = pqrs.detalle || "";
}

// Función para llenar el formulario con los datos obtenidos
async function renderizarGestion(data) {
    const gestionpqrs = data.gestionpqrs || {}; // Si es null, asignar un objeto vacío

    document.getElementById("responsable").value = gestionpqrs.responsable || "";
    document.getElementById("descripcion").value = gestionpqrs.especifico || "";
    document.getElementById("correccionImplementada").value = gestionpqrs.correccion || "";

    // Validar si los valores de pertinencia y eficaz coinciden con las opciones
    const pertinenciaSelect = document.getElementById("pertinencia");
    const eficazSelect = document.getElementById("eficaz");

    pertinenciaSelect.value = (gestionpqrs.pertinencia === "Sí" || gestionpqrs.pertinencia === "No")
        ? gestionpqrs.pertinencia
        : "";

    eficazSelect.value = (gestionpqrs.eficaz === "Sí" || gestionpqrs.eficaz === "No")
        ? gestionpqrs.eficaz
        : "";

    document.getElementById("fechaServicio").value = gestionpqrs.fechaservicio
        ? gestionpqrs.fechaservicio.split("T")[0]
        : "";

    // Obtener fuente y detallefuente
    const fuenteSelect = document.getElementById("fuente");
    const detallefuenteSelect = document.getElementById("detallefuente");

    if (gestionpqrs.idfuentepqrs) {
        fuenteSelect.value = gestionpqrs.idfuentepqrs;

        // Cargar subfuentes automáticamente y seleccionar la preexistente
        await fetchSubfuentes(gestionpqrs.idfuentepqrs, gestionpqrs.idsubfuente);
    }
}

// Función para obtener subfuentes automáticamente
async function fetchSubfuentes(idFuente, idSubfuenteSeleccionado) {
    if (!idFuente) return;

    try {
        const response = await fetch(`${url}/api/pqrs/obtenerSubfuentes/${idFuente}`, {
            credentials: 'include'
        });

        if (!response.ok) throw new Error(`Error en la petición: ${response.status} ${response.statusText}`);

        const data = await response.json();

        const subfuentes = data.subfuentes
            .filter(item => item.estado === true)
            .sort((a, b) => a.nombre.localeCompare(b.nombre));

        const selectDetalle = document.getElementById('detallefuente');
        selectDetalle.innerHTML = ''; // Limpiar opciones previas

        // Opción por defecto
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Seleccionar';
        selectDetalle.appendChild(defaultOption);

        // Agregar opciones dinámicas
        subfuentes.forEach(subfuente => {
            const option = document.createElement('option');
            option.value = subfuente.idsubfuente;
            option.textContent = subfuente.nombre;
            if (idSubfuenteSeleccionado && idSubfuenteSeleccionado == subfuente.idsubfuente) {
                option.selected = true; // Seleccionar la subfuente guardada
            }
            selectDetalle.appendChild(option);
        });

    } catch (error) {
        console.error(`Error al obtener los subfuentes:`, error);
    }
}

// Función para obtener opciones y seleccionar la preexistente
async function fetchOptions(url, selectId, keyName, idKey, selectedValue) {
    try {
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include' // Incluir cookies y autenticación de sesión
        });

        if (!response.ok) {
            throw new Error(`Error en la petición: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        const options = data[keyName]
            .filter(item => item.estado === true)
            .sort((a, b) => a.nombre.localeCompare(b.nombre));

        const select = document.getElementById(selectId);
        select.innerHTML = ''; // Limpiar opciones previas

        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Seleccionar';
        select.appendChild(defaultOption);

        options.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option[idKey];
            opt.textContent = option.nombre;
            if (selectedValue && selectedValue === option[idKey]) {
                opt.selected = true; // Seleccionar el valor preexistente
            }
            select.appendChild(opt);
        });

    } catch (error) {
        console.error(`Error al obtener las opciones para ${selectId}:`, error);
    }
}

function guardarAdjuntosData() {
    const { idpqrs } = getQueryParams();
    const idusuario = localStorage.getItem("idusuario");
    const inputAdjuntos = document.getElementById("inputAdjuntos");
    const archivos = inputAdjuntos.files;

    if (archivos.length === 0) {
        Mensaje('warning', 'Sin adjuntos', 'Por favor, selecciona al menos un archivo.', false, false);
        return;
    }

    // 🔹 VALIDACIÓN DE TAMAÑO MÁXIMO (10GB)
    const MAX_SIZE = 10 * 1024 * 1024 * 1024; // 10GB en bytes
    let totalSize = 0;

    for (let i = 0; i < archivos.length; i++) {
        totalSize += archivos[i].size;
    }

    if (totalSize > MAX_SIZE) {
        Mensaje('warning', 'Los archivos adjuntos superan el tamaño máximo de 10GB.', false, false);
        return;
    }

    // ✅ Si pasa la validación, continuar con la subida
    const formData = new FormData();
    for (let i = 0; i < archivos.length; i++) {
        formData.append("adjuntos[]", archivos[i]);
    }
    formData.append("idusuario", idusuario);
    formData.append("idpqrs", idpqrs);

    showSpinner(); // ✅ Mostrar spinner antes de enviar la solicitud
    document.getElementById("guardarAdjuntos").disabled = true; // 🔒 Bloquear botón de subida

    fetch(`${url}/api/pqrs/guardarAdjuntosPQRS`, {
        method: "POST",
        body: formData,
        credentials: "include",
    })
        .then(response => response.json().then(data => ({ status: response.status, body: data })))
        .then(async ({ status, body }) => {
            if (status === 200) {
                Mensaje('success', "Exito", 'Archivos adjuntos guardados exitosamente.', true, false);
                inputAdjuntos.value = ""; // Limpiar el input
                await fetchPQRSExtra();
            } else {
                Mensaje("error", "Error", `Error al almacenar los adjuntos: ${body.error}`, false, false);
            }
        })
        .catch(error => {
            console.error("Error al subir archivos:", error);
            Mensaje("error", "Error", "Hubo un error al subir los archivos adjuntos.", false, false);
        })
        .finally(() => {
            hideSpinner();
            document.getElementById("guardarAdjuntos").disabled = false; // 🔓 Desbloquear botón
        });
}

async function guardarAnotacion() {
    const textareaAnotacion = document.getElementById("inputSeguimiento");
    const anotacion = textareaAnotacion.value.trim();

    if (anotacion === "") {
        Mensaje("warning", "Sin seguimientos", "Por favor, Ingrese un seguimiento.", false, false);
        return;
    }

    const { idpqrs } = getQueryParams();
    // Obtener nombres y apellidos del localStorage
    const nombres = localStorage.getItem("nombres") || "";
    const apellidos = localStorage.getItem("apellidos") || "";
    const usuario = `${nombres} ${apellidos}`.trim(); // Concatenar nombres y apellidos


    try {
        const response = await fetch(`${url}/api/pqrs/guardarAnotacion`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ anotacion, idpqrs, usuario }), // Enviar datos completos
            credentials: "include",
        });

        if (!response.ok) {
            throw new Error("Error al guardar la anotación");
        }

        Mensaje("success", "Exito", "Seguimiento guardado Exitosamente.", true, false);
        textareaAnotacion.value = ""; // Limpiar el textarea después de guardar
        await fetchPQRSExtra()

    } catch (error) {
        console.error("Error:", error);
        Mensaje("error", "Error", "No fue posible guardar el seguimiento.", false, false);
    }
}

async function enviarDatosPQRS(estado) {
    const { idpqrs } = getQueryParams();
    const idusuario = JSON.parse(localStorage.getItem("idusuario"));
    // Capturar datos de los inputs editables y del formulario principal
    const dataPQRS = {
        idpqrs,
        estado,
        idusuario: idusuario,
        // Datos del formulario principal
        titular: document.getElementById("titular").value.trim(),
        cc: document.getElementById("cc").value.trim(),
        direccion: document.getElementById("direccion").value.trim(),
        telefono: document.getElementById("telefono").value.trim(),
        afiliado: document.getElementById("afiliado").value,
        contrato: document.getElementById("contrato").value.trim(),
        plan: document.getElementById("plan").value,
        numeroServicio: document.getElementById("numeroServicio").value.trim(),
        nombreFallecido: document.getElementById("nombreFallecido").value.trim(),
        fechaFallecimiento: document.getElementById("fechaFallecimiento").value,
        detalle: document.getElementById("reclamo").value.trim(),
        // Datos de gestión
        fechaServicio: document.getElementById("fechaServicio").value,
        coordinador: document.getElementById("responsable").value.trim(),
        proceso: document.getElementById("proceso").value,
        tipopqrs: document.getElementById("tipopqrs").value,
        fuente: document.getElementById("fuente").value,
        subfuente: document.getElementById("detallefuente").value,
        descripcion: document.getElementById("descripcion").value.trim(),
        correccionImplementada: document.getElementById("correccionImplementada").value.trim(),
        pertinencia: document.getElementById("pertinencia").value,
        eficaz: document.getElementById("eficaz").value
    };


    try {
        const response = await fetch(`${url}/api/pqrs/guardarGestionPQRS`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify(dataPQRS)
        });

        if (!response.ok) {
            throw new Error("Error al actualizar el PQRS");
        }

        // Actualizar la URL sin recargar la página
        const newUrl = `${window.location.pathname}?idpqrs=${idpqrs}`;
        history.replaceState(null, "", newUrl);

        // Llamar nuevamente a las funciones de carga de datos
        await fetchPQRSData();
        await fetchPQRSExtra();
        await cargarPermisosGestionPQRS();

        Mensaje("success", "Exito", "Gestion guardada Exitosamente.", true, false);

    } catch (error) {
        console.error("Error al actualizar PQRS:", error);
        Mensaje("error", "Error", "No fue posible guardar la gestion.", true, false);
    }
}

