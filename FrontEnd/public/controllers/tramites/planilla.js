document.addEventListener("DOMContentLoaded", () => {
    InicializarPlanilla();
});


function redireccionNuevaPlanilla() {
    const idUsuario = localStorage.getItem('idusuario');
    const url = `/tramites/nuevaplanilla?id=${idUsuario}`;
    cargarVista(url);
}

function redireccionContinuarPlanilla(idplanilla) {
    const idUsuario = localStorage.getItem('idusuario');
    const estado = 'GUARDADO';
    if (idplanilla) {
        const url = `/tramites/resumenplanilla?idusuario=${idUsuario}&estado=${estado}&idplanilla=${idplanilla}`;
        cargarVista(url);
    } else {
        console.error('El idplanilla es undefined');
    }
}

function redireccionPlanillasPendientes() {
    const url = `/tramites/planillaspendientes/`;
    cargarVista(url);
}

function redireccionPlanillasContabilizar() {
    const url = `/tramites/contabilizarplanillas/`;
    cargarVista(url);
}

async function InicializarPlanilla() {
    const idUsuario = localStorage.getItem('idusuario');
    const permisos = JSON.parse(localStorage.getItem('permisos'));

    const tieneVistaPendientes = permisos.some(permiso => permiso.vista === "PENDIENTE_PLANILLA");
    const vistaPendiente = document.getElementById('planillasPendientes');
    if (!tieneVistaPendientes) {
        vistaPendiente.style.display = 'none';
    }

    const tieneVistaDescargar = permisos.some(permiso => permiso.vista === "DESCARGAR_PLANILLA");
    const vistaDescargar = document.getElementById('descargarPlanillas');
    if (!tieneVistaDescargar) {
        vistaDescargar.style.display = 'none';
    }

    // Verificar si el usuario tiene el permiso para ver la vista NUEVA_PLANILLA
    const tieneVistaNuevaPlanilla = permisos.some(permiso => permiso.vista === "NUEVA_PLANILLA");

    const cardNuevaPlanilla = document.getElementById('NuevaPlanilla');
    const cardContinuarPlanilla = document.getElementById('continuarPlanilla');

    if (!tieneVistaNuevaPlanilla) {
        // Si el usuario no tiene permiso, ocultar ambas tarjetas y detener la ejecución
        cardNuevaPlanilla.style.display = 'none';
        cardContinuarPlanilla.style.display = 'none';
        console.log("Usuario sin permiso de NUEVA_PLANILLA");
        return;
    }

    try {
        // Realizamos la petición para consultar el estado de la planilla
        const response = await fetch(`${url}/api/planilla/getPlanilla/${idUsuario}`, {
            method: 'GET',
            headers: {},
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Error al obtener el estado de la planilla');
        }

        const { tienePlanillaGuardada, idplanilla } = await response.json();

        // Mostrar u ocultar las tarjetas según el estado de `tienePlanillaGuardada`
        if (tienePlanillaGuardada) {
            // Si hay una planilla guardada, mostrar "Continuar Planilla" y ocultar "Nueva Planilla"
            cardContinuarPlanilla.style.display = 'block';
            cardNuevaPlanilla.style.display = 'none';

            const continuarButton = document.getElementById('btnContinuarPlanilla');
            const nuevoBoton = continuarButton.cloneNode(true); // Clona el botón sin eventos previos
            continuarButton.replaceWith(nuevoBoton); // Reemplaza el botón viejo con el nuevo

            nuevoBoton.addEventListener('click', () => {
                redireccionContinuarPlanilla(idplanilla);
            });

        } else {
            // Si no hay planilla guardada, mostrar "Nueva Planilla" y ocultar "Continuar Planilla"
            cardContinuarPlanilla.style.display = 'none';
            cardNuevaPlanilla.style.display = 'block';
        }
    } catch (error) {
        console.error('Error al cargar las tarjetas:', error);
    }
}

async function buscarDatos(tipo) {
    let URL = '';
    switch (tipo) {
        case 'responsable':
            URL = `${url}/api/gestionplanilla/getResponsable`;
            break;
        case 'tramite':
            URL = `${url}/api/gestionplanilla/getTramites`;
            break;
        case 'municipios':
            URL = `${url}/api/gestionplanilla/getMunicipios`;
            break;
        default:
            return [];
    }

    try {
        const response = await fetch(URL, {
            method: 'GET',
            headers: {'Content-Type': 'application/json',},
            credentials: 'include',
        });

        const data = await response.json();
        if (!data.data) return [];

        // Ordenar los datos según el tipo
        switch (tipo) {
            case 'responsable':
                return data.data.sort((a, b) => a.nombres.localeCompare(b.nombres)); // Ordenar por nombre de responsable
            case 'tramite':
                return data.data.sort((a, b) => a.nombre.localeCompare(b.nombre)); // Ordenar por nombre de trámite
            case 'municipios':
                return data.data.sort((a, b) => a.nombre.localeCompare(b.nombre)); // Ordenar por nombre de municipio
            default:
                return data.data;
        }
    } catch (error) {
        console.error('Error en la petición:', error);
        return [];
    }
}