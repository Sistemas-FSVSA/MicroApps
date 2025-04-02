document.addEventListener("DOMContentLoaded", () => {
    InicializarContabilizarPlanillas();
});


async function InicializarContabilizarPlanillas() {
    const idusuario = localStorage.getItem('idusuario');
    const btnVisualizar = document.getElementById('btnVisualizar');
    const btnDescargar = document.getElementById('btnDescargar');
    const fechaInicioInput = document.getElementById('fechaInicio');
    const fechaFinInput = document.getElementById('fechaFin');
    mostrarFechaActual();
    cargarPermisosContabilizar();
    let planillasData = []; // Datos obtenidos de la API



    // Deshabilitar el botón de descarga inicialmente
    btnDescargar.disabled = true;

    // Inicializa DataTables
    const table = $('#planillasTable').DataTable({
        data: [],
        columns: [
            { data: 'documento' },
            { data: 'nombres' },
            { data: 'apellidos' },
            { data: 'valorTotal' },
        ],
        language: {
            url: 'https://cdn.datatables.net/plug-ins/1.13.4/i18n/es-MX.json'
        }
    });

    function obtenerPlanillas(fechaInicio, fechaFin) {
        showSpinner(); // Muestra el spinner
        fetch(`${url}/api/planilla/getPlanillasFiltro?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', },
            credentials: 'include',
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Error en la respuesta de la API: ${response.status}`);
                }
                return response.json();
            })
            .then((data) => {
                planillasData = data; // Guarda los datos para exportar
                if (data.length === 0) {
                    Swal.fire({
                        icon: 'info',
                        title: 'Sin resultados',
                        text: 'No hay planillas disponibles para el rango de fechas seleccionado.',
                        confirmButtonText: 'Aceptar',
                        cancelButtonText: 'Cancelar',
                        confirmButtonColor: '#163c64', // Color del botón "Sí"
                        cancelButtonColor: '#96072D', // Color del botón "No"
                    });
                } else {
                    table.clear().rows.add(data).draw(); // Actualiza la tabla
                    btnDescargar.disabled = false; // Habilita el botón de descarga si hay resultados
                }
            })
            .catch((error) => {
                console.error('Error en la petición:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Hubo un error al obtener las planillas. Intenta nuevamente.',
                    confirmButtonText: 'Aceptar',
                    cancelButtonText: 'Cancelar',
                    confirmButtonColor: '#163c64', // Color del botón "Sí"
                    cancelButtonColor: '#96072D', // Color del botón "No"
                });
            })
            .finally(() => {
                hideSpinner(); // Oculta el spinner
            });
    }


    function limpiarDatos() {
        planillasData = []; // Limpia el arreglo
        table.clear().draw(); // Limpia la tabla en DataTables
        btnDescargar.disabled = true; // Deshabilita el botón de descargar
    }

    // Evento para deshabilitar el botón "Descargar" si las fechas cambian
    function manejarCambioFechas() {
        btnDescargar.disabled = true; // Deshabilita el botón si cambian las fechas
    }
    fechaInicioInput.addEventListener('change', manejarCambioFechas);
    fechaFinInput.addEventListener('change', manejarCambioFechas);

    // Manejo del botón "Visualizar"
    btnVisualizar.addEventListener('click', () => {
        const fechaInicio = fechaInicioInput.value;
        const fechaFin = fechaFinInput.value;

        if (!fechaInicio || !fechaFin) {
            Swal.fire({
                icon: 'warning',
                title: 'Advertencia',
                text: 'Por favor selecciona ambas fechas.',
                confirmButtonText: 'Aceptar',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#163c64',  // Color del botón "Sí"
                cancelButtonColor: '#96072D'       // Color del botón "No"
            });
            return;
        }

        obtenerPlanillas(fechaInicio, fechaFin);
    });

    btnDescargar.addEventListener('click', function () {
        const fechaInicio = fechaInicioInput.value;
        const fechaFin = fechaFinInput.value;

        if (!fechaInicio || !fechaFin) {
            Swal.fire({
                icon: 'warning',
                title: 'Advertencia',
                text: 'Por favor selecciona ambas fechas.',
                confirmButtonText: 'Aceptar',
                confirmButtonColor: '#163c64'
            });
            return;
        }

        // Primera alerta de confirmación
        Swal.fire({
            title: '¿Estás seguro?',
            text: 'Esto marcará las planillas como pagadas y descargará el reporte.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Descargar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#163c64',
            cancelButtonColor: '#96072D'
        }).then((result) => {
            if (result.isConfirmed) {
                // Generar el reporte de Excel
                generarReporteExcel();

                // Simular la verificación de la descarga (esto debe ser reemplazado con una validación real en producción)
                const descargaExitosa = true; // Simulamos que la descarga fue exitosa

                if (descargaExitosa) {
                    // Si la descarga fue exitosa, marcamos las planillas como pagadas
                    fetch(`${url}/api/planilla/pagarPlanillasPorFechas`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', },
                        credentials: 'include',
                        body: JSON.stringify({
                            idusuario,
                            fechaInicio,
                            fechaFin,
                            estado: 'PAGADO',
                        }),
                    })
                        .then((response) => {
                            if (!response.ok) {
                                throw new Error(`Error en la respuesta de la API: ${response.status}`);
                            }
                            return response.json();
                        })
                        .then(() => {
                            Swal.fire({
                                icon: 'success',
                                title: 'Éxito',
                                text: 'Las planillas se han marcado como pagadas y el reporte ha sido descargado.',
                                confirmButtonText: 'Aceptar',
                                confirmButtonColor: '#163c64'
                            });
                            limpiarDatos(); // Limpiar datos
                        })
                        .catch((error) => {
                            console.error('Error al marcar las planillas:', error);
                            Swal.fire({
                                icon: 'error',
                                title: 'Error',
                                text: 'Hubo un problema al actualizar el estado de las planillas. Intenta nuevamente.',
                            });
                        });
                } else {
                    // Si la descarga no fue exitosa, mostramos una alerta de error
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Hubo un problema al descargar el reporte. Las planillas no han sido marcadas como pagadas.',
                    });
                }
            }
        });
    });

    // Función para generar el reporte de Excel
    function generarReporteExcel() {
        const fechaActual = new Date();

        // Estructura del archivo de Excel
        const worksheetData = [
            [
                'Cédula Empleado',
                'Código Concepto',
                'Código Centro de Costos',
                'Código Concepto Referencia',
                'Horas',
                'Valor',
                'Período',
                'Fecha',
                'Salario',
                'Unidades Producidas',
                'Es Prestación',
                'Número Préstamo',
                'Días mes 1',
                'Días mes 2',
                'Fecha Inicio',
                'Base',
                'Fecha Final Vacación',
            ],
        ];

        planillasData.forEach((item) => {
            const row = [
                item.documento,
                '024',
                '010',
                '',
                '',
                item.valorTotal,
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
            ];
            worksheetData.push(row);
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(worksheetData);
        XLSX.utils.book_append_sheet(wb, ws, 'Reporte');

        // Nombre del archivo
        XLSX.writeFile(wb, `Reporte_Planillas_${fechaActual.toISOString().split('T')[0]}.xlsx`);
    }

}
