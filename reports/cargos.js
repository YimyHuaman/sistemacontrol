async function imprimirCargoGuia(idGuia) {
  try {
    const clienteSupabase =
      window.supabaseClient ||
      window.supabase ||
      (typeof supabase !== "undefined" ? supabase : null);
    if (!clienteSupabase) {
      alert("Error: Supabase no está disponible.");
      return;
    }

    const { data, error } = await clienteSupabase
      .from("guia_documento")
      .select(`
        documento:documento_id (
          id,
          peso,
          doc_emitido,
          destinatario,
          direccion,
          codigo_barras,
          ubigeo:ubigeo_id (
            departamento,
            provincia,
            distrito
          )
        ),
        guia:guia_id (
          id,
          correlativo,
          fecha,
          sucursal:sucursal_id (
            id,
            nombre
          )
        )
      `)
      .eq("guia_id", idGuia);

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) {
      alert("No se encontraron registros para generar los cargos.");
      return;
    }

    const cargosProcesados = [];
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const doc = item.documento || {};
      const guia = item.guia || {};
      const sucursal = guia.sucursal || {};
      
      const codigoTexto = doc.codigo_barras || doc.doc_emitido || `DOC-${i}`;
      const imagenBarcode = await generarCodigoBarrasBase64(codigoTexto, false);
      
      cargosProcesados.push({
        correlativoGuia: guia.correlativo || "S/N",
        fechaGuia: guia.fecha ? new Date(guia.fecha).toLocaleDateString() : "",
        correlativoDoc: doc.doc_emitido || codigoTexto,
        destinatario: doc.destinatario || "SIN DESTINATARIO",
        direccion: doc.direccion || "SIN DIRECCIÓN",
        nombreSucursal: sucursal.nombre ? sucursal.nombre.toUpperCase() : "GENERAL",
        imagenBarcode: imagenBarcode,
        itemNum: `${i + 1}/${data.length}`
      });
    }

    const construirBloqueCargo = (cargo) => {
      return {
        table: {
          widths: [260], // Ancho seguro para la celda individual
          heights: [385], // Altura estricta para ocupar uniformemente la mitad vertical de la hoja
          body: [
            [
              {
                border: [true, true, true, true],
                margin: [4, 4, 4, 4],
                stack: [
                  // Cabecera: Correlativo, Fecha y Devolver a
                  {
                    columns: [
                      { text: `R${cargo.correlativoGuia}`, bold: true, fontSize: 9.5, width: 45 },
                      { text: cargo.fechaGuia, fontSize: 8, alignment: 'center', width: 65 },
                      { 
                        text: [
                          { text: 'Devol.: ', fontSize: 5.5 }, 
                          { text: `ADM. - ${cargo.nombreSucursal}`, bold: true, fontSize: 6 }
                        ], 
                        alignment: 'right',
                        width: '*' 
                      }
                    ]
                  },
                  { canvas: [{ type: 'line', x1: 0, y1: 2.5, x2: 248, y2: 2.5, lineWidth: 0.5 }] },
                  { text: '', margin: [0, 2] },

                  // Código de barras, texto numérico e Ítem
                  {
                    columns: [
                      {
                        stack: [
                          cargo.imagenBarcode ? { image: cargo.imagenBarcode, fit: [155, 25], alignment: 'center' } : { text: '[Código de barras]', fontSize: 8 },
                          { text: cargo.correlativoDoc, fontSize: 9, alignment: 'center', bold: true, margin: [0, 1, 0, 0] }
                        ],
                        width: '*'
                      },
                      { text: cargo.itemNum, fontSize: 8.5, bold: true, alignment: 'right', width: 28 }
                    ]
                  },

                  // Destinatario y Dirección
                  { text: cargo.destinatario, fontSize: 8.5, bold: true, margin: [0, 2, 0, 0] },
                  { text: cargo.direccion, fontSize: 7, margin: [0, 1, 0, 4] },

                  // Cuadro de motivos, visitas y referencias
                  {
                    table: {
                      widths: [90, 68, 90],
                      body: [
                        [
                          {
                            stack: [
                              { text: 'MOTIVO', bold: true, fontSize: 5.5 },
                              { text: '01 Dirección Errada', fontSize: 5 },
                              { text: '02 Rechazado', fontSize: 5 },
                              { text: '03 Ausente', fontSize: 5 },
                              { text: '04 Se mudó', fontSize: 5 },
                              { text: '05 Desconocido', fontSize: 5 }
                            ],
                            border: [true, true, true, true],
                            margin: [2, 2, 2, 2]
                          },
                          {
                            stack: [
                              { text: 'VISITAS', bold: true, fontSize: 5.5 },
                              { text: '1ra ___/___/___', fontSize: 5, margin: [0, 2] },
                              { text: '2da ___/___/___', fontSize: 5, margin: [0, 2] },
                              { text: 'F.ENT: ___/___ H/___', fontSize: 4.5, margin: [0, 3, 0, 0] }
                            ],
                            border: [true, true, true, true],
                            margin: [2, 2, 2, 2]
                          },
                          {
                            stack: [
                              { text: 'REFERENCIAS', bold: true, fontSize: 5.5 },
                              { text: 'Color Fachada: _________', fontSize: 4.5 },
                              { text: 'N° de Pisos: ___________', fontSize: 4.5 },
                              { text: 'Suminis. Elec.: _________', fontSize: 4.5 }
                            ],
                            border: [true, true, true, true],
                            margin: [2, 2, 2, 2]
                          }
                        ]
                      ]
                    },
                    layout: 'lightHorizontalLines',
                    margin: [0, 2, 0, 3]
                  },

                  // Bloque inferior: Datos del mensajero y Recibí Conforme (con amplio espacio para firma)
                  {
                    table: {
                      widths: [90, 158],
                      body: [
                        [
                          {
                            stack: [
                              { text: 'DATOS MENSAJERO', bold: true, fontSize: 5.5, alignment: 'center' },
                              { text: '(Sello, Código y Firma)', fontSize: 4.5, alignment: 'center', margin: [0, 22, 0, 0] }
                            ],
                            border: [true, true, true, true],
                            margin: [2, 2, 2, 2]
                          },
                          {
                            stack: [
                              { text: 'RECIBI CONFORME:', bold: true, fontSize: 5.5 },
                              { text: 'D.N.I.: ________________________', fontSize: 5.5 },
                              { text: '1. Titular [  ]    2. Familiar [  ]\n3. Empleado(a) [  ]    4. Vigilante/Portero [  ]', fontSize: 5, margin: [0, 3] },
                              {
                                columns: [
                                  { text: `SEN R${cargo.correlativoGuia}`, bold: true, fontSize: 7.5 },
                                  { text: 'Firma y Sello', fontSize: 5.5, alignment: 'right' }
                                ],
                                margin: [0, 12, 0, 2]
                              }
                            ],
                            border: [true, true, true, true],
                            margin: [2, 2, 2, 2]
                          }
                        ]
                      ]
                    },
                    layout: 'lightHorizontalLines'
                  }
                ]
              }
            ]
          ]
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#666',
          vLineColor: () => '#666'
        },
        margin: [2, 2, 2, 2]
      };
    };

    const contenidoA4 = [];
    let filasDePaginaActual = [];

    // Agrupación estricta de 4 en 4 por página (diseño 2x2)
    for (let i = 0; i < cargosProcesados.length; i += 4) {
      const loteCuatro = cargosProcesados.slice(i, i + 4);
      
      const fila1Izq = construirBloqueCargo(loteCuatro[0]);
      const fila1Der = loteCuatro[1] ? construirBloqueCargo(loteCuatro[1]) : { text: '', border: [false,false,false,false] };
      
      filasDePaginaActual.push({
        table: {
          widths: [260, 260],
          body: [[fila1Izq, fila1Der]]
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 2]
      });

      if (loteCuatro.length > 2) {
        const fila2Izq = construirBloqueCargo(loteCuatro[2]);
        const fila2Der = loteCuatro[3] ? construirBloqueCargo(loteCuatro[3]) : { text: '', border: [false,false,false,false] };
        
        filasDePaginaActual.push({
          table: {
            widths: [260, 260],
            body: [[fila2Izq, fila2Der]]
          },
          layout: 'noBorders',
          margin: [0, 0, 0, 0]
        });
      }

      // Si hay un 5to o más elementos, realiza un salto de página automático obligatorio
      if (i + 4 < cargosProcesados.length) {
        filasDePaginaActual.push({ text: '', pageBreak: 'after' });
      }
    }

    contenidoA4.push(...filasDePaginaActual);

    const definicionPdf = {
      pageSize: 'A4',
      pageMargins: [18, 18, 18, 18], // Márgenes perimetrales perfectamente equilibrados
      content: contenidoA4,
      defaultStyle: { font: 'Roboto' }
    };

    pdfMake.createPdf(definicionPdf).open();
  } catch (error) {
    console.error("❌ Error al generar los cargos:", error);
    alert("Hubo un error al generar los cargos: " + error.message);
  }
}