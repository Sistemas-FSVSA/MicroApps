const { poolPromise, sql } = require('../models/conexion');

// FUNCION PARA OBTENER LOS MUNICIPIOS
const getMunicipios = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query("SELECT * FROM municipios");
        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'No se encontraron municipios' });}
        res.json({
            data: result.recordset
        });
    } catch (error) {
        console.error('Error al obtener municipios', error);
        res.status(500).json({ error: 'Error en la base de datos' });
    }
};

// FUNCION PARA OBTENER LOS TRAMITES
const getTramites = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query("SELECT * FROM tramites");
        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'No se encontraron trámites' });}
        res.json({
            data: result.recordset
        });
    } catch (error) {
        console.error('Error al obtener trámites', error);
        res.status(500).json({ error: 'Error en la base de datos' });
    }
};

//FUNCION PARA OBTENER LOS USUARIOS
const getResponsable = async (req, res = response) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query("SELECT idusuario, nombres, apellidos, identificacion FROM usuarios WHERE responsable = 'true'");
        if (result.recordset.length === 0) {
            return res.status(404).json({message: 'No se encontraron usuarios'});}
        res.json({
            data: result.recordset
        });
    } catch (error) {
        console.error('Error al realizar la consulta', error);
        res.status(500).json({
            error: 'Error en la base de datos'
        });
    }
};


const manejarPlanilla = async (req, res) => {
    const { idplanilla, planillaData } = req.body;
    const tramites = planillaData;

    if (!tramites || !Array.isArray(tramites) || tramites.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'No se proporcionaron trámites válidos',
        });
    }

    const estado = tramites[0]?.estado || 'GUARDADO';
    const idtramitador = tramites[0]?.idtramitador;

    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        const nuevoIdPlanilla = await procesarPlanilla({
            idplanilla,
            estado,
            idtramitador,
        }, transaction);

        for (const tramite of tramites) {
            await procesarTramite(nuevoIdPlanilla, tramite, transaction);
        }

        await transaction.commit();

        res.status(200).json({
            success: true,
            message: `Planilla ${idplanilla ? 'editada' : 'creada'} exitosamente`,
            idplanilla: nuevoIdPlanilla,
        });
    } catch (error) {
        await transaction.rollback();
        console.error("Error al manejar la planilla:", error);
        res.status(500).json({
            success: false,
            message: 'Error al manejar la planilla',
            error: error.message,
        });
    }
};

// Procesa la creación o actualización de la planilla
const procesarPlanilla = async ({ idplanilla, estado, idtramitador }, transaction) => {
    let nuevoIdPlanilla;

    if (!idplanilla) {
        const result = await transaction.request()
            .input('idusuario', sql.Int, idtramitador)
            .input('estado', sql.VarChar, estado)
            .query(`
                INSERT INTO planillas (idusuario, estado, fechainicio, fechacierre)
                OUTPUT INSERTED.idplanilla
                VALUES (@idusuario, @estado, GETDATE(), ${estado === 'CERRADO' ? 'GETDATE()' : 'NULL'})
            `);
        nuevoIdPlanilla = result.recordset[0]?.idplanilla;
        if (!nuevoIdPlanilla) throw new Error('No se pudo crear la nueva planilla');
    } else {
        await transaction.request()
            .input('idplanilla', sql.Int, idplanilla)
            .input('estado', sql.VarChar, estado)
            .query(`
                UPDATE planillas
                SET estado = @estado, fechacierre = ${estado === 'CERRADO' ? 'GETDATE()' : 'NULL'}
                WHERE idplanilla = @idplanilla
            `);

        await transaction.request()
            .input('idplanilla', sql.Int, idplanilla)
            .query(`
                DELETE FROM subtramitesplanilla
                WHERE iddetalleplanilla IN (
                    SELECT iddetalleplanilla FROM detalleplanilla WHERE idplanilla = @idplanilla
                );
                DELETE FROM detalleplanilla WHERE idplanilla = @idplanilla;
            `);

        nuevoIdPlanilla = idplanilla;
    }

    return nuevoIdPlanilla;
};

// Procesa un trámite y sus subtrámites
const procesarTramite = async (idplanilla, tramite, transaction) => {
    const {
        tipo, responsable, tramite: idtramite, referencia, municipio, observacion, subtramites,
    } = tramite;

    let valor;

    if (tipo === "Metropolitano") {
        valor = await obtenerValorMetropolitano(idtramite, municipio, transaction);
    } else if (tipo === "Exterior") {
        valor = await calcularValorExterior(municipio, transaction);
    } else {
        valor = 0; // Valor por defecto para otros tipos
    }

    const result = await transaction.request()
        .input('idplanilla', sql.Int, idplanilla)
        .input('tipo', sql.Int, tipo === "Metropolitano" ? 1 : 2)
        .input('idresponsable', sql.Int, responsable)
        .input('idtramitador', sql.Int, responsable)
        .input('idtramite', sql.Int, idtramite)
        .input('referencia', sql.VarChar, referencia)
        .input('idmunicipio', sql.Int, municipio)
        .input('descripcion', sql.VarChar, observacion)
        .input('valor', sql.Decimal, valor)
        .query(`
            INSERT INTO detalleplanilla
            (idplanilla, tipo, idresponsable, idtramitador, idtramite, referencia, idmunicipio, descripcion, valor, estado)
            OUTPUT INSERTED.iddetalleplanilla
            VALUES (@idplanilla, @tipo, @idresponsable, @idtramitador, @idtramite, @referencia, @idmunicipio, @descripcion, @valor, 0)
        `);

    const iddetalleplanilla = result.recordset[0]?.iddetalleplanilla;

    if (subtramites && subtramites.length > 0) {
        await insertarSubtramites(iddetalleplanilla, subtramites, transaction);
    }
};

// Obtiene el valor del trámite metropolitano
const obtenerValorMetropolitano = async (idtramite, idmunicipio, transaction) => {
    const tipoResult = await transaction.request()
        .input('idtramite', sql.Int, idtramite)
        .query('SELECT tipo FROM tramites WHERE idtramite = @idtramite');

    const tipo = tipoResult.recordset[0]?.tipo;

    if (tipo === 2) {
        const result = await transaction.request()
            .input('idtramite', sql.Int, idtramite)
            .input('idmunicipio', sql.Int, idmunicipio)
            .query('SELECT valor FROM tarifasmunicipios WHERE idtramite = @idtramite AND idmunicipio = @idmunicipio');
        return result.recordset[0]?.valor || 0;
    } else if (tipo === 3) {
        const result = await transaction.request()
            .input('idtramite', sql.Int, idtramite)
            .query('SELECT valor FROM tarifasmunicipios WHERE idtramite = @idtramite AND idmunicipio IS NULL');
        return result.recordset[0]?.valor || 0;
    } else {
        return 0;
    }
};

// Calcula el valor del trámite exterior
const calcularValorExterior = async (municipio, transaction) => {
    const tramiteResult = await transaction.request()
        .query('SELECT idtramite FROM tramites WHERE tipo = 4');

    const idtramiteTipo4 = tramiteResult.recordset[0]?.idtramite;

    const valorResult = await transaction.request()
        .input('idtramite', sql.Int, idtramiteTipo4)
        .query('SELECT valor FROM tarifasmunicipios WHERE idtramite = @idtramite AND idmunicipio IS NULL');

    const valorPorKm = valorResult.recordset[0]?.valor || 0;

    const kmResult = await transaction.request()
        .input('idmunicipio', sql.Int, municipio)
        .query('SELECT km FROM municipios WHERE idmunicipio = @idmunicipio');

    const km = kmResult.recordset[0]?.km || 0;

    return valorPorKm * km;
};

// Inserta subtrámites
const insertarSubtramites = async (iddetalleplanilla, subtramites, transaction) => {
    for (const { idmunicipio, descripcion } of subtramites) {
        const valor = await obtenerValorSubtramite(transaction);
        await transaction.request()
            .input('iddetalleplanilla', sql.Int, iddetalleplanilla)
            .input('idmunicipio', sql.Int, idmunicipio)
            .input('descripcion', sql.VarChar, descripcion)
            .input('valor', sql.Decimal, valor)
            .query(`
                INSERT INTO subtramitesplanilla (iddetalleplanilla, idmunicipio, descripcion, valor)
                VALUES (@iddetalleplanilla, @idmunicipio, @descripcion, @valor)
            `);
    }
};

// Obtiene el valor de un subtrámite
const obtenerValorSubtramite = async (transaction) => {
    const tramiteResult = await transaction.request()
        .query('SELECT idtramite FROM tramites WHERE tipo = 1');

    const idtramiteTipo1 = tramiteResult.recordset[0]?.idtramite;

    const valorResult = await transaction.request()
        .input('idtramite', sql.Int, idtramiteTipo1)
        .query('SELECT valor FROM tarifasmunicipios WHERE idtramite = @idtramite AND idmunicipio IS NULL');

    return valorResult.recordset[0]?.valor || 0;
};

// FUNCIÓN PARA OBTENER LAS PLANILLAS POR USUARIO Y FILTRAR POR ESTADO O IDPLANILLA
const obtenerPlanillaUsuario = async (req, res = response) => {
    const { idusuario } = req.params;
    const { estado } = req.query;
    const { idplanilla } = req.query;
    
    try {
        const pool = await poolPromise;

        // Crear la consulta base para obtener las planillas filtradas por idusuario y estado
        let query = "SELECT * FROM planillas WHERE idusuario = @idusuario AND estado = @estado";
        
        // Solo incluir el filtro por idplanilla si se pasa un valor no vacío
        if (idplanilla && idplanilla !== 'null' && idplanilla !== '') {
            query += " AND idplanilla = @idplanilla";
        }

        // Preparar la consulta con los parámetros necesarios
        const request = pool.request()
            .input('idusuario', sql.Int, idusuario)
            .input('estado', sql.VarChar, estado); // Asegurarse de que el tipo de SQL coincida

        // Si idplanilla tiene un valor válido, añadir el parámetro
        if (idplanilla && idplanilla !== 'null' && idplanilla !== '') {
            request.input('idplanilla', sql.Int, idplanilla);
        }

        // Ejecutar la consulta
        const resultPlanillas = await request.query(query);

        const planillas = resultPlanillas.recordset;

        // Si no se encuentran planillas, devolver un mensaje con error 404
        if (planillas.length === 0) {
            console.warn('No se encontraron planillas para este usuario.');
            return res.status(404).json({ message: 'No se encontraron planillas para este usuario' });
        }

        // Para cada planilla obtenida, recuperar los detalles asociados
        for (const planilla of planillas) {
            const resultDetalles = await pool.request()
                .input('idplanilla', sql.Int, planilla.idplanilla)
                .query('SELECT * FROM detalleplanilla WHERE idplanilla = @idplanilla');
            
            planilla.detalles = resultDetalles.recordset;

            // Para cada detalle, obtener los subtrámites y los nombres correspondientes
            for (const detalle of planilla.detalles) {
    

                // Obtener nombre del responsable desde la tabla usuarios
                const resultUsuario = await pool.request()
                    .input('idresponsable', sql.Int, detalle.idresponsable)
                    .query('SELECT nombres, apellidos FROM usuarios WHERE idusuario = @idresponsable');
                const usuario = resultUsuario.recordset[0];
                detalle.responsableNombre = usuario ? `${usuario.nombres} ${usuario.apellidos}` : null;

                // Obtener nombre del municipio desde la tabla municipios
                const resultMunicipio = await pool.request()
                    .input('idmunicipio', sql.Int, detalle.idmunicipio)
                    .query('SELECT nombre FROM municipios WHERE idmunicipio = @idmunicipio');
                const municipio = resultMunicipio.recordset[0];
                detalle.municipioNombre = municipio ? municipio.nombre : null;

                // Obtener nombre del trámite desde la tabla tramites
                const resultTramite = await pool.request()
                    .input('idtramite', sql.Int, detalle.idtramite)
                    .query('SELECT nombre FROM tramites WHERE idtramite = @idtramite');
                const tramite = resultTramite.recordset[0];
                detalle.tramiteNombre = tramite ? tramite.nombre : null;

                // Obtener los subtrámites del detalle actual
                const resultSubtramites = await pool.request()
                    .input('iddetalleplanilla', sql.Int, detalle.iddetalleplanilla)
                    .query('SELECT * FROM subtramitesplanilla WHERE iddetalleplanilla = @iddetalleplanilla');

                detalle.subtramites = resultSubtramites.recordset;

                // Para cada subtrámite, obtener el nombre del municipio
                for (const subtramite of detalle.subtramites) {
                    const resultSubMunicipio = await pool.request()
                        .input('idmunicipio', sql.Int, subtramite.idmunicipio)
                        .query('SELECT nombre FROM municipios WHERE idmunicipio = @idmunicipio');
                    const subMunicipio = resultSubMunicipio.recordset[0];
                    subtramite.municipioNombre = subMunicipio ? subMunicipio.nombre : null;
                }
            }
        }

        // Devolver la respuesta con las planillas, detalles y subtrámites
     
        res.json({ planillas });

    } catch (error) {
        // Manejo de errores en caso de fallo en el proceso
        console.error('Error al obtener planillas:', error);
        res.status(500).json({ error: 'Error al obtener las planillas' });
    }
};




module.exports = { getMunicipios, getTramites, getResponsable, manejarPlanilla, obtenerPlanillaUsuario };
