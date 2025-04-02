document.addEventListener('DOMContentLoaded', function () {
    InicializarReporteVales()
});

async function InicializarReporteVales() {
    const btnDescargar = document.getElementById('btnDescargar');
    btnDescargar.disabled = true; // Deshabilitar el botón inicialmente
    let valesData = []; // Datos obtenidos de la API

    // Inicializar Select2
    $('.select2').select2({
        placeholder: 'Todo',
        closeOnSelect: false,
        allowClear: true
    });

    cargarFiltros();
    mostrarFechaActual();

    // Evento para capturar datos cuando se presiona "Visualizar"
    document.getElementById('btnVisualizar').addEventListener('click', async function () {
        await enviarDatosReporte();
        btnDescargar.disabled = false; // Habilitar botón tras la consulta exitosa
    });

    // Evento para ejecutar la descarga cuando el usuario haga clic en el botón
    document.getElementById('btnDescargar').addEventListener('click', generarReporteExcel);

    // Evento para detectar cambios en los filtros y deshabilitar el botón de descarga
    $('#fechaInicio, #fechaFin, #tipoReporte, #dependencia').on('change', function () {
        btnDescargar.disabled = true;
    });
}

// Función para cargar los filtros desde el backend usando fetch
async function cargarFiltros() {
    try {
        const response = await fetch(`${url}/api/vales/obtenerCategorias`);
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const data = await response.json();

        // Obtener el select de dependencias
        const dependenciaSelect = document.getElementById('dependencia');
        dependenciaSelect.innerHTML = ''; // Limpiar selectores

        // Añadir opción "Todo" al inicio
        const opcionTodo = new Option('Todo', 'all');
        dependenciaSelect.appendChild(opcionTodo);

        // Añadir opciones únicas desde el endpoint
        data.dependencia.forEach(item => {
            const option = new Option(item.nombre, item.nombre); // Agregamos valor correctamente
            dependenciaSelect.appendChild(option);
        });

        // Recargar Select2 para reflejar cambios
        $('#dependencia').trigger('change');

        // Configurar los selectores para mostrar "Todo" cuando todas las opciones están seleccionadas
        mostrarTodo();
    } catch (error) {
        console.error("Error cargando los filtros:", error);
    }
}

// Función para mostrar "Todo" cuando todas las opciones están seleccionadas o ninguna
function mostrarTodo() {
    $('.select2').each(function () {
        var $this = $(this);
        var totalOptions = $this.find('option').length - 1; // Restar la opción "Todo"

        $this.on('change', function () {
            var selectedOptions = $this.val();

            // Si se selecciona alguna opción, remover la selección de "Todo"
            if (selectedOptions && selectedOptions.includes('all') && selectedOptions.length > 1) {
                // Remover "Todo" si se selecciona alguna opción adicional
                selectedOptions = selectedOptions.filter(function (val) {
                    return val !== 'all';
                });
                $this.val(selectedOptions).trigger('change');
            }

            // Si no hay ninguna opción seleccionada, mostrar "Todo"
            if (!selectedOptions || selectedOptions.length === 0) {
                $this.val(['all']).trigger('change');
            }
        });

        // Inicialmente mostrar "Todo" si no hay selección
        if ($this.val() === null || $this.val().length === 0) {
            $this.val(['all']).trigger('change');
        }
    });
}

async function enviarDatosReporte() {
    const fechaInicio = document.getElementById('fechaInicio').value;
    const fechaFin = document.getElementById('fechaFin').value;
    const tipoReporte = document.getElementById('tipoReporte').value;
    const dependenciaSelect = $('#dependencia').val();

    let dependencias = [];

    // Si seleccionó "Todo" o ninguna opción, tomamos todas las opciones disponibles
    if (!dependenciaSelect || dependenciaSelect.includes('all')) {
        dependencias = $('#dependencia option').map(function () {
            return this.value !== 'all' ? this.value : null;
        }).get();
    } else {
        dependencias = dependenciaSelect;
    }

    const datos = { fechaInicio, fechaFin, dependencias, tipoReporte };

    try {
        const response = await fetch(`${url}/api/vales/generarReporte`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });

        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

        const data = await response.json();

        valesData = data;
        renderizarTabla(tipoReporte, valesData);
    } catch (error) {
        console.error("Error al enviar los datos:", error);
    }
}
function renderizarTabla(tipoReporte, data) {
    const tabla = $('#valesTable');

    // Destruir DataTable si ya existe
    if ($.fn.DataTable.isDataTable("#valesTable")) {
        tabla.DataTable().clear().destroy();
    }

    // Limpiar el contenido de la tabla antes de reconstruirla
    tabla.empty();

    let columnas = [];
    let datos = [];

    if (tipoReporte === "1") {
        // 📌 Reporte General (Totalizado por encargado)
        columnas = [
            { title: "Identificación", data: "identificacion" },
            { title: "Nombres", data: "nombres" },
            { title: "Apellidos", data: "apellidos" },
            { title: "Total Vales", data: "totalValor" }
        ];
        datos = data.reporte || [];

    } else if (tipoReporte === "2") {
        // 📌 Reporte Detallado (* de los registros)
        columnas = [
            { title: "Identificación", data: "identificacion" },
            { title: "Nombres", data: "nombres" },
            { title: "Apellidos", data: "apellidos" },
            { title: "Valor", data: "valor" },
            { 
                title: "Fecha Vale", 
                data: "fechavale",
                render: function(data) {
                    return formatFecha(data);
                }
            },
            { title: "Dependencia", data: "categoria" },
        ];
        datos = data.reporte || [];
    }

    // Validar que los datos sean un array antes de renderizar la tabla
    if (!Array.isArray(datos)) {
        console.error("Los datos recibidos no son un array:", datos);
        datos = [];
    }

    // Crear nueva instancia de DataTable con la nueva estructura
    tabla.DataTable({
        data: datos,
        columns: columnas,
        responsive: true,
        destroy: true,
        language: {
            url: 'https://cdn.datatables.net/plug-ins/1.13.4/i18n/es-MX.json'
        }
    });
}

// Función para generar el reporte de Excel
function generarReporteExcel() {
    if (!valesData || !valesData.reporte || valesData.reporte.length === 0) {
        alert("No hay datos para exportar.");
        return;
    }

    const fechaActual = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
    const tipoReporte = document.getElementById('tipoReporte').value; // Obtener el tipo de reporte

    let worksheetData = [];
    let nombreArchivo = `Reporte_${fechaActual}.xlsx`;

    if (tipoReporte === "1") {
        // 📌 Reporte General (Totalizado por encargado)
        worksheetData.push(["Identificación", "Nombres", "Apellidos", "Total Vales"]);

        valesData.reporte.forEach((item) => {
            worksheetData.push([
                item.identificacion,
                item.nombres,
                item.apellidos,
                item.totalValor,
            ]);
        });

        nombreArchivo = `Reporte_General_${fechaActual}.xlsx`;

    } else if (tipoReporte === "2") {
        // 📌 Reporte Detallado (* de los registros)
        worksheetData.push(["Identificación", "Nombres", "Apellidos", "Valor", "Fecha Vale", "Dependencia"]);

        valesData.reporte.forEach((item) => {
            worksheetData.push([
                item.identificacion,
                item.nombres,
                item.apellidos,
                item.valor,
                item.fechavale,
                item.categoria,
            ]);
        });

        nombreArchivo = `Reporte_Detallado_${fechaActual}.xlsx`;
    }

    // Crear el libro y la hoja de Excel
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte');

    // Descargar el archivo
    XLSX.writeFile(wb, nombreArchivo);
}

