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

                    const card = document.createElement("div");
                    card.className = "col-lg-3 col-md-4 col-sm-6";

                    card.innerHTML = `
                        <div class="card text-center shadow-sm h-100 w-100">
                            <div class="card-body">
                                <h1><i class="fas fa-file-alt"></i></h1>
                                <h5 class="card-title mb-2">Pedido #${pedido.idpedido}</h5>
                                <p class="card-text mb-3">
                                    Dependencia: <span class="badge bg-secondary">${dependencia.nombreDependencia}</span><br>
                                    Estado: <span class="badge bg-info text-dark">${pedido.estado}</span>
                                </p>
                                <button class="btn btn-fsvsaoff" onclick="verPedido(${pedido.idpedido})">Ver Detalle</button>
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
