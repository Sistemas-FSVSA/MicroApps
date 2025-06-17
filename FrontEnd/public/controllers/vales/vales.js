document.addEventListener('DOMContentLoaded', function () {
    InicializarVales()
});

async function InicializarVales() {
    mostrarFechaActual();
    cargarVales()
    obtenerCategorias()

    document.getElementById('agregarVale').addEventListener('click', abrirModalRegistrarVale);
    document.getElementById('registrarVale').addEventListener('click', registrarVale);
    document.getElementById('encargado').addEventListener('change', function () {
        const idEncargado = this.value;
        if (idEncargado) {
            obtenerPlacas(idEncargado);
        } else {
            document.getElementById('placa').innerHTML = '<option value="">Seleccione una placa</option>';
        }
    });

    // Escuchar cambios en el select de categorías
    document.getElementById('categoriaSelect').addEventListener('change', function () {
        const nuevaCategoria = this.value;
        if (nuevaCategoria) {
            localStorage.setItem('categoriaSeleccionada', nuevaCategoria);
            cargarVales(); // Recargar la tabla con la nueva categoría
        }
    });
}

async function obtenerCategorias() {
    try {
        const idUsuario = localStorage.getItem('idusuario');
        if (!idUsuario) {
            console.error('No se encontró idusuario en localStorage');
            return;
        }

        const response = await fetch(`${url}/api/vales/consultaCategorias`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idusuario: idUsuario })
        });

        const data = await response.json();

        if (data.data) {
            const selectCategoria = document.getElementById('categoriaSelect');
            selectCategoria.innerHTML = '<option value="">Seleccione una categoría</option>'; // Resetear opciones

            let categoriaGuardada = localStorage.getItem('categoriaSeleccionada');

            data.data.forEach((categoria, index) => {
                const option = document.createElement('option');
                option.value = categoria.nombre; // Guardamos el nombre en el select
                option.textContent = categoria.nombre;
                selectCategoria.appendChild(option);

                // Guardar la primera categoría si no hay ninguna en localStorage
                if (index === 0 && !categoriaGuardada) {
                    localStorage.setItem('categoriaSeleccionada', categoria.nombre);
                    categoriaGuardada = categoria.nombre;
                }
            });

            // Si hay una categoría guardada, seleccionarla en el select
            if (categoriaGuardada) {
                selectCategoria.value = categoriaGuardada;
            }

            // Cargar los vales filtrados con la categoría almacenada
            cargarVales();
        }
    } catch (error) {
        console.error('Error obteniendo categorías:', error);
    }
}

async function cargarVales() {
    const categoriaSeleccionada = localStorage.getItem('categoriaSeleccionada');

    if (!categoriaSeleccionada) {
        console.warn('No hay categoría seleccionada para filtrar vales.');
        return;
    }

    try {
        const response = await fetch(`${url}/api/vales/consultarVales`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ categorias: [categoriaSeleccionada] }) // Enviar el nombre de la categoría
        });

        const data = await response.json();

        if (data.data && data.data.length > 0) {
            renderizarTablaVales(data.data);
        } else {
            renderizarTablaVales([]); // Renderiza tabla vacía si no hay datos
        }
    } catch (error) {
        console.error('Error obteniendo los vales:', error);
    }
}

// Función para renderizar la tabla con DataTables
function renderizarTablaVales(vales) {
    const table = $('#valesTable').DataTable();
    table.clear(); // Limpia la tabla antes de añadir nuevos datos
    table.rows.add(vales); // Añade nuevos datos
    table.draw(); // Redibuja la tabla
}

// Inicializar DataTables
$(document).ready(function () {
    $('#valesTable').DataTable({
        data: [], // Inicialmente vacía
        columns: [
            { title: 'id', data: 'idvale', visible: false, width: '0%' },
            { title: 'Encargado', data: 'encargado', width: '20%' },
            { title: 'Valor', data: 'valor', width: '5%' },
            { title: 'Fecha', data: 'fechavale', width: '5%', render: (data) => formatFecha(data) },
            { title: 'Motivo', data: 'motivo', width: '50%' },
            { title: 'Placa', data: 'placa', width: '5%' }
        ],
        autoWidth: false, // Evita que DataTables ajuste automáticamente
        order: [[0, 'desc']], // Ordenar por idvale de mayor a menor
        language: { url: 'https://cdn.datatables.net/plug-ins/1.13.4/i18n/es-MX.json' },
    });

    // Cargar vales cuando la página cargue
    cargarVales();
});

async function obtenerEncargados() {
    const categoriaSeleccionada = localStorage.getItem('categoriaSeleccionada');

    try {
        const response = await fetch(`${url}/api/vales/consultaEncargados`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ categoria: categoriaSeleccionada, estado: true }), // Enviar la categoría seleccionada
            credentials: "include"
        });

        const data = await response.json();

        if (data.data) {
            const selectEncargado = document.getElementById('encargado');
            selectEncargado.innerHTML = '<option value="">Seleccione un encargado</option>'; // Resetear opciones

            // Ordenar alfabéticamente por nombre y apellido
            const encargadosOrdenados = data.data.sort((a, b) => {
                const nombreA = `${a.nombres} ${a.apellidos}`.toLowerCase();
                const nombreB = `${b.nombres} ${b.apellidos}`.toLowerCase();
                return nombreA.localeCompare(nombreB);
            });

            encargadosOrdenados.forEach(encargado => {
                const option = document.createElement('option');
                option.value = encargado.idusuariovale;
                option.textContent = `${encargado.nombres} ${encargado.apellidos}`;
                selectEncargado.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error obteniendo encargados:', error);
    }
}


async function obtenerPlacas(idEncargado) {
    try {
        const response = await fetch(`${url}/api/vales/placaEncargado`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idusuariovale: idEncargado })
        });
        const data = await response.json();

        const selectPlaca = document.getElementById('placa');
        selectPlaca.innerHTML = '<option value="">Seleccione una placa</option>'; // Resetear opciones

        if (data.data) {
            data.data.forEach(item => {
                const option = document.createElement('option');
                option.value = item.placa;
                option.textContent = item.placa;
                selectPlaca.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error obteniendo placas:', error);
    }
}

function abrirModalRegistrarVale() {
    document.getElementById('encargado').value = '';
    document.getElementById('fecha').value = '';
    document.getElementById('valor').value = '';
    document.getElementById('motivo').value = '';
    document.getElementById('placa').innerHTML = '<option value="">Seleccione una placa</option>';
    obtenerEncargados();
    $('#modalVale').modal('show');
}

async function registrarVale() {
    const form = document.getElementById('formVale');

    // Validar el formulario con las reglas de Bootstrap
    if (!form.checkValidity()) {
        form.classList.add('was-validated'); // Activa estilos de validación de Bootstrap
        return;
    }

    const idUsuario = localStorage.getItem('idusuario');
    const tipoPermiso = localStorage.getItem('categoriaSeleccionada')

    const valeData = {
        encargado: document.getElementById('encargado').value,
        placa: document.getElementById('placa').value,
        fecha: document.getElementById('fecha').value,
        valor: document.getElementById('valor').value,
        motivo: document.getElementById('motivo').value,
        idusuario: idUsuario,
        permiso: tipoPermiso
    };

    try {
        const response = await fetch(`${url}/api/vales/guardarVale`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(valeData)
        });

        const result = await response.json();

        if (response.ok) {
            Swal.fire({
                icon: 'success',
                title: 'Éxito',
                text: 'Vale registrado exitosamente',
                timer: 2000,
                showConfirmButton: false
            });
            $('#modalVale').modal('hide');
            form.classList.remove('was-validated'); // Restablecer el formulario
            form.reset();
            await cargarVales();
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: result.error,
                timer: 3000,
                showConfirmButton: false
            });
        }
    } catch (error) {
        console.error('Error al registrar vale:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Error al conectar con el servidor',
            timer: 3000,
            showConfirmButton: false
        });
    }
}
