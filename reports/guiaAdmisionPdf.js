// Función puente para disparar desde la tabla
function imprimirGuiaAdmision(idGuia) {
  console.log("Imprimiendo guía de admisión con ID:", idGuia);
  if (typeof generarReporteGuiaAdmision === "function") {
    generarReporteGuiaAdmision(idGuia);
  } else {
    alert("La función de reporte de admisión no está disponible.");
  }
}
window.imprimirGuiaAdmision = imprimirGuiaAdmision;
// Lógica principal del reporte de Admisión con Supabase
async function generarReporteGuiaAdmision(idGuia) {
  try {
    const clienteSupabase = window.supabaseClient || window.supabase || (typeof supabase !== "undefined" ? supabase : null);
    if (!clienteSupabase) {
      alert("Error: Supabase no está disponible.");
      return;
    }

    // Consulta incluyendo la hoja_ruta dentro del documento
    const { data, error } = await clienteSupabase
      .from('guia_documento')
      .select(`
        documento:documento_id (
          peso,
          doc_emitido,
          destinatario,
          direccion,
          hoja_ruta,
          ubigeo:ubigeo_id (
            departamento,
            provincia,
            distrito
          )
        ),
        guia:guia_id (
          id,
          correlativo,
          tipo,
          cantidad,
          fecha,
          sucursal:sucursal_id (nombre)
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
    const sucursalNombre = guiaInfo.sucursal?.nombre || 'CUSCO';
    const fechaGuia = guiaInfo.fecha ? guiaInfo.fecha.split('T')[0].split('-').reverse().join('/') : '';
    const correlativoGuia = guiaInfo.correlativo || '1';
    const anioActual = new Date().getFullYear();
    const tipoOperacion = (guiaInfo.tipo || 'admision').toUpperCase();

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

    const filasDetalle = data.map((item, index) => {
      const doc = item.documento || {};
      const ubigeo = doc.ubigeo || {};
      const ubicacionCompleta = [ubigeo.distrito, ubigeo.provincia, ubigeo.departamento].filter(Boolean).join(', ') || '-';
      const textoDetalle = `Doc: ${doc.doc_emitido || '-'} / Destinatario: ${doc.destinatario || '-'}\nDir: ${doc.direccion || '-'} - ${ubicacionCompleta}`;
      
      // Tomamos la hoja de ruta propia de cada documento
      const hojaRutaItem = doc.hoja_ruta || '-';
      
      let pesoNum = parseFloat(doc.peso) || 0;
      let pesoTexto = pesoNum <= 1 && pesoNum > 0 ? `${pesoNum.toFixed(3)} gr` : `${pesoNum.toFixed(3)} kgr`;

      return [
        { text: (index + 1).toString(), fontSize: 8, alignment: 'center', margin: [0, 4, 0, 4] },
        { text: hojaRutaItem, fontSize: 8, alignment: 'center', margin: [2, 4, 2, 4] },
        { text: textoDetalle, fontSize: 8, margin: [4, 4, 4, 4] },
        { text: pesoTexto, fontSize: 8, alignment: 'center', margin: [0, 4, 0, 4] }
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
                { text: 'CLIENTE: CONTRALORIA GENERAL DE LA REPUBLICA', fontSize: 9, bold: true, margin: [0, 0, 0, 2] },
                { columns: [{ text: `Sucursal: ${sucursalNombre}`, fontSize: 9, bold: true }, { text: `Fecha: ${fechaGuia}`, fontSize: 8, bold: true }], margin: [0, 2, 0, 2] },
                { columns: [{ text: `Cantidad de Ítems: ${data.length}`, fontSize: 8 }], margin: [0, 2, 0, 2] }
              ]
            },
            {
              width: 200,
              stack: [
                {
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
            }
          ]
        },
        { text: '', margin: [0, 1] },
        { text: 'DETALLE DE DOCUMENTOS', fontSize: 9, bold: true, alignment: 'center', margin: [0, 0, 0, 6] },
        {
          table: {
            headerRows: 1,
            widths: [30, 65, '*', 70],
            body: [
              [
                { text: 'ÍTEM', bold: true, fontSize: 8, alignment: 'center', fillColor: '#f0f0f0' },
                { text: 'HOJA RUTA', bold: true, fontSize: 8, alignment: 'center', fillColor: '#f0f0f0' },
                { text: 'DESCRIPCIÓN / DESTINATARIO / UBICACIÓN', bold: true, fontSize: 8, alignment: 'center', fillColor: '#f0f0f0' },
                { text: 'PESO', bold: true, fontSize: 8, alignment: 'center', fillColor: '#f0f0f0' }
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
    console.error("❌ Error al generar reporte de admisión:", error);
    alert("Hubo un error al generar el reporte: " + error.message);
  }
}
window.generarReporteGuiaAdmision = generarReporteGuiaAdmision;
