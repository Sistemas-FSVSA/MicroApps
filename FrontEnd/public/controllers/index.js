// --- Autenticación y Permisos ---
const url = window.env.API_URL;

document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");

  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const identificacion = document.getElementById("identificacion").value;
    const password = document.getElementById("password").value;

    // ✅ Capturar estado del checkbox y guardarlo
    const mantenerSesion = document.getElementById("mantenerSesion").checked;
    localStorage.setItem("mantenerSesion", mantenerSesion);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    fetch(`${url}/api/index/postUsuario`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ identificacion, password }),
      signal: controller.signal,
    })
      .then((response) => {
        clearTimeout(timeoutId);
        if (!response.ok) {
          return response.json().then((data) => {
            throw data;
          });
        }
        return response.json();
      })
      .then((data) => {
        localStorage.setItem("nombres", data.user.nombres);
        localStorage.setItem("apellidos", data.user.apellidos);
        localStorage.setItem("idusuario", data.user.idusuario);
        localStorage.setItem("permisos", JSON.stringify(data.user.permisos));

        // --- INICIO: Reinicio de sesión y temporizador ---
        setSessionStartTime();
        inactivityTime();
        // --- FIN: Reinicio de sesión y temporizador ---

        window.location.href = "/inicio";
      })
      .catch((error) => {
        clearTimeout(timeoutId);

        if (error.name === "AbortError") {
          // Timeout alcanzado, el backend no respondió
          Swal.fire({
            icon: "error",
            title: "Servidor no disponible",
            text: "No se pudo conectar al servidor. Intente nuevamente en unos minutos.",
            confirmButtonText: "Aceptar",
            customClass: { confirmButton: "swal2-confirm" },
          });
        } else if (error.error) {
          // Error manejado por el backend
          let errorMessage;
          switch (error.error) {
            case "Contraseña inválida.":
              errorMessage = "Contraseña incorrecta.";
              break;
            case "Usuario desactivado. No tiene acceso.":
              errorMessage = "Su cuenta está desactivada.";
              break;
            case "Identificación inválida.":
              errorMessage = "Identificación no encontrada.";
              break;
            case "Base de datos no disponible.":
              errorMessage =
                "El sistema está en mantenimiento. Intente más tarde.";
              break;
            default:
              errorMessage = "Error inesperado. Intente nuevamente.";
              break;
          }
          Swal.fire({
            icon: "error",
            title: "Error",
            text: errorMessage,
            confirmButtonText: "Aceptar",
            customClass: { confirmButton: "swal2-confirm" },
          });
        } else {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "Ocurrió un problema con el servidor. Intente más tarde.",
            confirmButtonText: "Aceptar",
            customClass: { confirmButton: "swal2-confirm" },
          });
        }
      });
  });

  document.getElementById('btnReservar').addEventListener('click', () => {
    window.location.href = '/agenda';
  });


  // Consultar usuarios activos y mostrarlos debajo del botón
  fetch(`${url}/api/online`) // Ajusta la ruta si usás un prefijo diferente
    .then((res) => res.json())
    .then((data) => {
      const conteo = data.activos ?? 0;
      document.getElementById(
        "usuarios-activos"
      ).textContent = `Usuarios activos: ${conteo}`;
    })
    .catch(() => {
      document.getElementById("usuarios-activos").textContent =
        "No se pudo obtener usuarios activos";
    });
});

function inactivityTime() {
  let time;
  const maxInactivityTime = 10 * 60 * 1000; // Tiempo máximo de inactividad

  function resetTimer() {
    clearTimeout(time);
    time = setTimeout(() => logoutUser(true), maxInactivityTime); // Cierre de sesión automático
    resetSessionTimer();
  }

  window.onload = resetTimer;
  document.onmousemove = resetTimer;
  document.onkeypress = resetTimer;
  document.onclick = resetTimer;
  document.onscroll = resetTimer;
  document.onkeydown = resetTimer;
}

function setSessionStartTime() {
  localStorage.setItem("sessionStartTime", Date.now());
}
