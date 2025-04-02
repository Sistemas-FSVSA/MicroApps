document.addEventListener("DOMContentLoaded", () => {
    InicializarPlanillasPendientes();
});

async function InicializarPlanillasPendientes() {
    formatFechaHora();
    mostrarFechaActual();

    const permisos = localStorage.getItem('permisos') ? JSON.parse(localStorage.getItem('permisos')) : [];
    const tienePermisoVerPlanillas = permisos.some(permiso => permiso.elemento === "BOTON_VER_PLANILLA");

    // Verificar si DataTable ya está inicializado
    if ($.fn.DataTable.isDataTable('#planillasTable')) {
        $('#planillasTable').DataTable().destroy(); // 🔥 Elimina la instancia previa
    }

    // Inicializa DataTable correctamente
    const table = $('#planillasTable').DataTable({
        language: {
            url: 'https://cdn.datatables.net/plug-ins/1.13.4/i18n/es-MX.json'
        },
        columns: [
            { title: 'Planilla', data: 'idplanilla' },
            { title: 'Identificación', data: 'identificacion' },
            { title: 'Nombres', data: 'nombres' },
            { title: 'Apellidos', data: 'apellidos' },
            {
                title: 'Fecha Creación', data: 'fechainicio', render: function (data) {
                    return formatFechaHora(data);
                }
            },
            {
                title: 'Fecha Cierre', data: 'fechacierre', render: function (data) {
                    return formatFechaHora(data);
                }
            },
            { title: 'Estado', data: 'estado' },
            {
                title: 'Acciones', data: null, render: function (data, type, row) {
                    return tienePermisoVerPlanillas
                        ? `<button type="button" class="btn btn-fsvsaon ver-planilla" data-idusuario="${row.idusuario}" data-nombres="${row.nombres}" data-apellidos="${row.apellidos}" data-idplanilla="${row.idplanilla}"><i class="fas fa-eye"></i></button>`
                        : '';
                }
            },
        ],
        order: [[4, 'asc']],
    });

    // Obtener planillas y actualizar la tabla
    obtenerPlanillas(table);

    // Event listener para el botón "Ver Planilla"
    $('#planillasTable').off('click', '.ver-planilla').on('click', '.ver-planilla', async function () { 
        const button = $(this);
        const idUsuario = button.data('idusuario');
        const nombres = button.data('nombres');
        const apellidos = button.data('apellidos');
        const idplanilla = button.data('idplanilla');
        const estado = 'CERRADO';

        const url = `/tramites/resumenplanilla?idusuario=${idUsuario}&nombres=${encodeURIComponent(nombres)}&apellidos=${encodeURIComponent(apellidos)}&estado=${estado}&idplanilla=${idplanilla}`;

        window.history.pushState({ path: url }, "", url);
        await cargarVista(url);
    });
}

function obtenerPlanillas(table) {
    const spinner = document.getElementById("spinner");
    if (spinner) showSpinner();

    fetch(`${url}/api/planilla/getPlanillas`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Error en la respuesta de la API: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data && data.length > 0) {
            table.clear().rows.add(data).draw(); // ✅ Ahora actualiza en vez de re-inicializar
        }
    })
    .catch(error => {
        console.error('Error al obtener las planillas:', error);
    })
    .finally(() => {
        if (spinner) hideSpinner();
    });
}

function mostrarFechaActual() {
    const fechaElemento = document.getElementById('fechaActual');
    if (fechaElemento) {
        const fecha = new Date();
        const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
        fechaElemento.textContent = fecha.toLocaleDateString('es-ES', opciones);
    }
}

