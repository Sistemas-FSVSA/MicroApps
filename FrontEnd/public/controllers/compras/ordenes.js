document.addEventListener("DOMContentLoaded", () => {
    InicializarOrdenes();
});

async function InicializarOrdenes() {
    const permisos = JSON.parse(localStorage.getItem('permisos'));

    // Validación independiente para la card APROBAR_PEDIDOS
    const tieneVistaGenerarOrden = permisos.some(permiso => permiso.elemento === "GENERAR_ORDEN");
    const GenerarOrden = document.getElementById('generarOrden');
    if (!tieneVistaGenerarOrden) {
        GenerarOrden.style.display = 'none';
    }

    // Validación independiente para la card APROBAR_PEDIDOS
    const tieneVistaRelacionarOrden = permisos.some(permiso => permiso.elemento === "RELACIONAR_ORDEN");
    const RelacionarOrden = document.getElementById('relacionarOrden');
    if (!tieneVistaRelacionarOrden) {
        RelacionarOrden.style.display = 'none';
    }
}

function redireccionNuevaOrden() {
    const url = `/compras/itemsolicitados`;
    cargarVista(url);
}

function redireccionRelacionarOrden() {
    const url = `/compras/relacionarorden`;
    cargarVista(url);
}

function redireccionImprimirOrden() {
    const url = `/compras/imprimirorden`;
    cargarVista(url);
}

function redireccionNuevaOrdenSinPedido() {
    sessionStorage.setItem("modoPedido", "sinreferencia");

    const param = btoa("sinreferencia");
    const url = `/compras/nuevopedido?param=${param}`;
    cargarVista(url);
}


