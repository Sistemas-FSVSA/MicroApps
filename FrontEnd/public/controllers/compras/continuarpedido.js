document.addEventListener("DOMContentLoaded", () => {
    InicializarContinuarPedido();
});

async function InicializarContinuarPedido() {
    permisos = await cargarPermisosContinuarPedidos(); // sin let aquí, usas la variable global
    añadirItems();
    renderizarItemsEncargo();

    // Agregar eventos a los botones
    document.getElementById('guardarEncargo').addEventListener('click', () => {
        manejarPedido('INICIADO', idpedido); // Estado para guardar
    });

    document.getElementById('cerrarEncargo').addEventListener('click', () => {
        manejarPedido('CERRADO', idpedido); // Estado para aprobar
    });

    document.getElementById('aprobarEncargo').addEventListener('click', () => {
        manejarPedido('APROBADO', idpedido); // Estado para aprobar
    });

    document.getElementById('agregarItem').addEventListener('click', function () {
        let modal = new bootstrap.Modal(document.getElementById('modalAñadirItem'));
        modal.show();
    });

    const urlParams = new URLSearchParams(window.location.search);
    const idpedido = urlParams.get('idpedido');

    // Verificar si ya hay datos en el sessionStorage
    const itemsEnSessionStorage = sessionStorage.getItem('itemsSeleccionados');

    if (itemsEnSessionStorage) {
        renderizarItemsEncargo(); // Renderizar los ítems existentes
        return; // No sobrescribir los datos existentes
    }

    if (idpedido) {
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
                // Guardar los ítems en el sessionStorage solo si no existen previamente
                if (data.detalle && Array.isArray(data.detalle)) {
                    sessionStorage.setItem('itemsSeleccionados', JSON.stringify(data.detalle));
                    renderizarItemsEncargo(); // Renderizar los ítems obtenidos
                } else {
                    console.warn('No se encontraron ítems en el pedido');
                }
            })
            .catch(error => {
                console.error('Error al obtener el pedido:', error);
            });
    } else {
        console.warn('No se encontró el idpedido en la URL');
    }
}

function renderizarItemsEncargo() {
    const dataTable = $('#tablaItemsSeleccionados').DataTable();

    // Limpiar la tabla antes de cargar los datos
    dataTable.clear().draw();

    const items = JSON.parse(sessionStorage.getItem('itemsSeleccionados')) || [];

    items.forEach((item, index) => {
        // Crear la fila como un array de datos
        const rowData = [
            item.id,
            item.nombre,
            item.categoria,
            `<input type="number" class="form-control input-cantidad" value="${item.cantidad}" min="1" data-index="${index}">`,
            item.nombreCompleto,
            (permisos.tienePermisoEliminarItem ? // Verificar permisos
                `<button class="btn btn-danger btn-eliminar-item" data-index="${index}">
                    <i class="fas fa-trash"></i>
                </button>` : '')
        ];

        // Agregar la fila a la tabla usando DataTables
        dataTable.row.add(rowData).draw();
    });

    // Agregar evento a los botones de eliminar
    document.querySelectorAll('.btn-eliminar-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = btn.getAttribute('data-index');
            eliminarItemDeSessionStorage(index);
        });
    });

    // Agregar evento a los inputs de cantidad
    document.querySelectorAll('.input-cantidad').forEach(input => {
        input.addEventListener('input', (e) => {
            const index = input.getAttribute('data-index');
            actualizarCantidadEnSessionStorage(index, input.value);
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
        alert("La cantidad debe ser mayor a 0.");
    }
}

function manejarPedido(estado, idpedido) {
    // Obtener los ítems del sessionStorage
    const itemsSeleccionados = JSON.parse(sessionStorage.getItem('itemsSeleccionados')) || [];

    if (itemsSeleccionados.length === 0) {
        Mensaje('warning', 'Espera!', 'No hay items para guardar.', false, false);
        return;
    }

    // Crear el objeto JSON con la información necesaria
    const encargo = {
        idusuario: localStorage.getItem('idusuario') || null,
        idpedido: idpedido || null, // Agregar el idpedido al body
        items: itemsSeleccionados,
        estado: estado // Agregar el estado al body
    };

    // Enviar el JSON al endpoint por medio de fetch
    fetch(`${url}/api/compras/manejarPedido`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(encargo)
    })
        .then(response => {
            // Verificar si la respuesta es exitosa
            if (!response.ok) {
                throw new Error('Error al guardar el encargo');
            }
            return response.json(); // Cambiar a .json() para obtener el idpedido del backend
        })
        .then(data => {
            // Determinar el mensaje y la acción según el estado
            if (estado === 'CERRADO') {
                Mensaje('success', 'Éxito!', 'El encargo ha sido cerrado con éxito.', true, false);
                sessionStorage.removeItem('itemsSeleccionados'); // Borrar el sessionStorage
            } else if (estado === 'APROBADO') {
                Mensaje('success', 'Éxito!', 'Encargo aprobado con éxito.', true, false);
            } else {
                Mensaje('success', 'Éxito!', 'El encargo se ha guardado correctamente.', true, false);
            }

            // Determinar la URL de redirección según el estado
            let redireccionUrl = '';
            if (estado === 'INICIADO') {
                redireccionUrl = `/compras/continuarpedido?idpedido=${data.idpedido}`;
            } else if (estado === 'CERRADO') {
                redireccionUrl = '/compras/pedidos';
            } else if (estado === 'APROBADO') {
                redireccionUrl = '/compras/aprobarpedido';
            }

            // Redirección después de 2 segundos
            setTimeout(() => {
                window.history.replaceState(null, "", redireccionUrl);
                cargarVista(redireccionUrl);
            }, 2000);
        })
        .catch(error => {
            // Manejar errores
            console.error('Error al guardar el encargo:', error);
            Mensaje('error', 'Error!', 'Hubo un problema al guardar el encargo.', false, false);
        });
}