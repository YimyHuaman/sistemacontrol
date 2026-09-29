// Función puente para disparar desde la tabla
function imprimirGuiaDevolucion(idGuia) {
  console.log("Imprimiendo guía de devolución con ID:", idGuia);
  if (typeof generarReporteGuiaDevolucion === "function") {
    generarReporteGuiaDevolucion(idGuia);
  } else {
    alert("La función de reporte de devolución no está disponible.");
  }
}
window.imprimirGuiaDevolucion = imprimirGuiaDevolucion;

// Lógica principal del reporte de Devolución
async function generarReporteGuiaDevolucion(idGuia) {
  try {
    const clienteSupabase = window.supabaseClient || window.supabase || (typeof supabase !== "undefined" ? supabase : null);
    if (!clienteSupabase) {
      alert("Error: Supabase no está disponible.");
      return;
    }

    // Consulta adaptada a tu estructura SQL exacta
    const { data, error } = await clienteSupabase
      .from('guia_documento')
      .select(`
        documento:documento_id (
          peso,
          codigo_barras,
          doc_emitido,
          destinatario,
          direccion,
          fecha_entrega,
          ubigeo:ubigeo_id (
            departamento,
            provincia,
            distrito
          ),
          estado:estado_id (
            nombre_estado
          )
        ),
        guia:guia_id (
          id,
          correlativo,
          tipo,
          cantidad,
          fecha,
          sucursal:sucursal_id (
            nombre
          )
        )
      `)
      .eq('guia_id', idGuia);

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) {
      alert("No se encontraron registros para esta guía.");
      return;
    }

    const primerItem = data[0];
    const guiaInfo = primerItem.guia || {};
    
    const nombreSucursal = guiaInfo.sucursal?.nombre || 'CUSCO';
    const fechaGuia = guiaInfo.fecha ? guiaInfo.fecha.split('T')[0].split('-').reverse().join('/') : '';
    const correlativoGuia = guiaInfo.correlativo || '1';
    const anioActual = new Date().getFullYear();
    const tipoOperacion = (guiaInfo.tipo || 'devolucion').toUpperCase();

    // Función auxiliar para cargar el logo en Base64
    async function obtenerImagenBase64(url) {
      try {
        const respuesta = await fetch(url);
        const blob = await respuesta.blob();
        return new Promise((resolve) => {
          const lector = new FileReader();
          lector.onloadend = () => resolve(lector.result);
          lector.readAsDataURL(blob);
        });
      } catch (e) {
        return null;
      }
    }

    const imagenLogoBase64 = await obtenerImagenBase64('resources/images.png');

    // Mapeo de filas transformando la fecha a formato DD-MM-YYYY
    const filasDetalle = data.map((item, index) => {
      const doc = item.documento || {};
      const ubigeo = doc.ubigeo || {};
      const estado = doc.estado || {};
      
      const ubicacionCompleta = [ubigeo.distrito, ubigeo.provincia, ubigeo.departamento].filter(Boolean).join(', ') || '-';
      
      // Formateo de fecha de entrega a DD-MM-YYYY
      let fechaFormateada = '-';
      if (doc.fecha_entrega) {
        const partesFecha = doc.fecha_entrega.split('T')[0].split('-');
        if (partesFecha.length === 3) {
          fechaFormateada = `${partesFecha[2]}-${partesFecha[1]}-${partesFecha[0]}`;
        }
      }

      const nombreEstado = estado.nombre_estado || '-';
      const codigoBarras = doc.codigo_barras || '-';

      let pesoNum = parseFloat(doc.peso) || 0;
      let pesoTexto = pesoNum <= 1 && pesoNum > 0 ? `${pesoNum.toFixed(3)} gr` : `${pesoNum.toFixed(3)} kgr`;

      const textoDescripcion = `Doc: ${doc.doc_emitido || '-'}\nDestinatario: ${doc.destinatario || '-'}\nDir: ${doc.direccion || '-'} - ${ubicacionCompleta}`;

      return [
        { text: (index + 1).toString(), fontSize: 8, alignment: 'center', margin: [0, 4, 0, 4] },
        { text: codigoBarras, fontSize: 8, alignment: 'center', margin: [2, 4, 2, 4] },
        { text: textoDescripcion, fontSize: 8, margin: [4, 4, 4, 4] },
        { text: pesoTexto, fontSize: 8, alignment: 'center', margin: [0, 4, 0, 4] },
        { text: fechaFormateada, fontSize: 8, alignment: 'center', margin: [0, 4, 0, 4] }, // Fecha en DD-MM-YYYY
        { text: nombreEstado, fontSize: 8, alignment: 'center', margin: [0, 4, 0, 4] }
      ];
    });

    const definicionPdf = {
      pageOrientation: 'portrait',
      pageSize: 'A4',
      pageMargins: [30, 30, 30, 30],
      content: [
        {
          columns: [
            {
              width: '*',
              stack: [
                imagenLogoBase64 ? { image: imagenLogoBase64, width: 130, margin: [0, 0, 0, 4] } : { text: 'Serpost', fontSize: 20, bold: true },
                { columns: [{ text: `Sucursal: ${nombreSucursal}`, fontSize: 9, bold: true }, { text: `Fecha: ${fechaGuia}`, fontSize: 8, bold: true }], margin: [0, 2, 0, 2] },
                // Se removió la línea "Tipo: DEVOLUCION" de aquí para evitar duplicidad
                { columns: [{ text: `Cantidad de Ítems: ${data.length}`, fontSize: 8, bold: true }, { text: '', fontSize: 8 }] },
                { text: '', margin: [0, 2, 0, 2] }
              ]
            },
            {
              width: 200,
              table: {
                widths: ['*'],
                body: [[{
                  text: [
                    { text: 'R.U.C. 20256136865\n', fontSize: 9, bold: true },
                    { text: `GUÍA DE ${tipoOperacion}\n`, fontSize: 11, bold: true, color: '#990000' },
                    { text: `SERIE ${anioActual}    Nº ${correlativoGuia}`, fontSize: 10, bold: true }
                  ],
                  alignment: 'center',
                  margin: [5, 5, 5, 5]
                }]]
              }
            }
          ]
        },
        { text: '', margin: [0, 1] },
        { text: 'DETALLE DE DOCUMENTOS - DEVOLUCIÓN', fontSize: 9, bold: true, alignment: 'center', margin: [0, 0, 0, 6] },
        {
          table: {
            headerRows: 1,
            widths: [25, 75, '*', 50, 60, 60],
            body: [
              [
                { text: 'ÍTEM', bold: true, fontSize: 8, alignment: 'center', fillColor: '#f0f0f0' },
                { text: 'CÓD. BARRAS', bold: true, fontSize: 8, alignment: 'center', fillColor: '#f0f0f0' },
                { text: 'DESCRIPCIÓN / DESTINATARIO / UBICACIÓN', bold: true, fontSize: 8, alignment: 'center', fillColor: '#f0f0f0' },
                { text: 'PESO', bold: true, fontSize: 8, alignment: 'center', fillColor: '#f0f0f0' },
                { text: 'FECHA', bold: true, fontSize: 8, alignment: 'center', fillColor: '#f0f0f0' }, // Cambiado a FECHA
                { text: 'ESTADO', bold: true, fontSize: 8, alignment: 'center', fillColor: '#f0f0f0' }
              ],
              ...filasDetalle
            ]
          }
        }
      ],
      defaultStyle: { font: 'Roboto' }
    };

    pdfMake.createPdf(definicionPdf).open();
  } catch (error) {
    console.error("❌ Error al generar reporte de devolución:", error);
    alert("Hubo un error al generar el reporte de devolución: " + error.message);
  }
}
window.generarReporteGuiaDevolucion = generarReporteGuiaDevolucion;