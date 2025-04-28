document.addEventListener("DOMContentLoaded", () => {
    InicializarPedidos();
});

async function InicializarPedidos() {
    const idusuario = localStorage.getItem('idusuario');
    const permisos = JSON.parse(localStorage.getItem('permisos'));
    const estado = 'INICIADO';
    const mensajeDependencia = document.getElementById('mensajeDependencia');
    const cardPedido = document.getElementById('manejarPedidos');

    // Validación independiente para la card APROBAR_PEDIDOS
    const tieneVistaAprobarPedidos = permisos.some(permiso => permiso.elemento === "APROBAR_PEDIDOS_PENDIENTES");
    const aprobarPedidosPendientes = document.getElementById('PedidoAprobar');
    if (!tieneVistaAprobarPedidos) {
        aprobarPedidosPendientes.style.display = 'none';
    }

    // Validación y lógica de la card MANEJAR_PEDIDOS
    const tieneVistaPedidos = permisos.some(permiso => permiso.elemento === "MANEJAR_PEDIDOS");

    if (tieneVistaPedidos) {
        try {
            // PRIMERO: Verificar dependencia
            const dependenciaResponse = await fetch(`${url}/api/compras/obtenerPedido`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ idusuario })
            });

            if (!dependenciaResponse.ok) {
                throw new Error('Error al verificar dependencia del usuario');
            }

            const dependenciaResult = await dependenciaResponse.json();

            if (dependenciaResult.message === 'Sin Depedencia') {
                // Mostrar el mensaje de no dependencia
                mensajeDependencia.style.display = 'block';
                cardPedido.style.display = 'none'; // Ocultamos la card de manejar pedidos
                return;
            }

            // Si sí tiene dependencia, seguimos con la lógica del pedido
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
            console.error('Error al inicializar pedidos:', error);
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

function redireccionAprobarPedido() {
    const url = `/compras/aprobarpedido/`;
    cargarVista(url);
}
