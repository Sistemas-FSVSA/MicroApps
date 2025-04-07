// --- Autenticación y Permisos ---
const url = window.env.API_URL;

document.addEventListener("DOMContentLoaded", () => {
  obtenerUsuarios(); // Llamar a la función para cargar los usuarios
  obtenerRecaudadores(); // Llamar a la función para cargar los recaudadores
});

async function obtenerUsuarios() {
  try {
    const respuesta = await fetch(`${url}/api/recaudo/obtenerusuarios`);
    if (!respuesta.ok) throw new Error("Error al obtener usuarios");
    const usuarios = await respuesta.json();

    // Ordenar los usuarios alfabéticamente por nombre
    usuarios.sort((a, b) => a.nombre.localeCompare(b.nombre));

    const selectUsuarios = document.getElementById("usuarios");
    selectUsuarios.innerHTML =
      '<option value="" disabled selected>Seleccione un usuario</option>';

    usuarios.forEach((usuario) => {
      const option = document.createElement("option");
      option.value = usuario.idusuario;
      option.textContent = usuario.nombre;
      selectUsuarios.appendChild(option);
    });
  } catch (error) {
    console.error("Error al cargar los usuarios:", error);
    alert("Error al cargar los usuarios. Intente de nuevo.");
  }
}

async function obtenerRecaudadores() {
  try {
    const respuesta = await fetch(`${url}/api/recaudo/obtenerRecaudadores`);
    // Comprobar si la respuesta es correcta
    if (!respuesta.ok) throw new Error("Error al obtener recaudadores");
    const recaudadores = await respuesta.json();

    // Ordenar los recaudadores alfabéticamente por nombre
    recaudadores.sort((a, b) => a.nombre.localeCompare(b.nombre));

    const selectRecaudadores = document.getElementById("recaudadores");
    selectRecaudadores.innerHTML = `
        <option value="null" selected>OTROS</option>
      `;

    recaudadores.forEach((recaudador) => {
      const option = document.createElement("option");
      option.value = recaudador.idrecaudador;
      option.textContent = recaudador.nombre;
      selectRecaudadores.appendChild(option);
    });
  } catch (error) {
    console.error("Error al cargar los recaudadores:", error);
    alert("Error al cargar los recaudadores. Intente de nuevo.");
  }
}

// Función para enviar los datos del formulario al backend
async function enviarFormulario(event) {
  event.preventDefault(); // Prevenir el envío tradicional del formulario

  // Obtener los valores de los inputs
  const idusuario = document.getElementById("usuarios").value;
  let idrecaudador = document.getElementById("recaudadores").value;
  const detalle = document.getElementById("detalle").value;

  // Si el recaudador es "OTROS", enviar como null
  if (idrecaudador === "null") {
    idrecaudador = null;
  }

  // Validar que los campos estén llenos
  if (!idusuario || !detalle) {
    Swal.fire("Error", "Todos los campos son obligatorios", "error");
    return;
  }

  // Crear el cuerpo de la solicitud
  const body = JSON.stringify({
    idusuario,
    idrecaudador,
    detalle,
  });

  try {
    const respuesta = await fetch(`${url}/api/recaudo/guardarNovedad`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: body,
    });

    if (!respuesta.ok) throw new Error("Error al generar la novedad");

    // Si la novedad se genera correctamente
    Swal.fire({
      title: "Éxito",
      text: "Novedad generada con éxito",
      icon: "success",
      confirmButtonText: "Aceptar",
      confirmButtonColor: "#96072D",
    }).then(() => {
      // Limpiar el formulario
      document.getElementById("novedadForm").reset();
    });
  } catch (error) {
    console.error("Error al generar la novedad:", error);
    Swal.fire({
      title: "Error",
      text: "Hubo un problema al generar la novedad. Intente nuevamente.",
      icon: "error",
      confirmButtonText: "Aceptar",
      confirmButtonColor: "#96072D",
    });
  }
}

// Cargar usuarios y recaudadores cuando la página esté lista
document.addEventListener("DOMContentLoaded", () => {
  obtenerUsuarios();
  obtenerRecaudadores();

  // Asignar el evento de submit al formulario
  const form = document.getElementById("novedadForm");
  form.addEventListener("submit", enviarFormulario);
});
