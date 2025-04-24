document.addEventListener("DOMContentLoaded", () => {
    InicializarPedidos();
});

async function InicializarPedidos() {
    const idusuario = localStorage.getItem('idusuario');
    const permisos = JSON.parse(localStorage.getItem('permisos'));
    const estado = 'INICIADO';

    // Validación independiente para la card APROBAR_PEDIDOS
    const tieneVistaAprobarPedidos = permisos.some(permiso => permiso.elemento === "APROBAR_PEDIDOS_PENDIENTES");
    const aprobarPedidosPendientes = document.getElementById('PedidoAprobar');
    if (!tieneVistaAprobarPedidos) {
        aprobarPedidosPendientes.style.display = 'none';
    }

    // Validación y lógica de la card MANEJAR_PEDIDOS
    const tieneVistaPedidos = permisos.some(permiso => permiso.elemento === "MANEJAR_PEDIDOS");
    const cardPedido = document.getElementById('manejarPedidos');

    if (tieneVistaPedidos) {
        try {
            const response = await fetch(`${url}/api/compras/obtenerPedido`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ idusuario, estado })
            });

            if (!response.ok) {
                throw new Error('Error al obtener el estado del pedido');
            }

            const resultado = await response.json();
            const botonPedido = document.querySelector('#Pedido button');
            const iconoPedido = document.querySelector('#Pedido h1 i');

            if (resultado.exists) {
                botonPedido.textContent = 'Continuar Pedido';
                botonPedido.onclick = () => redireccionContinuarPedido(resultado.idpedido);
                iconoPedido.className = 'fas fa-redo-alt';
            } else {
                botonPedido.textContent = 'Nuevo Pedido';
                botonPedido.onclick = () => redireccionNuevoPedido();
                iconoPedido.className = 'fas fa-file-medical';
            }
        } catch (error) {
            console.error('Error al obtener el pedido pendiente:', error);
            // Mostrar la card con opción de nuevo pedido si hay error
            const botonPedido = document.querySelector('#Pedido button');
            const iconoPedido = document.querySelector('#Pedido h1 i');

            botonPedido.textContent = 'Nuevo Pedido';
            botonPedido.onclick = () => redireccionNuevoPedido();
            iconoPedido.className = 'fas fa-file-medical';
        }
    } else {
        cardPedido.style.display = 'none'; // Ocultar si no tiene permiso
    }

    
}


function redireccionNuevoPedido() {
    const url = `/compras/nuevopedido`;
    cargarVista(url);
}

function redireccionContinuarPedido(idpedido) {
    const url = `/compras/continuarpedido?idpedido=${idpedido}`;
    cargarVista(url);
}




