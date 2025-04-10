document.addEventListener("DOMContentLoaded", () => {
    inicializarFormularioPQRS();
});

async function inicializarFormularioPQRS() {
    fetchOptions(`${url}/api/pqrs/obtenerPlanes`, 'plan', 'data');

    document.getElementById('guardarFormulario').addEventListener('click', async function () {
        try {
            const formData = await capturarInformacionModal();
            if (!formData) return;
            const idpqrs = await guardarInformacion(formData);
            if (idpqrs) {
                Mensaje('success', 'Exito', 'PQRS guardado exitosamente.', true, false);
                document.getElementById("formPQRS").reset();
                limpiarValidaciones();
            } else {
                Mensaje("error", "Error", "No fue posible guardar el PQRS", false, false);
            }
        } catch (error) {
            Mensaje("error", "Error", "No fue posible guardar el PQRS", false, false);
        }
    });

    document.getElementById("guardarImprimir").addEventListener("click", async function () {
        const formData = await capturarInformacionModal();
        
        if (!formData) return; // 🚫 Detener si faltan datos
    
        inicializarCanvas();
        $('#modalFirma').modal('show');
    });

    document.getElementById("btnGuardarFirma").addEventListener("click", async function () {
        showSpinner();
        try {
            const formData = await capturarInformacionModal();

            const idpqrs = await guardarInformacion(formData);
            if (!idpqrs) Mensaje("error", "Error","No fue posible guardar el PQRS.", false, false);

            const pdfBlob = await generarPDF(formData);
            if (!pdfBlob) Mensaje("error", "Error","No fue posible generar el PDF.", false, false);

            const adjuntoGuardado = await guardarAdjuntoPQRS(pdfBlob, idpqrs);
            if (!adjuntoGuardado) Mensaje("error", "Error","No fue posible guardar el PDF.", false, false);

            limpiarFirma();
            $('#modalFirma').modal('hide');
            document.getElementById("formPQRS").reset();
            Mensaje("success", "Exito","PQRS guardado Exitosamente.", true, false);

        } catch (error) {
            Mensaje("error", "Error","No fue posible completar la accion.", false, false);
        } finally {
            hideSpinner();
        }
    });

    document.getElementById('fuente').addEventListener('change', function () {
        const idFuente = this.value; // Capturar el id de la fuente seleccionada
    
        if (!idFuente) {
            // Si no hay selección válida, limpiar el select de subfuentes
            document.getElementById('detallefuente').innerHTML = '<option value="">Seleccionar</option>';
            return;
        }
    
        // Llamada al backend para obtener los subfuentes de la fuente seleccionada
        fetch(`${url}/api/pqrs/obtenerSudfuentes/${idFuente}`, {
            credentials: 'include'
        })
            .then(response => response.json())
            .then(data => {
                // Filtrar solo los activos
                const subfuentes = data.subfuentes
                    .filter(item => item.estado === true)
                    .sort((a, b) => a.nombre.localeCompare(b.nombre));
    
                const selectDetalle = document.getElementById('detallefuente');
                selectDetalle.innerHTML = ''; // Limpiar opciones previas
    
                // Opción por defecto
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = 'Seleccionar';
                selectDetalle.appendChild(defaultOption);
    
                // Agregar opciones dinámicas
                subfuentes.forEach(subfuente => {
                    const option = document.createElement('option');
                    option.value = subfuente.idsubfuente; // Suponiendo que "idsubfuente" es el ID
                    option.textContent = subfuente.nombre;
                    selectDetalle.appendChild(option);
                });
            })
            .catch(error => console.error(`Error al obtener los subfuentes:`, error));
    });
    
}

function inicializarCanvas() {
    document.getElementById("btnLimpiarFirma").addEventListener("click", limpiarFirma);

    let canvas = document.getElementById("canvasFirma");
    let ctx = canvas.getContext("2d");
    let firmando = false;

    // Asegurar que el canvas no tenga eventos duplicados
    canvas.replaceWith(canvas.cloneNode(true));
    canvas = document.getElementById("canvasFirma");
    ctx = canvas.getContext("2d");

    // Configurar estilos de dibujo
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "black";

    // Eventos de mouse (PC)
    canvas.addEventListener("mousedown", iniciarFirma);
    canvas.addEventListener("mouseup", () => firmando = false);
    canvas.addEventListener("mousemove", dibujar);

    // Eventos táctiles (Móviles y Tablets)
    canvas.addEventListener("touchstart", iniciarFirma);
    canvas.addEventListener("touchend", () => firmando = false);
    canvas.addEventListener("touchmove", dibujar);

    function iniciarFirma(event) {
        firmando = true;
        ctx.beginPath();
        const { x, y } = obtenerCoordenadas(event);
        ctx.moveTo(x, y);
        event.preventDefault(); // Evita el desplazamiento en móviles
    }

    function dibujar(event) {
        if (!firmando) return;
        const { x, y } = obtenerCoordenadas(event);
        ctx.lineTo(x, y);
        ctx.stroke();
        event.preventDefault(); // Evita el desplazamiento en móviles
    }

    function limpiarFirma() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // Función para obtener coordenadas en PC y dispositivos táctiles
    function obtenerCoordenadas(event) {
        const rect = canvas.getBoundingClientRect();
        if (event.touches) { // Evento táctil
            return {
                x: event.touches[0].clientX - rect.left,
                y: event.touches[0].clientY - rect.top
            };
        } else { // Evento de mouse
            return {
                x: event.clientX - rect.left,
                y: event.clientY - rect.top
            };
        }
    }

    window.limpiarFirma = limpiarFirma; // Aseguramos que limpiarFirma esté accesible globalmente
}

async function capturarInformacionModal() {
    const camposObligatorios = [
        'titular', 'telefono',
        'afiliado', 'fechaFallecimiento', 'reclamo'
    ];

    

    let data = { idusuario: localStorage.getItem('idusuario') };
    let faltanCampos = false;

    // 🔍 Validar campos vacíos y resaltar los que falten
    camposObligatorios.forEach(campo => {
        const input = document.getElementById(campo);
        const valor = input.value.trim();
        data[campo] = valor;

        if (!valor) {
            input.classList.add('is-invalid'); // 🚨 Resaltar en rojo si está vacío
            faltanCampos = true;
        } else {
            input.classList.remove('is-invalid'); // ✅ Quitar resaltado si se llena
        }
    });

    if (faltanCampos) {
        Mensaje('warning', 'Información incompleta', 'Por favor, complete todos los campos obligatorios.', false, false);
        return null;
    }

    return data;
}

async function guardarInformacion(formData) {
    try {
        const response = await fetch(`${url}/api/pqrs/guardarPQRS`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
            credentials: "include"
        });

        const result = await response.json();
        if (response.ok) {
            return result.idpqrs;
        } else {
            Mensaje('error', 'Error', 'No fue posible guardar la PQRS.', false, false);
        }
    } catch (error) {
        console.error('Error al guardar la PQRS:', error);
        return null;
    }
}

async function generarPDF(formData) {
    const dataToSend = new FormData();

    Object.entries(formData).forEach(([key, value]) => {
        dataToSend.append(key, value);
    });

    const fecha = new Date();
    dataToSend.append("dia", fecha.getDate());
    dataToSend.append("mes", fecha.getMonth() + 1);
    dataToSend.append("year", fecha.getFullYear());

    const nombres = localStorage.getItem("nombres") || "";
    const apellidos = localStorage.getItem("apellidos") || "";
    dataToSend.append("funcionario", `${nombres} ${apellidos}`.trim());

    let canvas = document.getElementById("canvasFirma");
    if (canvas) {
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
        dataToSend.append("firma", blob, "firma.png");
    }

    try {
        const response = await fetch(`${url}/api/pqrs/generarImpresionPQRS`, {
            method: "POST",
            body: dataToSend,
            credentials: "include",
        });

        if (!response.ok)  Mensaje('error', 'Error', 'No fue posible generar el PDF.', false, false);
        const pdfBlob = await response.blob();

        const pdfUrl = window.URL.createObjectURL(pdfBlob);
        const a = document.createElement("a");
        a.href = pdfUrl;
        a.download = "PQRS.pdf";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(pdfUrl);

        return pdfBlob;
    } catch (error) {
        Mensaje('error', 'Error', 'No fue posible generar el PDF.', false, false);
        return null;
    }
}

async function guardarAdjuntoPQRS(pdfBlob, idpqrs) {
    try {
        const idusuario = localStorage.getItem("idusuario");

        const formData = new FormData();
        formData.append("idpqrs", idpqrs);
        formData.append("idusuario", idusuario);
        formData.append("adjuntos[]", pdfBlob, "PQRS.pdf");

        const response = await fetch(`${url}/api/pqrs/guardarAdjuntosPQRS`, {
            method: "POST",
            body: formData,
            credentials: "include"
        });

        const result = await response.json();
        if (response.ok) {
            return true;
        } else {
            Mensaje('error', 'Error', 'No fue posible guardar el PDF.', false, false);
        }
    } catch (error) {
        console.error("Error al guardar el adjunto:", error);
        return false;
    }
}

function fetchOptions(url, selectId, keyName) {
    fetch(url, {
        credentials: 'include' // Se incluyen las credenciales en la petición
    })
        .then(response => response.json())
        .then(data => {
            // Filtrar los elementos con estado true
            const options = data[keyName]
                .filter(item => item.estado === true)
                .sort((a, b) => a.nombre.localeCompare(b.nombre));

            const select = document.getElementById(selectId);
            select.innerHTML = ''; // Limpiar opciones previas

            // Opción por defecto "Otros"
            const defaultOption = document.createElement('option');
            defaultOption.value = ''; // Valor especial para capturar null
            defaultOption.textContent = 'Seleccionar';
            select.appendChild(defaultOption);

            // Agregar opciones dinámicas al select
            options.forEach(option => {
                const opt = document.createElement('option');
                opt.value = option.idtipoplan;  // Usamos idtipoplan como value
                opt.textContent = option.nombre;
                select.appendChild(opt);
            });

            // Evento para capturar "Otros" como null
            select.addEventListener('change', function () {
                if (this.value === 'otros') {
                    this.dataset.value = null; // Guardamos null en dataset (opcional)
                } else {
                    this.dataset.value = this.value; // Guardamos el valor real
                }
            });
        })
        .catch(error => console.error(`Error al obtener los planes:`, error));
}