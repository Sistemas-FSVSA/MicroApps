document.addEventListener("DOMContentLoaded", () => {
    InicializarItemSolicitados();
});

async function InicializarItemSolicitados() {
    cargarItemSolicitados()
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
        console.log(data);
        renderizarTablaItems(data.items);
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

function toggleItemSeleccionado(iditem) {
    let items = getItemsSeleccionados();
    if (items.includes(iditem)) {
        items = items.filter(id => id !== iditem);
    } else {
        items.push(iditem);
    }
    guardarItemsSeleccionados(items);
}

function renderizarTablaItems(items) {
    const $tbody = $("#tbodyitem");
    $tbody.empty();

    const seleccionados = getItemsSeleccionados();

    items.forEach((item, index) => {
        const checked = seleccionados.includes(item.iditem) ? 'checked' : '';
        const fila = `
            <tr data-iditem="${item.iditem}" class="fila-item" style="cursor: pointer;">
                <td>${index + 1}</td>
                <td>${item.itemNombre}</td>
                <td>${item.categoriaNombre}</td>
                <td>${item.total}</td>
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

    // Evento para clic en checkbox directamente
    $(".checkbox-item").on("click", function (e) {
        e.stopPropagation();
        const iditem = parseInt($(this).data("iditem"));
        toggleItemSeleccionado(iditem);
    });

    // Evento para clic en fila (menos en elementos interactivos)
    $(".fila-item").on("click", function (e) {
        if ($(e.target).is("input, button, i, label")) return;

        const iditem = parseInt($(this).data("iditem"));
        const $checkbox = $(`#check-${iditem}`);
        $checkbox.prop("checked", !$checkbox.prop("checked"));
        toggleItemSeleccionado(iditem);
    });

    // Reinicializar DataTable si aplica
    if ($.fn.DataTable.isDataTable("#tablaItemsSeleccionados")) {
        $('#tablaItemsSeleccionados').DataTable().clear().destroy();
    }
    $('#tablaItemsSeleccionados').DataTable({
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.4/i18n/es-ES.json'
        }
    });
}


