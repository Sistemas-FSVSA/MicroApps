document.addEventListener("DOMContentLoaded", () => {
    InicializarEncargos();
    
});

function InicializarEncargos() {
    establecerEventoInput();

    document.getElementById('agregarItem').addEventListener('click', function () {
        let modal = new bootstrap.Modal(document.getElementById('modalAñadirItem'));
        modal.show();
    });
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
            <td><button class="btn btn-danger"><i class="fas fa-trash"></i></button></td>
        `;
        tbody.appendChild(row);
    });

    // Inicializar o actualizar DataTables
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

// 🔹 Función para limpiar la tabla
function limpiarTabla() {
    const tbody = document.getElementById('tbodyNuevoItem');
    tbody.innerHTML = ''; // Vaciar la tabla

    // Si DataTable ya está inicializado, también limpiarlo
    if ($.fn.DataTable.isDataTable('#itemTable')) {
        $('#itemTable').DataTable().clear().draw();
    }
}
