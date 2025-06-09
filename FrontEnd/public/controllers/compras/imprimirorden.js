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
        renderizarOrdenesBandeja(data);
    } catch (error) {
        document.getElementById("tbodyOrden").innerHTML = `<tr><td colspan="5">Error al cargar datos</td></tr>`;
    }
}

function renderizarOrdenesBandeja(ordenes) {
    const contenedor = document.getElementById("listaOrdenes");
    contenedor.innerHTML = "";

    if (!ordenes || ordenes.length === 0) {
        contenedor.innerHTML = `<p class="text-center text-muted m-3">Sin órdenes disponibles</p>`;
        return;
    }

    ordenes.forEach((orden) => {
        const ordenItem = document.createElement("a");
        ordenItem.href = "#";
        ordenItem.className = "list-group-item list-group-item-action";
        ordenItem.dataset.id = orden.idorden;
        ordenItem.innerHTML = `
    <div class="ticket-content d-flex justify-content-between">
        <div class="ticket-main">
            <strong class="font-weight-bold">Orden #${orden.idorden}</strong>
            <p class="mb-0 text-ellipsis">${orden.proveedor || 'Sin proveedor'}</p>
            <small class="text-muted">${formatFechaHora(orden.fecha)}</small>
        </div>
        <div class="ticket-side">
            <span class="badge badge-secondary">${orden.estado}</span>
        </div>
    </div>
`;

        ordenItem.addEventListener("click", (e) => {
            e.preventDefault();
            obtenerOrdenPorId(orden.idorden);
        });


        contenedor.appendChild(ordenItem);
    });
}

async function obtenerOrdenPorId(idorden) {
    try {
        const respuesta = await fetch(`${url}/api/compras/obtenerOrden`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ idorden }) // 👈 mandamos el id
        });

        if (!respuesta.ok) throw new Error("Error al obtener la orden");

        const ordenDetallada = await respuesta.json();
        mostrarDetalleOrden(ordenDetallada); // 👈 usamos la respuesta detallada
    } catch (error) {
        console.error("Error al obtener detalles de la orden:", error);
        Swal.fire({
            title: "Error",
            text: "No se pudo cargar la orden seleccionada.",
            icon: "error",
            confirmButtonText: "Aceptar"
        });
    }
}

let ordenGlobal = null;

function mostrarDetalleOrden(orden) {
    ordenGlobal = orden;  // Guardamos referencia global
    const titulo = document.getElementById("ordenTitle");
    const contenido = document.getElementById("ordenContent");

    titulo.innerHTML = `<h4 class="font-weight-bold">Orden #${orden.idorden} - ${orden.tipo}</h4>`;

    const detallesHTML = orden.detalles && orden.detalles.length > 0
        ? (() => {
            let totalGeneral = 0;
            const filas = orden.detalles.map(detalle => {
                const total = detalle.cantidad * detalle.valor;
                totalGeneral += total;
                return `
                    <div class="form-row mb-2">
                        <div class="col-md-6">
                            <input type="text" class="form-control" value="${detalle.nombre}" readonly>
                        </div>
                        <div class="col-md-2">
                            <input type="text" class="form-control" value="${detalle.cantidad}" readonly>
                        </div>
                        <div class="col-md-2">
                           <input type="text" class="form-control valor-unitario-input" value="${detalle.valor}" data-iditem="${detalle.iditem}" readonly>
                        </div>
                        <div class="col-md-2">
                            <input type="text" class="form-control" value="$ ${total.toFixed(2)}" readonly>
                        </div>
                    </div>`;
            }).join('');

            return `
                <div class="form-group">
                    <label>Items</label>
                    ${filas}
                    <div class="form-row justify-content-end mt-3">
                        <div class="col-md-2">
                            <label><strong>Total general</strong></label>
                            <input type="text" class="form-control text-right font-weight-bold" value="$ ${totalGeneral.toFixed(2)}" readonly>
                        </div>
                    </div>
                </div>`;
        })()
        : `<p class="text-muted">Sin detalles disponibles</p>`;

    contenido.innerHTML = `
        <form>
            <div class="form-row">
                <div class="form-group col-md-4">
                    <label>Fecha</label>
                    <input type="text" class="form-control" value="${formatFechaHora(orden.fecha)}" readonly>
                </div>
                <div class="form-group col-md-4">
                    <label>Estado</label>
                    <input type="text" class="form-control" value="${orden.estado}" readonly>
                </div>
                <div class="form-group col-md-4">
                    <label>Factura</label>
                    <div class="d-flex align-items-center" id="facturaDisplay">
                        <input type="text" class="form-control" id="facturaInput" value="${orden.factura || ''}" readonly>
                        <button type="button" class="btn btn-link btn-sm ml-2 p-0" onclick="editarFactura()">
                            <i class="fas fa-pencil-alt"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group col-md-12">
                    <label>Proveedor</label>
                    <input type="text" class="form-control" value="${orden.proveedor || 'Sin proveedor'}" readonly>
                </div>
            </div>
            ${detallesHTML}
            <div class="form-group mt-3">
                ${orden.tipo === "COMPRA" ? `
                <button type="button" class="btn btn-success" onclick="generarOrdenCompra(${orden.idorden})">
                    <i class="fas fa-download"></i> Descargar
                </button>` : ''}
            </div>
        </form>
    `;
}

function editarFactura() {
    const input = document.getElementById("facturaInput");
    const display = document.getElementById("facturaDisplay");
    const currentValue = input.value;

    // Guardar valores originales como atributo data-valor-original
    document.querySelectorAll('.valor-unitario-input').forEach(input => {
        input.dataset.valorOriginal = input.value; // guardar original
        input.removeAttribute('readonly');
    });

    display.innerHTML = `
        <input type="text" class="form-control" id="facturaInputEdit" value="${currentValue}">
        <button type="button" class="btn btn-link btn-sm ml-2 p-0 text-success" onclick="confirmarEdicionFactura(${ordenGlobal.idorden})">
            <i class="fas fa-check"></i>
        </button>
        <button type="button" class="btn btn-link btn-sm ml-2 p-0 text-danger" onclick="cancelarEdicionFactura('${currentValue}')">
            <i class="fas fa-times"></i>
        </button>
    `;
}

function cancelarEdicionFactura(valorOriginal) {
    const display = document.getElementById("facturaDisplay");

    // Restaurar y deshabilitar los inputs
    document.querySelectorAll('.valor-unitario-input').forEach(input => {
        if (input.dataset.valorOriginal !== undefined) {
            input.value = input.dataset.valorOriginal; // restaurar valor
        }
        input.setAttribute('readonly', true);
    });

    display.innerHTML = `
        <input type="text" class="form-control" id="facturaInput" value="${valorOriginal}" readonly>
        <button type="button" class="btn btn-link btn-sm ml-2 p-0" onclick="editarFactura()">
            <i class="fas fa-pencil-alt"></i>
        </button>
    `;
}

function confirmarEdicionFactura(idorden) {
    const nuevoValorFactura = document.getElementById("facturaInputEdit").value.trim();
    if (!nuevoValorFactura) {
        Mensaje('error', '¡Error!', 'La factura no puede estar vacia.', false, false);
        return;
    }

    // Capturar nuevos valores de items
    const itemsActualizados = Array.from(document.querySelectorAll('.valor-unitario-input')).map(input => {
        return {
            iditem: parseInt(input.dataset.iditem),
            valor: parseFloat(input.value) || 0
        };
    });

    const payload = {
        idorden: idorden,
        factura: nuevoValorFactura,
        items: itemsActualizados
    };

    // Aquí llamas a tu función para guardar, ej. por fetch o como prefieras
    guardarFactura(payload);
}

function guardarFactura(payload) {
    fetch(`${url}/api/compras/actualizarFacturaPedido`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        credentials: "include"
    })
        .then(res => {
            if (!res.ok) throw new Error("Error al guardar");
            return res.json();
        })
        .then(data => {
            Mensaje('success', '¡Éxito!', 'Informacion actualizada exitosamente.', true, false);
            // Clonar detalles y actualizar sus valores
            const detallesActualizados = ordenGlobal.detalles.map(detalle => {
                const itemModificado = payload.items.find(i => i.iditem === detalle.iditem);
                return itemModificado
                    ? { ...detalle, valor: itemModificado.valor }
                    : detalle;
            });

            mostrarDetalleOrden({
                ...ordenGlobal,
                factura: payload.factura,
                detalles: detallesActualizados
            });

        })
        .catch(err => {
            console.error(err);
            Mensaje('error', '¡Error!', 'No fue posible guardar la informacion.', false, false);
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


