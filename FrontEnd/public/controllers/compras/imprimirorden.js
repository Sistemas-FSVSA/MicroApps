document.addEventListener("DOMContentLoaded", () => {
    InicializarImprimirOrden();

});

async function InicializarImprimirOrden() {
    cargarOrdenes();
}

async function cargarOrdenes() {
    try {
        const respuesta = await fetch(`${url}/api/compras/obtenerOrden`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include"
        });

        if (!respuesta.ok) throw new Error("Error al obtener datos");

        const data = await respuesta.json();
        renderizarTabla(data);
    } catch (error) {
        document.getElementById("tbodyOrden").innerHTML = `<tr><td colspan="5">Error al cargar datos</td></tr>`;
    }
}

function renderizarTabla(ordenes) {
    const tablaId = "#tableOrden";
    const tbody = document.getElementById("tbodyOrden");
    tbody.innerHTML = "";

    if (!ordenes || ordenes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center">No hay órdenes para mostrar</td></tr>`;
    } else {
        ordenes.forEach((orden) => {
            const tr = document.createElement("tr");

            const botonDescarga = orden.tipo === "COMPRA" ? `
                <button class="btn btn-fsvsaoff" onclick="generarOrdenCompra(${orden.idorden})">
                    <i class="fas fa-download"></i>
                </button>
            ` : '';

            tr.innerHTML = `
                <td>${orden.idorden}</td>
                <td>${orden.tipo}</td>
                <td>${formatFechaHora(orden.fecha)}</td>
                <td>${orden.proveedor || ''}</td>
                <td>${orden.estado}</td>
                <td>
                    <button class="btn btn-fsvsaon" onclick="verOrden(${orden.idorden})">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${botonDescarga}
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

async function generarOrdenCompra(idorden) {
    if (!idorden) {
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
        const res = await fetch(`${url}/api/compras/generarOrdenCompra`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idorden, usuario }),
            credentials: 'include'
        });

        if (!res.ok) throw new Error("Error en la generación");

        const blob = await res.blob();
        const urlDescarga = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = urlDescarga;
        a.download = `orden_${idorden}.pdf`;
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


