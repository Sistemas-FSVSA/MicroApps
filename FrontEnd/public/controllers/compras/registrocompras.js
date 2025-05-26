document.addEventListener("DOMContentLoaded", () => {
    InicializarRegistroCompras();
});

function InicializarRegistroCompras() {
    document.getElementById('registrarItems').addEventListener('click', function () {
        manejarBusquedaItems()
        let modal = new bootstrap.Modal(document.getElementById('modalEditarItem'));
        modal.show();
    });

    document.getElementById('btnRegistrarItems').addEventListener('click', async function () {
        await obtenerCategoria(); // Cargar categorías antes de mostrar el modal
        const modal = new bootstrap.Modal(document.getElementById('modalRegistrarItems'));
        modal.show();
    });

    document.getElementById('btnConfirmarRegistro').addEventListener('click', function () {
        registrarNuevoItem();
    });

}

async function registrarNuevoItem() {
    const idcategoria = document.getElementById('selectCategoria').value;
    const nombreItem = document.getElementById('inputNombreItem').value.trim();
    const descripcionItem = document.getElementById('inputDescripcionItem').value.trim();

    if (!idcategoria) {
        alert('Seleccione una categoría');
        return;
    }

    if (!nombreItem) {
        alert('Ingrese un nombre para el ítem');
        return;
    }

    if (!descripcionItem) {
        alert('Ingrese un nombre para el ítem');
        return;
    }

    const payload = {
        idcategoria: parseInt(idcategoria),
        items: [
            {
                nombre: nombreItem,
                descripcion: descripcionItem || null // puedes agregar un input si quieres permitir descripción
            }
        ]
    };

    try {
        const response = await fetch(`${url}/api/compras/guardarItem`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(payload)
        });

        console.log('HTTP status:', response.status);
        console.log('Response.ok:', response.ok);

        if (response.ok) {
            alert('Ítem registrado correctamente');
            document.getElementById('inputNombreItem').value = '';
            document.getElementById('selectCategoria').value = '';
            document.getElementById('inputDescripcionItem').value = '';
           $('#modalRegistrarItems').modal('hide');
        } else {
            let errorMessage = 'Error desconocido';
            try {
                const error = await response.json();
                errorMessage = error.mensaje || error.error || errorMessage;
            } catch (e) {
                console.warn('La respuesta no es JSON válida');
            }
            alert(`Error al registrar: ${errorMessage}`);
        }

    } catch (error) {
        console.error('Error en registrarNuevoItem():', error);
        alert('Error al registrar el ítem');
    }
}

async function obtenerCategoria() {
    try {
        const response = await fetch(`${url}/api/compras/obtenerCategoria`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({})
        });

        if (!response.ok) throw new Error('Error al obtener las categorías');

        const data = await response.json();

        const select = document.getElementById('selectCategoria');
        select.innerHTML = '<option value="">Seleccione una categoría</option>'; // Limpiar opciones anteriores

        // Filtrar solo las categorías activas (estado === true)
        const categoriasActivas = data.filter(cat => cat.estado === true);

        categoriasActivas.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.idcategoriaitem;
            option.textContent = cat.nombre;
            select.appendChild(option);
        });

        if (categoriasActivas.length === 0) {
            const option = document.createElement('option');
            option.disabled = true;
            option.textContent = 'No hay categorías activas';
            select.appendChild(option);
        }

    } catch (error) {
        console.error('Error en obtenerCategoria():', error);
        alert('No se pudieron cargar las categorías');
    }
}

function manejarBusquedaItems() {
    const input = document.getElementById('inputNuevoItem');

    input.addEventListener('input', function () {
        const query = input.value.trim();

        if (query.length > 0) {
            fetch(`${url}/api/compras/obtenerItems?query=${encodeURIComponent(query)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            })
                .then(response => response.json())
                .then(data => {
                    actualizarTabla(data);
                })
                .catch(error => {
                    console.error('Error al buscar items:', error);
                });
        } else {
            actualizarTabla([]); // Limpiar tabla si el input está vacío
        }
    });
}

function actualizarTabla(data) {
    const tbody = document.getElementById('tbodyEditarItem');
    tbody.innerHTML = '';

    data.forEach(item => {
        const row = document.createElement('tr');

        row.innerHTML = `
            <td>${item.itemId}</td>
            <td>${item.itemNombre}</td>
            <td>${item.categoriaNombre}</td>
            <td>
                <button 
                    class="btn btn-fsvsaon btn-editar-item"
                    data-id="${item.itemId}">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
            <td>
                <label class="switch">
                    <input type="checkbox" class="switch-estado" data-id="${item.itemId}" ${item.estado ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            </td>
        `;

        tbody.appendChild(row);
    });

    document.querySelectorAll('.switch-estado').forEach(input => {
        input.addEventListener('change', () => {
            const id = input.getAttribute('data-id');
            const nuevoEstado = input.checked;
            actualizarEstadoItemFront(id, nuevoEstado);
        });
    });


    // Re-renderizar datatable
    if (!$.fn.DataTable.isDataTable('#EditaritemTable')) {
        $('#EditaritemTable').DataTable({
            pageLength: 5,
            lengthChange: false,
            searching: false,
            destroy: true,
            language: {
                url: "https://cdn.datatables.net/plug-ins/1.10.16/i18n/Spanish.json"
            },
        });
    } else {
        $('#EditaritemTable').DataTable().clear().rows.add($('#tbodyEditarItem tr')).draw();
    }
}

async function actualizarEstadoItemFront(iditem, estado) {
    try {
        const response = await fetch(`${url}/api/compras/actualizarEstadoItem`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                iditem: parseInt(iditem),
                estado: estado
            })
        });

        if (response.status === 200) {
            Mensaje("success", "Exito", "Estado actualizado correctamente.", true, false);
        } else {
            const data = await response.json();
            alert(`Error: ${data.mensaje || 'No se pudo actualizar'}`);
            revertirSwitch(iditem);
        }
    } catch (error) {
        console.error('Error al actualizar estado:', error);
        alert('Error de conexión con el servidor');
        revertirSwitch(iditem);
    }
}
