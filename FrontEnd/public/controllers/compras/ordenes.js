document.addEventListener("DOMContentLoaded", () => {
    InicializarOrdenes();
});

async function InicializarOrdenes() {
   
}

function redireccionNuevaOrden() {
    const url = `/compras/itemsolicitados`;
    cargarVista(url);
}

function redireccionRelacionarOrden() {
    const url = `/compras/relacionarorden`;
    cargarVista(url);
}
