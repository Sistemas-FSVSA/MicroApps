document.addEventListener("DOMContentLoaded", function () {
  incializarNovedadesRecaudo();
});

function incializarNovedadesRecaudo() {
  obtenerNovedades(); // Llamamos a la función para obtener las novedades al cargar la página
}

// Función para obtener las novedades desde el backend
async function obtenerNovedades() {
  try {
    const response = await fetch(`${url}/api/recaudo/obtenerNovedades`, {
      method: "GET",
      credentials: "include", // Incluimos las credenciales en la solicitud
    });

    if (response.ok) {
      const novedades = await response.json(); // Convertimos la respuesta a JSON

      // Ordenamos las novedades por id
      novedades.sort((a, b) => a.id - b.id);

      console.log(novedades);
      renderizarNovedades(novedades); // Llamamos a la función para renderizar los datos
    } else {
      console.error("Error al obtener novedades:", response.status);
      alert("Error al obtener novedades");
    }
  } catch (error) {
    console.error("Error en la solicitud fetch:", error);
    alert("Hubo un error al obtener las novedades");
  }
}

// Función para renderizar las novedades en el frontend
function renderizarNovedades(novedades) {
  const contenedor = document.getElementById("novedades-container"); // El contenedor donde se mostrarán las cards

  // Limpiamos el contenedor antes de agregar las novedades
  contenedor.innerHTML = "";

  // Si no hay novedades, mostramos el mensaje "Sin novedades pendientes"
  if (novedades.length === 0) {
    contenedor.innerHTML =
      '<h3 class="text-center">Sin novedades pendientes</h3>';
    return; // No hacemos nada más
  }

  // Iteramos sobre las novedades y creamos una card para cada una
  novedades.forEach((novedad) => {
    const col = document.createElement("div");
    col.classList.add("col-md-4", "mb-4"); // Definimos la columna con ancho de 4 (3 columnas por fila)

    const card = document.createElement("div");
    card.classList.add("card", "shadow-sm", "h-100"); // Card con sombra y altura completa

    // Formateamos la fecha antes de insertarla en el HTML
    const fechaFormateada = formatFechaHora(novedad.fechagenerado);

    card.innerHTML = `
    <div class="card-body">
        <p class="hora">${fechaFormateada}</p> <!-- Hora en la parte superior derecha -->
        <h5 class="card-title">POR: ${novedad.generadoPor}</h5>
        <br>
        <h6 class="card-subtitle">RECAUDADOR: ${novedad.recaudador}</h6>
        <p class="card-text">DETALLE: ${novedad.detalle}</p>
        <button type="button" class="btn btn-sm btn-leido" data-idgestion="${novedad.id}">
            <i class="fas fa-check"></i>
        </button>
    </div>
`;

    // Añadimos la card dentro de la columna
    col.appendChild(card);

    // Añadimos la columna al contenedor
    contenedor.appendChild(col);
  });

  // Añadimos el evento para los botones de cada card
  // Añadimos el evento para los botones de cada card
  document.querySelectorAll(".btn-leido").forEach((button) => {
    button.addEventListener("click", async (event) => {
      const idgestion = event.target
        .closest("button")
        .getAttribute("data-idgestion");
      
      // Mostrar la confirmación con la función Mensaje
      const result = await Mensaje("warning", "¿Desea cerrar esta novedad?", "Esta acción no puede deshacerse.", false, true);

      if (result) {
        const response = await fetch(`${url}/api/recaudo/actualizarNovedad`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ idgestion, estado: 'CERRADO' }), // Enviamos el idgestion y el estado
          credentials: "include", // Incluimos las credenciales en la solicitud
        });

        if (response.ok) {
          // Si la novedad se cerró correctamente, recargamos las novedades
          obtenerNovedades();
          Mensaje("success", "Cerrada", "La novedad ha sido cerrada.");
        } else {
          Mensaje("error", "Error", "Hubo un problema al cerrar la novedad.");
        }
      }
    });
  });
}
