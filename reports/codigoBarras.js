function generarCodigoBarrasBase64(texto, esDobleColumna = false) {
  return new Promise((resolve) => {
    try {
      if (!window.JsBarcode) {
        console.warn("JsBarcode no está disponible.");
        resolve(null);
        return;
      }
      const canvas = document.createElement("canvas");
      const escala = 4;
      const anchoLogico = esDobleColumna ? 120 : 185;
      const altoLogico = 28;

      canvas.width = anchoLogico * escala;
      canvas.height = altoLogico * escala;

      window.JsBarcode(canvas, texto || "S/N", {
        format: "CODE128",
        width: 2 * escala,
        height: altoLogico * escala,
        displayValue: false,
        margin: 0,
      });

      resolve(canvas.toDataURL("image/png"));
    } catch (e) {
      console.error("Error al generar código de barras:", e);
      resolve(null);
    }
  });
}

function mostrarModalSeleccionColumnas() {
  return Swal.fire({
    title: 'Seleccionar Formato',
    text: 'Elige el diseño de tus etiquetas térmicas:',
    icon: 'question',
    showDenyButton: true,
    showCancelButton: true,
    confirmButtonText: '1 Columna (7.5 x 2.5 cm)',
    denyButtonText: '2 Columnas (11 cm)',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#2563eb',
    denyButtonColor: '#059669',
    cancelButtonColor: '#64748b'
  }).then((resultado) => {
    if (resultado.isConfirmed) {
      return 1;
    } else if (resultado.isDenied) {
      return 2;
    } else {
      return null;
    }
  });
}

async function imprimirCodigoBarrasGuia(idGuia) {
  try {
    const columnasImpresora = await mostrarModalSeleccionColumnas();
    if (columnasImpresora === null) return;

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
      .select(
        `
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
          fecha,
          sucursal:sucursal_id (
            id,
            nombre
          )
        )
      `
      )
      .eq("guia_id", idGuia);

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) {
      alert("No se encontraron registros para generar etiquetas.");
      return;
    }

    const etiquetasProcesadas = [];
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const doc = item.documento || {};
      const guia = item.guia || {};
      
      const registroPlano = {
        ...doc,
        guia: guia
      };

      const codigoTexto = registroPlano.codigo_barras || registroPlano.doc_emitido || `DOC-${i}`;
      const imagenBarcode = await generarCodigoBarrasBase64(
        codigoTexto,
        columnasImpresora === 2
      );
      
      etiquetasProcesadas.push({ ...registroPlano, imagenBarcode });
    }

    let definicionPdf;
    const altoPt = 2.5 * 28.3465; 
    const anchoPt = 7.5 * 28.3465;

    if (columnasImpresora === 2) {
      // Nuevos ajustes con mayor margen de respiro en los extremos y centro
      const anchoTotalPt = 11 * 28.3465;
      const margenLateralPt = 0.5 * 28.3465; // Margen exterior de 0.5 cm a cada lado
      const anchoColumnaPt = 4.5 * 28.3465;  // Ancho de columna de 4.6 cm
      const separacionPt = 0.8 * 28.3465;    // Separación central de 0.8 cm

      const contenidoPaginas = [];

      for (let i = 0; i < etiquetasProcesadas.length; i += 2) {
        const item1 = etiquetasProcesadas[i];
        const item2 =
          i + 1 < etiquetasProcesadas.length
            ? etiquetasProcesadas[i + 1]
            : null;

        const etiqueta1 = construirBloqueEtiqueta(item1, i, etiquetasProcesadas.length, true);
        const etiqueta2 = item2
          ? construirBloqueEtiqueta(item2, i + 1, etiquetasProcesadas.length, true)
          : { text: "" };

        const tablaFila = {
          table: {
            widths: [anchoColumnaPt, separacionPt, anchoColumnaPt],
            body: [[etiqueta1, { text: "", width: separacionPt }, etiqueta2]]
          },
          layout: "noBorders"
        };

        if (i + 2 < etiquetasProcesadas.length) {
          tablaFila.pageBreak = 'after';
        }

        contenidoPaginas.push(tablaFila);
      }

      definicionPdf = {
        pageSize: { width: anchoTotalPt, height: altoPt },
        pageMargins: [margenLateralPt, 0.15 * 28.3465, margenLateralPt, 0.15 * 28.3465],
        content: contenidoPaginas,
        defaultStyle: { font: "Roboto" },
      };
    } else {
      const contenidoEtiquetas = [];

      etiquetasProcesadas.forEach((item, index) => {
        const bloque = construirBloqueEtiqueta(item, index, etiquetasProcesadas.length, false);

        if (index < etiquetasProcesadas.length - 1) {
          bloque.pageBreak = 'after';
        }

        contenidoEtiquetas.push(bloque);
      });

      definicionPdf = {
        pageSize: { width: anchoPt, height: altoPt },
        pageMargins: [0.25 * 28.3465, 0.15 * 28.3465, 0.25 * 28.3465, 0.15 * 28.3465],
        content: contenidoEtiquetas,
        defaultStyle: { font: "Roboto" },
      };
    }

    pdfMake.createPdf(definicionPdf).open();
  } catch (error) {
    console.error("❌ Error al generar etiquetas:", error);
    alert("Hubo un error al generar las etiquetas: " + error.message);
  }
}

function construirBloqueEtiqueta(doc, index, total, esDobleColumna = false) {
  const ubigeo = doc.ubigeo || {};
  const guia = doc.guia || {};
  const sucursalObj = guia.sucursal || {};
  const nombreSucursal = sucursalObj.nombre || "ADM POSTAL CUSCO";

  const docEmitido = doc.doc_emitido || "-";
  const codigoBarrasVal = doc.codigo_barras || docEmitido;
  const destinatario = doc.destinatario || "-";
  const direccion = doc.direccion || "-";

  const distrito = ubigeo.distrito || "";
  const provincia = ubigeo.provincia || "";
  const departamento = ubigeo.departamento || "";
  const ubicacionCompleta =
    [distrito, provincia, departamento].filter(Boolean).join(", ") || "-";

  let fechaFormateada = "-";
  if (guia.fecha) {
    const d = new Date(guia.fecha);
    if (!isNaN(d.getTime())) {
      fechaFormateada = d.toLocaleDateString("es-PE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    }
  }

  let pesoNum = parseFloat(doc.peso) || 0;
  let pesoTexto =
    pesoNum <= 1 && pesoNum > 0
      ? `${pesoNum.toFixed(3)} gr`
      : `${pesoNum.toFixed(3)} kgr`;

  const stackElementos = [];

  const fontSizeSucursal = esDobleColumna ? 5.5 : 7;
  const fontSizeDoc = esDobleColumna ? 5.5 : 7;
  const anchoBarcode = esDobleColumna ? 115 : 175;

  stackElementos.push({
    text: `${nombreSucursal}`,
    fontSize: fontSizeSucursal,
    bold: true,
    alignment: "center",
    color: "#000000",
    margin: [0, 0, 0, 0.5],
  });

  if (doc.imagenBarcode) {
    stackElementos.push({
      image: doc.imagenBarcode,
      width: anchoBarcode,
      alignment: "center",
      margin: [0, 0, 0, 0],
    });
  }

  stackElementos.push({
    text: `${codigoBarrasVal}`,
    fontSize: fontSizeDoc,
    alignment: "center",
    bold: true,
    color: "#000000",
    margin: [0, 0, 0, 0.5],
  });

  stackElementos.push({
    text: `DEST: ${destinatario}`,
    fontSize: esDobleColumna ? 4.5 : 6,
    bold: true,
    color: "#000000",
    margin: [0, 0, 0, 0.5],
  });

  stackElementos.push({
    text: `DIR: ${direccion} - ${ubicacionCompleta}`,
    fontSize: esDobleColumna ? 4 : 5,
    color: "#222222",
    margin: [0, 0, 0, 0.5],
  });

  stackElementos.push({
    columns: [
      {
        text: `FEC: ${fechaFormateada}`,
        fontSize: esDobleColumna ? 4 : 5,
        color: "#333333",
      },
      {
        text: `Ítem ${index + 1}/${total}`,
        fontSize: esDobleColumna ? 4 : 5,
        color: "#444444",
        alignment: "center",
      },
      {
        text: `PESO: ${pesoTexto}`,
        fontSize: esDobleColumna ? 4.5 : 6,
        bold: true,
        alignment: "right",
        color: "#990000",
      },
    ],
    margin: [0, 0, 0, 0],
  });

  return {
    stack: stackElementos,
    margin: [0, 0, 0, 0], // Eliminamos el margen externo para evitar desbordes de altura
  };
}

window.imprimirCodigoBarrasGuia = imprimirCodigoBarrasGuia;