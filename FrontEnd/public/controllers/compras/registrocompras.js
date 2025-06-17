document.addEventListener("DOMContentLoaded", () => {
    InicializarRegistroCompras();
});

function InicializarRegistroCompras() {
    //BOTONES PARA EL MANEJO DE ITEMS
    document.getElementById('regItems').addEventListener('click', function () {
        buscarItems()
        let modal = new bootstrap.Modal(document.getElementById('modalEditarItem'));
        modal.show();
    });
    document.getElementById('btnRegistrarItems').addEventListener('click', async function () {
        await obtenerCategoria(); // Cargar categorías antes de mostrar el modal
        const modal = new bootstrap.Modal(document.getElementById('modalRegistrarItems'));
        modal.show();
    });
    document.getElementById('btnConfirmarRegistro').addEventListener('click', function () {
        guardarItem();
    });
    document.getElementById('btnGuardarCambiosItem').addEventListener('click', function () {
        actualizarItem();
    });

    //BOTONES PARA EL MANEJO DE USUARIOS
    document.getElementById('regUsuarios').addEventListener('click', function () {
        let modal = new bootstrap.Modal(document.getElementById('modalEditarUsuario'));
        modal.show();
        renderizarUsuarios();
    });
    $('#modalEditarUsuario').on('hidden.bs.modal', function () {
        sessionStorage.removeItem('usuariosEncontrados');
        $('#tbodyEditarUsuario').empty();
        $('#inputUsuario').val('');
    });

    //BOTONES PARA EL MANEJO DE CATEGORIAS
    document.getElementById('regCategorias').addEventListener('click', function () {
        let modal = new bootstrap.Modal(document.getElementById('modalCategorias'));
        modal.show();
        obtenerCategorias();
    });
    document.getElementById('registrarCatBtn').addEventListener('click', () => {
        registrarCategoria();
    });

    //BOTONES PARA EL MANEJO DE PROVEEDORES
    document.getElementById('regProveedores').addEventListener('click', function () {
        let modal = new bootstrap.Modal(document.getElementById('modalProveedores'));
        modal.show();
        obtenerProveedores();
    });
    document.getElementById('registrarProBtn').addEventListener('click', function () {
        // Forma correcta para Bootstrap 4
        $('#registrarProveedor').modal('show');
    });

    document.getElementById('BotonRegistrarProveedor').addEventListener('click', function () {
        registrarProveedor();
    });
}

//FUNCIONES PARA EL MANEJO DE ITEMS
function buscarItems() {
    const input = document.getElementById('inputNuevoItem');

    input.addEventListener('input', function () {
        const query = input.value.trim();

        if (query.length > 0) {
            fetch(`${url}/api/compras/obtenerItems?query=${encodeURIComponent(query)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            })
                .then(response => response.json())
                .then(data => {
                    renderizarTablaItems(data);
                })
                .catch(error => {
                    console.error('Error al buscar items:', error);
                });
        } else {
            renderizarTablaItems([]); // Limpiar tabla si el input está vacío
        }
    });
}
function renderizarTablaItems(data) {
    const tbody = document.getElementById('tbodyEditarItem');
    tbody.innerHTML = '';

    data.forEach(item => {
        const row = document.createElement('tr');

        row.innerHTML = `
            <td>${item.itemId}</td>
            <td>${item.itemNombre}</td>
            <td>${item.itemDescripcion}</td>
            <td>${item.categoriaNombre}</td>
            <td>
                <button 
                    class="btn btn-fsvsaon btn-editar-item"
                    data-id="${item.itemId}">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
            <td>
                <label class="switch">
                    <input type="checkbox" class="switch-estado" data-id="${item.itemId}" ${item.estado ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            </td>
        `;

        tbody.appendChild(row);
    });

    document.querySelectorAll('.switch-estado').forEach(input => {
        input.addEventListener('change', () => {
            const id = input.getAttribute('data-id');
            const nuevoEstado = input.checked;
            actualizarEstadoItem(id, nuevoEstado);
        });
    });

    document.querySelectorAll('.btn-editar-item').forEach(btn => {
        btn.addEventListener('click', async function () {
            const itemId = this.getAttribute('data-id');
            const item = data.find(i => i.itemId == itemId);
            if (!item) return;

            // Usar la función reutilizada
            await obtenerCategoria(item.categoriaId, true); // true = es edición

            document.getElementById('inputEditarNombreItem').value = item.itemNombre || '';
            document.getElementById('inputEditarDescripcionItem').value = item.itemDescripcion || '';
            document.getElementById('inputEditarIdItem').value = item.itemId;


            const modal = new bootstrap.Modal(document.getElementById('modalEditarItemSeleccionado'));
            modal.show();
        });
    });


    // Re-renderizar datatable
    if (!$.fn.DataTable.isDataTable('#EditaritemTable')) {
        $('#EditaritemTable').DataTable({
            pageLength: 5,
            lengthChange: false,
            searching: false,
            destroy: true,
            language: {
                url: "https://cdn.datatables.net/plug-ins/1.10.16/i18n/Spanish.json"
            },
        });
    } else {
        $('#EditaritemTable').DataTable().clear().rows.add($('#tbodyEditarItem tr')).draw();
    }
}
async function actualizarEstadoItem(iditem, estado) {
    try {
        const response = await fetch(`${url}/api/compras/actualizarEstadoItem`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                iditem: parseInt(iditem),
                estado: estado
            })
        });

        if (response.status === 200) {
            Mensaje("success", "Exito", "Estado actualizado correctamente.", true, false);
        } else {
            const data = await response.json();
            Mensaje("error", "Error", "No fue posible actualizar el item.", false, false);
        }
    } catch (error) {
        console.error('Error al actualizar estado:', error);
        Mensaje("error", "Error", "No fue posible conectar con el servidor.", false, false);
    }
}
async function obtenerCategoria(idSeleccionado = null, esEdicion = false) {
    try {
        const response = await fetch(`${url}/api/compras/obtenerCategoria`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({})
        });

        if (!response.ok) throw new Error('Error al obtener las categorías');

        const data = await response.json();

        const select = document.getElementById(esEdicion ? 'selectEditarCategoria' : 'selectCategoria');
        select.innerHTML = '<option value="">Seleccione una categoría</option>';

        const categoriasActivas = data.filter(cat => cat.estado === true);

        categoriasActivas.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.idcategoriaitem;
            option.textContent = cat.nombre;

            if (idSeleccionado && cat.idcategoriaitem === idSeleccionado) {
                option.selected = true;
            }

            select.appendChild(option);
        });

        if (categoriasActivas.length === 0) {
            const option = document.createElement('option');
            option.disabled = true;
            option.textContent = 'No hay categorías activas';
            select.appendChild(option);
        }

    } catch (error) {
        console.error('Error en obtenerCategoria():', error);
        Mensaje("error", "Error", "No fue posible obtener las categorías.", true, false);
    }
}
async function actualizarItem() {
    const iditem = document.getElementById('inputEditarIdItem').value;
    const nombre = document.getElementById('inputEditarNombreItem').value.trim();
    const descripcion = document.getElementById('inputEditarDescripcionItem').value.trim();
    const categoriaId = document.getElementById('selectEditarCategoria').value;

    if (!iditem || !nombre || !categoriaId) {
        Mensaje("error", "Error", "Todos los campos son obligatorios.", false, false);
        return;
    }

    const payload = {
        iditem: parseInt(iditem),
        nombre,
        descripcion,
        categoriaId: parseInt(categoriaId)
    };

    try {
        const response = await fetch(`${url}/api/compras/actualizarItems`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            Mensaje("success", "Éxito", "Item actualizado correctamente.", true, false);

        } else {
            let errorMsg = "Error al actualizar el item.";
            try {
                const error = await response.json();
                errorMsg = error.mensaje || error.error || errorMsg;
            } catch (e) { }

            Mensaje("error", "Error", errorMsg, false, false);
        }

    } catch (error) {
        console.error('Error en actualizarItem():', error);
        Mensaje("error", "Error", "Error de red al actualizar el item.", false, false);
    }
}
async function guardarItem() {
    const idcategoria = document.getElementById('selectCategoria').value;
    const nombreItem = document.getElementById('inputNombreItem').value.trim();
    const descripcionItem = document.getElementById('inputDescripcionItem').value.trim();

    if (!idcategoria) {
        Mensaje("error", "Error", "Seleccione una categoria valida.", false, false);
        return;
    }

    if (!nombreItem) {
        Mensaje("error", "Error", "Ingrese un nombre de item valido.", false, false);
        return;
    }

    if (!descripcionItem) {
        Mensaje("error", "Error", "Ingrese una descripcion de item valida.", false, false);
        return;
    }

    const payload = {
        idcategoria: parseInt(idcategoria),
        items: [
            {
                nombre: nombreItem,
                descripcion: descripcionItem || null // puedes agregar un input si quieres permitir descripción
            }
        ]
    };

    try {
        const response = await fetch(`${url}/api/compras/guardarItem`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            Mensaje("success", "Exito", "Item registrado exitosamente.", true, false);
            document.getElementById('inputNombreItem').value = '';
            document.getElementById('selectCategoria').value = '';
            document.getElementById('inputDescripcionItem').value = '';
        } else {
            let errorMessage = 'Error desconocido';
            try {
                const error = await response.json();
                errorMessage = error.mensaje || error.error || errorMessage;
            } catch (e) {
                console.warn('La respuesta no es JSON válida');
            }
            Mensaje("error", "Error", "No fue posible registrar el item.", false, false);
        }

    } catch (error) {
        console.error('Error en guardarItem():', error);
        Mensaje("error", "Error", "No fue posible registrar el item.", false, false);
    }
}

//FUNCIONES PARA EL MANEJO DE USUARIOS
async function buscarUsuarios() {
    const identificacion = document.getElementById('inputUsuario').value;

    try {
        const response = await fetch(`${url}/api/compras/obtenerUsuario`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ identificacion })
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }

        const usuario = await response.json();
        console.log('Usuario encontrado:', usuario);

        let usuariosEncontrados = getUsuariosStorage();
        const yaExiste = usuariosEncontrados.some(u => u.identificacion === usuario.identificacion);

        if (!yaExiste) {
            usuariosEncontrados.push(usuario);
            setUsuariosStorage(usuariosEncontrados);
            renderizarUsuarios();
        } else {
            console.warn('El usuario ya está en la lista.');
        }

    } catch (error) {
        console.error('Error al buscar usuario:', error);
    }
}
function getUsuariosStorage() {
    return JSON.parse(sessionStorage.getItem('usuariosEncontrados') || '[]');
}
function setUsuariosStorage(usuarios) {
    sessionStorage.setItem('usuariosEncontrados', JSON.stringify(usuarios));
}
function renderizarUsuarios() {
    const tbody = document.getElementById('tbodyEditarUsuario');
    tbody.innerHTML = '';

    const usuariosEncontrados = getUsuariosStorage();

    usuariosEncontrados.forEach((usuario, index) => {
        const fila = document.createElement('tr');

        fila.innerHTML = `
            <td>${usuario.identificacion}</td>
            <td>${usuario.nombres}</td>
            <td>${usuario.apellidos}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editarUsuario(${index})">Editar</button>
            </td>
        `;

        tbody.appendChild(fila);
    });
}
async function obtenerDependencias() {
    try {
        const response = await fetch(`${url}/api/compras/obtenerDependencias`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });

        if (!response.ok) throw new Error('Error al obtener dependencias');

        const dependencias = await response.json();

        // Limpiar y reconstruir el objeto
        dependenciasDisponibles = {};
        dependencias.forEach(dep => {
            if (dep.estado) {
                dependenciasDisponibles[dep.iddependencia] = dep.nombre;
            }
        });

    } catch (error) {
        console.error('Error al obtener dependencias:', error);
    }
}
function editarUsuario(index) {
    const usuarios = getUsuariosStorage();
    const usuario = usuarios[index];

    if (!usuario) {
        console.error('Usuario no encontrado');
        return;
    }

    // Llenar los campos del modal con la información del usuario
    document.getElementById('inputEditarIdUsuario').value = index;
    document.getElementById('inputEditarIdentificacion').value = usuario.identificacion || '';
    document.getElementById('inputEditarNombres').value = usuario.nombres || '';
    document.getElementById('inputEditarApellidos').value = usuario.apellidos || '';

    // Mostrar resumen de dependencias
    const dependencias = usuario.dependencias
        ? Object.values(usuario.dependencias).join(', ')
        : '-';
    document.getElementById('resumenDependencias').textContent = dependencias;

    // Mostrar el modal con jQuery (Bootstrap 4)
    $('#modalEditarUsuarioSeleccionado').modal('show');
}
async function abrirModalSeleccionarDependencias() {
    const index = document.getElementById('inputEditarIdUsuario').value;
    const usuarios = getUsuariosStorage();
    const usuario = usuarios[index];

    if (!usuario) {
        console.error('Usuario no encontrado');
        return;
    }

    // Obtener dependencias si aún no están cargadas
    if (!window.dependenciasDisponibles || Object.keys(dependenciasDisponibles).length === 0) {
        await obtenerDependencias();
    }

    const contenedor = document.getElementById('listaDependencias');
    contenedor.innerHTML = '';

    const dependenciasAsignadas = usuario.dependencias ? Object.keys(usuario.dependencias) : [];

    // Ordenar las dependencias alfabéticamente por nombre
    const dependenciasOrdenadas = Object.entries(dependenciasDisponibles)
        .sort(([, nombreA], [, nombreB]) => nombreA.localeCompare(nombreB));

    for (const [id, nombre] of dependenciasOrdenadas) {
        const checkbox = document.createElement('div');
        checkbox.className = 'form-check';

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.className = 'form-check-input';
        input.id = `dep-${id}`;
        input.value = id;
        input.checked = dependenciasAsignadas.includes(id); // Marcar si ya está asignada

        const label = document.createElement('label');
        label.className = 'form-check-label';
        label.htmlFor = `dep-${id}`;
        label.textContent = nombre;

        checkbox.appendChild(input);
        checkbox.appendChild(label);
        contenedor.appendChild(checkbox);
    }

    // Mostrar modal
    $('#modalSeleccionarDependencias').modal('show');
}
function actualizarResumenDependencias() {
    const index = document.getElementById('inputEditarIdUsuario').value;
    const usuarios = getUsuariosStorage();
    const usuario = usuarios[index];

    const checkboxes = document.querySelectorAll('#listaDependencias input[type="checkbox"]');
    const nuevasDependencias = {};

    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            const id = checkbox.value;
            const nombre = dependenciasDisponibles[id];
            nuevasDependencias[id] = nombre;
        }
    });

    // Actualizar usuario y guardar en sessionStorage
    usuario.dependencias = nuevasDependencias;
    usuarios[index] = usuario;
    setUsuariosStorage(usuarios);

    // Actualizar resumen visual
    const resumen = Object.values(nuevasDependencias).join(', ') || '-';
    document.getElementById('resumenDependencias').textContent = resumen;
}
async function actualizarUsuario() {
    const index = document.getElementById('inputEditarIdUsuario').value;
    const usuarios = getUsuariosStorage();
    const usuario = usuarios[index];

    if (!usuario) {
        console.error('Usuario no encontrado');
        return;
    }

    // Preparamos el payload con solo la info necesaria
    const payload = {
        idusuario: usuario.idusuario,
        dependencias: usuario.dependencias
    };

    try {
        const response = await fetch(`${url}/api/compras/actualizarUsuario`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(payload),
        });
        console.log('Payload enviado:', payload)

        if (!response.ok) throw new Error('Error al guardar dependencias');

        const resultado = await response.json();
        console.log('Respuesta del backend:', resultado);

        // Puedes mostrar un mensaje o cerrar modal
        $('#modalEditarUsuarioSeleccionado').modal('hide');
        renderizarUsuarios();

    } catch (error) {
        console.error('Error al actualizar el usuario:', error);
    }
}

// FUNCIONES PARA EL MANEJO DE CATEGORIAS
function obtenerCategorias() {
    fetch(`${url}/api/compras/obtenerCategoria`, {
        method: 'POST',
        credentials: 'include'
    })
        .then(response => {
            if (!response.ok) throw new Error('Error al obtener categorías');
            return response.json();
        })
        .then(data => {
            renderizarDataCategorias(data);
        })
        .catch(error => {
            console.error('Error en obtenerCategorias:', error);
        });
}
function renderizarDataCategorias(data) {
    const tbody = document.querySelector('#categoriasTable tbody');
    tbody.innerHTML = ''; // Limpia contenido anterior

    let lastRow = null;

    if (Array.isArray(data) && data.length > 0) {
        // Ordenar alfabéticamente por nombre (ignorando mayúsculas/minúsculas)
        data.sort((a, b) => {
            const nombreA = (a.nombre || a.Nombre || '').toLowerCase();
            const nombreB = (b.nombre || b.Nombre || '').toLowerCase();
            return nombreA.localeCompare(nombreB);
        });

        data.forEach((categoria, index) => {
            const tr = document.createElement('tr');

            const id = categoria.idcategoriaitem || index;
            const nombre = categoria.nombre || categoria.Nombre || 'Sin nombre';
            const estado = categoria.estado ?? categoria.Estado ?? true;

            tr.innerHTML = `
                <td class="d-none">${id}</td>
                <td>${nombre}</td>
                <td class="text-center">
                    <div class="custom-control custom-switch">
                        <input type="checkbox" class="custom-control-input estado-switch" id="switch-${id}" data-id="${id}" ${estado ? 'checked' : ''}>
                        <label class="custom-control-label" for="switch-${id}"></label>
                    </div>
                </td>
            `;

            tbody.appendChild(tr);
            lastRow = tr;
        });

        // Eventos de cambio de estado en los switches
        document.querySelectorAll('.estado-switch').forEach(switchInput => {
            switchInput.addEventListener('change', (e) => {
                const id = e.target.dataset.id;
                const nuevoEstado = e.target.checked;
                actualizarEstadoCategoria(id, nuevoEstado);
            });
        });

        // Hacer scroll a la última fila si existe
        if (lastRow) {
            setTimeout(() => {
                lastRow.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }, 200);
        }

    } else {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="3" class="text-center">No hay categorías registradas.</td>`;
        tbody.appendChild(tr);
    }
}
function actualizarEstadoCategoria(idcategoriaitem, estado) {
    fetch(`${url}/api/compras/actualizarEstadoCategoria`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            idcategoriaitem,
            estado
        })
    })
        .then(response => {
            if (!response.ok) throw new Error('Error al actualizar estado');
            return response.json();
        })
        .then(data => {
            Mensaje("success", "Exito", "Estado actualizado correctamente.", true, false);
            // Puedes mostrar un toast o alerta si deseas
        })
        .catch(error => {
            console.error('Error en actualizarEstadoCategoria:', error);
            // Puedes revertir el switch si hubo error
            const switchInput = document.querySelector(`#switch-${idcategoriaitem}`);
            if (switchInput) switchInput.checked = !estado;
        });
}
function registrarCategoria() {
    const inputCategoria = document.getElementById('categoria');
    const nombreCategoria = inputCategoria.value.trim();

    // Validación
    if (!nombreCategoria) {
        Mensaje("error", "Error", "Ingrese un nombre de categoria valido.", false, false);
        return;
    }

    // Armar payload como array de objetos
    const categoriasPayload = [
        {
            nombre: nombreCategoria,
            descripcion: null // si más adelante agregas descripción, actualizas aquí
        }
    ];

    fetch(`${url}/api/compras/guardarCategoria`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(categoriasPayload)
    })
        .then(response => {
            if (!response.ok) throw new Error('Error al registrar categoría');
            return response.json();
        })
        .then(data => {
            Mensaje("success", "Exito", "Categoria registrada exitosamente.", true, false);
            inputCategoria.value = ''; // Limpiar campo
            obtenerCategorias(); // Recargar la tabla
        })
        .catch(error => {
            console.error('Error en registrarCategoria:', error);
            Mensaje("error", "Error", "Ocurrio un problema.", false, false);
        });
}

//FUNCION PARA EL MANEJO DE PROVEEDORES
function obtenerProveedores() {
    fetch(`${url}/api/compras/obtenerProveedores`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
    })
        .then(response => response.json())
        .then(data => {
            renderizarTablaProveedores(data);
        })
        .catch(error => {
            console.error('Error al obtener proveedores:', error);
        });
}
let tablaProveedores;
function renderizarTablaProveedores(data) {
    // Destruir tabla existente si ya fue inicializada
    if ($.fn.DataTable.isDataTable('#ProveedorTable')) {
        $('#ProveedorTable').DataTable().destroy();
    }

    // Limpiar contenido
    const tbody = document.querySelector('#ProveedorTable tbody');
    tbody.innerHTML = '';

    // Ordenar datos por nombre
    data.sort((a, b) => (a.nombre || '').toLowerCase().localeCompare((b.nombre || '').toLowerCase()));

    // Construir filas
    data.forEach((proveedor, index) => {
        const id = proveedor.idproveedor || index;
        const nombre = proveedor.nombre || 'Sin nombre';
        const identificacion = proveedor.identificacion || 'Sin identificación';
        const estado = proveedor.estado ?? true;

        const tr = document.createElement('tr');
        tr.innerHTML = `
      <td class="d-none">${id}</td>
      <td>${identificacion}</td>
      <td>${nombre}</td>
      <td class="text-center">
        <div class="custom-control custom-switch">
          <input type="checkbox" class="custom-control-input estado-switch" id="switch-prov-${id}" data-id="${id}" ${estado ? 'checked' : ''}>
          <label class="custom-control-label" for="switch-prov-${id}"></label>
        </div>
      </td>
    `;
        tbody.appendChild(tr);
    });

    // Inicializar DataTable
    tablaProveedores = $('#ProveedorTable').DataTable({
        pageLength: 5,
        lengthChange: false,
        searching: true,
        language: {
            url: "https://cdn.datatables.net/plug-ins/1.10.16/i18n/Spanish.json"
        },
        columnDefs: [
            { targets: 0, visible: false }
        ],
        initComplete: function () {
            // Limpiar el contenedor del buscador antes de moverlo
            $('#dataTableSearchWrapper').empty();

            const searchInputWrapper = $('#ProveedorTable_filter').detach();
            $('#dataTableSearchWrapper').append(searchInputWrapper);

            // Reaplicar clases Bootstrap al input de búsqueda
            const input = $('#dataTableSearchWrapper input');
            input.addClass('form-control form-control d-inline-block')
                .css('width', '200px');

            $('#dataTableSearchWrapper label').addClass('mb-0');
        }
    });

    // Asociar eventos a los switches nuevamente
    document.querySelectorAll('.estado-switch').forEach(switchInput => {
        switchInput.addEventListener('change', (e) => {
            const id = e.target.dataset.id;
            const nuevoEstado = e.target.checked;
            actualizarEstadoProveedor(id, nuevoEstado);
        });
    });
}
function actualizarEstadoProveedor(idproveedor, estado) {
    fetch(`${url}/api/compras/actualizarEstadoProveedor`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            idproveedor,
            estado
        })
    })
        .then(response => {
            if (!response.ok) throw new Error('Error al actualizar estado');
            return response.json();
        })
        .then(data => {
            Mensaje("success", "Exito", "Estado actualizado correctamente.", true, false);
            // Puedes mostrar un toast o alerta si deseas
        })
        .catch(error => {
            console.error('Error en actualizarEstadoCategoria:', error);
            // Puedes revertir el switch si hubo error
            const switchInput = document.querySelector(`#switch-${idproveedor}`);
            if (switchInput) switchInput.checked = !estado;
        });
}
async function registrarProveedor() {
    // Captura de datos del formulario
    const tipoDocumento = document.getElementById('tipoDocumento').value.trim();
    const identificacion = document.getElementById('identificacion').value.trim();
    const razonSocial = document.getElementById('razonSocial').value.trim();
    const direccion = document.getElementById('direccion').value.trim();
    const telefono = document.getElementById('telefono').value.trim();

    // Validaciones personalizadas
    if (!tipoDocumento) {
        Mensaje("error", "Error", "Selecciona un tipo de documento.", false, false);
        return;
    }
    if (!identificacion) {
        Mensaje("error", "Error", "Ingresa la identificación del proveedor.", false, false);
        return;
    }
    if (!razonSocial) {
        Mensaje("error", "Error", "Ingresa la razón social del proveedor.", false, false);
        return;
    }

    // Construcción del objeto con nombres esperados por el backend
    const proveedor = {
        tipoidentificacion: tipoDocumento,
        identificacion: identificacion,
        nombre: razonSocial,
        direccion: direccion,
        telefono: telefono
    };

    // Envío al backend como arreglo de proveedores
    try {
        const respuesta = await fetch(`${url}/api/compras/guardarProveedor`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ proveedores: [proveedor] }),
            credentials: 'include'
        });

        const resultado = await respuesta.json();

        if (respuesta.ok) {
            Mensaje("success", "Éxito", resultado.mensaje || "Proveedor registrado correctamente", true, false);

            // Limpiar campos si lo deseas
            const form = document.getElementById('formRegistrarProveedor');
            form.reset();
            $('#registrarProveedor').modal('hide');

            // Opcional: recargar la tabla de proveedores
            obtenerProveedores();
        } else {
            Mensaje("error", "Error", resultado.error || "Ocurrió un error al registrar el proveedor.", false, false);
        }

    } catch (error) {
        console.error("Error al enviar proveedor:", error);
        Mensaje("error", "Error", "Error de red o del servidor.", false, false);
    }
}


