document.addEventListener("DOMContentLoaded", () => {
    InicializarPedidos();
});

async function InicializarPedidos() {
    const idusuario = localStorage.getItem('idusuario');
    const permisos = JSON.parse(localStorage.getItem('permisos'));
    const estado = 'INICIADO';
    const mensajeDependencia = document.getElementById('mensajeDependencia');
    const cardPedido = document.getElementById('Pedido');
    const cardContinuarPedidos = document.getElementById('continuarPedidos');
    
    // Ocultar por defecto la card de "Continuar Varios Pedidos"
    if (cardContinuarPedidos) {
        cardContinuarPedidos.style.display = 'none';
    }

    // Validación independiente para la card APROBAR_PEDIDOS
    const tieneVistaAprobarPedidos = permisos.some(permiso => permiso.elemento === "APROBAR_PEDIDOS_PENDIENTES");
    const aprobarPedidosPendientes = document.getElementById('PedidoAprobar');
    if (!tieneVistaAprobarPedidos) {
        aprobarPedidosPendientes.style.display = 'none';
    }

    // Validación independiente para la card REVISAR_PEDIDOS
    const tieneVistaRevisarPedidos = permisos.some(permiso => permiso.elemento === "REVISAR_PEDIDOS");
    const RevisarPedidosPendientes = document.getElementById('RevisarPedido');
    if (!tieneVistaRevisarPedidos) {
        RevisarPedidosPendientes.style.display = 'none';
    }

    // Validación independiente para la card CONSULTAR_PEDIDOS
    const tieneVistaConsultarPedidos = permisos.some(permiso => permiso.elemento === "CONSULTAR_PEDIDOS");
    const consultarPedidos = document.getElementById('consultarPedidos');
    if (!tieneVistaConsultarPedidos) {
        consultarPedidos.style.display = 'none';
    }

    // Validación y lógica de la card MANEJAR_PEDIDOS
    const tieneVistaPedidos = permisos.some(permiso => permiso.elemento === "MANEJAR_PEDIDOS");

    if (tieneVistaPedidos) {
        try {
            // PASO 1: Verificar dependencias del usuario usando el nuevo endpoint
            const dependenciasResponse = await fetch(`${url}/api/compras/obtenerDependencias?idusuario=${idusuario}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include'
            });

            if (!dependenciasResponse.ok) {
                throw new Error('Error al verificar dependencias del usuario');
            }

            const dependencias = await dependenciasResponse.json();

            // Si no tiene dependencias
            if (!dependencias || dependencias.length === 0) {
                mensajeDependencia.style.display = 'block';
                // Ocultar todas las cards
                cardPedido.style.display = 'none';
                cardContinuarPedidos.style.display = 'none';
                document.getElementById('PedidoAprobar').style.display = 'none';
                document.getElementById('RevisarPedido').style.display = 'none';
                return;
            }

            // PASO 2: Verificar pedidos pendientes usando el endpoint de pedidos
            const pedidosResponse = await fetch(`${url}/api/compras/obtenerPedido`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ idusuario, estado })
            });

            if (!pedidosResponse.ok) {
                throw new Error('Error al obtener el estado del pedido');
            }

            const resultadoPedidos = await pedidosResponse.json();

            // PASO 3: Aplicar lógica según los escenarios planteados
            const botonPedido = document.querySelector('#Pedido button');
            const iconoPedido = document.querySelector('#Pedido h1 i');
            const botonContinuarPedidos = document.querySelector('#continuarPedidos button');

            // Contabilizar pedidos existentes
            const tienePedidos = resultadoPedidos.exists && resultadoPedidos.pedidos && resultadoPedidos.pedidos.length > 0;
            const cantidadPedidos = tienePedidos ? resultadoPedidos.pedidos.length : 0;
            const cantidadDependencias = dependencias.length;

            // Verificar si la dependencia única tiene subdependencias
            const tieneSubdependencias = cantidadDependencias === 1 && 
                dependencias[0].subdependencias && 
                dependencias[0].subdependencias.length > 0;

            // ESCENARIO 1: Usuario con 2 o más dependencias
            if (cantidadDependencias >= 2) {
                // El botón "Nuevo Pedido" SIEMPRE se mantiene como "Nuevo Pedido"
                botonPedido.textContent = 'Nuevo Pedido';
                botonPedido.onclick = () => redireccionNuevoPedido();
                iconoPedido.className = 'fas fa-file-medical';

                // Para usuarios con 2+ dependencias: mostrar "Continuar Varios Pedidos" SOLO si tiene pedidos procesados
                if (tienePedidos) {
                    cardContinuarPedidos.style.display = 'block';
                    botonContinuarPedidos.textContent = 'Continuar Varios Pedidos';
                    botonContinuarPedidos.onclick = () => redireccionVariosPedidos();
                } else {
                    cardContinuarPedidos.style.display = 'none';
                }
            }
            // ESCENARIO 2: Usuario con una sola dependencia
            else if (cantidadDependencias === 1) {
                // SUBESCENARIO 2.1: La dependencia única tiene subdependencias
                if (tieneSubdependencias) {
                    // Tratar como si fuera múltiples dependencias
                    botonPedido.textContent = 'Nuevo Pedido';
                    botonPedido.onclick = () => redireccionNuevoPedido();
                    iconoPedido.className = 'fas fa-file-medical';

                    // Mostrar "Continuar Varios Pedidos" SOLO si tiene pedidos procesados
                    if (tienePedidos) {
                        cardContinuarPedidos.style.display = 'block';
                        botonContinuarPedidos.textContent = 'Continuar Varios Pedidos';
                        botonContinuarPedidos.onclick = () => redireccionVariosPedidos();
                    } else {
                        cardContinuarPedidos.style.display = 'none';
                    }
                }
                // SUBESCENARIO 2.2: La dependencia única NO tiene subdependencias
                else {
                    // Para usuarios con 1 dependencia sin subdependencias: SIEMPRE ocultar "Continuar Varios Pedidos"
                    cardContinuarPedidos.style.display = 'none';

                    // Si tiene exactamente UN pedido procesado - cambiar a "Continuar Pedido"
                    if (cantidadPedidos === 1) {
                        botonPedido.textContent = 'Continuar Pedido';
                        botonPedido.onclick = () => redireccionContinuarPedido(resultadoPedidos.pedidos[0].idpedido);
                        iconoPedido.className = 'fas fa-redo-alt';
                    }
                    // Si tiene múltiples pedidos procesados - mantener "Nuevo Pedido"
                    else if (cantidadPedidos > 1) {
                        botonPedido.textContent = 'Nuevo Pedido';
                        botonPedido.onclick = () => redireccionNuevoPedido();
                        iconoPedido.className = 'fas fa-file-medical';
                    }
                    // Sin pedidos procesados - mantener "Nuevo Pedido"
                    else {
                        botonPedido.textContent = 'Nuevo Pedido';
                        botonPedido.onclick = () => redireccionNuevoPedido();
                        iconoPedido.className = 'fas fa-file-medical';
                    }
                }
            }

        } catch (error) {
            console.error('Error al inicializar pedidos:', error);
            
            // En caso de error, mostrar configuración por defecto
            const botonPedido = document.querySelector('#Pedido button');
            const iconoPedido = document.querySelector('#Pedido h1 i');

            botonPedido.textContent = 'Nuevo Pedido';
            botonPedido.onclick = () => redireccionNuevoPedido();
            iconoPedido.className = 'fas fa-file-medical';
            cardContinuarPedidos.style.display = 'none';
        }
    } else {
        // No tiene permisos para manejar pedidos
        cardPedido.style.display = 'none';
        cardContinuarPedidos.style.display = 'none';
    }
}

// FUNCIONES GLOBALES DE REDIRECCIÓN
function redireccionNuevoPedido() {
    sessionStorage.setItem("modoPedido", "conreferencia");
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

function redireccionRevisarPedido() {
    const url = `/compras/revisarpedido/`;
    cargarVista(url);
}

function redireccionConsultarPedidos() {
    const url = `/compras/consultarpedidos/`;
    cargarVista(url);
}

function redireccionVariosPedidos() {
    const url = `/compras/variospedidos/`;
    cargarVista(url);
}