
document.addEventListener("DOMContentLoaded", () => {
    InicializarConsultarPedidos();

});

async function InicializarConsultarPedidos() {
    cargarPedidos();
}

async function cargarPedidos() {
    try {
        const respuesta = await fetch(`${url}/api/compras/obtenerPedido`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ estado: "FINALIZADO" })
        });

        if (!respuesta.ok) throw new Error("Error al obtener datos");

        const data = await respuesta.json();
        renderizarTabla(data.pedidos);;
    } catch (error) {
        document.getElementById("tbodyPedido").innerHTML = `<tr><td colspan="5">Error al cargar datos</td></tr>`;
    }
}

function renderizarTabla(pedidos) {
    const tablaId = "#tablePedidos";
    const tbody = document.getElementById("tbodyPedido");
    tbody.innerHTML = "";

    if (!pedidos || pedidos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center">No hay Pedidos para mostrar</td></tr>`;
    } else {
        pedidos.forEach((pedidos) => {
            const tr = document.createElement("tr");


            tr.innerHTML = `
                <td>${pedidos.idpedido}</td>
                <td>${pedidos.nombreDependencia}</td>
                <td>${formatFechaHora(pedidos.fechapedido)}</td>
                <td>
                    <button class="btn btn-fsvsaon" onclick="generarOrdenSalida(${pedidos.idpedido})">
                        <i class="fas fa-download"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Destruir DataTable anterior si existe
    if ($.fn.DataTable.isDataTable(tablaId)) {
        $(tablaId).DataTable().destroy();
    }

    // Re-inicializa DataTable con orden descendente por idorden
    tablaDataTable = $(tablaId).DataTable({
        language: {
            url: "https://cdn.datatables.net/plug-ins/1.13.4/i18n/es-ES.json"
        },
        responsive: true,
        autoWidth: false,
        pageLength: 10,
        ordering: true,
        order: [[0, 'desc']]
    });
}

async function generarOrdenSalida(idpedido) {
    if (!idpedido) {
        await Mensaje('warning', 'ID inválido', 'No se proporcionó un ID de orden.', true);
        return;
    }

    // Mostrar mensaje de espera mientras se genera el archivo
    const loading = Swal.fire({
        title: 'Generando archivo...',
        text: 'Por favor, espere un momento.',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    const nombres = localStorage.getItem('nombres') || '';
    const apellidos = localStorage.getItem('apellidos') || '';
    const usuario = `${nombres} ${apellidos}`.trim() || "Usuario Desconocido";

    try {
        const res = await fetch(`${url}/api/compras/generarOrdenSalida`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idpedido, usuario }),
            credentials: 'include'
        });

        if (!res.ok) throw new Error("Error en la generación");

        const blob = await res.blob();
        const urlDescarga = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = urlDescarga;
        a.download = `orden_${idpedido}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(urlDescarga);

        Swal.close(); // Cierra el loading
        await Mensaje('success', 'Descarga completa', 'La orden de compra ha sido descargada.');
    } catch (error) {
        console.error("Error al generar orden de compra:", error);
        Swal.close();
        await Mensaje('error', 'Error', 'Ocurrió un error al generar la orden de compra.');
    }
}


