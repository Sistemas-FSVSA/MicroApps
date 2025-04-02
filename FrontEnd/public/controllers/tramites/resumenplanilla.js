document.addEventListener("DOMContentLoaded", () => {
    InicializarResumenPlanilla();
});


async function InicializarResumenPlanilla() {
    let tramiteIndex = 0;
    let estadoPlanillaGlobal;
    mostrarNombreUsuario();

    // Función genérica para obtener parámetros de la URL
    function obtenerParametroDeURL(nombreParametro) {
        const params = new URLSearchParams(window.location.search);
        return params.get(nombreParametro);
    }


    // Obtener parámetros desde la URL
    estadoPlanillaGlobal = obtenerParametroDeURL('estado');
    const idUsuario = obtenerParametroDeURL('idusuario');
    const idplanilla = obtenerParametroDeURL('idplanilla');
    const nombres = obtenerParametroDeURL('nombres');
    const apellidos = obtenerParametroDeURL('apellidos');

    // Carga los permisos con base en el estado de la planilla
    const permisos = cargarPermisosResumen(estadoPlanillaGlobal);

    // Asociar eventos a botones si existen
    const continuarButton = document.getElementById('editarPlanilla');
    const municipiosButton = document.getElementById('editarPlanillaCerrado');

    if (continuarButton) {
        continuarButton.addEventListener('click', () => {
            redireccionEditarPlanilla(idplanilla, idUsuario, estadoPlanillaGlobal, nombres, apellidos);
        });
    }

    if (municipiosButton) {
        municipiosButton.addEventListener('click', () => {
            redireccionEditarMunicipios(idplanilla, idUsuario, estadoPlanillaGlobal, nombres, apellidos);
        });
    }



    // Función para obtener las planillas del usuario
    async function obtenerPlanillasPorUsuario() {
        if (!idUsuario) {
            console.error('ID de usuario no encontrado en la URL.');
            return [];
        }

        try {
            const response = await fetch(`${url}/api/gestionplanilla/obtenerPlanillaUsuario/${idUsuario}?estado=${estadoPlanillaGlobal}&idplanilla=${idplanilla}`, {
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

    // Función para cargar las planillas y calcular el total
    async function cargarPlanillas() {
        try {
            showSpinner(); // Muestra el spinner
            const planillas = await obtenerPlanillasPorUsuario();

            if (planillas.length > 0) {
                const planillaActual = planillas[0]; // Consideramos la primera planilla para mostrar

                // Mostrar información general de la planilla
                document.getElementById('title').textContent = `PLANILLA N°: ${planillaActual.idplanilla}`;
                document.getElementById('fechaInicio').textContent = `FECHA GENERADA: ${new Date(planillaActual.fechainicio).toLocaleDateString('es-ES')}`;

                // Verificar si la planilla fue rechazada
                if (planillaActual.motivorechazo && planillaActual.estado === 'GUARDADO') {
                    Swal.fire({
                        title: `Planilla Rechazada`,
                        html: `
                            <div style="font-size: 18px; margin-bottom: 10px;">Planilla N°: <strong>${planillaActual.idplanilla}</strong></div>
                            <div style="font-size: 14px; color: gray; margin-bottom: 15px;">Fecha Generada: ${new Date(planillaActual.fechainicio).toLocaleDateString('es-ES')}</div>
                            <div style="font-size: 16px;">Motivo: <strong>${planillaActual.motivorechazo}</strong></div>
                        `,
                        icon: 'warning',
                        confirmButtonText: 'Continuar',
                        confirmButtonColor: '#163c64' // Color del botón
                    });
                }

                // Calcular el total de la planilla
                let planillatotal = 0;
                estadoPlanillaGlobal = planillaActual.estado;

                planillaActual.detalles.forEach(detalle => {
                    let tipoTramite = detalle.tipo === 1 ? 'Metropolitano' : 'Exterior';
                    agregarResumenTramite(tipoTramite, detalle);

                    // Sumar valores
                    if (detalle.valor) planillatotal += parseFloat(detalle.valor);
                    if (detalle.subtramites) {
                        detalle.subtramites.forEach(subtramite => {
                            if (subtramite.valor) planillatotal += parseFloat(subtramite.valor);
                        });
                    }
                });

                document.getElementById('totalPlanilla').value = planillatotal.toFixed();
            } else {
                console.log('No se encontraron planillas para este usuario');
            }
        } catch (error) {
            console.error('Error al cargar las planillas:', error);
        } finally {
            hideSpinner(); // Oculta el spinner
        }
    }
    await cargarPlanillas();

    let ajusteGuardado = null
    document.getElementById('agregarAjuste').addEventListener('click', () => {
        // Si ya hay un ajuste guardado, precargamos los valores en el modal
        if (ajusteGuardado) {
            document.getElementById('valorAjuste').value = ajusteGuardado.valor;
            document.getElementById('motivoAjuste').value = ajusteGuardado.motivo;
        } else {
            // Limpiar campos si no hay ajuste previo
            document.getElementById('valorAjuste').value = '';
            document.getElementById('motivoAjuste').value = '';
        }

        // Mostrar el modal usando jQuery
        $('#modalAjuste').modal('show');
    });

    document.getElementById('guardarAjuste').addEventListener('click', () => {
        const valorAjuste = parseFloat(document.getElementById('valorAjuste').value);
        const motivoAjuste = document.getElementById('motivoAjuste').value.trim();

        if (isNaN(valorAjuste) || !motivoAjuste) {
            alert('Por favor, ingresa ambos campos: valor y motivo del ajuste.');
            return;
        }

        // Guardar el ajuste
        ajusteGuardado = { valor: valorAjuste, motivo: motivoAjuste };

        // Actualizar la visualización del total con el ajuste
        actualizarTotal();

        // Cerrar el modal usando jQuery
        $('#modalAjuste').modal('hide');
    });


    function actualizarTotal() {
        const totalPlanilla = parseFloat(document.getElementById('totalPlanilla').value);
        const totalAjuste = ajusteGuardado ? ajusteGuardado.valor : 0;
        const totalFinal = totalPlanilla + totalAjuste;

        // Mostrar el valor del ajuste, el total de la planilla y el total final
        document.getElementById('totalAjuste').value = totalAjuste;
        document.getElementById('totalPlanilla').value = totalPlanilla;
        document.getElementById('totalFinal').value = totalFinal;
    }

    // Función para agregar los trámites y subtrámites en la página
    function agregarResumenTramite(tipo, detalle = {}) {
        tramiteIndex++;
        const tramiteId = `tramite_${tramiteIndex}`;
        const NumeroTramite = `Tramite ${tramiteIndex}`;

        // Crear el HTML para el resumen de trámite
        const resumenTramiteHTML = `
        <div class="card" id="${tramiteId}">
            <div class="card-body">
                <h5 class="card-title d-flex justify-content-between">
                <span class="font-weight-bold ms-auto text-left">${NumeroTramite}</span>
                &nbsp;&nbsp;&nbsp; - &nbsp;&nbsp;&nbsp;
                <span>${tipo} - ${detalle.tramiteNombre}</span>
                </h5>
                <br><hr>
                <div class="d-flex align-items-center flex-wrap">
                    <div class="me-3 ml-3">
                        <label><strong>Municipio:</strong></label>
                        <input type="text" class="form-control" value="${detalle.municipioNombre}" readonly>
                    </div>
                    <div class="me-3 ml-3">
                        <label><strong>Responsable:</strong></label>
                        <input type="text" class="form-control" value="${detalle.responsableNombre}" readonly>
                    </div>
                    <div class="me-3 ml-3">
                        <label><strong>Referencia:</strong></label>
                        <input type="text" class="form-control" value="${detalle.referencia || 'N/A'}" readonly>
                    </div>
                    <div class="me-3 ml-3">
                        <label><strong>Descripción:</strong></label>
                        <input type="text" class="form-control" value="${detalle.descripcion || 'N/A'}" readonly>
                    </div>
                    ${permisos.permisoVerValores ? `<div class="me-3 ml-3"><label><strong>Subtotal:</strong></label><input type="text" class="form-control" value="${detalle.valor}" readonly></div>` : ''}
                </div>
                ${detalle.subtramites && detalle.subtramites.length > 0 ? `<div class="subtramite-toggle" id="toggle_${tramiteId}">
                    <i class="fas fa-chevron-down"></i> Ver subtrámites
                </div>` : ''}
                <div class="subtramites mt-3" id="subtramites_${tramiteId}" style="display: none;">
                    ${detalle.subtramites && detalle.subtramites.length > 0 ? detalle.subtramites.map(subtramite => crearResumenSubtramiteHTML(subtramite)).join('') : ''}
                </div>
            </div>
        </div>`;

        // Insertamos el resumen de trámite en el contenedor
        document.getElementById('contenedorTramites').insertAdjacentHTML('beforeend', resumenTramiteHTML);

        // Si el trámite tiene subtrámites, añadimos el evento para el despliegue
        if (detalle.subtramites && detalle.subtramites.length > 0) {
            const subtramiteToggle = document.querySelector(`#toggle_${tramiteId}`);
            subtramiteToggle.addEventListener('click', function () {
                const subtramiteContent = document.querySelector(`#subtramites_${tramiteId}`);
                const icon = subtramiteToggle.querySelector('i');

                // Alternamos el display entre none y block
                subtramiteContent.style.display = subtramiteContent.style.display === 'none' ? 'block' : 'none';
                // Cambiamos la dirección de la flecha
                icon.classList.toggle('fa-chevron-down');
                icon.classList.toggle('fa-chevron-up');
            });
        }
    }

    // Función para crear el HTML de un subtrámite
    function crearResumenSubtramiteHTML(subtramite) {
        return `
        <div class="card mb-2">
            <div class="card-body p-2 d-flex align-items-center">
                <div class="col-md-3 me-3">
                    <label><strong>Municipio:</strong></label>
                    <input type="text" class="form-control" value="${subtramite.municipioNombre}" readonly>
                </div>
                <div class="col-md-6 me-3">
                    <label><strong>Descripción:</strong></label>
                    <input type="text" class="form-control" value="${subtramite.descripcion || 'N/A'}" readonly>
                </div>
                ${permisos.permisoVerValores ?
                `<div class="col-md-3 me-3">
                    <label><strong>Subtotal:</strong></label>
                    <input type="text" class="form-control" value="${subtramite.valor || 'N/A'}" readonly>
                </div>`
                : ''}
            </div>
        </div>`;
    }

    document.getElementById('aprobarPlanilla').addEventListener('click', async function () {
        Swal.fire({
            title: '¿Estás seguro de aprobar la planilla?',
            text: "Una vez aprobada no podrás realizar más cambios.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Aprobar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#163c64',  // Color del botón "Sí"
            cancelButtonColor: '#96072D'       // Color del botón "No"
        }).then(async (result) => {
            if (result.isConfirmed) {
                const idPlanilla = idplanilla;
                const idusuario = localStorage.getItem('idusuario');

                // Validamos si hay un ajuste guardado
                const valorAjuste = ajusteGuardado ? ajusteGuardado.valor : 0;
                const motivoAjuste = ajusteGuardado ? ajusteGuardado.motivo : '';

                // Creamos el payload a enviar al backend
                const payload = {
                    idplanilla: idPlanilla,
                    estado: 'APROBADO',
                    ajuste: {
                        valor: valorAjuste,
                        motivo: motivoAjuste,
                        idusuario: idusuario
                    }
                };

                try {
                    const response = await fetch(`${url}/api/planilla/aprobarPlanilla/${idPlanilla}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', },
                        credentials: 'include',
                        body: JSON.stringify(payload)
                    });

                    const result = await response.json();

                    if (response.ok) {
                        // Si la respuesta es exitosa, mostramos mensaje y redirigimos
                        Swal.fire({
                            title: 'Aprobada!',
                            text: 'La planilla ha sido aprobada exitosamente.',
                            icon: 'success',
                            timer: 2000,  // Tiempo en milisegundos antes de que el mensaje se cierre automáticamente
                            showConfirmButton: false  // Oculta el botón de confirmación
                        }).then(() => {
                            const nuevaUrl = '/tramites/planillaspendientes/';

                            // 🔥 Reemplaza la URL actual para que no se pueda volver atrás
                            window.history.replaceState(null, "", nuevaUrl);
                            cargarVista(nuevaUrl)
                        });
                    } else {
                        console.error(result.message);
                        Swal.fire(
                            'Error',
                            'Hubo un error al aprobar la planilla.',
                            'error'
                        );
                    }
                } catch (error) {
                    console.error('Error al enviar la petición:', error);
                    Swal.fire(
                        'Error',
                        'Error en la conexión.',
                        'error'
                    );
                }
            }
        });
    });

    document.getElementById('rechazarPlanilla').addEventListener('click', async function () {
        Swal.fire({
            title: '¿Estás seguro de rechazar la planilla?',
            text: "Una vez rechazada, la planilla volverá a su estado anterior.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Rechazar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#163c64',
            cancelButtonColor: '#96072D',
            input: 'textarea',  // Campo de texto para el motivo
            inputPlaceholder: 'Escribe el motivo del rechazo aquí...',
            inputValidator: (value) => {
                if (!value || value.trim() === '') {
                    return 'El motivo del rechazo es obligatorio.';
                }
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                const idPlanilla = idplanilla;
                const motivo = result.value;
                const idusuario = localStorage.getItem('idusuario');

                // Creamos el payload a enviar al backend
                const payload = {
                    idplanilla: idPlanilla,
                    estado: 'GUARDADO',
                    motivo: motivo,
                    idusuario: idusuario
                };

                try {
                    const response = await fetch(`${url}/api/planilla/rechazarPlanilla/${idPlanilla}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', },
                        credentials: 'include',
                        body: JSON.stringify(payload)
                    });

                    const result = await response.json();

                    if (response.ok) {
                        Swal.fire({
                            title: 'Rechazada!',
                            text: 'La planilla ha sido rechazada exitosamente.',
                            icon: 'success',
                            timer: 2000,
                            showConfirmButton: false
                        }).then(() => {
                            const nuevaUrl = '/tramites/planillaspendientes/';

                            // 🔥 Reemplaza la URL actual para que no se pueda volver atrás
                            window.history.replaceState(null, "", nuevaUrl);
                            cargarVista(nuevaUrl)
                        });
                    } else {
                        console.error(result.message);
                        Swal.fire(
                            'Error',
                            'Hubo un error al rechazar la planilla.',
                            'error'
                        );
                    }
                } catch (error) {
                    console.error('Error al enviar la petición:', error);
                    Swal.fire(
                        'Error',
                        'Error en la conexión.',
                        'error'
                    );
                }
            }
        });
    });

    document.getElementById('cerrarPlanilla').addEventListener('click', async function () {
        Swal.fire({
            title: '¿Estás seguro de cerrar la planilla?',
            text: "Una vez cerrada no podrás realizar más cambios.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Cerrar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#163c64',  // Color del botón "Sí"
            cancelButtonColor: '#96072D'       // Color del botón "No"
        }).then(async (result) => {
            if (result.isConfirmed) {
                const idPlanilla = idplanilla;

                if (!idPlanilla) {
                    console.error("ID de planilla no encontrado.");
                    return;
                }

                try {
                    const response = await fetch(`${url}/api/planilla/cerrarPlanilla/${idPlanilla}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', },
                        credentials: 'include',
                        body: JSON.stringify({ idplanilla: idPlanilla })
                    });

                    const result = await response.json();

                    if (response.ok) {
                        Swal.fire({
                            title: 'Cerrada!',
                            text: 'La planilla ha sido cerrada exitosamente.',
                            icon: 'success',
                            timer: 2000,  // Tiempo en milisegundos antes de que el mensaje se cierre automáticamente
                            showConfirmButton: false  // Oculta el botón de confirmación
                        }).then(() => {
                            const nuevaUrl = '/tramites/planilla/';

                            // 🔥 Reemplaza la URL actual para que no se pueda volver atrás
                            window.history.replaceState(null, "", nuevaUrl);
                            cargarVista(nuevaUrl)
                        });
                    } else {
                        console.error(result.message);
                        Swal.fire(
                            'Error',
                            'Hubo un error al cerrar la planilla.',
                            'error'
                        );
                    }
                } catch (error) {
                    console.error('Error al enviar la petición:', error);
                    Swal.fire(
                        'Error',
                        'Error en la conexión.',
                        'error'
                    );
                }
            }
        });
    });
}


function redireccionEditarPlanilla(idplanilla) {
    const idUsuario = localStorage.getItem('idusuario');
    const estado = 'GUARDADO'; // Ajusta según sea necesario.

    if (!idUsuario || !idplanilla) {
        console.error('Faltan valores para la redirección a Planilla');
        return;
    }

    const url = `/tramites/edicionplanilla?idusuario=${idUsuario}&estado=${estado}&idplanilla=${idplanilla}`;
    cargarVista(url);
}

function redireccionEditarMunicipios(idplanilla, idUsuario, estado, nombres, apellidos) {
    if (!idplanilla || !idUsuario || !estado || !nombres || !apellidos) {
        console.error('Faltan valores para la redirección a Municipios');
        return;
    }

    const url = `/tramites/edicionplanilla?idusuario=${idUsuario}&nombres=${encodeURIComponent(nombres)}&apellidos=${encodeURIComponent(apellidos)}&estado=${estado}&idplanilla=${idplanilla}`;
    cargarVista(url);
}

