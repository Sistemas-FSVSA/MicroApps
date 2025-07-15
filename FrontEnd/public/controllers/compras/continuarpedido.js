document.addEventListener("DOMContentLoaded", () => {
    InicializarContinuarPedido();
});

async function InicializarContinuarPedido() {
    const urlParams = new URLSearchParams(window.location.search);
    const idpedido = urlParams.get('idpedido');

    permisos = await cargarPermisosContinuarPedidos(); // sin let aquí, usas la variable global
    añadirItems();
    renderizarItemsEncargo();

    // Agregar eventos a los botones
    document.getElementById('guardarEncargo').addEventListener('click', () => {
        manejarPedido('INICIADO', idpedido);
    });

    document.getElementById('cerrarEncargo').addEventListener('click', () => {
        manejarPedido('CERRADO', idpedido);
    });

    document.getElementById('aprobarEncargo').addEventListener('click', () => {
        manejarPedido('APROBADO', idpedido, localStorage.getItem('idusuario'));
    });

    document.getElementById('autorizarEncargo').addEventListener('click', () => {
        manejarPedido('AUTORIZADO', idpedido);
    });

    document.getElementById('confirmarEntrega').addEventListener('click', () => {
        confirmarEntrega('ENTREGADO', idpedido);
    });

    document.getElementById('agregarItem').addEventListener('click', function () {
        let modal = new bootstrap.Modal(document.getElementById('modalAñadirItem'));
        modal.show();
    });

    cargarDatosDelPedido(idpedido);

    configurarNavegacionPedidos();

    cargarAprobado();
}


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

function cargarDatosDelPedido(idpedido) {
    fetch(`${url}/api/compras/obtenerPedido`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ idpedido })
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Error al obtener el pedido');
            }
            return response.json();
        })
        .then(data => {
            renderizadoInfo(data); // SIEMPRE renderiza info general

            const itemsEnSessionStorage = sessionStorage.getItem('itemsSeleccionados');

            if (!itemsEnSessionStorage && data.detalle && Array.isArray(data.detalle)) {
                sessionStorage.setItem('itemsSeleccionados', JSON.stringify(data.detalle));
                renderizarItemsEncargo(); // Renderizar los ítems obtenidos
            } else if (itemsEnSessionStorage) {
                renderizarItemsEncargo(); // Renderizar ítems desde session
            } else {
                console.warn('No se encontraron ítems en el pedido');
            }
        })
        .catch(error => {
            console.error('Error al obtener el pedido:', error);
        });
}

function renderizadoInfo(data) {
    const dependenciaPedidoSpan = document.getElementById('dependenciaPedido');
    if (dependenciaPedidoSpan) {
        const { nombreDependencia, idpedido } = data;
        dependenciaPedidoSpan.textContent = `${nombreDependencia}, Pedido N°: ${idpedido}`;
    } else {
        console.warn('No se encontró el elemento con id "dependenciaPedido" en el HTML.');
    }
}

function renderizarItemsEncargo() {
    const dataTable = $('#tablaItemsSeleccionados').DataTable();

    dataTable.clear().draw();

    const items = JSON.parse(sessionStorage.getItem('itemsSeleccionados')) || [];

    items.forEach((item, index) => {
        // Botón de eliminar
        const btnEliminar = permisos.tienePermisoEliminarItem
            ? `<button class="btn btn-danger btn-eliminar-item" data-index="${index}">
                    <i class="fas fa-trash"></i>
               </button>`
            : '';



        // Botón de nota con campanita si aplica
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
            `<input type="number" class="form-control input-cantidad" value="${item.cantidad}" min="1" data-index="${index}" ${permisos.tienePermisoEditarCantidad ? '' : 'disabled'}>`,
            item.nombreCompleto,
            btnEliminar + ' ' + btnNota
        ];

        dataTable.row.add(rowData).draw();
    });

    // Eventos
    document.querySelectorAll('.btn-eliminar-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = btn.getAttribute('data-index');
            eliminarItemDeSessionStorage(index);
        });
    });

    document.querySelectorAll('.input-cantidad').forEach(input => {
        input.addEventListener('input', () => {
            const index = input.getAttribute('data-index');
            actualizarCantidadEnSessionStorage(index, input.value);
        });
    });

    document.querySelectorAll('.btn-nota-item').forEach(btn => {
        btn.addEventListener('click', async () => {
            const index = btn.getAttribute('data-index');
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
                renderizarItemsEncargo(); // Recargar para actualizar campanita
            }
        });
    });
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
                    actualizarTabla(data);
                })
                .catch(error => {
                    console.error('Error en la petición:', error);
                });
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
                nombreCompleto: `${localStorage.getItem('nombres') || ''} ${localStorage.getItem('apellidos') || ''}`.trim()
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

    // Actualizar la tabla principal
    renderizarItemsEncargo();


    // Mostrar mensaje de éxito
    Mensaje('success', 'Éxito!', 'Item agregado exitosamente.', true, false);
}

function eliminarItemDeSessionStorage(index) {
    let items = JSON.parse(sessionStorage.getItem('itemsSeleccionados')) || [];

    // Eliminar el ítem por índice
    items.splice(index, 1);

    // Guardar la nueva lista
    sessionStorage.setItem('itemsSeleccionados', JSON.stringify(items));

    // Volver a renderizar la tabla
    renderizarItemsEncargo();
}

function actualizarCantidadEnSessionStorage(index, nuevaCantidad) {
    let items = JSON.parse(sessionStorage.getItem('itemsSeleccionados')) || [];

    // Validar cantidad (solo mayor a 0)
    if (parseInt(nuevaCantidad) > 0) {
        items[index].cantidad = nuevaCantidad;

        // Guardar en sessionStorage
        sessionStorage.setItem('itemsSeleccionados', JSON.stringify(items));
    } else {
        Mensaje('warning', '¡Cuidado!', 'La cantidad debe ser mayor a 0.', true, false);
    }
}

function manejarPedido(estado, idpedido) {
    // Obtener los ítems del sessionStorage
    const itemsSeleccionados = JSON.parse(sessionStorage.getItem('itemsSeleccionados')) || [];
    // Obtener el idaprueba seleccionado del <select>
    const idaprueba = document.getElementById('aprobadoPor')?.value || null;

    if (itemsSeleccionados.length === 0) {
        Mensaje('warning', 'Espera!', 'No hay items para gestionar.', false, false);
        return;
    }

    if (estado === 'AUTORIZADO' && !idaprueba) {
        Mensaje('warning', 'Espera!', 'Debes seleccionar quién aprueba el pedido.', false, false);
        return;
    }



    // Crear el objeto JSON con la información necesaria
    const encargo = {
        idusuario: localStorage.getItem('idusuario') || null,
        idpedido: idpedido || null,
        idaprueba: idaprueba, // 🔹 Se añade el id del aprobador seleccionado
        items: itemsSeleccionados,
        estado: estado
    };

    // Enviar el JSON al endpoint por medio de fetch
    fetch(`${url}/api/compras/manejarPedido`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(encargo)
    })
        .then(response => {
            if (!response.ok) throw new Error('Error al guardar el encargo');
            return response.json();
        })
        .then(async data => {
            if (estado === 'AUTORIZADO') {
                let pedidos = await obtenerPedidos(); // Todos los pedidos en estado APROBADO

                // 🔧 Ordenar los pedidos por idpedido de forma ascendente (secuencial)
                pedidos = pedidos.sort((a, b) => a.idpedido - b.idpedido);

                const idActual = idpedido;
                const idsOrdenados = pedidos.map(p => p.idpedido);

                // 🔍 Buscar siguiente idpedido aprobado que sea mayor al actual
                const siguiente = idsOrdenados.find(id => id > idActual);

                // 🔍 Si no hay uno adelante, buscar uno anterior (menor)
                const anterior = !siguiente ? [...idsOrdenados].reverse().find(id => id < idActual) : null;

                const idDestino = siguiente || anterior;

                if (idDestino) {
                    Mensaje('info', 'Info', `Pedido autorizado. Redirigiendo al pedido #${idDestino}...`, true, false);
                    setTimeout(() => {
                        const nuevaUrl = `/compras/continuarpedido?idpedido=${idDestino}`;
                        sessionStorage.removeItem('itemsSeleccionados');
                        cargarVista(nuevaUrl, false);
                    }, 1000);
                } else {
                    Mensaje('info', 'Info', 'No hay más pedidos aprobados para autorizar.', true, false);
                    setTimeout(() => {
                        irAtras();
                    }, 1000);
                }
                return;
            }

            // Resto de estados
            if (estado === 'CERRADO') {
                Mensaje('success', 'Éxito!', 'El encargo ha sido cerrado con éxito.', true, false);
            } else if (estado === 'APROBADO') {
                Mensaje('success', 'Éxito!', 'Encargo aprobado con éxito.', true, false);
            } else {
                Mensaje('success', 'Éxito!', 'El encargo se ha guardado correctamente.', true, false);
            }

            // Limpiar el sessionStorage después de una acción exitosa
            sessionStorage.removeItem('itemsSeleccionados');

            let redireccionUrl = '';
            if (estado === 'INICIADO') {
                redireccionUrl = `/compras/continuarpedido?idpedido=${data.idpedido}`;
            } else if (estado === 'CERRADO') {
                redireccionUrl = '/compras/pedidos';
            } else if (estado === 'APROBADO') {
                redireccionUrl = '/compras/aprobarpedido';
            }

            // Redirección inmediata
            window.history.replaceState(null, "", redireccionUrl);
            cargarVista(redireccionUrl, false);
        })
        .catch(error => {
            console.error('Error al guardar el encargo:', error);
            Mensaje('error', 'Error!', 'Hubo un problema al guardar el encargo.', false, false);
        });
}

async function obtenerPedidos() {
    const response = await fetch(`${url}/api/compras/obtenerPedido`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ estado: 'APROBADO' })
    });

    if (!response.ok) throw new Error('Error al obtener los pedidos aprobados');
    const data = await response.json();
    return data.pedidos || [];
}

async function configurarNavegacionPedidos() {
    const urlParams = new URLSearchParams(window.location.search);
    const idpedidoActual = parseInt(urlParams.get('idpedido'));

    const pedidos = await obtenerPedidos();
    const ids = pedidos.map(p => p.idpedido);
    const indiceActual = ids.indexOf(idpedidoActual);

    if (indiceActual === -1) return;

    // 👈 Ir al pedido anterior
    document.getElementById('flechaIzquierda').addEventListener('click', async () => {
        if (indiceActual > 0) {
            sessionStorage.removeItem('itemsSeleccionados');
            const idAnterior = ids[indiceActual - 1];
            const nuevaUrl = `/compras/continuarpedido?idpedido=${idAnterior}`;
            await cargarVista(nuevaUrl, false);
        }
    });

    // 👉 Ir al siguiente pedido
    document.getElementById('flechaDerecha').addEventListener('click', async () => {
        if (indiceActual < ids.length - 1) {
            sessionStorage.removeItem('itemsSeleccionados');
            const idSiguiente = ids[indiceActual + 1];
            const nuevaUrl = `/compras/continuarpedido?idpedido=${idSiguiente}`;
            await cargarVista(nuevaUrl, false);
        }
    });
}

async function confirmarEntrega(estado, idpedido) {
    try {
        const idusuario = localStorage.getItem('idusuario');
        const respuesta = await fetch(`${url}/api/compras/actualizarEstadoPedido`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                idpedido,
                estado: estado,
                idusuario: idusuario
            })
        });

        if (!respuesta.ok) throw new Error("Error al actualizar el estado del pedido");

        Swal.fire({
            icon: "success",
            title: "Pedido enviado",
            text: "Confirmacion de entrega exitosa",
            confirmButtonText: "Aceptar"
        });

        irAtras();

    } catch (error) {
        console.error("Error al enviar el pedido a recepción:", error);
        Swal.fire({
            icon: "error",
            title: "Error",
            text: "No se pudo enviar el pedido a recepción.",
            confirmButtonText: "Aceptar"
        });
    }
}