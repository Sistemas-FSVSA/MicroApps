document.addEventListener("DOMContentLoaded", () => {
    InicializarItemSolicitados();

});

async function InicializarItemSolicitados() {
    cargarItemSolicitados()

    document.getElementById('ordenSalida').addEventListener('click', function () {
        renderizarItemsSeleccionadosModal(); // <-- ¡Aquí!
        let modal = new bootstrap.Modal(document.getElementById('modalOrdenSalida'));
        modal.show();
    });
}

function renderizarItemsSeleccionadosModal() {
    const tbody = document.getElementById('tbodyOrdenSalida');
    tbody.innerHTML = '';

    const itemsSeleccionados = JSON.parse(sessionStorage.getItem('itemsSeleccionados')) || [];

    // ✅ Destruir DataTable si ya existe para evitar reinitialise error
    if ($.fn.DataTable.isDataTable('#ordenSalidaTable')) {
        $('#ordenSalidaTable').DataTable().clear().destroy();
    }

    itemsSeleccionados.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.iditem}</td>
            <td>${item.itemNombre}</td>
            <td>${item.categoriaNombre}</td>
            <td>
                <input type="number" class="form-control input-cantidad" 
                    data-iditem="${item.iditem}" 
                    value="${item.total}" 
                    min="1" style="width: 80px;">
            </td>
        `;
        tbody.appendChild(row);
    });

    // Escuchar cambios
    tbody.querySelectorAll('.input-cantidad').forEach(input => {
        input.addEventListener('input', function () {
            const iditem = parseInt(this.dataset.iditem);
            const nuevoValor = parseInt(this.value);
            let items = JSON.parse(sessionStorage.getItem('itemsSeleccionados')) || [];

            items = items.map(item => {
                if (item.iditem === iditem) {
                    return { ...item, total: nuevoValor };
                }
                return item;
            });

            sessionStorage.setItem('itemsSeleccionados', JSON.stringify(items));
            console.log(`Cantidad actualizada para ID ${iditem}:`, nuevoValor);
        });
    });


    $('#ordenSalidaTable').DataTable({
        pageLength: 5,
        lengthChange: false,
        searching: false,
        language: {
            url: "https://cdn.datatables.net/plug-ins/1.10.16/i18n/Spanish.json"
        }
    });

}

async function manejarOrden() {
    const itemsSeleccionados = JSON.parse(sessionStorage.getItem('itemsSeleccionados')) || [];
    const idusuario = localStorage.getItem('idusuario'); // Capturar idusuario del localStorage

    // Validación básica
    if (!Array.isArray(itemsSeleccionados) || itemsSeleccionados.length === 0) {
        console.warn('No hay items seleccionados para enviar.');
        alert('No hay datos para enviar.');
        return;
    }

    if (!idusuario) {
        console.warn('No se encontró el idusuario en el localStorage.');
        alert('No se encontró el idusuario. Por favor, inicie sesión nuevamente.');
        return;
    }

    try {
        const data = {
            idusuario, // Incluir idusuario en la data
            items: itemsSeleccionados
        };

        const respuesta = await fetch(`${url}/api/compras/manejarOrden`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(data)
        });

        const resultado = await respuesta.json();

        if (respuesta.ok) {
            console.log('Orden Generada exitosamente:', resultado);
            alert('Orden Generada exitosamente.');

            // Limpiar sessionStorage
            sessionStorage.removeItem('itemsSeleccionados');

            // Forzar cierre del modal
            $('#modalOrdenSalida').removeClass('show').removeAttr('style').attr('aria-hidden', 'true');
            $('.modal-backdrop').remove();
            $('body').removeClass('modal-open');

            // Recargar los items solicitados
            await cargarItemSolicitados();
        } else {
            console.error('Error al generar la orden:', resultado);
            alert('Error al generar la orden. Ver consola para más detalles.');
        }

    } catch (error) {
        console.error('Error en la solicitud:', error);
        alert('Error de conexión al generar la orden.');
    }
}

async function cargarItemSolicitados() {
    try {
        const response = await fetch(`${url}/api/compras/obtenerItemsPedido`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error('Error al obtener el pedido');
        }

        const data = await response.json();
        renderizarTablaItems(data.items, data.itemsOrden);
    } catch (error) {
        console.error("Error:", error);
    }
}

function getItemsSeleccionados() {
    const data = sessionStorage.getItem("itemsSeleccionados");
    return data ? JSON.parse(data) : [];
}

function guardarItemsSeleccionados(items) {
    sessionStorage.setItem("itemsSeleccionados", JSON.stringify(items));
}

function toggleItemSeleccionado(item) {
    let items = getItemsSeleccionados();
    const existe = items.find(i => i.iditem === item.iditem);

    if (existe) {
        items = items.filter(i => i.iditem !== item.iditem);
    } else {
        const cantidad = item.diferencia > 0 ? item.diferencia : 0;

        items.push({
            iditem: item.iditem,
            itemNombre: item.itemNombre,
            categoriaNombre: item.categoriaNombre,
            total: cantidad
        });
    }
    guardarItemsSeleccionados(items);
}


function renderizarTablaItems(items, itemsOrden) {
    const $tbody = $("#tbodyitem");
    $tbody.empty();

    const seleccionados = getItemsSeleccionados().map(i => i.iditem);

    if ($.fn.DataTable.isDataTable("#tablaItemsSeleccionados")) {
        $('#tablaItemsSeleccionados').DataTable().clear().destroy();
    }

    items.forEach((item) => {
        const checked = seleccionados.includes(item.iditem) ? 'checked' : '';

        // Buscar item en itemsOrden por iditem
        const itemOrden = itemsOrden.find(io => io.iditem === item.iditem);
        const totalOrden = itemOrden ? itemOrden.total : 0;
        const diferencia = item.total - totalOrden;

        // Agregar propiedades al objeto original
        item.totalOrden = totalOrden;
        item.diferencia = diferencia;


        const fila = `
            <tr data-iditem="${item.iditem}" class="fila-item" style="cursor: pointer;">
                <td>${item.iditem}</td>
                <td>${item.itemNombre}</td>
                <td>${item.categoriaNombre}</td>
                <td>${item.total}</td>
                <td>${totalOrden}</td>
                <td>${diferencia}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="verDetalle(${item.iditem}); event.stopPropagation();">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
                <td class="text-center">
                    <div class="form-check d-flex justify-content-center mb-0">
                        <input class="form-check-input checkbox-item" type="checkbox" id="check-${item.iditem}" data-iditem="${item.iditem}" ${checked}>
                        <label class="form-check-label" for="check-${item.iditem}"></label>
                    </div>
                </td>
            </tr>
        `;
        $tbody.append(fila);
    });

    // Eventos como los tenías antes
    $(".checkbox-item").on("click", function (e) {
        e.stopPropagation();
        const iditem = parseInt($(this).data("iditem"));
        const item = items.find(i => i.iditem === iditem);
        toggleItemSeleccionado(item);
    });

    $(".fila-item").on("click", function (e) {
        if ($(e.target).is("input, button, i, label")) return;

        const iditem = parseInt($(this).data("iditem"));
        const $checkbox = $(`#check-${iditem}`);
        $checkbox.prop("checked", !$checkbox.prop("checked"));

        const item = items.find(i => i.iditem === iditem);
        toggleItemSeleccionado(item);
    });

    $('#tablaItemsSeleccionados').DataTable({
        language: {
            url: 'https://cdn.datatables.net/plug-ins/1.13.4/i18n/es-ES.json'
        }
    });
}
