const { poolPromisePrevision, poolPromiseRecaudo, sql } = require("../../models/conexion");

const generarNomina = async (req, res) => {
    try {
        const { fechaDesde, fechaHasta } = req.body;
        const pool = await poolPromisePrevision;

        const dependenciasResult = await pool.request().query(`
            SELECT Dependencia
            FROM [FusionPrevision].[dbo].[Dependencias]
            WHERE GrupoRecaudo = 'DOMICILIARIO'
        `);
        const dependencias = dependenciasResult.recordset.map(row => row.Dependencia);

        const cobrosQuery = `
            SELECT *
            FROM (
                SELECT 
                    f.Vendedor,
                    CONVERT(DATE, f.Fecha) AS FechaDia,
                    f.DocReferencia,
                    f.Factura,
                    f.Dependencia,
                    f.TotalFactura,
                    df.Cantidad,
                    ROW_NUMBER() OVER (
                        PARTITION BY f.Vendedor, CONVERT(DATE, f.Fecha), f.DocReferencia
                        ORDER BY f.TotalFactura DESC
                    ) AS rn
                FROM [FusionPrevision].[dbo].[Facturas] f
                LEFT JOIN [FusionPrevision].[dbo].[DetallesFacturas] df
                    ON f.Factura = df.Factura 
                    AND f.Dependencia = df.Dependencia 
                    AND f.Resolucion = df.Resolucion
                WHERE CONVERT(DATE, f.Fecha) BETWEEN @FechaInicio AND @FechaFin
                    AND f.Resolucion = '1'
                    AND f.Estado = '01'
                    AND f.Dependencia IN (${dependencias.map((_, i) => `@dep${i}`).join(', ')})
            ) AS CobrosUnicos
            WHERE rn = 1;
        `;

        const request = pool.request();
        request.input('FechaInicio', sql.Date, fechaDesde);
        request.input('FechaFin', sql.Date, fechaHasta);
        dependencias.forEach((dep, i) => request.input(`dep${i}`, sql.VarChar, dep));
        const cobrosUnicos = (await request.query(cobrosQuery)).recordset;

        function dividirEnChunks(array, size) {
            const chunks = [];
            for (let i = 0; i < array.length; i += size) {
                chunks.push(array.slice(i, i + size));
            }
            return chunks;
        }

        const contratosUnicos = [...new Set(cobrosUnicos.map(r => r.DocReferencia?.trim()).filter(Boolean))];
        let contratoRows = [];

        for (const chunk of dividirEnChunks(contratosUnicos, 500)) {
            const chunkReq = pool.request();
            chunk.forEach((c, i) => chunkReq.input(`contrato${i}`, sql.VarChar, c));
            const query = `
                SELECT c.Contrato, c.PlanCubrimiento, pc.Mascotas
                FROM [FusionPrevision].[dbo].[Contratos] c
                LEFT JOIN [FusionPrevision].[dbo].[PlanesCubrimiento] pc ON c.PlanCubrimiento = pc.PlanCubrimiento
                WHERE c.Contrato IN (${chunk.map((_, i) => `@contrato${i}`).join(', ')});
            `;
            contratoRows = contratoRows.concat((await chunkReq.query(query)).recordset);
        }

        const contratoToTipo = Object.fromEntries(
            contratoRows.map(r => [r.Contrato?.trim(), r.Mascotas ? 'Mascota' : 'Humano'])
        );

        const cobrosEnriquecidos = cobrosUnicos.map(row => {
            const tipo = contratoToTipo[row.DocReferencia?.trim()] || 'Desconocido';
            const cuotas = parseInt(row.Cantidad) || 0;
            return {
                ...row,
                TipoContrato: tipo,
                Anualidades: Math.floor(cuotas / 12)
            };
        });

        const resumenPorVendedor = {};
        for (const c of cobrosEnriquecidos) {
            const v = c.Vendedor;
            if (!resumenPorVendedor[v]) resumenPorVendedor[v] = {
                Vendedor: v, CantidadCobrosHumano: 0, CantidadCobrosMascota: 0, AnualidadesHumano: 0, AnualidadesMascota: 0
            };
            if (c.TipoContrato === 'Humano') {
                resumenPorVendedor[v].CantidadCobrosHumano++;
                resumenPorVendedor[v].AnualidadesHumano += c.Anualidades;
            } else if (c.TipoContrato === 'Mascota') {
                resumenPorVendedor[v].CantidadCobrosMascota++;
                resumenPorVendedor[v].AnualidadesMascota += c.Anualidades;
            }
        }

        // === SEGUROS ===
        const segurosVendedores = [...new Set(cobrosUnicos.map(r => r.Vendedor?.trim()).filter(Boolean))];
        let segurosRows = [];

        for (const chunk of dividirEnChunks(segurosVendedores, 500)) {
            const r = pool.request();
            r.input('FechaInicio', sql.Date, fechaDesde);
            r.input('FechaFin', sql.Date, fechaHasta);
            chunk.forEach((v, i) => r.input(`vendedor${i}`, sql.VarChar, v));
            const q = `
                SELECT rs.Recaudador AS Vendedor, rs.Fecha
                FROM [FusionPrevision].[dbo].[RecaudoSeguros] rs
                WHERE rs.Estado = '01' AND CONVERT(DATE, rs.Fecha) BETWEEN @FechaInicio AND @FechaFin
                AND rs.Recaudador IN (${chunk.map((_, i) => `@vendedor${i}`).join(', ')});
            `;
            segurosRows = segurosRows.concat((await r.query(q)).recordset);
        }

        const resumenSeguros = {};
        for (const s of segurosRows) {
            const v = s.Vendedor?.trim();
            if (!resumenSeguros[v]) resumenSeguros[v] = { CobrosSeguros: 0 };
            resumenSeguros[v].CobrosSeguros++;
        }

        for (const v in resumenPorVendedor) {
            resumenPorVendedor[v].CobrosSeguros = resumenSeguros[v]?.CobrosSeguros || 0;
        }

        // === TARIFAS ===
        const pagosResult = await pool.request()
            .input('codigoRecaudador', sql.VarChar, '002')
            .input('codigoAsesor', sql.VarChar, '001')
            .query(`
                SELECT PagoRecaudadorMesPersona, PagoRecaudadorMesMascota,
                       PagoRecaudadorAnualidadPersona, PagoRecaudadoranualidadMascota
                FROM [FusionPrevision].[dbo].[Empresas]
                WHERE CodigoRecaudadores = @codigoRecaudador AND CodigoAsesores = @codigoAsesor
            `);
        const pagos = pagosResult.recordset[0];
        if (!pagos) return res.status(404).json({ message: "No se encontraron tarifas de pago" });
        
        // === GESTIONES ===
        const poolGestiones = await poolPromiseRecaudo;
        const cedulas = Object.values(resumenPorVendedor).map(r => r.Vendedor?.trim()).filter(Boolean);
        let gestiones = {};

        for (const chunk of dividirEnChunks(cedulas, 500)) {
            const r = poolGestiones.request();
            r.input('FechaInicio', sql.Date, fechaDesde);
            r.input('FechaFin', sql.Date, fechaHasta);
            chunk.forEach((ced, i) => r.input(`cedula${i}`, sql.VarChar, ced));

            const q = `
                    SELECT pt.cedula, t.nombre, t.recargo, t.base
                    FROM [recaudo].[dbo].[planillatramites] pt
                    JOIN [recaudo].[dbo].[tramite] t ON pt.idtramite = t.idtramite
                    WHERE pt.estado = '01'
                    AND CONVERT(DATE, pt.fecha) BETWEEN @FechaInicio AND @FechaFin
                    AND pt.cedula IN (${chunk.map((_, i) => `@cedula${i}`).join(', ')})
                `;

            const rows = (await r.query(q)).recordset;

            for (const { cedula, nombre, recargo, base } of rows) {
                if (!gestiones[cedula]) gestiones[cedula] = {};
                if (!gestiones[cedula][nombre]) {
                    gestiones[cedula][nombre] = {
                        cantidad: 0,
                        recargo: parseFloat(recargo || 0),
                        base: base === true || base === 1 || base === '1' // asegúrate de convertir a booleano real
                    };
                }
                gestiones[cedula][nombre].cantidad++;
            }
        }

        // === NOMBRES DE RECAUDADORES ===
        const poolRecaudo = await poolPromiseRecaudo;
        let nombresRecaudadores = {};

        for (const chunk of dividirEnChunks(cedulas, 500)) {
            const req = poolRecaudo.request();
            chunk.forEach((ced, i) => req.input(`cedula${i}`, sql.VarChar, ced));
            const query = `
                    SELECT cedula, nombre
                    FROM [recaudo].[dbo].[recaudador]
                    WHERE cedula IN (${chunk.map((_, i) => `@cedula${i}`).join(', ')});
                `;
            const rows = (await req.query(query)).recordset;
            for (const { cedula, nombre } of rows) {
                nombresRecaudadores[cedula?.toString()] = nombre;
            }
        }


        // === CONSTRUIR REPORTE FINAL ===

        // Paso previo: extraer todos los nombres de gestiones posibles
        const todosLosNombresGestiones = new Set();

        for (const gestionesVendedor of Object.values(gestiones)) {
            for (const nombreTramite of Object.keys(gestionesVendedor)) {
                todosLosNombresGestiones.add(nombreTramite);
            }
        }

        // Convertir a array para iteración
        const listaGestiones = Array.from(todosLosNombresGestiones);

        const resumenFinal = Object.values(resumenPorVendedor).map(r => {
            const {
                Vendedor, CantidadCobrosHumano, CantidadCobrosMascota,
                AnualidadesHumano, AnualidadesMascota
            } = r;

            const CobroSeguro = r.CobrosSeguros || 0;

            const PagoMesHumanos = CantidadCobrosHumano * pagos.PagoRecaudadorMesPersona;
            const PagoMesMascotas = CantidadCobrosMascota * pagos.PagoRecaudadorMesMascota;
            const PagoAnualidadHumanos = AnualidadesHumano * pagos.PagoRecaudadorAnualidadPersona;
            const PagoAnualidadMascotas = AnualidadesMascota * pagos.PagoRecaudadoranualidadMascota;
            const PagoMesSeguro = CobroSeguro * 153;

            const detalleGestiones = {};
            const gestionesVendedor = gestiones[Vendedor] || {};

            for (const nombreTramite of listaGestiones) {
                const datos = gestionesVendedor[nombreTramite];
                const cantidad = datos?.cantidad || 0;
                const recargo = datos?.recargo || 0;
                const baseIncluida = datos?.base ? pagos.PagoRecaudadorMesPersona : 0;

                detalleGestiones[nombreTramite] = cantidad;
                detalleGestiones[`Pago${nombreTramite.replace(/\s+/g, '')}`] = cantidad * (recargo + baseIncluida);
            }

            const nombre = nombresRecaudadores[Vendedor?.toString()] || null;

            return {
                Vendedor,
                Nombre: nombre,
                CantidadCobrosHumano,
                PagoMesHumanos,
                CantidadCobrosMascota,
                PagoMesMascotas,
                AnualidadesHumano,
                PagoAnualidadHumanos,
                AnualidadesMascota,
                PagoAnualidadMascotas,
                CobroSeguro,
                PagoMesSeguro,
                ...detalleGestiones
            };
        });



        res.status(200).json({ resumen: resumenFinal });

    } catch (error) {
        console.error("Error al generar la nómina:", error);
        res.status(500).json({ message: "Error al generar la nómina." });
    }
};

module.exports = { generarNomina };
