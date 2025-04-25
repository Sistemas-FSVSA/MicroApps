//FUNCION DE PERMISOS PARA EL SIDEBAR//
function cargarPermisosSidebar() {
    //ARRAY CON LOS PERMISOS DEL USUARIO
    const permisos = JSON.parse(localStorage.getItem('permisos'));

    //VERIFICAR SI EL USUARIO TIENE PERMISOS PARA CADA UNA DE LAS VISTAS EN EL SIDEBAR
    //PERMISOS PARA EL MENU DE USUARIOS
    const tienePermisoUsuarios = permisos.some(permiso => permiso.vista === "USUARIOS");
    document.getElementById('menuUsuarios').style.display = tienePermisoUsuarios ? '' : 'none';

    //PERMISOS PARA EL MENU DE PLANILLAS
    const tienePermisoPlanillas = permisos.some(permiso => ["NUEVA_PLANILLA", "PENDIENTE_PLANILLA", "DESCARGAR_PLANILLA"].includes(permiso.vista));
    document.getElementById('menuPlanillas').style.display = tienePermisoPlanillas ? '' : 'none';

    //PERMISOS PARA EL MENU DE MAPA
    const tienePermisoMapa = permisos.some(permiso => permiso.vista === "MAPA");
    document.getElementById('menuMapa').style.display = tienePermisoMapa ? '' : 'none';

    //PERMISOS PARA EL MENU DE PQRS
    const tienePermisoFormPQRS = permisos.some(permiso => permiso.vista === "FORMULARIO_PQRS");
    const tienePermisoConsPQRS = permisos.some(permiso => permiso.vista === "CONSULTAR_PQRS");
    const tienePermisoRepoPQRS = permisos.some(permiso => permiso.vista === "REPORTES_PQRS");
    document.getElementById('menuPQRS').style.display =
        (tienePermisoFormPQRS || tienePermisoConsPQRS || tienePermisoRepoPQRS) ? '' : 'none';
    document.getElementById('registrarPQRS').style.display = tienePermisoFormPQRS ? '' : 'none';
    document.getElementById('consultarPQRS').style.display = tienePermisoConsPQRS ? '' : 'none';
    document.getElementById('reportesPQRS').style.display = tienePermisoRepoPQRS ? '' : 'none';

    //PERMISOS PARA EL MENU DE VALES
    const tienePermisoGestVales = permisos.some(permiso => permiso.vista === "GESTION_VALES");
    const tienePermisoRepoVales = permisos.some(permiso => permiso.vista === "REPORTE_VALES");
    document.getElementById('menuVales').style.display =
        (tienePermisoGestVales || tienePermisoRepoVales) ? '' : 'none';
    document.getElementById('gestionVales').style.display = tienePermisoGestVales ? '' : 'none';
    document.getElementById('reporteVales').style.display = tienePermisoRepoVales ? '' : 'none';

    //PERMISOS PARA EL MENU DE RECAUDO
    const tienePermisoNoveRecau = permisos.some(permiso => permiso.vista === "NOVEDADES_RECAUDADO");
    document.getElementById('menuRecaudo').style.display = tienePermisoNoveRecau ? '' : 'none';
    document.getElementById('novedadesRecaudo').style.display = tienePermisoNoveRecau ? '' : 'none';

    //PERMISOS PARA EL MENU DE COMPRAS
    const tienePermisoGestCompras = permisos.some(permiso => permiso.vista === "GESTION_COMPRAS");
    const tienePermisoRepoCompras = permisos.some(permiso => permiso.vista === "REPORTE_COMPRAS");
    document.getElementById('menuCompras').style.display =
        (tienePermisoGestCompras || tienePermisoRepoCompras) ? '' : 'none';
    document.getElementById('gestionCompras').style.display = tienePermisoGestCompras ? '' : 'none';
    document.getElementById('reporteCompras').style.display = tienePermisoRepoCompras ? '' : 'none';

    //RENDERIZADO DEL NOMBRE DE USUARIO EN EL SIDEBAR
    const nombres = localStorage.getItem('nombres');
    const apellidos = localStorage.getItem('apellidos');

    if (nombres) {
        const nombreCompleto = `${nombres.trim()} ${apellidos.trim()}`;
        const userNameDisplay = document.getElementById('userNameDisplay');
        if (userNameDisplay) {
            userNameDisplay.innerHTML = nombreCompleto;
        }
    }
}

//FUNCION DE PERMISOS PARA LA GETION DE NUEVA/EDICION PLANILLA//
function cargarPermisosPlanillas(estadoPlanillaGlobal) {
    const permisos = JSON.parse(localStorage.getItem('permisos'));

    const tienePermisoGuardar = permisos.some(permiso => permiso.elemento === "BOTON_GUARDAR" && estadoPlanillaGlobal === 'GUARDADO');
    const botonGuardar = document.getElementById('guardarPlanilla');
    const usuarioNombre = document.getElementById('usuarioNombre')
    if (!tienePermisoGuardar) {
        botonGuardar.style.display = 'none';
        usuarioNombre.style.display = 'none';
    }

    const permisoEditar = permisos.some(permiso => permiso.elemento === "BOTON_EDITAR" && estadoPlanillaGlobal === 'CERRADO');
    const botonEditar = document.getElementById('editarPlanilla');
    const usuarioNombrePlantilla = document.getElementById('usuarioNombrePlantilla')
    if (!permisoEditar) {
        botonEditar.style.display = 'none';
        usuarioNombrePlantilla.style.display = 'none';
    }

    const tienePermisoCerrar = permisos.some(permiso => permiso.elemento === "BOTON_CERRAR" && estadoPlanillaGlobal === 'GUARDADO');
    const botonCerrar = document.getElementById('cerrarPlanilla');
    if (!tienePermisoCerrar) {
        botonCerrar.style.display = 'none';
    }

    const tienePermisoRegistrarTramite = permisos.some(permiso => permiso.elemento === "BOTON_REGISTRAR_TRAMITE");
    const botonRegistrar = document.getElementById('agregarTramite');
    if (!tienePermisoRegistrarTramite) {
        botonRegistrar.disabled = true; // Correcto: desactiva el botón
    } else {
        botonRegistrar.disabled = false; // Activa el botón en caso de que tenga el permiso
    }


    return {
        tienePermisoEliminarTramite: permisos.some(permiso => permiso.elemento === "BOTON_ELIMINAR_TRAMITE"),
        tienePermisoResponsableTramite: permisos.some(permiso => permiso.elemento === "SELECT_RESPONSABLE_TRAMITE"),
        tienePermisoTramiteTramite: permisos.some(permiso => permiso.elemento === "SELECT_TRAMITE_TRAMITE"),
        tienePermisoMunicipioTramite: permisos.some(permiso => permiso.elemento === "SELECT_MUNICIPIO_TRAMITE"),
        tienePermisoReferenciaTramite: permisos.some(permiso => permiso.elemento === "INPUT_REFERENCIA_TRAMITE"),
        tienePermisoDescripcionTramite: permisos.some(permiso => permiso.elemento === "INPUT_DESCRIPCION_TRAMITE"),
        tienePermisoRegistrarSubtramite: permisos.some(permiso => permiso.elemento === "BOTON_REGISTRAR_SUBTRAMITE"),
        tienePermisoRegistrarSubtramite: permisos.some(permiso => permiso.elemento === "BOTON_REGISTRAR_TRAMITE"),
        tienePermisoEliminarSubtramite: permisos.some(permiso => permiso.elemento === "BOTON_ELIMINAR_SUBTRAMITE"),
    };


}

//FUNCIONES DE PERMISOS PARA EL RESUMEN DE LA PLANILLA//
function cargarPermisosResumen(estadoPlanillaGlobal) {
    if (!estadoPlanillaGlobal) {
        return { permisoVerValores: false }; // Evita errores
    }

    const permisos = JSON.parse(localStorage.getItem('permisos'));

    const permisoCerrar = permisos.some(permiso => permiso.elemento === "BOTON_CERRAR" && estadoPlanillaGlobal === 'GUARDADO');
    const botonCerrar = document.getElementById('cerrarPlanilla');
    if (!permisoCerrar) {
        botonCerrar.style.display = 'none';
    }

    const permisoEditar = permisos.some(permiso => permiso.elemento === "BOTON_EDITAR" && estadoPlanillaGlobal === 'GUARDADO');
    const botonEditar = document.getElementById('editarPlanilla');
    const usuarioNombre = document.getElementById('usuarioNombre')
    if (!permisoEditar) {
        botonEditar.style.display = 'none'
        usuarioNombre.style.display = 'none'
    }

    const permisoEditarCerrado = permisos.some(permiso => permiso.elemento === "BOTON_EDITAR" && estadoPlanillaGlobal === 'CERRADO');
    const botonEditarCerrado = document.getElementById('editarPlanillaCerrado');
    if (!permisoEditarCerrado) {
        botonEditarCerrado.style.display = 'none'
    }


    const permisoAprobar = permisos.some(permiso => permiso.elemento === "BOTON_APROBAR" && estadoPlanillaGlobal === 'CERRADO');
    const botonAprobar = document.getElementById('aprobarPlanilla');
    const usuarioNombrePlantilla = document.getElementById('usuarioNombrePlantilla');
    if (!permisoAprobar) {
        botonAprobar.style.display = 'none'
        usuarioNombrePlantilla.style.display = 'none'
    }

    const permisoAgregarAjuste = permisos.some(permiso => permiso.elemento === "BOTON_AJUSTE" && estadoPlanillaGlobal === 'CERRADO');
    const botonAjuste = document.getElementById('agregarAjuste');
    if (!permisoAgregarAjuste) {
        botonAjuste.style.display = 'none'
    }

    const permisoTotalPlanilla = permisos.some(permiso => permiso.elemento === "INPUT_TOTAL_PLANILLA");
    const inputTotalPlanilla = document.getElementById('totalPlanilla');
    const labelTotalPlanilla = document.getElementById('labelTotalPlanilla')
    if (!permisoTotalPlanilla) {
        inputTotalPlanilla.style.display = 'none'
        labelTotalPlanilla.style.display = 'none'
    }

    const permisoTotalAjuste = permisos.some(permiso => permiso.elemento === "INPUT_TOTAL_AJUSTE" && estadoPlanillaGlobal === 'CERRADO');
    const inputTotalAjuste = document.getElementById('totalAjuste');
    const labelTotalAjuste = document.getElementById('labelTotalAjuste')
    if (!permisoTotalAjuste) {
        inputTotalAjuste.style.display = 'none'
        labelTotalAjuste.style.display = 'none'
    }

    const permisoTotalFinal = permisos.some(permiso => permiso.elemento === "INPUT_TOTAL_FINAL" && estadoPlanillaGlobal === 'CERRADO');
    const inputTotalFinal = document.getElementById('totalFinal');
    const labelTotalFinal = document.getElementById('labelTotalFinal')
    if (!permisoTotalFinal) {
        inputTotalFinal.style.display = 'none'
        labelTotalFinal.style.display = 'none'
    }

    const permisoRechazar = permisos.some(permiso => permiso.elemento === "BOTON_RECHAZAR" && estadoPlanillaGlobal === 'CERRADO');
    const botonRechzar = document.getElementById('rechazarPlanilla')
    if (!permisoRechazar) {
        botonRechzar.style.display = 'none'
    }

    function obtenerNombresDeURL() {
        const params = new URLSearchParams(window.location.search);
        return params.get('nombres');
    }
    function obtenerApellidosDeURL() {
        const params = new URLSearchParams(window.location.search);
        return params.get('apellidos');
    }

    const nombres = obtenerNombresDeURL()
    const apellidos = obtenerApellidosDeURL()
    const nombreCompleto = `${nombres} ${apellidos}`;
    document.getElementById('usuarioNombrePlantilla').textContent = nombreCompleto;

    return {
        permisoVerValores: permisos.some(permiso => permiso.elemento === "INPUT_VALOR_TRAMITE" && estadoPlanillaGlobal === 'CERRADO')
    };
}

//FUNCIONES DE PERMISOS PARA LA GESTION DE REPORTES PLANILLAS//
function cargarPermisosContabilizar() {
    const permisos = JSON.parse(localStorage.getItem('permisos'));

    const permisoVisualizar = permisos.some(permiso => permiso.elemento === "BOTON_VISUALIZAR_PLANILLAS");
    const botonVisualizar = document.getElementById('btnVisualizar');
    const labelFechaInicio = document.getElementById('labelFechaInicio')
    const labelFechaFin = document.getElementById('labelFechaFin')
    const InputFechaInicio = document.getElementById('fechaInicio')
    const InputFechaFin = document.getElementById('fechaFin')
    if (!permisoVisualizar) {
        botonVisualizar.style.display = 'none'
        labelFechaInicio.style.display = 'none'
        labelFechaFin.style.display = 'none'
        InputFechaInicio.style.display = 'none'
        InputFechaFin.style.display = 'none'
    }

    const permisoDescargar = permisos.some(permiso => permiso.elemento === "BOTON_DESCARGAR_PLANILLAS");
    const btnDescargar = document.getElementById('btnDescargar');
    if (!permisoDescargar) {
        btnDescargar.style.display = 'none'
    }
}

//FUNCIONES DE PERMISOS PARA LA GESTION DE USUARIOS//
function cargarPermisosUsuarios() {
}

async function cargarPermisosGestionPQRS() {

    const { idpqrs } = getQueryParams(); // Obtener el estado de la planilla
    const data = await fetch(`${url}/api/pqrs/obtenerEstadoPQRS/${idpqrs}`, {
        method: 'GET',
        credentials: 'include' // ✅ Esto asegura que las cookies se envíen
    });

    const { estado } = await data.json();
    const permisos = JSON.parse(localStorage.getItem('permisos'));

    const tienePermisoFechaServicio = permisos.some(permiso => permiso.elemento === "INPUT_FECHA_SERVICIO");
    const inputFechaServicio = document.getElementById("fechaServicio");
    inputFechaServicio.disabled = !(tienePermisoFechaServicio && estado !== "FINALIZADO");

    const tienePermisoCoordinador = permisos.some(permiso => permiso.elemento === "INPUT_COORDINADOR");
    const inputCoordinador = document.getElementById("responsable");
    inputCoordinador.disabled = !(tienePermisoCoordinador && estado !== "FINALIZADO");

    const tienePermisoSelectProceso = permisos.some(permiso => permiso.elemento === "SELECT_PROCESO_PQRS");
    const selectProceso = document.getElementById("proceso");
    selectProceso.disabled = !(tienePermisoSelectProceso && estado !== "FINALIZADO");

    const tienePermisoSelectTipoPQRS = permisos.some(permiso => permiso.elemento === "SELECT_TIPO_PQRS");
    const selectTipoPqrs = document.getElementById("tipopqrs");
    selectTipoPqrs.disabled = !(tienePermisoSelectTipoPQRS && estado !== "FINALIZADO");

    const tienePermisoSelectFuente = permisos.some(permiso => permiso.elemento === "SELECT_FUENTE_PQRS");
    const selectFuentePqrs = document.getElementById("fuente");
    selectFuentePqrs.disabled = !(tienePermisoSelectFuente && estado !== "FINALIZADO");

    const tienePermisoSelectSubfuente = permisos.some(permiso => permiso.elemento === "SELECT_FUENTE_PQRS");
    const selectSubfuente = document.getElementById("detallefuente");
    selectSubfuente.disabled = !(tienePermisoSelectSubfuente && estado !== "FINALIZADO");

    const tienePermisoDescripcion = permisos.some(permiso => permiso.elemento === "INPUT_DESCRIPCION");
    const inputDescripcion = document.getElementById("descripcion");
    inputDescripcion.disabled = !(tienePermisoDescripcion && estado !== "FINALIZADO");

    const tienePermisoCorrecion = permisos.some(permiso => permiso.elemento === "INPUT_CORRECION");
    const inputCorrecion = document.getElementById("correccionImplementada");
    inputCorrecion.disabled = !(tienePermisoCorrecion && estado !== "FINALIZADO");

    const tienePermisoSelectPertinencia = permisos.some(permiso => permiso.elemento === "SELECT_PERTINENCIA");
    const selectPertinencia = document.getElementById("pertinencia");
    selectPertinencia.disabled = !(tienePermisoSelectPertinencia && estado !== "FINALIZADO");

    const tienePermisoSelectEficaz = permisos.some(permiso => permiso.elemento === "SELECT_EFICAZ");
    const selectEficaz = document.getElementById("eficaz");
    selectEficaz.disabled = !(tienePermisoSelectEficaz && estado !== "FINALIZADO");

    const tienePermisoGuardarPqrs = permisos.some(permiso => permiso.elemento === "BOTON_GUARDAR_PQRS" && estado !== 'FINALIZADO');
    const botonGuardar = document.getElementById('btnGuardar');
    botonGuardar.style.display = tienePermisoGuardarPqrs ? 'inline-block' : 'none';

    const tienePermisoFinalizarPqrs = permisos.some(permiso => permiso.elemento === "BOTON_FINALIZAR_PQRS" && estado !== 'FINALIZADO');
    const botonFinalizar = document.getElementById('btnFinalizar');
    botonFinalizar.style.display = tienePermisoFinalizarPqrs ? 'inline-block' : 'none';

    const tienePermisoAbrirPqrs = permisos.some(permiso => permiso.elemento === "BOTON_ABRIR_PQRS" && estado == 'FINALIZADO');
    const botonAbrir = document.getElementById('btnAbrir');
    botonAbrir.style.display = tienePermisoAbrirPqrs ? 'inline-block' : 'none';
}

async function cargarPermisosNuevosPedidos() {
    const permisos = JSON.parse(localStorage.getItem('permisos'));

    const tienePermisoGuardarPedido = permisos.some(permiso => permiso.elemento === "BOTON_GUARDAR_PEDIDO");
    const botonGuardar = document.getElementById('guardarEncargo');
    botonGuardar.style.display = tienePermisoGuardarPedido ? 'inline-block' : 'none';

    const tienePermisoAprobarPedido = permisos.some(permiso => permiso.elemento === "BOTON_APROBAR_PEDIDO");
    const botonAprobar = document.getElementById('aprobarEncargo');
    botonAprobar.style.display = tienePermisoAprobarPedido ? 'inline-block' : 'none';
    
    const tienePermisoAgregarItem = permisos.some(permiso => permiso.elemento === "BOTON_AGREGAR_ITEM_PEDIDO");
    const botonAgregar = document.getElementById('agregarItem');
    botonAgregar.style.display = tienePermisoAgregarItem ? 'inline-block' : 'none';

    return {
        tienePermisoEliminarItem: permisos.some(permiso => permiso.elemento === "BOTON_ELIMINAR_ITEM_PEDIDO"),
    };

}

async function cargarPermisosContinuarPedidos() {
    const urlParams = new URLSearchParams(window.location.search);
    const idpedido = urlParams.get('idpedido');
    const data = await fetch(`${url}/api/compras/obtenerEstadoPedido/${idpedido}`, {
        method: 'GET',
        credentials: 'include' // ✅ Esto asegura que las cookies se envíen
    });
    const { estado } = await data.json();

    const permisos = JSON.parse(localStorage.getItem('permisos'));
    const tienePermisoGuardarPedido = permisos.some(permiso => permiso.elemento === "BOTON_GUARDAR_PEDIDO" && estado == 'INICIADO');
    const botonGuardar = document.getElementById('guardarEncargo');
    botonGuardar.style.display = tienePermisoGuardarPedido ? 'inline-block' : 'none';

    const tienePermisoAprobarPedido = permisos.some(permiso => permiso.elemento === "BOTON_APROBAR_PEDIDO" && estado == 'CERRADO');
    const botonAprobar = document.getElementById('aprobarEncargo');
    botonAprobar.style.display = tienePermisoAprobarPedido ? 'inline-block' : 'none';

    const tienePermisoCerrarPedido = permisos.some(permiso => permiso.elemento === "BOTON_CERRAR_PEDIDO" && estado == 'INICIADO');
    const botonCerrar = document.getElementById('cerrarEncargo');
    botonCerrar.style.display = tienePermisoCerrarPedido ? 'inline-block' : 'none';
    
    const tienePermisoAgregarItem = permisos.some(permiso => permiso.elemento === "BOTON_AGREGAR_ITEM_PEDIDO");
    const botonAgregar = document.getElementById('agregarItem');
    botonAgregar.style.display = tienePermisoAgregarItem ? 'inline-block' : 'none';

    return {
        tienePermisoEliminarItem: permisos.some(permiso => permiso.elemento === "BOTON_ELIMINAR_ITEM_PEDIDO"),
    };

}

