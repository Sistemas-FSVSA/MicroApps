document.addEventListener("DOMContentLoaded", () => {
    InicializarNuevaPlanilla();
});


async function InicializarNuevaPlanilla() {
    const modal = new bootstrap.Modal(document.getElementById('modalTipoTramite'), { keyboard: false });
    habilitarMayusculas();
    mostrarNombreUsuario()
    let tramiteIndex = 0;
    let usuarios = [];
    let tramites = [];
    let municipios = [];
    let tramitesFiltrados = { tipo1: [], tipo2: [], tipo3: [], tipo4: [] };
    const estadoPlanillaGlobal = 'GUARDADO'
    const permisos = cargarPermisosPlanillas(estadoPlanillaGlobal);

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


    // Filtra municipios por tipo
    function filtrarMunicipios(tipo) {
        return municipios.filter(municipio => {
            const tipoMunicipio = municipio.tipo.trim();
            return (tipo === 'Metropolitano' && tipoMunicipio === '1') || (tipo === 'Exterior' && tipoMunicipio === '2');
        });
    }

    document.getElementById('guardarPlanilla').addEventListener('click', function () {
        manejarPlanilla('GUARDADO');
    });

    // Agrega el evento de clic al botón "Cerrar Planilla"
    document.getElementById("cerrarPlanilla").addEventListener("click", function () {
        // Muestra el modal de confirmación usando SweetAlert
        Swal.fire({
            title: "Esta acción no se puede deshacer",
            text: "¿Estás seguro de que deseas cerrar la planilla?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: 'Cerrar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#163c64',  // Color del botón "Sí"
            cancelButtonColor: '#96072D'       // Color del botón "No"
        }).then((result) => {
            if (result.isConfirmed) {
                // Si el usuario confirma, llama a la función de cerrar planilla
                manejarPlanilla('CERRADO');
            }
            // Si el usuario cancela, no hace nada
        });
    });

    // Función para crear subtrámite HTML con filtro de municipios según el tipo de trámite
    function crearSubtramiteHTML(municipioSeleccionado, tipoTramite) {
        const municipiosFiltrados = filtrarMunicipios(tipoTramite); // Filtrar municipios según tipoTramite
        return `
    <form class="form-subtramite mb-2">
        <div class="form-row">
            <div class="col-md-2">
                <select class="form-control sub-municipio">
                    ${municipiosFiltrados.map(municipio => `
                        <option value="${municipio.idmunicipio}" ${municipio.nombre === municipioSeleccionado ? 'selected' : ''}>
                            ${municipio.nombre}
                        </option>
                    `).join('')}
                </select>
            </div>
            <div class="col-md-2">
                <input type="text" class="form-control" placeholder="Descripción">
            </div>
            <div class="col-auto">
                ${permisos.tienePermisoEliminarSubtramite ? `<button type="button" class="btn btn-fsvsaoff eliminar-subtramite">Eliminar Subtramite</i></button>` : ''}
            </div>
        </div>
    </form>`;
    }

    // Modifica la función agregarTramite para pasar el tipo de trámite al agregar un subtrámite
    function agregarTramite(tipo) {
        const tramitesMostrar = [...tramitesFiltrados.tipo2, ...tramitesFiltrados.tipo3];
        const municipiosFiltrados = filtrarMunicipios(tipo);

        tramiteIndex++;
        const tramiteId = `tramite_${tramiteIndex}`;
        const contenedorTramite = `
    <div class="card mb-3" id="${tramiteId}">
        <div class="card-header d-flex justify-content-between">
            <strong class="me-auto">${tipo}</strong>
            ${permisos.tienePermisoEliminarTramite ? `<button class="btn btn-fsvsaoff ms-auto eliminar-tramite">Eliminar Trámite</button>` : ''}
        </div>
        <div class="card-body">
            <form class="form-tramite">
                <div class="form-row d-flex align-items-center justify-content-between">
                    <div class="col-md-2">
                        <select class="form-control responsable" placeholder="Seleccione Responsable">
                            <option value="" disabled selected>Seleccione Responsable</option>
                            ${usuarios.map(usuario => `<option value="${usuario.idusuario}">${usuario.nombres} ${usuario.apellidos}</option>`).join('')}
                        </select>
                    </div>
                    <div class="col-md-2">
                        <select class="form-control tramite" placeholder="Seleccione Trámite">
                            <option value="" disabled selected>Seleccione Trámite</option>
                            ${tramitesMostrar.map(tramite => `<option value="${tramite.idtramite}">${tramite.nombre}</option>`).join('')}
                        </select>
                    </div>
                    <div class="col-md-2">
                        <input type="text" class="form-control" placeholder="Referencia">
                    </div>
                    <div class="col-md-2">
                        <select class="form-control municipio" placeholder="Seleccione Municipio">
                            <option value="" disabled selected>Seleccione Municipio</option>
                            ${municipiosFiltrados.map(municipio => `<option value="${municipio.idmunicipio}">${municipio.nombre}</option>`).join('')}
                        </select>
                    </div>
                    <div class="col-md-2">
                        <input type="text" class="form-control observacion" placeholder="Descripcion">
                    </div>
                </div>
                <div class="form-row mt-2">
                    <div class="col">
                     ${permisos.tienePermisoRegistrarSubtramite ? `<button type="button" class="btn btn-fsvsaon agregar-subtramite">Agregar Subtrámite</button>` : ''}
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
        }, 100); // Delay para asegurar que el DOM se haya actualizad);

        // Evento para la funcionalidad de agregar subtrámite con tipo de trámite
        document.querySelector(`#${tramiteId} .agregar-subtramite`).addEventListener('click', function () {
            const municipioSeleccionado = document.querySelector(`#${tramiteId} .municipio`).options[document.querySelector(`#${tramiteId} .municipio`).selectedIndex].text;
            const subtramiteHTML = crearSubtramiteHTML(municipioSeleccionado, tipo); // Pasa el tipo
            const subtramites = document.querySelector(`#${tramiteId} .subtramites`);
            subtramites.insertAdjacentHTML('beforeend', subtramiteHTML);

            habilitarMayusculas();
        });
    }

    async function manejarPlanilla(estado) {
        let planillaData = [];
        let validacionExitosa = true;
        const idtramitador = localStorage.getItem('idusuario');

        // Determinar la URL base de redirección
        let redireccionUrlBase = '';
        if (estado === 'GUARDADO') {
            redireccionUrlBase = `/tramites/edicionplanilla?idusuario=${idtramitador}&estado=${estado}`;
        } else if (estado === 'CERRADO') {
            redireccionUrlBase = '/tramites/planilla';
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
            });
            return;
        }

        // Recorre todos los trámites para capturar los datos y validar
        tramitesExistentes.forEach(card => {
            const responsable = card.querySelector('.form-tramite .responsable');
            const tramite = card.querySelector('.form-tramite .tramite');
            const referencia = card.querySelector('.form-tramite input[placeholder="Referencia"]');
            const municipio = card.querySelector('.form-tramite .municipio');
            const observacion = card.querySelector('.form-tramite .observacion');

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
                id: card.id,
                tipo: card.querySelector('.card-header strong').innerText.trim(),
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

                tramiteData.subtramites.push({ idmunicipio: idmunicipio.value, descripcion: descripcion.value });
            });

            planillaData.push(tramiteData);
        });

        if (validacionExitosa) {
            enviarPlanillaData(planillaData, redireccionUrlBase, estado);
        }
    }

    function enviarPlanillaData(planillaData, redireccionUrlBase, estado) {

        fetch(`${url}/api/gestionplanilla/manejarPlanilla`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ planillaData })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Error en la respuesta de la API');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {

                    let redireccionUrl = redireccionUrlBase;
                    // Agregar el idplanilla a la URL solo si el estado es GUARDADO
                    if (estado === 'GUARDADO') {
                        redireccionUrl = `${redireccionUrlBase}&idplanilla=${data.idplanilla}`;
                    }

                    // Mostrar alertas personalizadas
                    if (estado === 'GUARDADO') {
                        Swal.fire({
                            icon: 'success',
                            title: 'Planilla Guardada',
                            text: 'La planilla se ha guardado exitosamente.',
                            timer: 2000,
                            showConfirmButton: false
                        });
                    } else if (estado === 'CERRADO') {
                        Swal.fire({
                            icon: 'success',
                            title: 'Planilla Cerrada',
                            text: 'La planilla se ha cerrado con éxito.',
                            timer: 2000,
                            showConfirmButton: false
                        });
                    }

                    // Redirección después de 2 segundos
                    setTimeout(() => {
                        window.history.replaceState(null, "", redireccionUrl);
                        cargarVista(redireccionUrl);
                    }, 2000);
                } else {
                    throw new Error(data.message || 'Error desconocido');
                }
            })
            .catch(error => {
                console.error('Error al procesar la planilla:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error al procesar',
                    text: 'Hubo un problema al procesar la planilla.',
                    confirmButtonText: 'Aceptar',
                    confirmButtonColor: '#163c64'
                });
            });
    }




    document.getElementById('agregarTramite').addEventListener('click', function () {
        modal.show();
    });

    document.getElementById('tipoMetropolitano').addEventListener('click', function () {
        agregarTramite('Metropolitano');
        modal.hide();
    });

    document.getElementById('tipoExterior').addEventListener('click', function () {
        agregarTramite('Exterior');
        modal.hide();
    });

    // Eliminar trámite
    document.body.addEventListener('click', function (e) {
        if (e.target.classList.contains('eliminar-tramite')) {
            e.target.closest('.card').remove();
        }
    });

    // Eliminar subtrámite
    document.body.addEventListener('click', function (e) {
        if (e.target.classList.contains('eliminar-subtramite')) {
            e.target.closest('.form-subtramite').remove();
        }
    });
}
