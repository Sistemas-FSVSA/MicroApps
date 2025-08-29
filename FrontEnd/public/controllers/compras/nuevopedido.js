document.addEventListener("DOMContentLoaded", () => {
    InicializarNuevoPedido();
});

async function InicializarNuevoPedido() {
    permisos = await cargarPermisosNuevosPedidos(); // sin let aquí, usas la variable global
    añadirItems();
    renderizarItemsEncargo();
    cargarAprobado();
    cargarProveedores();
    cargarDependencias(); /* CARGAR LAS DEPENDENCIAS ----------------------------------------------------------------------------------------------------------------------------------------------------*/


    document.getElementById('agregarItem').addEventListener('click', function () {
        let modal = new bootstrap.Modal(document.getElementById('modalAñadirItem'));
        modal.show();
    });

    // Agregar eventos a los botones
    document.getElementById('guardarEncargo').addEventListener('click', () => {
        manejarPedido('INICIADO'); // Estado para guardar
    });

    document.getElementById('cerrarEncargo').addEventListener('click', () => {
        manejarPedido('CERRADO'); // Estado para aprobar
    });

    document.getElementById('ordenCompra').addEventListener('click', () => {
        manejarPedido('SINREFERENCIA'); // Estado para generar orden de compra
    });
}
var permisos = permisos || {};

function cargarAprobado() {
    fetch(`${url}/api/compras/obtenerAprobado`, {
        credentials: 'include'
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Error en la respuesta del servidor');
            }
            return response.json();
        })
        .then(data => {
            const select = document.getElementById('aprobadoPor');
            select.innerHTML = '<option value="">Aprobado Por</option>';

            // Filtrar y ordenar
            const aprobadosActivos = data.data
                .filter(usuario => usuario.estado === 1 || usuario.estado === '1')
                .sort((a, b) => a.nombres.localeCompare(b.nombres));

            aprobadosActivos.forEach(usuario => {
                const option = document.createElement('option');
                option.value = usuario.idaprueba;
                option.textContent = usuario.nombres;
                select.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error al cargar usuarios:', error);
        });
}

function cargarProveedores() {
    fetch(`${url}/api/compras/obtenerProveedores`, {
        credentials: 'include'
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Error en la respuesta del servidor');
            }
            return response.json();
        })
        .then(data => {
            const select = document.getElementById('proveedor');
            select.innerHTML = '<option value="">Proveedor...</option>';

            // Filtrar y ordenar
            const proveedoresActivos = data
                .filter(proveedor => proveedor.estado === true)
                .sort((a, b) => a.nombre.localeCompare(b.nombre));

            proveedoresActivos.forEach(proveedor => {
                const option = document.createElement('option');
                option.value = proveedor.idproveedor;
                option.textContent = proveedor.nombre;
                select.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error al cargar proveedores:', error);
        });
}

async function cargarDependencias() {
    try {
        const idusuario = localStorage.getItem('idusuario'); /*capturar el idusuario desde el localstorage y enviarlo como parametro*/
        const response = await fetch(`${url}/api/compras/obtenerDependencias/${idusuario}`, { /* CARGAR LAS DEPENDENCIAS (IdUsuario depende del localStorage) */
            credentials: "include"
        });
        if (!response.ok) throw new Error("Error al cargar dependencias");

        const data = await response.json();
        console.log("Dependencias response:", data);
        const dependencias = Array.isArray(data) ? data : (data.dependencias || []);
        // const dependencias = data.dependencias || [];

        const dependenciaSelect = document.getElementById("IdDependencia");
        const subdependenciaSelect = document.getElementById("IdSubdependencia");

        // Limpiar selects
        dependenciaSelect.innerHTML = '<option disabled selected value="">Dependencia</option>';
        subdependenciaSelect.innerHTML = '<option disabled selected value="">Subdependencia</option>';

        // Llenar dependencias
        dependencias.forEach(dep => {
            const option = document.createElement("option");
            option.value = dep.iddependencia;
            option.textContent = dep.nombre || dep.nombreDependencia || dep.dependencia || `Dependencia ${dep.iddependencia}`;
            dependenciaSelect.appendChild(option);
        });


        // Evento para cuando se seleccione una dependencia
        dependenciaSelect.addEventListener("change", function () {
            const idDep = parseInt(this.value);
            const dependenciaSeleccionada = dependencias.find(d => d.iddependencia === idDep);

            // Limpiar subdependencias
            subdependenciaSelect.innerHTML = '<option disabled selected value="">Subdependencia</option>';

            if (dependenciaSeleccionada && dependenciaSeleccionada.subdependencias.length > 0) {
                dependenciaSeleccionada.subdependencias.forEach(sub => {
                    if (sub.estado) {
                        const option = document.createElement("option");
                        option.value = sub.idsubdependencia;
                        option.textContent = sub.nombre;
                        subdependenciaSelect.appendChild(option);
                    }
                });
            }
        });

    } catch (error) {
        console.error("Error cargando dependencias:", error);
    }
}

function añadirItems() {
    const inputNuevoItem = document.getElementById('inputNuevoItem');

    inputNuevoItem.addEventListener('input', function () {
        const query = inputNuevoItem.value.trim();

        if (query.length > 0) {
            fetch(`${url}/api/compras/obtenerItems?query=${query}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: "include",
            })
                .then(response => response.json())
                .then(data => {
                    // Filtramos los ítems cuyo estado sea true
                    const itemsActivos = data.filter(item => item.estado === true);
                    actualizarTabla(itemsActivos);
                })
                .catch(error => {
                    console.error('Error en la petición:', error);
                });
        }
    });
}

function renderizarItemsEncargo(paginaDeseada = null) {
    const dataTable = $('#tablaItemsSeleccionados').DataTable();

    // Guardar la página actual solo si no se pasa una página deseada
    const paginaActual = paginaDeseada !== null ? paginaDeseada : dataTable.page();

    dataTable.clear();

    const items = JSON.parse(sessionStorage.getItem('itemsSeleccionados')) || [];

    items.forEach((item, index) => {
        const btnEliminar = permisos.tienePermisoEliminarItem
            ? `<button class="btn btn-danger btn-eliminar-item" data-index="${index}">
                    <i class="fas fa-trash"></i>
               </button>` : '';

        const btnNota = `
            <div class="position-relative d-inline-block">
                <button class="btn btn-warning btn-nota-item" data-index="${index}" title="Agregar nota">
                    <i class="fas fa-sticky-note"></i>
                </button>
                ${item.notas && item.notas.trim() !== '' ? `
                    <span class="campanita-badge">
                        <i class="fas fa-bell fa-xs text-white"></i>
                    </span>` : ''}
            </div>`;

        const rowData = [
            item.id,
            item.nombre,
            item.categoria,
            `<input type="number" class="form-control input-cantidad" value="${item.cantidad}" min="1" data-index="${index}">`,
            item.nombreCompleto,
            btnEliminar + ' ' + btnNota
        ];

        dataTable.row.add(rowData);
    });

    // Volver a la página deseada sin reiniciar
    dataTable.draw(false).page(paginaActual).draw(false);

    const $tabla = $('#tablaItemsSeleccionados tbody');

    // Delegación de eventos
    $tabla.off('click', '.btn-eliminar-item').on('click', '.btn-eliminar-item', function () {
        const index = $(this).data('index');
        eliminarItemDeSessionStorage(index);
    });

    $tabla.off('input', '.input-cantidad').on('input', '.input-cantidad', function () {
        const index = $(this).data('index');
        const valor = $(this).val();
        actualizarCantidadEnSessionStorage(index, valor);
    });

    $tabla.off('click', '.btn-nota-item').on('click', '.btn-nota-item', async function () {
        const index = $(this).data('index');
        const items = JSON.parse(sessionStorage.getItem('itemsSeleccionados')) || [];
        const notaActual = items[index]?.notas || '';

        const { value: nuevaNota } = await Swal.fire({
            input: 'textarea',
            inputLabel: 'Nota para el item',
            inputValue: notaActual,
            inputPlaceholder: 'Escribe una nota aquí...',
            inputAttributes: {
                'aria-label': 'Escribe una nota para este item'
            },
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
            customClass: {
                confirmButton: 'swal-confirm-button',
                cancelButton: 'swal-cancel-button'
            }
        });

        if (nuevaNota !== undefined) {
            items[index].notas = nuevaNota;
            sessionStorage.setItem('itemsSeleccionados', JSON.stringify(items));

            // Mantener la página actual al recargar
            const page = $('#tablaItemsSeleccionados').DataTable().page();
            renderizarItemsEncargo(page);
        }
    });
}

function actualizarTabla(data) {
    const tbody = document.getElementById('tbodyNuevoItem');
    tbody.innerHTML = '';

    data.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.itemId}</td>
            <td>${item.itemNombre}</td>
            <td>${item.categoriaNombre}</td>
            <td>${item.itemDescripcion}</td>
            <td>
                <button 
                    class="btn btn-success btn-agregar-item"
                    data-id="${item.itemId}"
                    data-nombre="${item.itemNombre}"
                    data-categoria="${item.categoriaNombre}"
                    data-descripcion="${item.itemDescripcion}">
                    <i class="fas fa-plus"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    document.querySelectorAll('.btn-agregar-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const nuevoItem = {
                id: btn.getAttribute('data-id'),
                nombre: btn.getAttribute('data-nombre'),
                categoria: btn.getAttribute('data-categoria'),
                descripcion: btn.getAttribute('data-descripcion'),
                cantidad: "1",
                nombreCompleto: `${localStorage.getItem('nombres') || ''} ${localStorage.getItem('apellidos') || ''}`.trim(),
                notas: "",
            };

            agregarItemASessionStorage(nuevoItem);
        });
    });

    if (!$.fn.DataTable.isDataTable('#itemTable')) {
        $('#itemTable').DataTable({
            pageLength: 5,
            lengthChange: false,
            searching: false,
            destroy: true,
            language: {
                url: "https://cdn.datatables.net/plug-ins/1.10.16/i18n/Spanish.json"
            },
        });
    } else {
        $('#itemTable').DataTable().clear().rows.add($('#tbodyNuevoItem tr')).draw();
    }
}

function agregarItemASessionStorage(nuevoItem) {
    let items = JSON.parse(sessionStorage.getItem('itemsSeleccionados')) || [];

    // Verificar si el ítem ya está en la lista (para evitar duplicados)
    const existe = items.some(item => item.id === nuevoItem.id);

    if (existe) {
        Mensaje('warning', 'Espera!', 'Este ítem ya ha sido agregado.', false, false);
        return;
    }

    items.push(nuevoItem);
    sessionStorage.setItem('itemsSeleccionados', JSON.stringify(items));

    const page = $('#tablaItemsSeleccionados').DataTable().page();
    renderizarItemsEncargo(page);

    // Mostrar mensaje de éxito
    Mensaje('success', 'Éxito!', 'Item agregado exitosamente.', true, false);
}

function eliminarItemDeSessionStorage(index) {
    let items = JSON.parse(sessionStorage.getItem('itemsSeleccionados')) || [];

    // Eliminar el ítem por índice
    items.splice(index, 1);

    // Guardar la nueva lista
    sessionStorage.setItem('itemsSeleccionados', JSON.stringify(items));

    const page = $('#tablaItemsSeleccionados').DataTable().page();
    renderizarItemsEncargo(page);
}

function actualizarCantidadEnSessionStorage(index, nuevaCantidad) {
    let items = JSON.parse(sessionStorage.getItem('itemsSeleccionados')) || [];

    // Validar cantidad (solo mayor a 0)
    if (parseInt(nuevaCantidad) > 0) {
        items[index].cantidad = nuevaCantidad;

        // Guardar en sessionStorage
        sessionStorage.setItem('itemsSeleccionados', JSON.stringify(items));
    } else {
        Mensaje('warning', '¡Espera!', 'La cantidad debe ser mayor a 0.', true, false);
    }
}
async function manejarPedido(estado) {
    // Obtener valores de la UI
    const itemsSeleccionados = JSON.parse(sessionStorage.getItem('itemsSeleccionados')) || [];
    const idaprueba = document.getElementById('aprobadoPor')?.value || null;
    const idproveedor = document.getElementById('proveedor')?.value || null;

    const depVal = document.getElementById('IdDependencia')?.value ?? '';
    const subdepVal = document.getElementById('IdSubdependencia')?.value ?? '';
    const iddependencia = depVal ? parseInt(depVal, 10) : null;
    const idsubdependencia = subdepVal ? parseInt(subdepVal, 10) : null;

    // --- Validaciones base ---
    if (!iddependencia) {
        Mensaje('warning', '¡Espera!', 'Debes seleccionar una dependencia válida.', false, false);
        return;
    }

    const tieneSubdependenciasActivas = await (async () => {
        const isActive = v => v === true || v === 1 || v === '1';
        let deps = [];
        const cache = window.__dependenciasCache;
        if (Array.isArray(cache)) {
            deps = cache;
        } else if (cache && Array.isArray(cache.dependencias)) {
            deps = cache.dependencias;
        }

        if (!deps.length) {
            try {
                const idusuario = localStorage.getItem('idusuario');
                const resp = await fetch(`${url}/api/compras/obtenerDependencias/${idusuario}`, { credentials: 'include' });
                if (resp.ok) {
                    const data = await resp.json();
                    deps = Array.isArray(data) ? data : (data.dependencias || []);
                    window.__dependenciasCache = deps;
                }
            } catch (e) {
                console.error('No se pudo consultar dependencias para validar subdependencias:', e);
            }
        }

        const dep = deps.find(d => Number(d.iddependencia) === Number(iddependencia));
        if (!dep) return false;
        const subdeps = Array.isArray(dep.subdependencias) ? dep.subdependencias
            : Array.isArray(dep.Subdependencias) ? dep.Subdependencias
                : [];
        return subdeps.some(s => isActive(s.estado));
    })();

    if (tieneSubdependenciasActivas && !idsubdependencia) {
        Mensaje('warning', '¡Espera!', 'Debes seleccionar una subdependencia válida.', false, false);
        return;
    }

    if (itemsSeleccionados.length === 0) {
        Mensaje('warning', 'Espera!', 'No hay items para guardar.', false, false);
        return;
    }

    if (estado === 'SINREFERENCIA' && !idaprueba) {
        Mensaje('warning', 'Espera!', 'Debes seleccionar quién aprueba el pedido.', false, false);
        return;
    }

    if (estado === 'SINREFERENCIA' && !idproveedor) {
        Mensaje('warning', 'Espera!', 'Debes seleccionar el proveedor del pedido.', false, false);
        return;
    }

    const payload = {
        idusuario: localStorage.getItem('idusuario') || null,
        items: itemsSeleccionados,
        estado: estado,
        idaprueba: idaprueba,
        iddependencia: iddependencia,
        idsubdependencia: idsubdependencia || null
    };

    fetch(`${url}/api/compras/manejarPedido`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
    })
        .then(async response => {
            if (!response.ok) {
                // ⚡ Manejar validación del backend
                const errorData = await response.json().catch(() => ({}));

                if (response.status === 400 && errorData.message?.includes('Ya existe un pedido INICIADO')) {
                    // Usamos la función Mensaje con confirmación
                    const result = await Mensaje(
                        "warning",
                        "¡Espera!",
                        "Ya existe un pedido iniciado para esta dependencia.",
                        true, // autoCerrar
                        false   // confirmacion
                    );

                    // Si el mensaje se autocierra, no redirigir ni actualizar vista
                    return; // Salir de la función
                }

                // Si no es el error específico, mostramos mensaje genérico
                await Mensaje("error", "Error", "Error al guardar el encargo", true, false);
                throw new Error("Error al guardar el encargo");
            }

            return response.json();
        })

        .then(data => {
            // Si el paso anterior terminó por autocierre, no hacer nada
            if (!data) return;

            if (estado === 'SINREFERENCIA') {
                console.log('ID del pedido generado:', data.idpedido);
                const idusuario = localStorage.getItem('idusuario');
                generarOrdenDesdePedido(itemsSeleccionados, idusuario, idproveedor)
                    .then(resp => relacionarPedidoYOrden(data.idpedido, resp.idorden))
                    .then(() => console.log('Pedido y orden relacionados correctamente.'))
                    .catch(err => console.error('Error al generar orden o relacionar:', err));
            }

            if (estado === 'CERRADO') {
                Mensaje('success', 'Éxito!', 'El encargo ha sido cerrado con éxito.', true, false);
                sessionStorage.removeItem('itemsSeleccionados');
            } else if (estado === 'SINREFERENCIA') {
                Mensaje('success', 'Éxito!', 'Orden de compra generada exitosamente.', true, false);
                sessionStorage.removeItem('itemsSeleccionados');
            } else {
                Mensaje('success', 'Éxito!', 'El encargo se ha guardado correctamente.', true, false);
            }

            let redireccionUrl = '';
            if (estado === 'INICIADO') {
                redireccionUrl = `/compras/continuarpedido?idpedido=${data.idpedido}`;
            } else if (estado === 'CERRADO') {
                redireccionUrl = '/compras/pedidos';
            } else if (estado === 'SINREFERENCIA') {
                redireccionUrl = '/compras/ordenes';
            }

            window.history.replaceState(null, "", redireccionUrl);
            cargarVista(redireccionUrl, false);
        })
        .catch(error => {
            console.error('Error al guardar el encargo:', error);
            if (!error.message.includes('Ya existe un pedido INICIADO')) {
                Mensaje('error', 'Error!', 'Hubo un problema al guardar el encargo.', false, false);
            }
        });
}

async function generarOrdenDesdePedido(items, idusuario, idproveedor) {
    const ordenItems = items.map(item => ({
        iditem: parseInt(item.id),
        total: parseInt(item.cantidad),
        valor: 0,
        observacion: item.notas || "",
    }));

    const orden = {
        tipo: "COMPRA",
        idusuario: parseInt(idusuario),
        idproveedor: idproveedor,
        items: ordenItems
    };

    console.log(orden)

    return fetch(`${url}/api/compras/manejarOrden`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(orden)
    }).then(res => {
        if (!res.ok) throw new Error('Error al crear la orden');
        return res.json(); // { idorden }
    });
}

async function relacionarPedidoYOrden(idpedido, idorden) {
    const relaciones = [{ idpedido, idorden }];
    const estadopedido = 'SINREFERENCIA';
    const estadoorden = 'SINREFERENCIA';

    return fetch(`${url}/api/compras/guardarRelacion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
            relaciones,
            estadopedido,
            estadoorden
        })
    })
        .then(res => {
            if (!res.ok) throw new Error('Error al relacionar pedido y orden');
            return res.json(); // mensaje
        });
}
