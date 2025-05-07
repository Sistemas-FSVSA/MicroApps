document.addEventListener("DOMContentLoaded", () => {
    InicializarOrdenes();
});

async function InicializarOrdenes() {
   
}

function redireccionNuevaOrden() {
    const url = `/compras/itemsolicitados`;
    cargarVista(url);
}
