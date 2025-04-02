document.addEventListener("DOMContentLoaded", () => {
    inicializarUsuarios();
});

async function inicializarUsuarios() {
    mostrarFechaActual();
    obtenerUsuarios();
}


let Usuarios = []; // Variable global para almacenar los usuarios

async function obtenerUsuarios() {
    showSpinner();
    try {
        const response = await fetch(`${url}/api/gestionusuario/getUsuarios`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
        });

        if (!response.ok) throw new Error(`Error en la API: ${response.status}`);

        const data = await response.json();
        Usuarios = data.data; // Almacenar los usuarios en la variable global
        renderizarUsuarios(); // Llamar a la función de renderizado
    } catch (error) {
        console.error("Error al obtener usuarios:", error);
    } finally {
        hideSpinner();
    }
}

function renderizarUsuarios() {
    const tabla = $("#usuariosTable").DataTable();

    // Guardar la página actual antes de actualizar
    let paginaActual = tabla.page();

    // Limpiar la tabla sin destruirla
    tabla.clear();

    // Agregar los nuevos datos
    Usuarios.forEach((usuario) => {
        const perfiles = usuario.perfiles?.length
            ? usuario.perfiles.map((p) => p.nombre).join(", ")
            : "No tiene perfiles";

        tabla.row.add([
            usuario.nombres,
            usuario.apellidos,
            usuario.email,
            usuario.identificacion,
            perfiles,
            formatFechaHora(usuario.ultimoinicio),
            `<label class="switch">
                <input type="checkbox" class="toggle-estado" data-id="${usuario.idusuario}" ${usuario.estado ? "checked" : ""}>
                <span class="slider round"></span>
            </label>`,
            `<button class="btn btn-fsvsaon btn-sm editar-usuario" data-id="${usuario.idusuario}">
                <i class="fas fa-pencil-alt"></i>
            </button>`
        ]);
    });

    // Dibujar la tabla con los nuevos datos y mantener la página actual
    tabla.draw(false);
    tabla.page(paginaActual).draw(false);
}

$(document).ready(function () {
    $("#usuariosTable").DataTable({
        language: {
            url: "https://cdn.datatables.net/plug-ins/1.13.4/i18n/es-MX.json",
        },
        order: [[0, "asc"]],
        pageLength: 10,
        autoWidth: false, // ❌ Deshabilita el ajuste automático de ancho

        columnDefs: [
            { width: "15%", targets: 0 }, // 📌 Nombres
            { width: "15%", targets: 1 }, // 📌 Apellidos
            { width: "10%", targets: 2 }, // 📌 Email
            { width: "5%", targets: 3 }, // 📌 Identificación
            { width: "40%", targets: 4 }, // 📌 Perfiles
            { width: "15%", targets: 5 }, // 📌 Última Sesión
            { width: "5%", targets: 6 }, // 📌 Estado (toggle switch)
            { width: "5%", targets: 7 }, // 📌 Botón de editar
        ],
    });

    // Delegar evento para botones de edición
    $("#usuariosTable tbody").on("click", ".editar-usuario", function () {
        const idUsuario = $(this).data("id");
        editarUsuario(idUsuario); // Llamar a la función de edición
    });

    // Cargar usuarios por primera vez
    obtenerUsuarios();
});

async function editarUsuario(idUsuario) {
    try {
        const response = await fetch(`${url}/api/gestionusuario/getUsuarios?idUsuario=${idUsuario}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error('Error al obtener los datos del usuario');
        }

        const data = await response.json();
        const usuario = data.data[0];

        document.getElementById('documentoUsuario').value = usuario.identificacion;
        document.getElementById('nombreUsuario').value = usuario.nombres;
        document.getElementById('apellidoUsuario').value = usuario.apellidos;
        document.getElementById('emailUsuario').value = usuario.email;

        if (usuario.perfiles && Array.isArray(usuario.perfiles)) {
            document.getElementById('perfilesUsuario').value = usuario.perfiles.map(p => p.nombre).join(', ');
            document.getElementById('ocultoPerfilesInput').value = usuario.perfiles.map(p => p.idperfil).join(',');
        } else {
            document.getElementById('perfilesUsuario').value = '';
            document.getElementById('ocultoPerfilesInput').value = '';
        }

        document.getElementById('modalUsuarioLabel').textContent = 'Editar Usuario';
        document.getElementById('registrarUsuario').style.display = 'none';
        document.getElementById('actualizarUsuario').style.display = 'block';
        document.getElementById('documentoUsuario').disabled = true;
        document.getElementById('buscarUsuario').style.display = 'none';

        $('#modalUsuario').modal('show');

        document.getElementById('actualizarUsuario').onclick = async function () {
            await actualizarUsuario(idUsuario);
        };
    } catch (error) {
        console.error('Error al cargar el usuario:', error);
    }
}

async function actualizarUsuario(idUsuario) {
    const nombres = document.getElementById('nombreUsuario').value;
    const documento = document.getElementById('documentoUsuario').value;
    const apellidos = document.getElementById('apellidoUsuario').value;
    const email = document.getElementById('emailUsuario').value;
    
    const perfiles = document.getElementById('ocultoPerfilesInput').value
        .split(',')
        .map(id => parseInt(id, 10))
        .filter(id => !isNaN(id));

    if (!nombres || !apellidos || perfiles.length === 0) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Por favor complete los campos obligatorios (Nombre, Apellido y al menos un Perfil).',
        });
        return;
    }

    try {
        const updateResponse = await fetch(`${url}/api/gestionusuario/crearUsuario`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                idUsuario,
                nombres,
                apellidos,
                documento,
                email,
                perfiles
            })
        });

        if (updateResponse.ok) {
            alert('Usuario actualizado correctamente');
            $('#modalUsuario').modal('hide');
            obtenerUsuarios();
        } else {
            const errorData = await updateResponse.json();
            alert(`Error al actualizar el usuario: ${errorData.error}`);
        }
    } catch (error) {
        console.error('Error al actualizar el usuario:', error);
    }
}



document.getElementById('añadirPerfilBtn').addEventListener('click', function () {
    $('#modalPerfiles').modal('show'); // Abrir el modal de perfiles
});

// Cargar perfiles al abrir el modal
$('#modalPerfiles').on('show.bs.modal', cargarPerfiles);
const perfilesUsuarioInput = document.getElementById('perfilesUsuario');
const listaPerfiles = document.getElementById('listaPerfiles');
const idUsuarioLogueado = localStorage.getItem('idusuario');
const documentoUsuarioInput = document.getElementById('documentoUsuario');
const nombreUsuarioInput = document.getElementById('nombreUsuario');
const apellidoUsuarioInput = document.getElementById('apellidoUsuario');
const emailUsuarioInput = document.getElementById('emailUsuario');



// Función para cargar perfiles desde el backend
function cargarPerfiles() {
    fetch(`${url}/api/gestionusuario/getPerfiles`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', },
        credentials: 'include',
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Error al obtener perfiles');
            }
            return response.json();
        })
        .then(data => {

            // Verifica si `data` contiene un array válido
            if (data && Array.isArray(data.data)) {
                listaPerfiles.innerHTML = ''; // Limpia la lista
                data.data.forEach(perfil => {
                    // Crea un elemento de lista por cada perfil
                    const li = document.createElement('li');
                    li.className = 'list-group-item';

                    // Mostrar nombre y descripción
                    li.innerHTML = `
                            <strong>${perfil.nombre}</strong>
                            <br><small>${perfil.descripcion || 'Sin descripción'}</small>
                        `;

                    // Agregar atributos de datos
                    li.setAttribute('data-id', perfil.idperfil); // Internamente manejamos idperfil
                    li.setAttribute('data-nombre', perfil.nombre); // Para mostrar el nombre en el input
                    li.setAttribute('data-selected', 'false');

                    // Verificar si ya está seleccionado
                    const perfilesSeleccionados = perfilesUsuarioInput.value.split(',').map(nombre => nombre.trim());
                    if (perfilesSeleccionados.includes(perfil.nombre)) {
                        li.setAttribute('data-selected', 'true');
                        li.classList.add('active');
                    }

                    // Añadir el evento para seleccionar o deseleccionar
                    li.addEventListener('click', function () {
                        const isSelected = li.getAttribute('data-selected') === 'true';
                        li.setAttribute('data-selected', !isSelected);
                        li.classList.toggle('active');

                        // Actualizar los perfiles seleccionados
                        const seleccionados = [...listaPerfiles.children]
                            .filter(item => item.getAttribute('data-selected') === 'true');

                        // Actualiza el campo visible (nombres)
                        const nombresSeleccionados = seleccionados.map(item => item.getAttribute('data-nombre'));
                        perfilesUsuarioInput.value = nombresSeleccionados.join(', ');

                        const idsSeleccionados = seleccionados.map(item => item.getAttribute('data-id'));
                        document.getElementById('ocultoPerfilesInput').value = idsSeleccionados.join(',');
                    });

                    listaPerfiles.appendChild(li);
                });
            } else {
                listaPerfiles.innerHTML = '<li class="list-group-item text-muted">No hay perfiles disponibles</li>';
            }
        })
        .catch(error => {
            console.error('Error al cargar perfiles:', error);
            listaPerfiles.innerHTML = '<li class="list-group-item text-danger">Error al cargar perfiles</li>';
        });
}


// Función para agregar un nuevo usuario (abrir el modal)
document.getElementById('agregarUsuario').addEventListener('click', function () {
    // Limpiar los campos del formulario antes de registrar
    document.getElementById('documentoUsuario').value = '';
    document.getElementById('nombreUsuario').value = '';
    document.getElementById('apellidoUsuario').value = '';
    document.getElementById('emailUsuario').value = '';
    document.getElementById('perfilesUsuario').value = '';
    document.getElementById('ocultoPerfilesInput').value = '';

    // Habilitar el campo de documento y mostrar el botón de búsqueda
    document.getElementById('documentoUsuario').disabled = false;  // Habilitar el campo de documento
    document.getElementById('buscarUsuario').style.display = 'block'; // Mostrar el botón de búsqueda

    // Cambiar el título del modal a 'Registrar Nuevo Usuario'
    document.getElementById('modalUsuarioLabel').textContent = 'Registrar Nuevo Usuario';

    // Mostrar el botón de registrar y ocultar el de actualizar
    document.getElementById('registrarUsuario').style.display = 'block'; // Mostrar el botón de registrar
    document.getElementById('actualizarUsuario').style.display = 'none'; // Ocultar el botón de actualizar

    // Abre el modal para registrar un nuevo usuario
    $('#modalUsuario').modal('show');
});

// Función para registrar un nuevo usuario
document.getElementById('registrarUsuario').addEventListener('click', function () {
    // Función para formatear el texto (primera letra de cada palabra en mayúscula)
    function formatearTexto(texto) {
        return texto
            .replace(/\b\w/g, function (letra) {
                return letra.toUpperCase(); // Poner en mayúscula la primera letra de cada palabra
            });
    }

    // Validar campos y registrar el usuario cuando el botón "Registrar" es presionado
    const documento = documentoUsuarioInput.value.trim();
    const nombresI = nombreUsuarioInput.value.trim();
    const apellidosI = apellidoUsuarioInput.value.trim();
    const email = emailUsuarioInput.value.trim(); // Email puede estar vacío

    const nombres = formatearTexto(nombresI);
    const apellidos = formatearTexto(apellidosI);

    // Obtener los IDs de los perfiles seleccionados
    const perfilesSeleccionados = [...listaPerfiles.children]
        .filter(item => item.getAttribute('data-selected') === 'true')
        .map(item => parseInt(item.getAttribute('data-id'))); // Convertimos a número

    // Validación: Asegurarse de que todos los campos estén llenos y que al menos un perfil esté seleccionado
    if (!documento || !nombres || !apellidos || perfilesSeleccionados.length === 0) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Por favor complete todos los campos obligatorios y seleccione al menos un perfil.',
        });
        return;
    }

    const usuarioData = {
        documento,
        nombres,
        apellidos,
        email,
        perfiles: perfilesSeleccionados,
    };

    // Enviar los datos al backend para crear el usuario
    fetch(`${url}/api/gestionusuario/crearUsuario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', },
        credentials: 'include',
        body: JSON.stringify(usuarioData),
    })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: data.error || 'No se pudo registrar el usuario.',
                });
            } else {
                Swal.fire({
                    icon: 'success',
                    title: 'Usuario registrado',
                    text: 'El usuario se registró correctamente.',
                });

                // Limpiar los campos después del registro exitoso
                documentoUsuarioInput.value = '';
                nombreUsuarioInput.value = '';
                apellidoUsuarioInput.value = '';
                emailUsuarioInput.value = '';
                perfilesUsuarioInput.value = '';
                [...listaPerfiles.children].forEach(item => {
                    item.setAttribute('data-selected', 'false');
                    item.classList.remove('active');
                });

                // Cerrar el modal
                $('#modalUsuario').modal('hide');

                obtenerUsuarios();
            }
        })
        .catch(error => {
            console.error('Error al enviar los datos:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Hubo un problema al registrar el usuario. Intenta nuevamente.',
            });
        });
});

// Otros eventos y funciones que ya tienes...
document.getElementById('cancelarModalUsuario').addEventListener('click', function () {
    documentoUsuarioInput.value = ''; // Limpia el documento
    nombreUsuarioInput.value = ''; // Limpia el nombre
    apellidoUsuarioInput.value = ''; // Limpia el apellido
    emailUsuarioInput.value = ''; // Limpia el email
    perfilesUsuarioInput.value = ''; // Limpia los perfiles seleccionados
});

document.getElementById('buscarUsuario').addEventListener('click', function () {
    const documento = documentoUsuarioInput.value.trim();
    if (!documento) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Por favor ingrese un documento para buscar.',
        });
        return;
    }

    // Realiza la búsqueda del usuario
    fetch(`${url}/api/gestionusuario/buscarusuario/${documento}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', },
        credentials: 'include',
    })
        .then(response => response.json())
        .then(data => {

            if (data.success && data.usuario) {
                // Obtener el nombre completo
                const nombreCompleto = data.usuario.Nombre;

                // Dividir el nombre completo en nombres y apellidos
                const partesNombre = nombreCompleto.split(' ');
                const nombres = partesNombre.slice(0, partesNombre.length - 2).join(' '); // Todos los elementos menos los dos últimos son los nombres
                const apellidos = partesNombre.slice(partesNombre.length - 2).join(' '); // Los dos últimos elementos son los apellidos

                // Mostrar la información del usuario
                nombreUsuarioInput.value = nombres;
                apellidoUsuarioInput.value = apellidos;

                // Asignar el email o poner "No registra" si no hay email
                emailUsuarioInput.value = data.usuario.email ? data.usuario.email : "";


                // Hacer los campos editables si ya están rellenos
                nombreUsuarioInput.readOnly = false;
                apellidoUsuarioInput.readOnly = false;
                emailUsuarioInput.readOnly = false;

            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Usuario no encontrado',
                    text: 'No se encontró un usuario con ese documento.',
                });
            }
        })
        .catch(error => {
            console.error('Error al buscar el usuario:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Hubo un problema al realizar la búsqueda. Intenta nuevamente.',
            });
        });
});





$('#usuariosTable').on('change', '.toggle-estado', function () {
    const idUsuario = $(this).data('id');
    const isChecked = $(this).is(':checked');
    const estado = isChecked ? 1 : 0; // 1 para activo, 0 para inactivo
    const toggleSwitch = $(this);

    // Verificar si el usuario está intentando desactivarse a sí mismo
    if (idUsuario == idUsuarioLogueado && estado === 0) {
        Swal.fire({
            icon: 'error',
            title: 'Acción no permitida',
            text: 'No puedes desactivar tu propio usuario.',
            confirmButtonText: 'Aceptar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#163c64',  // Color del botón "Sí"
            cancelButtonColor: '#96072D'       // Color del botón "No"
        });
        // Revertir el cambio en el switch
        toggleSwitch.prop('checked', true);
        return;
    }

    // Si se va a desactivar, solicitar confirmación
    if (!isChecked) {
        Swal.fire({
            title: '¿Estás seguro?',
            text: 'Esta acción desactivará al usuario. ¿Deseas continuar?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Aceptar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#163c64',  // Color del botón "Sí"
            cancelButtonColor: '#96072D'       // Color del botón "No"
        }).then((result) => {
            if (result.isConfirmed) {
                actualizarEstadoUsuario(idUsuario, estado, toggleSwitch);
            } else {
                // Revertir el estado del switch si se cancela
                toggleSwitch.prop('checked', true);
            }
        });
    } else {
        // Activar directamente si no se requiere confirmación
        actualizarEstadoUsuario(idUsuario, estado, toggleSwitch);
    }
});

function actualizarEstadoUsuario(idUsuario, estado, toggleSwitch) {
    fetch(`${url}/api/gestionusuario/actualizarEstadoUsuario`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', },
        credentials: 'include',
        body: JSON.stringify({ idusuario: idUsuario, estado }),
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error en la actualización: ${response.status}`);
            }
            return response.json();
        })
        .then(() => {
            Swal.fire({
                icon: 'success',
                title: 'Estado actualizado',
                text: `El usuario ha sido ${estado === 1 ? 'activado' : 'desactivado'} correctamente.`,
                timer: 2000,  // Tiempo en milisegundos antes de que el mensaje se cierre automáticamente
                showConfirmButton: false  // Oculta el botón de confirmación
            });
        })
        .catch(error => {
            console.error('Error al actualizar el estado:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo actualizar el estado del usuario.',
                confirmButtonText: 'Aceptar',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#163c64',  // Color del botón "Sí"
                cancelButtonColor: '#96072D'       // Color del botón "No"
            });
            // Revertir el estado del switch si falla la operación
            toggleSwitch.prop('checked', !estado);
        });
}



