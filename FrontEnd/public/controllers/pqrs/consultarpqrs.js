document.addEventListener("DOMContentLoaded", () => {
    inicializarConsultarPQRS();
});

async function inicializarConsultarPQRS() {
    cargarPqrs();
}

async function cargarPqrs() {
    try {
        const response = await fetch(`${url}/api/pqrs/obtenerPQRS`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
        });
        const result = await response.json();
        pqrs = result;
        renderizarPqrs();
    } catch (error) {
        console.error("Error al cargar las pqrs:", error);
    }
}

function renderizarPqrs() {
    if (!Array.isArray(pqrs)) {
        console.error("Error: pqrs no es un array", pqrs);
        return;
    }

    const tabla = $("#pqrs").DataTable();
    let paginaActual = tabla.page();

    tabla.clear();
    pqrs.forEach((item) => {
        tabla.row.add([
            item.idpqrs,
            item.titular || "No especificado",
            item.servicio || "No especificado",
            item.contrato || "No especificado",
            formatFecha(item.fechapqrs),
            obtenerEstadoConColor(item.estado),
            item.usuario_nombre || "No especificado",
            `<button class="btn btn-fsvsaon editar-inventario" 
            data-id="${item.idpqrs}" 
            data-estado="${item.estado}">
            <i class="fas fa-edit"></i>
            </button>`
        ]);
    });

    tabla.draw(false);
    tabla.page(paginaActual).draw(false);
}

$(document).ready(function () {
    $("#pqrs").DataTable({
        language: {
            url: "https://cdn.datatables.net/plug-ins/1.10.16/i18n/Spanish.json"
        },
        order: [[0, "desc"]],
        pageLength: 10
    });

    // 🔹 Delegar evento para los botones de gestión
    $("#pqrs tbody").on("click", ".editar-inventario", async function () {
        const idpqrs = $(this).data("id"); // Obtener el ID de PQRS
        const url = `/pqrs/gestionpqrs?idpqrs=${idpqrs}`;

        try {
            const response = await fetch(url, { method: "GET", headers: { "X-Requested-With": "XMLHttpRequest" } });

            if (!response.ok) throw new Error("Error al cargar la vista");

            const html = await response.text();
            document.getElementById("contenido").innerHTML = html; // Reemplaza el contenido

            // Actualizar la URL en el historial sin recargar
            const prevUrl = window.location.pathname;
            window.history.pushState({ path: url, prevUrl: prevUrl }, "", url);

            // Re-ejecutar scripts específicos de la vista
            reinitializeScripts();

        } catch (error) {
            console.error("Error en la navegación:", error);
        }
    });


    // 🔹 Cargar inventario por primera vez
    cargarPqrs();
});

function obtenerEstadoConColor(estado) {
    let claseColor = "estado-otro";

    switch (estado.toUpperCase()) {
        case "FINALIZADO":
            claseColor = "estado-finalizado";
            break;
        case "EN_PROGRESO":
            claseColor = "estado-progreso";
            break;
        case "RECIBIDO":
            claseColor = "estado-recibido";
            break;
    }

    return `
        <span class="estado-con-color">
            <span class="estado-circulo ${claseColor}"></span>
            ${estado}
        </span>`;
}

