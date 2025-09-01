document.addEventListener("DOMContentLoaded", () => {
    InicializarAprobarPedido();
});

async function InicializarAprobarPedido() {
    const idusuario = localStorage.getItem("idusuario");

    try {
        const response = await fetch(`${url}/api/compras/obtenerPedido`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ idusuario }),
            credentials: "include",
        });

        if (!response.ok) {
            throw new Error(`Error en la petición: ${response.statusText}`);
        }

        const data = await response.json();

        const container = document.getElementById("cards-container");
        container.innerHTML = "";

        let totalPedidosAgregados = 0;

        if (!data.dependencias || data.dependencias.length === 0) {
            mostrarMensajeSinPedidos(container);
            return;
        }

        container.className = "row g-3"; // restaurar grilla para las cards

        data.dependencias.forEach(dependencia => {
            dependencia.pedidos
                .filter(pedido => pedido.estado === "CERRADO" || pedido.estado === "RECEPCION")
                .forEach(pedido => {
                    totalPedidosAgregados++;

                    let icono = "";
                    if (pedido.estado === "RECEPCION") {
                        icono = '<i class="fas fa-clipboard-list"></i>';
                    } else if (pedido.estado === "CERRADO") {
                        icono = '<i class="fas fa-clipboard-check"></i>';
                    }

                    const card = document.createElement("div");
                    card.className = "col-lg-3 col-md-4 col-sm-6 mt-3";

                    let botonClass = "btn btn-fsvsaoff";
                    let botonText = "RECIBIR";

                    if (pedido.estado === "CERRADO") {
                        botonClass = "btn btn-fsvsaon";
                        botonText = "APROBAR";
                    }
                    // Definir color del badge según estado
                    let estadoClass = pedido.estado === "RECEPCION"
                        ? "badge-recepcion"
                        : "badge-cerrado";

                    // CORRECCIÓN: Usar nombreSubdependencia en lugar de subdependencia
                    const nombreSubdependencia = pedido.nombreSubdependencia || 'No Aplica';

                    card.innerHTML = `
    <div class="card shadow-sm h-100 w-100 text-center p-2">
        <div class="card-body d-flex flex-column align-items-center">
            
            <!-- Título -->
            <h5 class="fw-bold mb-3" style="font-size: 1.4rem; font-weight: bolder;">
                PEDIDO Nº ${pedido.idpedido}
            </h5>
            
            <!-- Ícono -->
            <div class="mb-3">
                <h1 style="font-size: 5rem; color: gray;">${icono}</h1>
            </div>

            <!-- Información -->
            <p class="mb-1">
                <span class="fw-bold" style="font-weight:bold">DEPENDENCIA:</span> ${dependencia.nombreDependencia}
            </p>
            <p class="mb-1">
                <span class="fw-bold" style="font-weight:bold">SUBDEPENDENCIA:</span> ${nombreSubdependencia}
            </p>
            <p class="mb-3">
                <span class="fw-bold" style="font-weight:bold">ESTADO:</span> 
                <span class="estado-badge ${estadoClass}">${pedido.estado}</span>
            </p>

            <!-- Botón Estado -->
            <button class="${botonClass}" style="padding: 8px 24px;" onclick="verPedido(${pedido.idpedido})">
                ${botonText}
            </button>
        </div>
    </div>
`;

                    container.appendChild(card);
                });
        });

        if (totalPedidosAgregados === 0) {
            mostrarMensajeSinPedidos(container);
        }

    } catch (error) {
        console.error("Error al inicializar la aprobación de pedidos:", error);
    }
}

function mostrarMensajeSinPedidos(container) {
    container.className = "no-pedidos-wrapper";
    container.innerHTML = `
        <div class="no-pedidos">
            <div>
                <h2>
                    <i class="fas fa-box-open fa-2x d-block mb-3"></i>
                    No hay pedidos pendientes por gestionar
                </h2>
            </div>
        </div>
    `;
}

function verPedido(idpedido) {
    const url = `/compras/continuarpedido?idpedido=${idpedido}`;
    cargarVista(url);
}