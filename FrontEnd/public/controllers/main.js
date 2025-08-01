// --- Autenticación y Permisos ---
const url = window.env.API_URL;

document.addEventListener('DOMContentLoaded', function () {
    InicializarMain()
});

function InicializarMain() {
    setupMenuToggle('togglePQRS', 'submenuPQRS', 'pqrsIcon');
    setupMenuToggle('toggleVales', 'submenuVales', 'valesIcon');
    setupMenuToggle('toggleCompras', 'submenuCompras', 'ComprasIcon');
    setupMenuToggle('toggleRecaudo', 'submenuRecaudo', 'RecaudoIcon');

    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
        logoutLink.addEventListener('click', (event) => {
            event.preventDefault(); // Evita la acción predeterminada del enlace
            logoutUser(); // Cierre de sesión manual
        });
    }

    cargarPermisosSidebar();
    checkSessionExpiration();
    inactivityTime();

    document.querySelectorAll("a[data-navigate]").forEach(link => {
        link.addEventListener("click", async (event) => {
            event.preventDefault(); // Evita la recarga de la página

            const url = link.getAttribute("href");
            if (!url) return;

            try {
                // Borra el sessionStorage en cada navegación
                sessionStorage.clear();

                const response = await fetch(url, { method: "GET", headers: { "X-Requested-With": "XMLHttpRequest" } });

                if (!response.ok) throw new Error("Error al cargar la vista");

                const html = await response.text();
                document.getElementById("contenido").innerHTML = html;

                // Guarda el estado anterior y la nueva URL en el historial
                const prevUrl = window.location.pathname;
                window.history.pushState({ path: url, prevUrl: prevUrl }, "", url);

                // Re-ejecutar scripts específicos de la vista
                reinitializeScripts();

            } catch (error) {
                console.error("Error en la navegación:", error);
            }
        });
    });

    window.addEventListener("popstate", function (event) {
        if (event.state && event.state.path) {
            cargarVista(event.state.path);
        } else {
            cargarVista('/inicio'); // Si no hay historial válido, ir a inicio
        }
    });

    // Redirigir si no hay sesión
    const sessionStartTime = localStorage.getItem("sessionStartTime");
    if (!sessionStartTime) {
        window.location.href = "/login";
        return;
    }

    // Validar expiración inmediata
    const elapsed = Date.now() - parseInt(sessionStartTime, 10);
    if (elapsed > getMaxInactivityTime()) {
        logoutUser(true);
    }
}

//FUNCIONES PARA EL MANEJO DEL CIERRE DE SESION AUTOMATICO LUEGO DE 10MIN
// 🔄 Obtiene el tiempo máximo de inactividad dinámicamente
function getMaxInactivityTime() {
    const mantenerSesion = localStorage.getItem('mantenerSesion') === 'true';
    return mantenerSesion ? 8 * 60 * 60 * 1000 : 10 * 60 * 1000; // 8 horas o 10 min
}

// 🔁 Guardar inicio de sesión
function setSessionStartTime() {
    localStorage.setItem('sessionStartTime', Date.now());
}

// 🔁 Reiniciar temporizador al detectar actividad
function resetSessionTimer() {
    localStorage.setItem('sessionStartTime', Date.now());
}

// 🔍 Verificar si ya expiró la sesión al cargar
function checkSessionExpiration() {
    const sessionStartTime = localStorage.getItem('sessionStartTime');
    if (sessionStartTime) {
        const elapsedTime = Date.now() - parseInt(sessionStartTime, 10);
        if (elapsedTime > getMaxInactivityTime()) {
            logoutUser(true);
        }
    }
}

// 💤 Inactividad detectada
function inactivityTime() {
    let time;

    function resetTimer() {
        clearTimeout(time);
        time = setTimeout(() => logoutUser(true), getMaxInactivityTime());
        resetSessionTimer();
    }

    window.onload = resetTimer;
    document.onmousemove = resetTimer;
    document.onkeypress = resetTimer;
    document.onclick = resetTimer;
    document.onscroll = resetTimer;
    document.onkeydown = resetTimer;
}

// 🔚 Cierre de sesión
async function logoutUser(autoLogout = false) {
    try {
        if (!autoLogout) {
            const confirmacion = await Mensaje(
                'warning',
                'Confirmación',
                '¿Estás seguro de que deseas cerrar sesión?',
                false,
                true
            );
            if (!confirmacion) return;
        }

        const response = await fetch(`${url}/api/index/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
        });

        const data = await response.json();
        if (data.estado === 'ok') {
            localStorage.clear();

            const isTabVisible = document.visibilityState === 'visible';
            if (autoLogout && isTabVisible) {
                await Mensaje('warning', 'Sesión Expirada', 'Por inactividad, tu sesión ha expirado.', false, false);
            } else if (!autoLogout) {
                await Mensaje('success', 'Sesión Cerrada', 'Has cerrado sesión correctamente.', true, false);
            }

            window.location.href = '/login';
        } else {
            console.error('Error al cerrar sesión:', data.mensaje);
            await Mensaje('error', 'Error', 'Hubo un problema al cerrar sesión. Inténtalo de nuevo.', false, false);
        }
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        await Mensaje('error', 'Error', 'Hubo un problema al cerrar sesión. Inténtalo de nuevo.', false, false);
    }
}
//FIN FUNCIONES CIERRE DE SESION

// NAVEGACION DINAMICA CARGANDO EL CONTENIDO SIN REFRESCAR LA PAGINA
function reinitializeScripts() {
    const path = window.location.pathname;

    function loadAndRunScript(scriptPath, functionName) {
        // Elimina el script si ya existe
        const existingScript = document.querySelector(`script[src="${scriptPath}"]`);
        if (existingScript) {
            existingScript.remove();
        }

        // Cargar nuevamente el script
        const script = document.createElement("script");
        script.src = scriptPath;
        script.onload = () => {
            if (typeof window[functionName] === "function") {
                window[functionName]();
            } else {
                console.error(`Error: ${functionName} no está definido.`);
            }
        };
        script.onerror = () => {
            console.error(`Error al cargar ${scriptPath}`);
        };
        document.body.appendChild(script);
    }


    if (path.includes("/usuarios/usuarios")) {
        loadAndRunScript("/controllers/usuarios/usuarios.js", "inicializarUsuarios");
    }

    if (path.includes("/usuarios/usuario/")) {
        loadAndRunScript("/controllers/usuarios/usuario.js", "inicializarUsuario");
    }

    if (path.includes("/pqrs/formulariopqrs")) {
        loadAndRunScript("/controllers/pqrs/formulariopqrs.js", "inicializarFormularioPQRS");
    }

    if (path.includes("/pqrs/consultarpqrs")) {
        loadAndRunScript("/controllers/pqrs/consultarpqrs.js", "inicializarConsultarPQRS");
    }

    if (path.includes("/pqrs/gestionpqrs")) {
        loadAndRunScript("/controllers/pqrs/gestionpqrs.js", "inicializarGestionPQRS");
    }

    if (path.includes("/tramites/planilla/")) {
        loadAndRunScript("/controllers/tramites/planilla.js", "InicializarPlanilla");
    }

    if (path.includes("/tramites/planillaspendientes/")) {
        loadAndRunScript("/controllers/tramites/planillaspendientes.js", "InicializarPlanillasPendientes");
    }

    if (path.includes("/tramites/contabilizarplanillas/")) {
        loadAndRunScript("/controllers/tramites/contabilizarplanillas.js", "InicializarContabilizarPlanillas");
    }

    if (path.includes("/tramites/resumenplanilla")) {
        loadAndRunScript("/controllers/tramites/resumenplanilla.js", "InicializarResumenPlanilla");
    }

    if (path.includes("/tramites/edicionplanilla")) {
        loadAndRunScript("/controllers/tramites/edicionplanilla.js", "InicializarEdicionPlanilla");
    }

    if (path.includes("/tramites/nuevaplanilla")) {
        loadAndRunScript("/controllers/tramites/nuevaplanilla.js", "InicializarNuevaPlanilla");
    }

    if (path.includes("/vales/vales")) {
        loadAndRunScript("/controllers/vales/vales.js", "InicializarVales");
    }

    if (path.includes("/vales/reportevales")) {
        loadAndRunScript("/controllers/vales/reportevales.js", "InicializarReporteVales");
    }

    if (path.includes("/recaudo/novedadesrecaudo")) {
        loadAndRunScript("/controllers/recaudo/novedadesrecaudo.js", "incializarNovedadesRecaudo");
    }

    if (path.includes("/recaudo/nominarecaudo")) {
        loadAndRunScript("/controllers/recaudo/nominarecaudo.js", "inicializarNominaRecaudo");
    }

    if (path.includes("/compras/pedidos")) {
        loadAndRunScript("/controllers/compras/pedidos.js", "InicializarPedidos");
    }

    if (path.includes("/compras/continuarpedido")) {
        loadAndRunScript("/controllers/compras/continuarpedido.js", "InicializarContinuarPedido");
    }

    if (path.includes("/compras/nuevopedido")) {
        loadAndRunScript("/controllers/compras/nuevopedido.js", "InicializarNuevoPedido");;
    }

    if (path.includes("/compras/aprobarpedido")) {
        loadAndRunScript("/controllers/compras/aprobarpedido.js", "InicializarAprobarPedido");;
    }

    if (path.includes("/compras/revisarpedido")) {
        loadAndRunScript("/controllers/compras/revisarpedido.js", "InicializarRevisarPedido");;
    }

    if (path.includes("/compras/ordenes")) {
        loadAndRunScript("/controllers/compras/ordenes.js", "InicializarOrdenes");;
    }

    if (path.includes("/compras/itemsolicitados")) {
        loadAndRunScript("/controllers/compras/itemsolicitados.js", "InicializarItemSolicitados");;
    }

    if (path.includes("/compras/relacionarorden")) {
        loadAndRunScript("/controllers/compras/relacionarorden.js", "InicializarRelacionarOrden");;
    }

    if (path.includes("/compras/registrocompras")) {
        loadAndRunScript("/controllers/compras/registrocompras.js", "InicializarRegistroCompras");;
    }

    if (path.includes("/compras/consultarorden")) {
        loadAndRunScript("/controllers/compras/consultarorden.js", "InicializarConsultarOrden");;
    }

    if (path.includes("/compras/consultarpedidos")) {
        loadAndRunScript("/controllers/compras/consultarpedidos.js", "InicializarConsultarPedidos");;
    }
}

function irAtras() {
    if (window.history.length > 1) {
        window.history.back();
    } else {
        cargarVista('/inicio'); // Si no hay historial, volver a inicio
    }
    sessionStorage.clear();
}

function limpiarEventos() {
    $(document).off(); // Elimina todos los eventos de jQuery
}

async function cargarVista(url, push = true) {
    try {
        const response = await fetch(url, {
            method: "GET",
            headers: { "X-Requested-With": "XMLHttpRequest" }
        });

        if (!response.ok) throw new Error("Error al cargar la vista");

        const html = await response.text();
        document.getElementById("contenido").innerHTML = html;

        const currentUrl = window.location.pathname + window.location.search;

        if (currentUrl !== url) {
            const prevUrl = currentUrl;
            if (push) {
                window.history.pushState({ path: url, prevUrl: prevUrl }, "", url);
            } else {
                window.history.replaceState({ path: url, prevUrl: prevUrl }, "", url);
            }
        }

        reinitializeScripts(); // reejecuta los scripts después de modificar la URL
    } catch (error) {
        console.error("Error en la navegación:", error);
    }
}

//FINAL NAVEGACION DINAMICA//

//FUNCIONES EXTRAS
//FUNCION MOSTRAR MENSAJES GENERAL CON SWEETALERT
async function Mensaje(icono, titulo, mensaje, autoCerrar = true, confirmacion = false) {
    return Swal.fire({
        icon: icono, // 'success', 'error', 'warning', 'info'
        title: titulo,
        text: mensaje,
        showConfirmButton: !autoCerrar, // Si autoCerrar es false, debe mostrar el botón "Aceptar"
        showCancelButton: confirmacion, // Si confirmacion es true, muestra botón "Cancelar"
        confirmButtonText: "Aceptar",
        cancelButtonText: "Cancelar",
        timer: autoCerrar ? 3000 : null, // Si autoCerrar es true, cierra en 3 segundos sin botones
        customClass: {
            confirmButton: 'swal-confirm-button', // Clase para el botón Aceptar
            cancelButton: 'swal-cancel-button' // Clase para el botón Cancelar
        }
    }).then((result) => {
        return confirmacion ? result.isConfirmed : true; // Devuelve true si se confirmó o si no se pidió confirmación
    });
}

//FUNCION MOSTRAR FECHA FORMATEADA (CON HORA)
function formatFechaHora(data) {
    if (!data) return 'Sin registro';
    const cleanedData = data.endsWith('Z') ? data.slice(0, -1) : data;
    const [datePart, timePart] = cleanedData.split('T');
    if (!datePart || !timePart) return 'Formato inválido';
    const [year, month, day] = datePart.split('-');
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const mesAbreviado = meses[parseInt(month, 10) - 1];
    const [hourStr, minuteStr] = timePart.split(':');
    let hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);
    const amPm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    const minutoFormateado = minute.toString().padStart(2, '0');
    return `${day}/${mesAbreviado}/${year} ${hour}:${minutoFormateado} ${amPm}`;
}

//FUNCION MOSTRAR FECHA FORMATEADA (SIN HORA)
function formatFecha(data) {
    if (!data) return 'Sin registro'; // Si la fecha es null o undefined
    // Asegurar que no termine en "Z" para evitar problemas de formato
    const cleanedData = data.endsWith('Z') ? data.slice(0, -1) : data;
    // Dividir la fecha y extraer los componentes
    const [year, month, day] = cleanedData.split('T')[0].split('-');
    return `${day}/${month}/${year}`; // Formato DD/MM/YYYY
}

//FUNCION PARA MOSTRAR LA FECHA ACUAL (SIN HORA)
function mostrarFechaActual() {
    const fecha = new Date();
    const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
    const fechaFormateada = fecha.toLocaleDateString('es-ES', opciones);
    document.getElementById('fechaActual').textContent = fechaFormateada;
}

//FUNCION MOSTRAR/OCULTAR SPINNER DE CARGA
function showSpinner() {
    const spinner = document.getElementById('spinner-overlay');
    spinner.classList.add('active');
}
function hideSpinner() {
    const spinner = document.getElementById('spinner-overlay');
    spinner.classList.remove('active');
}

//FUNCION MOSTRAR NOMBRE
function mostrarNombreUsuario() {
    const nombres = localStorage.getItem('nombres');
    const apellidos = localStorage.getItem('apellidos');
    if (nombres && apellidos) {
        const usuarioNombre = document.getElementById('usuarioNombre');
        if (usuarioNombre) {
            usuarioNombre.textContent = `${nombres} ${apellidos}`;
        }
    }
}

//FUNCION HABILITAR MAYUSCULA EN TODA LA PAGINA:
function habilitarMayusculas() {
    // Selecciona todos los inputs de la página
    const inputs = document.querySelectorAll("input");

    // Agrega el evento a cada input
    inputs.forEach(input => {
        input.addEventListener("input", function () {
            this.value = this.value.toUpperCase(); // Convierte el texto a mayúsculas
        });
    });
}

//FUNCION OPCIONES DINAMICAS SIDEBAR
function setupMenuToggle(menuId, submenuId, iconId) {
    const toggleMenu = document.getElementById(menuId);
    const submenu = document.getElementById(submenuId);
    const icon = document.getElementById(iconId);

    if (toggleMenu && submenu && icon) {
        submenu.style.display = 'none';
        icon.style.transition = 'transform 0.3s ease';

        toggleMenu.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();

            const isOpen = submenu.classList.contains('menu-open');
            document.querySelectorAll('.nav .menu-open').forEach(menu => {
                menu.classList.remove('menu-open');
                menu.style.display = 'none';
            });
            document.querySelectorAll('.nav .fa-chevron-down').forEach(icon => {
                icon.style.transform = 'rotate(0deg)';
            });

            if (!isOpen) {
                submenu.classList.add('menu-open');
                submenu.style.display = 'block';
                icon.style.transform = 'rotate(180deg)';
            }
        });
    }
}

//FUNCION LIMPIAR VALIDACIONES FORMULARIO
function limpiarValidaciones() {
    document.querySelectorAll('.is-invalid').forEach(input => {
        input.classList.remove('is-invalid');
    });
}

//FUNCION PARA VALIDAR LAS RUTAS AUTORIZADAS
function userHasPermission(path) {
    const permisos = JSON.parse(localStorage.getItem('permisos')) || [];
    const routePermissions = {
        '/planilla': ["NUEVA_PLANILLA", "PENDIENTE_PLANILLA", "DESCARGAR_PLANILLA", "USUARIOS"],
        '/usuario': ["NUEVA_PLANILLA", "PENDIENTE_PLANILLA", "DESCARGAR_PLANILLA", "USUARIOS"],
        '/nuevaplanilla': ["NUEVA_PLANILLA"],
        '/usuarios': ["USUARIOS"],
        '/resumenplanilla': ["NUEVA_PLANILLA", "PENDIENTE_PLANILLA"],
        '/edicionplanilla': ["NUEVA_PLANILLA", "PENDIENTE_PLANILLA"],
        '/contabilizarplanillas': ["DESCARGAR_PLANILLA"]
    };

    const requiredPermissions = routePermissions[path];
    if (!requiredPermissions) return true;

    return requiredPermissions.some(permission =>
        permisos.some(permiso => permiso.vista === permission)
    );
}