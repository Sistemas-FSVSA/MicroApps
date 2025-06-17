document.addEventListener("DOMContentLoaded", () => {
    InicializarConsultarPedidos();
});

async function InicializarConsultarPedidos() {
    const select = document.getElementById("estadoPedidoSelect");
    // Cargar inicialmente los pedidos con el estado seleccionado por defecto
    cargarPedidosPorEstado(select.value);
    // Cargar pedidos cada vez que cambia el valor del select
    select.addEventListener("change", function () {
        const estadoSeleccionado = select.value;
        cargarPedidosPorEstado(estadoSeleccionado);
    });
}

async function cargarPedidosPorEstado(estado) {
    try {
        const response = await fetch(`${url}/api/compras/obtenerPedido`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ estado }),
        });

        if (!response.ok) throw new Error("Error al obtener pedidos");

        const data = await response.json();
        renderizarPedidosBandeja(data.pedidos);
    } catch (error) {
        console.error("Error al cargar pedidos por estado:", error);
        document.getElementById("listaPedidos").innerHTML = `<p class="text-danger m-3">Error al cargar datos</p>`;
    }
}

function renderizarPedidosBandeja(pedidos) {
    const contenedor = document.getElementById("listaPedidos");
    contenedor.innerHTML = "";

    if (!pedidos || pedidos.length === 0) {
        contenedor.innerHTML = `<p class="text-center text-muted m-3">Sin pedidos disponibles</p>`;
        return;
    }

    pedidos.sort((a, b) => b.idpedido - a.idpedido);

    pedidos.forEach((pedido) => {
        const pedidoItem = document.createElement("a");
        pedidoItem.href = "#";
        pedidoItem.className = "list-group-item list-group-item-action";
        pedidoItem.dataset.id = pedido.idpedido;
        pedidoItem.innerHTML = `
    <div class="ticket-content d-flex justify-content-between">
        <div class="ticket-main">
            <strong class="font-weight-bold">Pedido #${pedido.idpedido}</strong>
            <p class="mb-0 text-ellipsis">Aprobo: ${pedido.nombres || 'Sin registro'}</p>
            <small class="text-muted">${formatFechaHora(pedido.fechapedido)}</small>
        </div>
        <div class="ticket-side">
            <span class="badge badge-secondary">${pedido.nombreDependencia}</span>
        </div>
    </div>
`;

        pedidoItem.addEventListener("click", (e) => {
            e.preventDefault();
            obtenerPedidoPorId(pedido.idpedido);
        });


        contenedor.appendChild(pedidoItem);
    });
}

async function obtenerPedidoPorId(idpedido) {
    try {
        const respuesta = await fetch(`${url}/api/compras/obtenerPedido`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ idpedido })
        });

        if (!respuesta.ok) throw new Error("Error al obtener el pedido");

        const pedidoDetallada = await respuesta.json();
        mostrarDetalleOrden(pedidoDetallada); // 🔧 nombre correcto
    } catch (error) {
        console.error("Error al obtener detalles del pedido:", error);
        Swal.fire({
            title: "Error",
            text: "No se pudo cargar el pedido seleccionado.",
            icon: "error",
            confirmButtonText: "Aceptar"
        });
    }
}

function mostrarDetalleOrden(pedido) {
    const titulo = document.getElementById("pedidoTitle");
    const contenido = document.getElementById("pedidoContent");

    titulo.innerHTML = `<h4 class="font-weight-bold">Pedido #${pedido.idpedido} - ${pedido.nombreDependencia}</h4>`;

    const detallesHTML = pedido.detalle && pedido.detalle.length > 0
        ? (() => {
            let totalGeneral = 0;
            const filas = pedido.detalle.map(detalle => {
                const total = detalle.cantidad * (detalle.valor || 0); // por si no viene valor
                totalGeneral += total;
                return `
                    <div class="form-row mb-2">
                        <div class="col-md-10">
                            <input type="text" class="form-control" value="${detalle.nombre}" readonly>
                        </div>
                        <div class="col-md-2">
                            <input type="text" class="form-control" value="${detalle.cantidad}" readonly>
                        </div>
                    </div>`;
            }).join('');

            return `
                <div class="form-group">
                    <label>Items</label>
                    ${filas}
                </div>`;
        })()
        : `<p class="text-muted">Sin detalles disponibles</p>`;

    contenido.innerHTML = `
        <form>
            <div class="form-row">
                <div class="form-group col-md-8">
                    <label>Fecha Solicitud</label>
                    <input type="text" class="form-control" value="${pedido.fechapedido ? formatFechaHora(pedido.fechapedido) : 'Sin fecha'}" readonly>
                </div>
                <div class="form-group col-md-4">
                    <label>Estado</label>
                    <input type="text" class="form-control" value="${pedido.estado}" readonly>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group col-md-8">
                    <label>Aprobado Por:</label>
                    <input type="text" class="form-control" value="${pedido.nombres || 'Sin registro'}" readonly>
                </div>
                <div class="form-group col-md-4">
                    <label>Fecha Entrega</label>
                    <input type="date" class="form-control" id="fechaEntregaInput" value="${pedido.fechaentrega ? pedido.fechaentrega.split('T')[0] : ''}" readonly>
                </div>
            </div>
            ${detallesHTML}
            <div class="form-group mt-3 d-flex justify-content-end">
                ${pedido.estado === "FINALIZADO"
            ? `<button type="button" class="btn btn-fsvsaon mr-2" onclick="enviarRecepcion(${pedido.idpedido})">
                                <i class="fas fa-paper-plane"></i> Enviar Recepción
                        </button>`
            : ""
        }
                <button type="button" class="btn btn-fsvsaoff ml-2" onclick="generarOrdenSalida(${pedido.idpedido})">
                    <i class="fas fa-download"></i> Descargar
                </button>
            </div>
        </form>
    `;
}

async function enviarRecepcion(idpedido) {
    const select = document.getElementById("estadoPedidoSelect");
    try {
        const respuesta = await fetch(`${url}/api/compras/actualizarEstadoPedido`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                idpedido,
                estado: "RECEPCION"
            })
        });

        if (!respuesta.ok) throw new Error("Error al actualizar el estado del pedido");

        const resultado = await respuesta.json();

        Swal.fire({
            icon: "success",
            title: "Pedido enviado",
            text: "Pedido enviado a confirmación de manera exitosa",
            confirmButtonText: "Aceptar"
        });

        obtenerPedidoPorId(idpedido)
        cargarPedidosPorEstado(select.value);

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


