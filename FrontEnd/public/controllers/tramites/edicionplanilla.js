document.addEventListener("DOMContentLoaded", () => {
    InicializarEdicionPlanilla();
});

async function InicializarEdicionPlanilla() {
    const modal = new bootstrap.Modal(document.getElementById('modalTipoTramite'), { keyboard: false });
    habilitarMayusculas();
    mostrarNombreUsuario()
    let tramiteIndex = 0;
    let idplanillaGlobal;
    let usuarios = [];
    let tramites = [];
    let municipios = [];
    let urlAnterior = window.location.href;
    let tramitesFiltrados = { tipo1: [], tipo2: [], tipo3: [], tipo4: [] };
    const params = new URLSearchParams(window.location.search);

    let estadoPlanillaGlobal;

    // Función genérica para obtener parámetros de la URL
    function obtenerParametroDeURL(nombreParametro) {
        const params = new URLSearchParams(window.location.search);
        return params.get(nombreParametro);
    }

    // Obtener parámetros desde la URL
    estadoPlanillaGlobal = obtenerParametroDeURL('estado');
    const idUsuario = obtenerParametroDeURL('idusuario');
    const idplanilla = obtenerParametroDeURL('idplanilla');
    const estadoURL = params.get('estado')
    const nombres = obtenerParametroDeURL('nombres');
    const apellidos = obtenerParametroDeURL('apellidos');
    const nombreCompleto = `${nombres} ${apellidos}`;
    document.getElementById('usuarioNombrePlantilla').textContent = nombreCompleto;

    // Carga los permisos con base en el estado de la planilla
    const permisos = cargarPermisosPlanillas(estadoPlanillaGlobal);

    async function obtenerPlanillasPorUsuario() {
        const idusuario = idUsuario;
        const estado = estadoURL
        try {
            const response = await fetch(`${url}/api/gestionplanilla/obtenerPlanillaUsuario/${idusuario}?estado=${estado}&idplanilla=${idplanilla}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json', },
                credentials: 'include',
            });
            const data = await response.json();
            return data.planillas;
        } catch (error) {
            console.error('Error al obtener las planillas:', error);
            return [];
        }
    }

    async function cargarDatos() {
        buscarDatos()
        usuarios = await buscarDatos('responsable');
        tramites = await buscarDatos('tramite');
        municipios = await buscarDatos('municipios');
        tarifas = await buscarDatos('tarifas');
        tramites.forEach(tramite => {
            const tipoTramite = String(tramite.tipo).trim();
            if (tipoTramite === '1') {
                tramitesFiltrados.tipo1.push(tramite);
            } else if (tipoTramite === '2') {
                tramitesFiltrados.tipo2.push(tramite);
            } else if (tipoTramite === '3') {
                tramitesFiltrados.tipo3.push(tramite);
            } else if (tipoTramite === '4') {
                tramitesFiltrados.tipo4.push(tramite);
            }
        });
    }
    await cargarDatos();

    async function cargarPlanillas() {
        showSpinner();

        try {
            // Llamar a la función que obtiene las planillas
            const planillas = await obtenerPlanillasPorUsuario();

            // Actualizar el título y la fecha
            document.getElementById('title').textContent = `PLÁNILLA N°: ${idplanilla}`;
            document.getElementById('fechaInicio').textContent = `FECHA GENERADA: ${new Date(new Date(planillas[0].fechainicio).setDate(new Date(planillas[0].fechainicio).getDate())).toLocaleDateString('es-ES')}`;

            idplanillaGlobal = planillas[0].idplanilla;

            // Procesar las planillas si se obtienen
            if (planillas.length > 0) {
                planillas.forEach(planilla => {
                    planilla.detalles.forEach(detalle => {
                        let tipoTramite;
                        if (detalle.tipo === 1) {
                            tipoTramite = 'Metropolitano';
                        } else if (detalle.tipo === 2) {
                            tipoTramite = 'Exterior';
                        }
                        agregarTramite(tipoTramite, detalle);
                    });
                });
            } else {
                console.log('No se encontraron planillas para este usuario');
            }
        } catch (error) {
            console.error('Error al cargar las planillas:', error);
        } finally {
            hideSpinner();
        }
    }

    // Llamada a la función
    await cargarPlanillas();

    function filtrarMunicipios(tipo) {
        return municipios.filter(municipio => {
            const tipoMunicipio = municipio.tipo.trim();
            return (tipo === 'Metropolitano' && tipoMunicipio === '1') || (tipo === 'Exterior' && tipoMunicipio === '2');
        });
    }

    document.getElementById("guardarPlanilla").addEventListener("click", function () {
        manejarPlanilla(1, "GUARDADO", "La planilla se ha guardado con éxito.");
    });

    document.getElementById("cerrarPlanilla").addEventListener("click", function () {
        Swal.fire({
            title: '¿Estás seguro?',
            text: 'Una vez cerrada, no podrás modificar la planilla.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Cerrar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#163c64',
            cancelButtonColor: '#96072D'
        }).then((result) => {
            if (result.isConfirmed) {
                manejarPlanilla(2, "CERRADO", "La planilla se ha cerrado con éxito.");
            }
        });
    });

    document.getElementById("editarPlanilla").addEventListener("click", function () {
        Swal.fire({
            title: '¿Estás seguro?',
            text: 'Esta accion cambiara los valores de la planilla.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Editar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#163c64',
            cancelButtonColor: '#96072D'
        }).then((result) => {
            if (result.isConfirmed) {
                manejarPlanilla(3, "CERRADO", "La planilla se ha editado con éxito.");
            }
        });
    });

    function manejarPlanilla(accion, estado, mensajeExito) {
        let planillaData = [];
        let validacionExitosa = true;
        const idtramitador = localStorage.getItem('idusuario');
        const idplanilla = idplanillaGlobal;

        // Determinar URL de redirección según el número recibido
        let redireccionUrl;
        if (accion === 1) {
            redireccionUrl = window.location.href; // Mantiene la misma página
        } else if (accion === 2) {
            redireccionUrl = "/tramites/planilla/"; // Redirige a /tramites/planilla/
        } else if (accion === 3) {
            redireccionUrl = null; // Redirige a /tramites/planillaspendientes/
        }

        // Validar si hay trámites antes de continuar
        const tramitesExistentes = document.querySelectorAll('.card');
        if (tramitesExistentes.length === 0) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No hay trámites para guardar.',
                confirmButtonText: 'Aceptar',
                confirmButtonColor: '#163c64'
            }).then(() => {
                cargarPlanillas();
            });
            return;
        }

        tramitesExistentes.forEach(card => {
            const responsable = card.querySelector('.form-tramite .responsable');
            const tramite = card.querySelector('.form-tramite .tramite');
            const referencia = card.querySelector('.form-tramite input[placeholder="Referencia"]');
            const municipio = card.querySelector('.form-tramite .municipio');
            const observacion = card.querySelector('.form-tramite .observacion');
            const tipo = card.querySelector('.card-header strong').innerText.trim();

            [responsable, tramite, referencia, municipio, observacion].forEach(input => input.classList.remove('input-error'));

            if (!responsable.value || !tramite.value || !referencia.value || !municipio.value || !observacion.value) {
                validacionExitosa = false;
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Por favor, completa todos los campos obligatorios en cada trámite.',
                    confirmButtonText: 'Aceptar',
                    confirmButtonColor: '#163c64'
                });

                [responsable, tramite, referencia, municipio, observacion].forEach(input => {
                    if (!input.value) {
                        input.classList.add('input-error');
                    }
                });
                return;
            }

            let tramiteData = {
                tipo,
                responsable: responsable.value,
                tramite: tramite.value,
                referencia: referencia.value,
                municipio: municipio.value,
                observacion: observacion.value,
                idtramitador,
                estado,
                subtramites: []
            };

            card.querySelectorAll('.form-subtramite').forEach(subtramite => {
                const idmunicipio = subtramite.querySelector('.sub-municipio');
                const descripcion = subtramite.querySelector('input[placeholder="Descripción"]');

                [idmunicipio, descripcion].forEach(input => input.classList.remove('input-error'));

                if (!idmunicipio.value || !descripcion.value) {
                    validacionExitosa = false;
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Por favor, completa todos los campos de los subtrámites.',
                        confirmButtonText: 'Aceptar',
                        confirmButtonColor: '#163c64'
                    });

                    [idmunicipio, descripcion].forEach(input => {
                        if (!input.value) {
                            input.classList.add('input-error');
                        }
                    });
                    return;
                }

                tramiteData.subtramites.push({
                    idmunicipio: idmunicipio.value,
                    descripcion: descripcion.value
                });
            });

            planillaData.push(tramiteData);
        });

        if (validacionExitosa) {
            enviarPlanillaData(idplanilla, planillaData, redireccionUrl, mensajeExito);
        }
    }

    function crearSubtramiteHTML(municipioSeleccionado, tipoTramite, descripcion = '') {
        const municipiosFiltrados = filtrarMunicipios(tipoTramite);

        return `
            <form class="form-subtramite mb-2">
                <div class="form-row">
                    <div class="col-md-2">
                        <select class="form-control sub-municipio" ${permisos.tienePermisoMunicipioTramite ? '' : 'disabled'}>
                            <option value="" disabled ${!municipioSeleccionado ? 'selected' : ''}>Seleccione Municipio</option>
                            ${municipiosFiltrados.map(municipio => `
                                <option value="${municipio.idmunicipio}" ${String(municipio.idmunicipio) === String(municipioSeleccionado) ? 'selected' : ''}>
                                    ${municipio.nombre}
                                </option>`).join('')}
                        </select>
                    </div>
                    <div class="col-md-2">
                        <input type="text" class="form-control" placeholder="Descripción" value="${descripcion}" ${permisos.tienePermisoDescripcionTramite ? '' : 'disabled'}>
                    </div>
                    <div class="col-auto">
                        <button type="button" class="btn btn-fsvsaoff eliminar-subtramite" ${permisos.tienePermisoEliminarSubtramite ? '' : 'disabled'}>
                            Eliminar Subtramite
                        </button>
                    </div>
                </div>
            </form>`;
    }

    function agregarTramite(tipo, detalle = {}) {
        const tramitesMostrar = [...tramitesFiltrados.tipo2, ...tramitesFiltrados.tipo3];
        const municipiosFiltrados = filtrarMunicipios(tipo);

        tramiteIndex++;
        const tramiteId = `tramite_${tramiteIndex}`;
        const contenedorTramite = `
        <div class="card mb-3" id="${tramiteId}">
            <div class="card-header d-flex justify-content-between">
                <strong class="me-auto">${tipo}</strong>
                <button class="btn btn-fsvsaoff eliminar-tramite" ${permisos.tienePermisoEliminarTramite ? '' : 'disabled'}>
                    Eliminar Trámite
                </button>
            </div>
            <div class="card-body">
                <form class="form-tramite">
                    <div class="form-row d-flex align-items-center justify-content-between">
                        <div class="col-md-2">
                            <select class="form-control responsable" ${permisos.tienePermisoResponsableTramite ? '' : 'disabled'}>
                                <option value="" disabled selected>Seleccione Responsable</option>
                                ${usuarios.map(usuario => `
                                    <option value="${usuario.idusuario}" ${usuario.idusuario === detalle.idresponsable ? 'selected' : ''}>
                                        ${usuario.nombres} ${usuario.apellidos}
                                    </option>`).join('')}
                            </select>
                        </div>
                        <div class="col-md-2">
                            <select class="form-control tramite" ${permisos.tienePermisoTramiteTramite ? '' : 'disabled'}>
                                <option value="" disabled selected>Seleccione Trámite</option>
                                ${tramitesMostrar.map(tramite => `
                                    <option value="${tramite.idtramite}" ${tramite.idtramite === detalle.idtramite ? 'selected' : ''}>
                                        ${tramite.nombre}
                                    </option>`).join('')}
                            </select>
                        </div>
                        <div class="col-md-2">
                            <input type="text" class="form-control" placeholder="Referencia" value="${detalle.referencia || ''}" ${permisos.tienePermisoReferenciaTramite ? '' : 'disabled'}>
                        </div>
                        <div class="col-md-2">
                            <select class="form-control municipio" ${permisos.tienePermisoMunicipioTramite ? '' : 'disabled'}>
                                <option value="" disabled selected>Seleccione Municipio</option>
                                ${municipiosFiltrados.map(municipio => `
                                    <option value="${municipio.idmunicipio}" ${municipio.idmunicipio === detalle.idmunicipio ? 'selected' : ''}>
                                        ${municipio.nombre}
                                    </option>`).join('')}
                            </select>
                        </div>
                        <div class="col-md-2">
                            <input type="text" class="form-control observacion" placeholder="Descripcion" value="${detalle.descripcion || ''}" ${permisos.tienePermisoDescripcionTramite ? '' : 'disabled'}>
                        </div>
                    </div>
                    <div class="form-row mt-2">
                        <div class="col">
                            <button type="button" class="btn btn-fsvsaon agregar-subtramite" ${permisos.tienePermisoRegistrarSubtramite ? '' : 'disabled'}>
                                Agregar Subtrámite
                            </button>
                        </div>
                    </div>
                </form>
                <div class="subtramites mt-2"></div> <!-- Contenedor para los subtrámites -->
            </div>
        </div>`;

        document.getElementById('contenedorTramites').insertAdjacentHTML('beforeend', contenedorTramite);

        habilitarMayusculas();

        setTimeout(() => {
            window.scrollTo({
                top: document.body.scrollHeight,
                behavior: 'smooth'
            });
        }, 100); // Delay para asegurar que el DOM se haya actualizad

        // Cargar subtrámites existentes en el trámite, si los hay
        if (detalle.subtramites && detalle.subtramites.length > 0) {
            const subtramitesContainer = document.querySelector(`#${tramiteId} .subtramites`);
            detalle.subtramites.forEach(subtramite => {
                const subtramiteHTML = crearSubtramiteHTML(subtramite.idmunicipio, tipo, subtramite.descripcion);
                subtramitesContainer.insertAdjacentHTML('beforeend', subtramiteHTML);
            });
        }

        document.querySelector(`#${tramiteId} .agregar-subtramite`).addEventListener('click', function () {
            // Obtener el municipio seleccionado en el trámite principal
            const municipioSeleccionado = document.querySelector(`#${tramiteId} .municipio`).value;

            // Crear el subtrámite con el municipio seleccionado
            const subtramiteHTML = crearSubtramiteHTML(municipioSeleccionado, tipo);

            // Agregar el subtrámite al contenedor de subtrámites
            const subtramites = document.querySelector(`#${tramiteId} .subtramites`);
            subtramites.insertAdjacentHTML('beforeend', subtramiteHTML);

            habilitarMayusculas();

        });
    }

    

    function enviarPlanillaData(idplanilla, planillaData, redireccionUrl, mensajeExito) {

        fetch(`${url}/api/gestionplanilla/manejarPlanilla`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', },
            credentials: 'include',
            body: JSON.stringify({ idplanilla, planillaData })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Éxito',
                        text: mensajeExito,
                        showConfirmButton: false,
                        timer: 2000
                    });
                    setTimeout(() => {
                        if (redireccionUrl) {
                            window.history.replaceState(null, "", redireccionUrl);
                            cargarVista(redireccionUrl);
                        } else {
                            window.history.back(); // Volver a la página anterior en el historial
                        }
                    }, 2000);
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Hubo un problema al guardar la planilla.',
                        confirmButtonText: 'Aceptar',
                        confirmButtonColor: '#163c64'
                    });
                }
            })
            .catch(error => {
                console.error('Error al enviar la planilla:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo enviar la planilla.',
                    confirmButtonText: 'Aceptar',
                    confirmButtonColor: '#163c64'
                });
            });
    }

    //FUNCIONES PROPIAS EDICION PLANILLA
    // Evento delegado para eliminar trámite
    document.addEventListener('click', function (e) {
        if (e.target.classList.contains('eliminar-tramite')) {
            e.target.closest('.card').remove();
        }
    });

    // Evento delegado para eliminar subtrámite
    document.addEventListener('click', function (e) {
        if (e.target.classList.contains('eliminar-subtramite')) {
            e.target.closest('.form-subtramite').remove();
        }
    });

    // Eveneto delegado para abrir modal para agregar tramite
    document.getElementById('agregarTramite').addEventListener('click', function () {
        modal.show();
    });
    // Input modal agregar tramite
    document.getElementById('tipoMetropolitano').addEventListener('click', function () {
        agregarTramite('Metropolitano');
        modal.hide();
    });
    // Input modal agregar tramite
    document.getElementById('tipoExterior').addEventListener('click', function () {
        agregarTramite('Exterior');
        modal.hide();
    });
}