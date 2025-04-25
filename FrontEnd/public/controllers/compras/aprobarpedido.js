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
        console.log("Pedido obtenido:", data);

        const container = document.getElementById("cards-container");
        container.innerHTML = ""; // Limpiar contenido previo

        data.pedidos
            .filter(pedido => pedido.estado === "CERRADO") // Filtrar solo los pedidos con estado "CERRADO"
            .forEach(pedido => {
                const card = document.createElement("div");
                card.className = "col-lg-3 col-md-4 col-sm-6 mb-3";
            
                card.innerHTML = `
                    <div class="card text-center shadow-sm h-100">
                        <div class="card-body">
                            <h1><i class="fas fa-file-alt"></i></h1>
                            <h5 class="card-title mb-2">Pedido #${pedido.idpedido}</h5>
                            <p class="card-text mb-3">
                                Estado: <span class="badge bg-info text-dark">${pedido.estado}</span>
                            </p>
                            <button class="btn btn-fsvsaoff" onclick="verPedido(${pedido.idpedido})">Ver Detalle</button>
                        </div>
                    </div>
                `;
            
                container.appendChild(card);
            });

    } catch (error) {
        console.error("Error al obtener el pedido:", error);
    }
}


function verPedido(idpedido) {
    const url = `/compras/continuarpedido?idpedido=${idpedido}`;
    cargarVista(url);
}
