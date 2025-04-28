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
        console.log("Respuesta del backend:", data);

        // Verifica si no hay dependencia asociada
        if (data.message === "Sin Depedencia") {
            console.warn("El usuario no tiene dependencia asignada.");
            return;
        }

        const { iddependencia } = data;

        // Realiza una nueva petición para obtener los pedidos de la dependencia
        const pedidosResponse = await fetch(`${url}/api/compras/obtenerPedido`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ idusuario, iddependencia, estado: "CERRADO" }),
            credentials: "include",
        });

        if (!pedidosResponse.ok) {
            throw new Error(`Error al obtener los pedidos: ${pedidosResponse.statusText}`);
        }

        const pedidosData = await pedidosResponse.json();
        console.log("Pedidos obtenidos:", pedidosData);

        const container = document.getElementById("cards-container");
        container.innerHTML = ""; // Limpiar contenido previo

        pedidosData.pedidos
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
        console.error("Error al inicializar la aprobación de pedidos:", error);
    }
}


function verPedido(idpedido) {
    const url = `/compras/continuarpedido?idpedido=${idpedido}`;
    cargarVista(url);
}
