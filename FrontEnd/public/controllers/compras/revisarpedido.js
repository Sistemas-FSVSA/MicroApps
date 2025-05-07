document.addEventListener("DOMContentLoaded", () => {
    InicializarRevisarPedido();
});

async function InicializarRevisarPedido() {
    // Verificar si DataTable ya está inicializado
    if ($.fn.DataTable.isDataTable('#pedidoTable')) {
        $('#pedidoTable').DataTable().destroy(); // 🔥 Elimina la instancia previa
    }

    // Inicializa DataTable correctamente
    const table = $('#pedidoTable').DataTable({
        language: {
            url: 'https://cdn.datatables.net/plug-ins/1.13.4/i18n/es-MX.json'
        },
        columns: [
            { title: 'Pedido', data: 'idpedido' },
            { title: 'Dependencia', data: 'nombreDependencia' },
            {
                title: 'Fecha Pedido', data: 'fechapedido', render: function (data) {
                    return data ? formatFechaHora(data) : 'Sin fecha';
                }
            },
            { title: 'Total Items', data: 'totalItems' },
            {
                title: 'Acciones',
                data: null,
                render: function (data) {
                    return `<button type="button" class="btn btn-fsvsaoff ver-pedido" data-idpedido="${data.idpedido}"><i class="fas fa-eye"></i></button>`;
                },
                orderable: false
            }
        ],
        order: [[0, 'asc']], // Ordenar por la primera columna (ID del pedido) de forma descendente
    });

    // Obtener pedidos y actualizar la tabla
    obtenerPedidos(table);

    // Event listener para el botón "Ver Pedido"
    $('#pedidoTable').off('click', '.ver-pedido').on('click', '.ver-pedido', async function () {
        const idpedido = $(this).data('idpedido');

        const url = `/compras/continuarpedido?idpedido=${idpedido}`;

        window.history.pushState({ path: url }, "", url);
        await cargarVista(url);
    });
}

function obtenerPedidos(table) {
    const spinner = document.getElementById("spinner");
    if (spinner) showSpinner();

    fetch(`${url}/api/compras/obtenerPedido`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ estado: 'APROBADO' }) // Enviar el estado "CERRADO" en el cuerpo de la solicitud
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error en la respuesta de la API: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data && data.pedidos && data.pedidos.length > 0) {
                table.clear().rows.add(data.pedidos).draw(); // ✅ Ahora actualiza en vez de re-inicializar
            }
        })
        .catch(error => {
            console.error('Error al obtener los pedidos:', error);
        })
        .finally(() => {
            if (spinner) hideSpinner();
        });
}


