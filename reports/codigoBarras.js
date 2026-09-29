// Archivo: reports/codigoBarras.js

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
  return new Promise((resolve) => {
    const modalExistente = document.getElementById("modal-columnas-impresora");
    if (modalExistente) modalExistente.remove();

    const overlay = document.createElement("div");
    overlay.id = "modal-columnas-impresora";
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(15, 23, 42, 0.55); backdrop-filter: blur(4px);
      display: flex; justify-content: center; align-items: center; z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;

    const caja = document.createElement("div");
    caja.style.cssText = `
      background: #ffffff; padding: 28px 32px; border-radius: 16px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      text-align: center; max-width: 360px; width: 90%;
    `;

    caja.innerHTML = `
      <div style="width: 50px; height: 50px; background: #e0f2fe; color: #0284c7; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px auto; font-size: 22px;">🏷️</div>
      <h3 style="margin: 0 0 6px 0; color: #0f172a; font-size: 18px; font-weight: 700;">Seleccionar Formato</h3>
      <p style="color: #64748b; font-size: 13px; margin: 0 0 22px 0; line-height: 1.4;">Elige el diseño de tus etiquetas térmicas:</p>
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <button id="btn-col-1" style="width: 100%; padding: 12px; background: #2563eb; color: white; border: none; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer;">1 Columna (7.5 x 2.5 cm)</button>
        <button id="btn-col-2" style="width: 100%; padding: 12px; background: #059669; color: white; border: none; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer;">2 Columnas (11cm total: 5cm c/u)</button>
      </div>
      <button id="btn-col-cancelar" style="margin-top: 16px; background: transparent; border: none; color: #94a3b8; cursor: pointer; font-size: 12px; font-weight: 500;">Cancelar</button>
    `;

    overlay.appendChild(caja);
    document.body.appendChild(overlay);

    document.getElementById("btn-col-1").onclick = () => {
      overlay.remove();
      resolve(1);
    };
    document.getElementById("btn-col-2").onclick = () => {
      overlay.remove();
      resolve(2);
    };
    document.getElementById("btn-col-cancelar").onclick = () => {
      overlay.remove();
      resolve(null);
    };
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
      .from("documento")
      .select(
        `
        peso,
        doc_emitido,
        destinatario,
        direccion,
        codigo_barras,
        guia:guia_id (
          id,
          fecha,
          sucursal:sucursal_id (
            nombre
          )
        ),
        ubigeo:ubigeo_id (
          departamento,
          provincia,
          distrito
        )
      `,
      )
      .eq("guia_id", idGuia);

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) {
      alert("No se encontraron registros para generar etiquetas.");
      return;
    }

    const etiquetasProcesadas = [];
    for (let i = 0; i < data.length; i++) {
      const doc = data[i];
      const codigoTexto = doc.codigo_barras || doc.doc_emitido || `DOC-${i}`;
      const imagenBarcode = await generarCodigoBarrasBase64(
        codigoTexto,
        columnasImpresora === 2,
      );
      etiquetasProcesadas.push({ ...doc, imagenBarcode });
    }

    let definicionPdf;
    const altoPt = 2.5 * 28.3465; // Alto físico estricto: 2.5 cm

    if (columnasImpresora === 2) {
      // Configuramos el ancho total a 11 cm exactos
      const anchoTotalPt = 11 * 28.3465;
      const altoPt = 2.5 * 28.3465;

      // Margen izquierdo y derecho de la hoja de 0.5 cm cada uno
      const margenLateralPt = 0.5 * 28.3465;

      // Espacio útil restante: 10 cm (dividido en Columna 1: 4.75cm, Separación: 0.5cm, Columna 2: 4.75cm para calzar perfecto)
      const anchoColumnaPt = 4.75 * 28.3465;
      const separacionPt = 0.5 * 28.3465;

      const filasTabla = [];

      for (let i = 0; i < etiquetasProcesadas.length; i += 2) {
        const item1 = etiquetasProcesadas[i];
        const item2 =
          i + 1 < etiquetasProcesadas.length
            ? etiquetasProcesadas[i + 1]
            : null;

        const etiqueta1 = construirBloqueEtiqueta(
          item1,
          i,
          etiquetasProcesadas.length,
          true,
        );
        const etiqueta2 = item2
          ? construirBloqueEtiqueta(
              item2,
              i + 1,
              etiquetasProcesadas.length,
              true,
            )
          : { text: "" };

        filasTabla.push([
          etiqueta1,
          { text: "", width: separacionPt },
          etiqueta2,
        ]);

        if (i + 2 < etiquetasProcesadas.length) {
          filasTabla.push([
            { text: "", pageBreak: "after" },
            { text: "" },
            { text: "" },
          ]);
        }
      }

      definicionPdf = {
        pageSize: { width: anchoTotalPt, height: altoPt },
        pageMargins: [margenLateralPt, 0, margenLateralPt, 0], // Margenes reales de 0.5 cm en los bordes de la impresora
        content: [
          {
            table: {
              widths: [anchoColumnaPt, separacionPt, anchoColumnaPt],
              body: filasTabla,
            },
            layout: "noBorders",
          },
        ],
        defaultStyle: { font: "Roboto" },
      };
    } else {
      const anchoPt = 7.5 * 28.3465; // 1 columna (7.5 cm)
      const contenidoEtiquetas = [];

      etiquetasProcesadas.forEach((item, index) => {
        contenidoEtiquetas.push(
          construirBloqueEtiqueta(
            item,
            index,
            etiquetasProcesadas.length,
            false,
          ),
        );

        if (index < etiquetasProcesadas.length - 1) {
          contenidoEtiquetas.push({ text: "", pageBreak: "after" });
        }
      });

      definicionPdf = {
        pageSize: { width: anchoPt, height: altoPt },
        pageMargins: [0, 0, 0, 0],
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

  const fontSizeSucursal = esDobleColumna ? 6 : 7.5;
  const fontSizeDoc = esDobleColumna ? 6 : 7.5;
  const anchoBarcode = esDobleColumna ? 125 : 190;

  stackElementos.push({
    text: `${nombreSucursal}`,
    fontSize: fontSizeSucursal,
    bold: true,
    alignment: "center",
    color: "#000000",
    margin: [0, 1, 0, 1],
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
    margin: [0, 0, 0, 1],
  });

  stackElementos.push({
    text: `DEST: ${destinatario}`,
    fontSize: esDobleColumna ? 5 : 6.5,
    bold: true,
    color: "#000000",
    margin: [0, 0, 0, 0.5],
  });

  stackElementos.push({
    text: `DIR: ${direccion} - ${ubicacionCompleta}`,
    fontSize: esDobleColumna ? 4.2 : 5.5,
    color: "#222222",
    margin: [0, 0, 0, 1.5],
  });

  stackElementos.push({
    columns: [
      {
        text: `FEC: ${fechaFormateada}`,
        fontSize: esDobleColumna ? 4.2 : 5.5,
        color: "#333333",
      },
      {
        text: `Ítem ${index + 1}/${total}`,
        fontSize: esDobleColumna ? 4.2 : 5.5,
        color: "#444444",
        alignment: "center",
      },
      {
        text: `PESO: ${pesoTexto}`,
        fontSize: esDobleColumna ? 5 : 6.5,
        bold: true,
        alignment: "right",
        color: "#990000",
      },
    ],
    margin: [0, 0, 0, 0],
  });

  return {
    stack: stackElementos,
    margin: [2, 1, 2, 1],
  };
}

window.imprimirCodigoBarrasGuia = imprimirCodigoBarrasGuia;
