// public/controllers/compras/variospedidos.js
document.addEventListener("DOMContentLoaded", () => {
    InicializarVariosPedidos();
});

async function InicializarVariosPedidos() {
    // Fecha en header
    const elFecha = document.getElementById('fechaActual');
    if (elFecha) {
        elFecha.textContent = new Date().toLocaleDateString('es-ES', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    const idusuario = sessionStorage.getItem('idusuario') || localStorage.getItem('idusuario');
    const contenedor = document.getElementById('contenedorVariosPedidos');
    if (!contenedor) return;

    contenedor.innerHTML = '<div class="loading">Cargando pedidos...</div>';

    try {
        // USAR EL ENDPOINT CORRECTO: obtenerPedido con idusuario y estado
        const resp = await fetch(`${url}/api/compras/obtenerPedido`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ 
                idusuario: parseInt(idusuario), 
                estado: 'INICIADO' 
            })
        });

        if (!resp.ok) throw new Error('Error al obtener pedidos pendientes');
        const resultadoPedidos = await resp.json();

        console.log('Respuesta del endpoint obtenerPedido:', resultadoPedidos);

        // Verificar si hay pedidos pendientes
        if (!resultadoPedidos.exists || !resultadoPedidos.pedidos || resultadoPedidos.pedidos.length === 0) {
            contenedor.innerHTML = `
                <div class="no-pedidos-wrapper">
                    <div class="no-pedidos">
                        <h2>No tienes pedidos pendientes.</h2>
                        <p>Puedes crear un nuevo pedido desde el menú principal.</p>
                    </div>
                </div>`;
            return;
        }

        // Obtener información completa de cada pedido
        let pedidosCompletos = [];
        
        for (const pedidoBasico of resultadoPedidos.pedidos) {
            try {
            // Obtener información completa del pedido usando su ID
            const respDetalle = await fetch(`${url}/api/compras/obtenerPedido`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ idpedido: pedidoBasico.idpedido })
            });

            if (respDetalle.ok) {
                const pedidoCompleto = await respDetalle.json();
                pedidosCompletos.push(pedidoCompleto);
            }
            } catch (error) {
            console.error(`Error obteniendo detalles del pedido ${pedidoBasico.idpedido}:`, error);
            // Si falla el detalle, usar la información básica
            pedidosCompletos.push({
                idpedido: pedidoBasico.idpedido,
                iddependencia: pedidoBasico.iddependencia,
                estado: 'INICIADO',
                nombreDependencia: 'Dependencia',
                nombreSubdependencia: null
            });
            }
        }

        // Ordenar los pedidos por idpedido de manera ascendente
        pedidosCompletos.sort((a, b) => a.idpedido - b.idpedido);

        console.log('Pedidos completos obtenidos:', pedidosCompletos);

        // Renderizar todos los pedidos
        contenedor.innerHTML = '';
        let renderizados = 0;

        pedidosCompletos.forEach(pedido => {
            const card = document.createElement('div');
            card.classList.add('col-md-4', 'mb-4');

            const icono = `<i class="fas fa-file-alt"></i>`;
            const estadoClass = "badge text-white";
            const botonClass = pedido.estado === "INICIADO" ? "btn btn-fsvsaoff" : "btn btn-btn-fsvsaon";
            const botonText = pedido.estado === "INICIADO" ? "Continuar Pedido" : "Ver Pedido";

            card.innerHTML = `
                <div class="card shadow-sm h-100 w-100 text-center p-2">
                    <div class="card-body d-flex flex-column align-items-center">
                        
                        <!-- Título -->
                        <h5 class="fw-bold mb-3" style="font-size: 1.4rem; font-weight: bolder;">
                            PEDIDO Nº ${pedido.idpedido}
                        </h5>
                        
                        <!-- Ícono -->
                        <div class="mb-3">
                            <h1 style="font-size: 5rem; color: GREY;">${icono}</h1>
                        </div>

                        <!-- Información -->
                        <p class="mb-1">
                            <span class="fw-bold" style="font-weight:bold">DEPENDENCIA:</span> ${pedido.nombreDependencia || 'Sin nombre'}
                        </p>
                        <p class="mb-1">
                            <span class="fw-bold" style="font-weight:bold">SUBDEPENDENCIA:</span> ${pedido.nombreSubdependencia || 'No Aplica'}
                        </p>
                        <p class="mb-3">
                            <span class="fw-bold" style="font-weight:bold">ESTADO:</span> 
                            <span class="${estadoClass}" style="background-color:#17a2b8;">${pedido.estado}</span>
                        </p>

                        <!-- Botón Estado -->
                        <button class="${botonClass}" style="padding: 8px 24px;" onclick="verPedido(${pedido.idpedido})">
                            ${botonText}
                        </button>
                    </div>
                </div>
            `;
            contenedor.appendChild(card);
            renderizados++;
        });

        console.log(`Renderizados ${renderizados} pedidos en total`);

        if (renderizados === 0) {
            contenedor.innerHTML = `
                <div class="no-pedidos-wrapper">
                    <div class="no-pedidos">
                        <h2>No se pudieron cargar los pedidos.</h2>
                        <p>Intenta recargar la página.</p>
                    </div>
                </div>`;
        }

    } catch (err) {
        console.error('Error cargando pedidos:', err);
        contenedor.innerHTML = `
            <div class="error-message">
                <h3>Error al cargar pedidos</h3>
                <p>Ocurrió un error al cargar los pedidos. Error: ${err.message}</p>
                <button onclick="InicializarVariosPedidos()" class="btn btn-primary">Reintentar</button>
            </div>
        `;
    }
}

// Función global para redirigir
function verPedido(idpedido) {
    const urlDestino = `/compras/continuarpedido?idpedido=${idpedido}`;
    cargarVista(urlDestino);
}