document.addEventListener("DOMContentLoaded", () => {
    inicializarUsuario();
});


async function inicializarUsuario() {
    obtenerUsuario();
    document.getElementById('formCambiarPassword').addEventListener('submit', cambiarContrasena);
}

async function obtenerUsuario() {
    const idUsuario = localStorage.getItem('idusuario');

    try {
        const response = await fetch(`${url}/api/gestionusuario/getUsuarios?idUsuario=${idUsuario}`, {
            method: 'GET',
            headers: {},
            credentials: "include",
        });

        if (!response.ok) {
            throw new Error(`Error al obtener el usuario: ${response.status}`);
        }

        const { data } = await response.json();

        if (data && data.length > 0) {
            const usuario = data[0]; 
            renderizarUsuario(usuario);
        } else {
            console.log('No se encontró información del usuario.');
        }
    } catch (error) {
        console.error('Error al obtener el usuario:', error);
    }
}

function renderizarUsuario(usuario) {
    // Asignar valores a los campos
    document.getElementById('nombre').value = `${usuario.nombres} ${usuario.apellidos}`;
    document.getElementById('documento').value = usuario.identificacion;

    const perfilesTexto = usuario.perfiles && usuario.perfiles.length > 0
        ? usuario.perfiles.map(perfil => perfil.nombre).join(', ') // Ajusta 'nombre' a la propiedad correcta
        : 'No hay perfiles asociados';

    document.getElementById('rol').value = perfilesTexto;

}

async function cambiarContrasena(event) {
    event.preventDefault();

    const passwordAnterior = document.getElementById('passwordAnterior').value;
    const passwordNueva = document.getElementById('passwordNueva').value;
    const passwordConfirmacion = document.getElementById('passwordConfirmacion').value;
    const idUsuario = localStorage.getItem('idusuario');

    if (passwordNueva !== passwordConfirmacion) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Las contraseñas no coinciden.',
            confirmButtonText: 'Aceptar',
            confirmButtonColor: '#163c64',
        });
        return;
    }

    if (passwordNueva.length < 4) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'La contraseña nueva debe tener al menos 4 caracteres.',
            confirmButtonText: 'Aceptar',
            confirmButtonColor: '#163c64',
        });
        return;
    }

    try {
        const response = await fetch(`${url}/api/gestionusuario/actualizarPasswordUsuario`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                idusuario: idUsuario,
                passwordAnterior,
                nuevaContraseña: passwordNueva,
                confirmarContraseña: passwordConfirmacion,
            })
        });

        const result = await response.json();

        if (response.ok) {
            Swal.fire({
                icon: 'success',
                title: 'Éxito',
                text: 'Contraseña cambiada exitosamente.',
                timer: 2000,
                showConfirmButton: false,
            });
            $('#modalCambiarPassword').modal('hide');
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: result.message || "Hubo un problema con la solicitud.",
                confirmButtonText: 'Aceptar',
                confirmButtonColor: '#163c64',
            });
        }
    } catch (error) {
        console.error('Error al cambiar la contraseña:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: "Ocurrió un error al cambiar la contraseña.",
            confirmButtonText: 'Aceptar',
            confirmButtonColor: '#163c64',
        });
    }
}

