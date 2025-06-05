document.addEventListener("DOMContentLoaded", () => {
    InicializarRelacionarOrden();
});

async function InicializarRelacionarOrden() {
    const estadoPedidos = document.getElementById('estadoPedidos');
    const estadoOrdenes = document.getElementById('estadoOrdenes');

    // Cargar data inicial
    obtenerPedido(estadoPedidos.value);
    obtenerOrden(estadoOrdenes.value);

    // Listeners para recarga dinámica
    estadoPedidos.addEventListener('change', () => {
        obtenerPedido(estadoPedidos.value);
    });

    estadoOrdenes.addEventListener('change', () => {
        obtenerOrden(estadoOrdenes.value);
    });

    // Agregar eventos a los botones
    document.getElementById('guardarRelacion').addEventListener('click', () => {
        guardarRelacion();
    });
}

async function obtenerPedido(estado) {
    try {
        const response = await fetch(`${url}/api/compras/obtenerPedido`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ estado }),
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(await response.text());
        }

        const data = await response.json();
        console.log('Pedidos:', data);
        renderizarPedidos(data.pedidos); // ACCEDEMOS A .pedidos
    } catch (error) {
        console.error('Error al obtener pedido:', error.message);
    }
}

async function renderizarPedidos(pedidos) {
    const contenedor = document.getElementById('cards-pedidos');
    contenedor.innerHTML = '';
    const relaciones = JSON.parse(sessionStorage.getItem('relacionpedido')) || [];

    // Ordenar pedidos de manera descendente por idpedido
    pedidos.sort((a, b) => b.idpedido - a.idpedido);

    pedidos.forEach(pedido => {
        const card = document.createElement('div');
        card.className = 'card mb-2 p-3 shadow-sm d-flex flex-row justify-content-between align-items-start';
        card.dataset.idpedido = pedido.idpedido;

        card.addEventListener('dragover', (e) => e.preventDefault());

        // Aquí convertimos el manejador de drop en una función async
        card.addEventListener('drop', async (e) => {
            e.preventDefault();
            const idorden = e.dataTransfer.getData('idorden');
            const idpedido = pedido.idpedido;

            const confirmado = await Mensaje(
                'question',
                'Confirmar Relación',
                `¿Deseas relacionar la Orden ${idorden} con el Pedido ${idpedido}?`,
                false,
                true
            );

            if (confirmado) {
                const relacionesActuales = JSON.parse(sessionStorage.getItem('relacionpedido')) || [];

                const yaExisteEnSesion = relacionesActuales.some(rel => rel.idpedido == idpedido && rel.idorden == idorden);
                const yaExisteEnBD = pedido.ordenesRelacionadas?.includes(Number(idorden));

                if (yaExisteEnSesion || yaExisteEnBD) {
                    await Mensaje('warning', '¡Espera!', 'Esta relación ya existe.', false, false);
                } else {
                    relacionesActuales.push({ idpedido: String(idpedido), idorden: String(idorden) });
                    sessionStorage.setItem('relacionpedido', JSON.stringify(relacionesActuales));
                    await Mensaje('success', '¡Éxito!', 'Relación generada exitosamente.', true, false);
                    obtenerPedido(document.getElementById('estadoPedidos').value);
                    obtenerOrden(document.getElementById('estadoOrdenes').value);
                }
            }
        });

        // Parte izquierda (info del pedido)
        const info = document.createElement('div');
        info.innerHTML = `
            <div><strong>Pedido:</strong> ${pedido.idpedido}</div>
            <div><strong>Dependencia:</strong> ${pedido.nombreDependencia}</div>
            <div><strong>Fecha:</strong> ${new Date(pedido.fechapedido).toLocaleDateString()}</div>
            <div><strong>Total Ítems:</strong> ${pedido.totalItems || pedido.detalle?.length || 0}</div>
            <div><strong>Estado:</strong> ${pedido.estado}</div>
            <button class="btn btn-sm btn-primary mt-2" onclick="mostrarDetallesPedido(${pedido.idpedido})">
                Ver detalles
            </button>
        `;

        // Relacionados desde BD + sesión
        const relacionados = [
            ...(pedido.ordenesRelacionadas || []).map(id => `#${id}`),
            ...relaciones
                .filter(rel => rel.idpedido == pedido.idpedido)
                .map(rel => `#${rel.idorden}`)
        ];

        const relacionesDiv = document.createElement('div');
        relacionesDiv.innerHTML = `<small><strong>Órdenes:</strong> ${relacionados.join(', ') || 'Ninguna'}</small>`;
        relacionesDiv.style.textAlign = 'right';

        card.appendChild(info);
        card.appendChild(relacionesDiv);
        contenedor.appendChild(card);
    });
}


async function obtenerOrden(estado) {
    try {
        const response = await fetch(`${url}/api/compras/obtenerOrden`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ estado }),
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(await response.text());
        }

        const data = await response.json();
        console.log('Órdenes:', data);
        renderizarOrdenes(data);
    } catch (error) {
        console.error('Error al obtener orden:', error.message);
    }
}

function renderizarOrdenes(ordenes) {
    const contenedor = document.getElementById('cards-ordenes');
    contenedor.innerHTML = '';
    const relaciones = JSON.parse(sessionStorage.getItem('relacionpedido')) || [];

    // Ordenar órdenes de manera descendente por idorden
    ordenes.sort((a, b) => b.idorden - a.idorden);

    ordenes.forEach(orden => {
        const card = document.createElement('div');
        card.className = 'card mb-2 p-2 shadow-sm d-flex flex-row justify-content-between align-items-start';
        card.draggable = true;
        card.dataset.idorden = orden.idorden;

        card.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('idorden', orden.idorden);
        });

        const info = document.createElement('div');
        info.innerHTML = `
            <div><strong>Orden:</strong> ${orden.idorden}</div>
            <div><strong>Fecha:</strong> ${orden.fecha}</div>
            <div><strong>Tipo:</strong> ${orden.tipo}</div>
            <button class="btn btn-sm btn-info mt-2" onclick="mostrarDetallesOrden(${orden.idorden})">
                Ver detalles
            </button>
        `;

        // ✅ Combina pedidos relacionados desde BD y desde sessionStorage (sin duplicados)
        const relacionadosBD = orden.pedidosRelacionados || [];
        const relacionadosSesion = relaciones
            .filter(rel => rel.idorden == orden.idorden)
            .map(rel => Number(rel.idpedido)); // convertir a número para comparar bien

        const relacionadosTotales = [...new Set([...relacionadosBD, ...relacionadosSesion])]
            .map(id => `#${id}`)
            .join(', ');

        const relacionesDiv = document.createElement('div');
        relacionesDiv.innerHTML = `<small><strong>Pedidos:</strong> ${relacionadosTotales || 'Ninguno'}</small>`;
        relacionesDiv.style.textAlign = 'right';

        card.appendChild(info);
        card.appendChild(relacionesDiv);
        contenedor.appendChild(card);
    });
}

async function mostrarDetallesOrden(idorden) {
    try {
        const response = await fetch(`${url}/api/compras/obtenerOrden`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ idorden }),
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(await response.text());
        }

        const orden = await response.json();

        // Crear HTML de tabla
        const tabla = `
            <table class="table table-bordered">
                <thead>
                    <tr>
                        <th>#Detalle</th>
                        <th>ID Item</th>
                        <th>Nombre</th>
                        <th>Cantidad</th>
                    </tr>
                </thead>
                <tbody>
                    ${orden.detalles.map(det => `
                        <tr>
                            <td>${det.iddetalleorden}</td>
                            <td>${det.iditem}</td>
                            <td>${det.nombre}</td>
                            <td>${det.cantidad}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        Swal.fire({
            title: `Detalles de Orden #${orden.idorden}`,
            html: tabla,
            width: '60%',
            confirmButtonText: 'Cerrar'
        });

    } catch (error) {
        console.error('Error al obtener detalles:', error.message);
        Swal.fire('Error', 'No se pudieron obtener los detalles de la orden.', 'error');
    }
}

async function mostrarDetallesPedido(idpedido) {
    try {
        const response = await fetch(`${url}/api/compras/obtenerPedido`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ idpedido }),
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(await response.text());
        }

        const pedido = await response.json();

        const tabla = `
            <table class="table table-bordered">
                <thead>
                    <tr>
                        <th>ID Item</th>
                        <th>Nombre</th>
                        <th>Descripción</th>
                        <th>Categoría</th>
                        <th>Cantidad</th>
                        <th>Solicitante</th>
                    </tr>
                </thead>
                <tbody>
                    ${pedido.detalle.map(item => `
                        <tr>
                            <td>${item.id}</td>
                            <td>${item.nombre}</td>
                            <td>${item.descripcion}</td>
                            <td>${item.categoria}</td>
                            <td>${item.cantidad}</td>
                            <td>${item.nombreCompleto}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        Swal.fire({
            title: `Detalles del Pedido #${pedido.idpedido}`,
            html: tabla,
            width: '70%',
            confirmButtonText: 'Cerrar'
        });

    } catch (error) {
        console.error('Error al obtener detalles del pedido:', error.message);
        Swal.fire('Error', 'No se pudieron obtener los detalles del pedido.', 'error');
    }
}

async function guardarRelacion() {
    const relaciones = JSON.parse(sessionStorage.getItem('relacionpedido')) || [];

    if (relaciones.length === 0) {
        Mensaje('warning', '¡Espera!', 'No hay relaciones para guardar.', false, false);
        return;
    }

    try {
        const response = await fetch(`${url}/api/compras/guardarRelacion`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ relaciones }),
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Error en la petición');
        }

        const data = await response.json();

        Mensaje('Success', '¡Exito!', 'Relacionar guardada exitosamente.', true, false);
        sessionStorage.clear();

        // Llamadas posteriores
        obtenerPedido(document.getElementById('estadoPedidos').value);
        obtenerOrden(document.getElementById('estadoOrdenes').value);

    } catch (error) {
        console.error('Error al guardar relaciones:', error);
        Mensaje('Error', '¡Error!', 'Ocurrio un problema la guardar la relacion', false, false);
    }
}
