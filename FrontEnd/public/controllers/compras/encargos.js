document.addEventListener("DOMContentLoaded", () => {
    InicializarEncargos();
    

});

function InicializarEncargos() {
    establecerEventoInput();

    document.getElementById('agregarItem').addEventListener('click', function () {
        let modal = new bootstrap.Modal(document.getElementById('modalAñadirItem'));
        modal.show();
    });
    cargarItemsDesdeSessionStorage();
}

function establecerEventoInput() {
    const inputNuevoItem = document.getElementById('inputNuevoItem');

    inputNuevoItem.addEventListener('input', function () {
        const query = inputNuevoItem.value.trim();

        if (query.length > 0) {
            // Si hay algo escrito, hacer la petición
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
        } else {
            // Si el input está vacío, limpiar la tabla
            limpiarTabla();
        }
    });
}

function actualizarTabla(data) {
    const tbody = document.getElementById('tbodyNuevoItem');
    tbody.innerHTML = ''; // Limpiar el contenido previo de la tabla

    data.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
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
        btn.addEventListener('click', (e) => {
            const itemNombre = btn.getAttribute('data-nombre');
            const categoria = btn.getAttribute('data-categoria');
            const descripcion = btn.getAttribute('data-descripcion');

            // 🔁 Cerrar modal (versión Bootstrap 4)
            $('#modalAñadirItem').modal('hide');

            // ✅ Agregar a tabla principal
            agregarItemATablaPrincipal({
                nombre: itemNombre,
                categoria: categoria,
                descripcion: descripcion,
            });
        });
    });

    // Inicializar DataTable (opcional, si lo necesitas)
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

function guardarItemsEnSessionStorage() {
    const rows = document.querySelectorAll('#tbodyitem tr');
    const items = [];

    rows.forEach(row => {
        const nombre = row.children[0].textContent;
        const categoria = row.children[1].textContent;
        const cantidad = row.children[2].querySelector('input').value;
        const nombreCompleto = row.children[3].textContent;

        items.push({ nombre, categoria, cantidad, nombreCompleto });
    });

    sessionStorage.setItem('itemsSeleccionados', JSON.stringify(items));
}


function agregarItemATablaPrincipal(item) {
    const tbody = document.getElementById('tbodyitem');

    const nombres = localStorage.getItem('nombres') || '';
    const apellidos = localStorage.getItem('apellidos') || '';
    const nombreCompleto = `${nombres} ${apellidos}`.trim();

    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${item.nombre}</td>
        <td>${item.categoria}</td>
        <td><input type="number" class="form-control" value="1" min="1"></td>
        <td>${nombreCompleto}</td>
        <td>
            <button class="btn btn-danger"><i class="fas fa-trash"></i></button>
        </td>
    `;

    tbody.appendChild(row);

    // Guardar en sessionStorage
    guardarItemsEnSessionStorage();

    if (!$.fn.DataTable.isDataTable('#tablaItemsSeleccionados')) {
        $('#tablaItemsSeleccionados').DataTable({
            language: {
                url: "https://cdn.datatables.net/plug-ins/1.10.16/i18n/Spanish.json"
            },
        });
    } else {
        $('#tablaItemsSeleccionados').DataTable().row.add($(row)).draw();
    }
}

function cargarItemsDesdeSessionStorage() {
    const items = JSON.parse(sessionStorage.getItem('itemsSeleccionados')) || [];

    items.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.nombre}</td>
            <td>${item.categoria}</td>
            <td><input type="number" class="form-control" value="${item.cantidad}" min="1"></td>
            <td>${item.nombreCompleto}</td>
            <td>
                <button class="btn btn-danger"><i class="fas fa-trash"></i></button>
            </td>
        `;

        document.getElementById('tbodyitem').appendChild(row);

        if ($.fn.DataTable.isDataTable('#tablaItemsSeleccionados')) {
            $('#tablaItemsSeleccionados').DataTable().row.add($(row)).draw();
        }
    });
}



// 🔹 Función para limpiar la tabla
function limpiarTabla() {
    const tbody = document.getElementById('tbodyNuevoItem');
    tbody.innerHTML = ''; // Vaciar la tabla

    // Si DataTable ya está inicializado, también limpiarlo
    if ($.fn.DataTable.isDataTable('#itemTable')) {
        $('#itemTable').DataTable().clear().draw();
    }
}

