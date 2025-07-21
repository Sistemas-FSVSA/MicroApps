document.addEventListener("DOMContentLoaded", () => {
    InicializarItemSolicitados();

});

async function InicializarItemSolicitados() {
    cargarItemSolicitados()

    document.getElementById('ordenSalida').addEventListener('click', function () {
        tipoOrdenActual = 'SALIDA';
        renderizarItemsSeleccionadosModal();
        let modal = new bootstrap.Modal(document.getElementById('modalOrden'));
        modal.show();
    });

    document.getElementById('orderCompra').addEventListener('click', async function () {
        tipoOrdenActual = 'COMPRA';
        await renderizarItemsSeleccionadosModal(true);
        let modal = new bootstrap.Modal(document.getElementById('modalOrden'));
        modal.show();
    });

}

async function renderizarItemsSeleccionadosModal(esOrdenCompra = false) {
    const tbody = document.getElementById('tbodyOrdenSalida');
    tbody.innerHTML = '';

    // Habilitar o deshabilitar los campos de proveedor
    const contenedorProveedor = document.getElementById('contenedorProveedor');
    const selectProveedor = document.getElementById('selectProveedor');
    contenedorProveedor.style.display = esOrdenCompra ? 'block' : 'none';
    selectProveedor.disabled = !esOrdenCompra;  // Habilitar o deshabilitar el select

    // Deshabilitar o habilitar los campos de valor según la orden de compra
    document.querySelectorAll('.input-valor-item').forEach(input => {
        input.disabled = !esOrdenCompra;  // Habilitar o deshabilitar el input de precio
    });

    // Cargar proveedores si es orden de compra
    if (esOrdenCompra) {
        await cargarProveedores();  // Esta función debe llenar el selectProveedor
    }

    const itemsSeleccionados = JSON.parse(sessionStorage.getItem('itemsSeleccionados')) || [];

    // Si ya existe una tabla, destruirla y crearla de nuevo
    if ($.fn.DataTable.isDataTable('#ordenSalidaTable')) {
        $('#ordenSalidaTable').DataTable().clear().destroy();
    }

    itemsSeleccionados.forEach(item => {
        const row = document.createElement('tr');

        row.innerHTML = `
            <td>${item.iditem}</td>
            <td>${item.itemNombre}</td>
            <td>${item.categoriaNombre}</td>
            <td>
                <input type="number" class="form-control input-cantidad"
                    data-iditem="${item.iditem}"
                    value="${item.total}"
                    min="1" style="width: 80px;">
            </td>
            ${esOrdenCompra
                ? `<td>
                            <input type="text" class="form-control input-observacion-item"
                                data-iditem="${item.iditem}" value="${item.observacion || ''}"
                                placeholder="Observación" style="width: 150px;">
                    </td>`
                : ''
            }
            <td class="td-valor-item">
                <input type="number" class="form-control input-valor-item"
                    data-iditem="${item.iditem}"
                    value="${item.valor || 0}"
                    min="0" style="width: 100px;" ${!esOrdenCompra ? 'disabled' : ''}>
            </td>
        `;


        tbody.appendChild(row);
    });

    // Escuchar cambios de cantidad, valor y observación
    tbody.querySelectorAll('.input-cantidad, .input-valor-item, .input-observacion-item').forEach(input => {
        input.addEventListener('input', function () {
            const iditem = parseInt(this.dataset.iditem);
            const items = JSON.parse(sessionStorage.getItem('itemsSeleccionados')) || [];

            const nuevosItems = items.map(item => {
                if (item.iditem === iditem) {
                    if (this.classList.contains('input-cantidad')) {
                        item.total = parseInt(this.value);
                    } else if (this.classList.contains('input-valor-item')) {
                        item.valor = parseFloat(this.value);
                    } else if (this.classList.contains('input-observacion-item')) {
                        item.observacion = this.value;
                    }
                }
                return item;
            });

            sessionStorage.setItem('itemsSeleccionados', JSON.stringify(nuevosItems));
        });
    });


    // Inicializar la tabla de DataTables
    $('#ordenSalidaTable').DataTable({
        pageLength: 5,
        lengthChange: false,
        searching: false,
        language: {
            url: "https://cdn.datatables.net/plug-ins/1.10.16/i18n/Spanish.json"
        }
    });
}

async function manejarOrden(tipo = 'SALIDA') {
    const itemsSeleccionados = JSON.parse(sessionStorage.getItem('itemsSeleccionados')) || [];
    const idusuario = localStorage.getItem('idusuario');
    const idproveedor = document.getElementById('selectProveedor')?.value;

    if (!Array.isArray(itemsSeleccionados) || itemsSeleccionados.length === 0) {
        return Mensaje('warning', '¡Espera!', 'No hay items para gestionar.', false, false);
    }


    if (tipo === 'COMPRA' && !idproveedor) {
        return Mensaje('warning', '¡Espera!', 'Selecciona un proveedor para poder continuar.', false, false);
    }

    try {
        const data = {
            idusuario,
            tipo,
            items: itemsSeleccionados,
            ...(tipo === 'COMPRA' && { idproveedor })
        };

        const respuesta = await fetch(`${url}/api/compras/manejarOrden`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        });

        const resultado = await respuesta.json();

        if (respuesta.ok) {
            Mensaje('success', '¡Exito!', 'Orden generada exitosamente.', true, false);
            sessionStorage.removeItem('itemsSeleccionados');
            $('#modalOrden').removeClass('show').removeAttr('style').attr('aria-hidden', 'true');
            $('.modal-backdrop').remove();
            $('body').removeClass('modal-open');
            await cargarItemSolicitados();
        } else {
            Mensaje('error', '¡Error!', 'No fue posible generar la orden.', false, false);
        }
    } catch (error) {
        Mensaje('error', '¡Error!', 'No se pudo obtener la informacion.', false, false);
    }
}

let dependencias = []; // Variable global para almacenar dependencias

async function cargarItemSolicitados() {
    try {
        const response = await fetch(`${url}/api/compras/obtenerItemsPedido`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error('Error al obtener el pedido');
        }

        const data = await response.json();
        dependencias = data.dependencias || []; // <-- Guardamos las dependencias aquí
        renderizarTablaItems(data.items, data.itemsOrden);
    } catch (error) {
        console.error("Error:", error);
    }
}

async function cargarProveedores() {
    try {
        const res = await fetch(`${url}/api/compras/obtenerProveedores`, {
            credentials: 'include'
        });
        const proveedores = await res.json();

        const select = document.getElementById('selectProveedor');
        select.innerHTML = '<option value="">Seleccione un proveedor</option>';

        proveedores.forEach(p => {
            const option = document.createElement('option');
            option.value = p.idproveedor;
            option.textContent = `${p.identificacion} - ${p.nombre}`;
            select.appendChild(option);
        });

        // Activar Select2 después de llenar las opciones
        $('#selectProveedor').select2({
            placeholder: 'Seleccione un proveedor',
            width: '100%'  // Asegura que se ajuste al contenedor
        });

    } catch (error) {
        console.error('Error al cargar proveedores:', error);
        Mensaje('error', '¡Error!', 'No se pudieron cargar los proveedores', false, false);
    }
}

function getItemsSeleccionados() {
    const data = sessionStorage.getItem("itemsSeleccionados");
    return data ? JSON.parse(data) : [];
}

function guardarItemsSeleccionados(items) {
    sessionStorage.setItem("itemsSeleccionados", JSON.stringify(items));
}

function toggleItemSeleccionado(item) {
    let items = getItemsSeleccionados();
    const existe = items.find(i => i.iditem === item.iditem);

    if (existe) {
        items = items.filter(i => i.iditem !== item.iditem);
    } else {
        const cantidad = item.diferencia > 0 ? item.diferencia : 0;

        items.push({
            iditem: item.iditem,
            itemNombre: item.itemNombre,
            categoriaNombre: item.categoriaNombre,
            total: cantidad
        });
    }
    guardarItemsSeleccionados(items);
}

function renderizarTablaItems(items, itemsOrden) {
    const $tbody = $("#tbodyitem");
    $tbody.empty();

    const seleccionados = getItemsSeleccionados().map(i => i.iditem);

    if ($.fn.DataTable.isDataTable("#tablaItemsSeleccionados")) {
        $('#tablaItemsSeleccionados').DataTable().clear().destroy();
    }

    items.forEach((item) => {
        const checked = seleccionados.includes(item.iditem) ? 'checked' : '';

        // Buscar item en itemsOrden por iditem
        const itemOrden = itemsOrden.find(io => io.iditem === item.iditem);
        const totalOrden = itemOrden ? itemOrden.total : 0;
        const diferencia = item.total - totalOrden;

        // Agregar propiedades al objeto original
        item.totalOrden = totalOrden;
        item.diferencia = diferencia;


        const fila = `
            <tr data-iditem="${item.iditem}" class="fila-item" style="cursor: pointer;">
                <td>${item.iditem}</td>
                <td>${item.itemNombre}</td>
                <td>${item.categoriaNombre}</td>
                <td>${item.total}</td>
                <td>${totalOrden}</td>
                <td>${diferencia}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="verDetalle(${item.iditem}); event.stopPropagation();">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
                <td class="text-center">
                    <div class="form-check d-flex justify-content-center mb-0">
                        <input class="form-check-input checkbox-item" type="checkbox" id="check-${item.iditem}" data-iditem="${item.iditem}" ${checked}>
                        <label class="form-check-label" for="check-${item.iditem}"></label>
                    </div>
                </td>
            </tr>
        `;
        $tbody.append(fila);
    });

    // Eventos como los tenías antes
    $(".checkbox-item").on("click", function (e) {
        e.stopPropagation();
        const iditem = parseInt($(this).data("iditem"));
        const item = items.find(i => i.iditem === iditem);
        toggleItemSeleccionado(item);
    });

    $(".fila-item").on("click", function (e) {
        if ($(e.target).is("input, button, i, label")) return;

        const iditem = parseInt($(this).data("iditem"));
        const $checkbox = $(`#check-${iditem}`);
        $checkbox.prop("checked", !$checkbox.prop("checked"));

        const item = items.find(i => i.iditem === iditem);
        toggleItemSeleccionado(item);
    });

    $('#tablaItemsSeleccionados').DataTable({
        language: {
            url: 'https://cdn.datatables.net/plug-ins/1.13.4/i18n/es-ES.json'
        }
    });
}

function verDetalle(iditem) {
    const detalles = dependencias.filter(dep => dep.iditem === iditem);

    if (detalles.length === 0) {
        Swal.fire({
            icon: 'info',
            title: 'Sin dependencias',
            text: 'Este item no ha sido solicitado por ninguna dependencia.'
        });
        return;
    }

    const htmlDetalle = detalles.map(dep => `
        <tr>
            <td>${dep.dependenciaNombre}</td>
            <td>${dep.cantidad}</td>
        </tr>
    `).join('');

    Swal.fire({
        title: 'Dependencias que solicitaron el item',
        html: `
            <div style="text-align:left">
                <strong>Item:</strong> ${detalles[0].itemNombre}
                <br><br>
                <table class="table table-sm table-bordered">
                    <thead>
                        <tr>
                            <th>Dependencia</th>
                            <th>Cantidad</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${htmlDetalle}
                    </tbody>
                </table>
            </div>
        `,
        width: 600
    });
}