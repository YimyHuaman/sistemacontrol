// ==========================================
// 1. LISTAR ESTADOS Y CREAR LOS CHECKBOXES
// ==========================================
window.listarMotivoDescarga = async function () {
  const contenedores = document.querySelectorAll(
    "#contenedor-checks-estados, .contenedor-checks-estados",
  );

  if (contenedores.length === 0) return;

  try {
    const { data: estados, error } = await window.supabaseClient
      .from("estado")
      .select("*");

    if (error) throw new Error(error.message);

    let checkboxesHtml = "";

    if (estados && estados.length > 0) {
      estados.forEach((estado) => {
        const nombreEstado = (estado.nombre_estado || "").trim().toUpperCase();

        if (nombreEstado) {
          checkboxesHtml += `
            <label class="inline-flex items-center gap-1.5 text-[11px] text-slate-700 cursor-pointer select-none hover:text-blue-600 transition-colors">
              <input type="checkbox" name="filtro-estado" value="${nombreEstado}" class="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3 h-3 cursor-pointer">
              ${nombreEstado}
            </label>
          `;
        }
      });
    } else {
      checkboxesHtml =
        '<span class="text-[11px] text-slate-400 italic">No hay estados disponibles</span>';
    }

    contenedores.forEach((contenedor) => {
      contenedor.innerHTML = checkboxesHtml;
    });

    console.log("✅ Checkboxes de Estado listados correctamente.");
  } catch (error) {
    console.error("❌ Error al listar los estados:", error);
  }
};

window.listarTipoServicio = async function () {
  const contenedores = document.querySelectorAll(
    "#contenedor-checks-servicios, .contenedor-checks-servicios",
  );

  if (contenedores.length === 0) return;

  try {
    // 🔍 CORREGIDO: Consultamos la tabla 'tipo_servicio'
    const { data: servicios, error } = await window.supabaseClient
      .from("tipo_servicio")
      .select("*");

    if (error) throw new Error(error.message);

    let checkboxesHtml = "";

    // 🔍 CORREGIDO: Validamos correctamente la variable 'servicios'
    if (servicios && servicios.length > 0) {
      servicios.forEach((item) => {
        const codigoServicio = (item.codigo || item.nombre || "")
          .trim()
          .toUpperCase();

        if (codigoServicio) {
          checkboxesHtml += `
  <label class="inline-flex items-center gap-1.5 text-[11px] text-slate-700 cursor-pointer select-none hover:text-blue-600 transition-colors">
    <input type="checkbox" name="filtro-servicio" value="${codigoServicio}" onchange="filtrarPorEstadoLocal()" class="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3 h-3 cursor-pointer">
    ${codigoServicio}
  </label>
`;
        }
      });
    } else {
      checkboxesHtml =
        '<span class="text-[11px] text-slate-400 italic">No hay servicios disponibles</span>';
    }

    contenedores.forEach((contenedor) => {
      contenedor.innerHTML = checkboxesHtml;
    });

    console.log("✅ Checkboxes de Servicios listados correctamente.");
  } catch (error) {
    console.error("❌ Error al listar los servicios:", error);
  }
};

// ==========================================
// 2. FILTRAR LOCALMENTE SEGÚN LOS CHECKBOXES SELECCIONADOS
// ==========================================
window.filtrarPorEstadoLocal = function () {
  // 1. Obtener estados seleccionados
  const checkboxesEstados = document.querySelectorAll(
    'input[name="filtro-estado"]:checked',
  );
  const estadosSeleccionados = Array.from(checkboxesEstados).map((cb) =>
    String(cb.value).trim().toUpperCase(),
  );

  // 2. Obtener servicios seleccionados (asegúrate de que tus checkboxes de servicios usen name="filtro-servicio")
  const checkboxesServicios = document.querySelectorAll(
    'input[name="filtro-servicio"]:checked',
  );
  const serviciosSeleccionados = Array.from(checkboxesServicios).map((cb) =>
    String(cb.value).trim().toUpperCase(),
  );

  let datosAVisualizar = window.datosConsolidadoGlobal || [];

  // 3. Filtrar por Estados (si hay alguno seleccionado)
  if (estadosSeleccionados.length > 0) {
    datosAVisualizar = datosAVisualizar.filter((row) => {
      const estadoFila = String(row.nombre_estado || row.estado || "")
        .trim()
        .toUpperCase();
      return estadosSeleccionados.includes(estadoFila);
    });
  }

  // 4. Filtrar por Servicios (si hay alguno seleccionado, evaluando 'codigo' u otras propiedades equivalentes)
  if (serviciosSeleccionados.length > 0) {
    datosAVisualizar = datosAVisualizar.filter((row) => {
      const servicioFila = String(
        row.codigo || row.tipo_servicio_codigo || row.tipo_servicio || "",
      )
        .trim()
        .toUpperCase();
      return serviciosSeleccionados.includes(servicioFila);
    });
  }

  // 5. Renderizar la tabla con los datos filtrados
  if (typeof window.renderizarGridConsolidado === "function") {
    window.renderizarGridConsolidado(datosAVisualizar);
  }
};

window.buscarConsolidado = async function () {
  const fechaDesdeInput = document.getElementById("fecha-desde").value;
  const fechaHastaInput = document.getElementById("fecha-hasta").value;
  const contenedor = document.getElementById("wrapper-grid-table-consolidado");

  // 🛡️ Validaciones...
  if (!fechaDesdeInput || !fechaHastaInput) {
    if (contenedor) {
      contenedor.innerHTML = `<div class="p-8 text-center text-amber-600 text-xs font-medium bg-amber-50 rounded-lg">⚠️ Por favor, seleccione una fecha de inicio y fin.</div>`;
    }
    return;
  }

  const sucursalId =
    window.sucursalIdUsuario ||
    sessionStorage.getItem("sucursal_id") ||
    localStorage.getItem("sucursal_id");

  if (!sucursalId) return;

  try {
    if (contenedor) {
      contenedor.innerHTML = `<div class="p-8 text-center text-slate-400 text-xs animate-pulse">Consultando registros por fechas...</div>`;
    }

    // 🔍 CORREGIDO: Apuntando al nombre exacto de tu vista en Supabase
    let query = window.supabaseClient
      .from("vista_consolidado_envios") // <--- Nombre exacto de tu captura de pantalla
      .select("*")
      .eq("sucursal_id", sucursalId)
      .gte("fecha_admision", fechaDesdeInput)
      .lte("fecha_admision", fechaHastaInput + " 23:59:59");

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    window.datosConsolidadoGlobal = data || [];
    console.log(
      `✅ Datos obtenidos (${window.datosConsolidadoGlobal.length} registros).`,
    );

    if (typeof window.filtrarPorEstadoLocal === "function") {
      window.filtrarPorEstadoLocal();
    } else if (typeof window.renderizarGridConsolidado === "function") {
      window.renderizarGridConsolidado(window.datosConsolidadoGlobal);
    }
  } catch (error) {
    console.error("❌ Error al consultar:", error);
  }
};

// ==========================================
// 4. RENDERIZAR LA TABLA DE RESULTADOS EN EL GRID
// ==========================================
// Variable global para mantener el límite del consolidado de forma estática
window.limiteTablaConsolidado = window.limiteTablaConsolidado || 10;

window.renderizarGridConsolidado = function (data) {
  const contenedor = document.getElementById("wrapper-grid-table-consolidado");

  if (!contenedor) return;

  if (!data || data.length === 0) {
    contenedor.innerHTML = `
      <div class="p-12 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200 shadow-sm">
        No se encontraron registros para el rango de fechas y filtros seleccionados en esta sucursal.
      </div>
    `;
    return;
  }

  // Función auxiliar para formatear fechas a DD/MM/YYYY
  const formatearFechaDMY = (fechaStr) => {
    if (!fechaStr) return "-";
    const soloFecha = fechaStr.split("T")[0];
    const partes = soloFecha.split("-");
    if (partes.length === 3) {
      const [anio, mes, dia] = partes;
      return `${dia}/${mes}/${anio}`;
    }
    return fechaStr;
  };

  // 1. Cálculo de totales generales sobre toda la data
  const totalEnvios = data.length;
  const totalPeso = data.reduce((acc, row) => acc + (Number(row.peso) || 0), 0);
  const totalCantidad = data.reduce((acc, row) => acc + (Number(row.cantidad) || 0), 0);

  // 2. Mapeo de filas para Grid.js con estilos de color idénticos a los tuyos
  const rowsData = data.map((row) => [
    gridjs.html(`<span class="text-blue-600 font-semibold">${row.guia_admision || "-"}</span>`),
    row.codigo || "-",
    row.hoja_ruta || "-",
    row.doc_emitido || "-",
    gridjs.html(`<span class="text-blue-600 font-semibold">${row.guia_fisica || "-"}</span>`),
    gridjs.html(`<span class="font-mono text-[10px] text-slate-600">${row.codigo_barras || "-"}</span>`),
    row.orden || "-",
    gridjs.html(`<span class="font-medium text-slate-900">${row.destinatario || "-"}</span>`),
    row.direccion || "-",
    row.departamento || "-",
    row.provincia || "-",
    row.distrito || "-",
    gridjs.html(`<span class="font-semibold text-indigo-700">${row.nombre_estado || "-"}</span>`),
    row.acceso || "-",
    row.descripcion || "-",
    formatearFechaDMY(row.fecha_admision),
    formatearFechaDMY(row.fecha_entrega),
    formatearFechaDMY(row.fecha_descargo),
    formatearFechaDMY(row.fecha_devolucion),
    gridjs.html(`<span class="text-amber-600 font-semibold">${row.guia_devolucion || "-"}</span>`),
    gridjs.html(`<span class="text-right font-medium text-slate-700">${row.peso !== null && row.peso !== undefined ? Number(row.peso).toFixed(2) : "0.00"}</span>`),
    gridjs.html(`<span class="text-right font-medium text-slate-700">${row.cantidad !== null && row.cantidad !== undefined ? row.cantidad : "0"}</span>`),
  ]);

  if (window.gridConsolidadoInstance) {
    window.gridConsolidadoInstance.destroy();
    window.gridConsolidadoInstance = null;
  }

  // Limpiar contenedor e inyectar cabecera superior de totales antes del grid
  contenedor.innerHTML = `
    <div class="mb-4 flex items-center justify-between px-1">
      <div class="inline-flex items-center gap-2 bg-blue-50/80 border border-blue-100 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 shadow-xs">
        <svg class="w-4 h-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        Total de envíos encontrados: <span class="text-blue-600 font-bold ml-0.5">${totalEnvios}</span>
      </div>
    </div>
    <div id="grid-table-element-consolidado" class="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden"></div>
  `;

  const gridSubContainer = document.getElementById("grid-table-element-consolidado");

  // 3. Inicializar Grid.js
  window.gridConsolidadoInstance = new gridjs.Grid({
    columns: [
      "Guia Adm.",
      "Servicio",
      "Hoja Ruta",
      "Doc. Emitido",
      "Guia Fisica",
      "Código Barras",
      "Orden",
      "Destinatario",
      "Dirección / Ubigeo",
      "Departamento",
      "Provincia",
      "Distrito",
      "Estado",
      "Acceso",
      "Servicio",
      "Fecha Admisión",
      "Fecha Entrega",
      "Fecha Descargo",
      "Fecha Devolución",
      "Guia Dev.",
      "Peso",
      "Cantidad",
    ],
    data: rowsData,
    pagination: { 
      limit: window.limiteTablaConsolidado,
      summary: true 
    },
    search: { placeholder: "Escribe para buscar en el consolidado..." },
    sort: true,
    language: {
      search: { placeholder: "Escribe para buscar..." },
      pagination: {
        previous: "Anterior",
        next: "Siguiente",
        showing: "Mostrando",
        of: "de",
        to: "a",
        results: "registros",
      },
      noRecordsFound: "No se encontraron registros coincidentes",
    },
    style: {
      table: { "font-size": "11px", width: "100%", "white-space": "nowrap" },
      th: {
        "background-color": "#f8fafc",
        color: "#475569",
        "font-weight": "600",
        "border-bottom": "1px solid #e2e8f0",
        padding: "10px 12px",
      },
      td: {
        padding: "8px 12px",
        "border-bottom": "1px solid #f1f5f9",
        color: "#334155",
      },
    },
  });

  window.gridConsolidadoInstance.render(gridSubContainer);

  // 4. Inserción del selector estático de filas (10, 20, 30, Todos) y el pie con Totales
  window.gridConsolidadoInstance.on('ready', () => {
    const summaryContainer = gridSubContainer.querySelector(".gridjs-summary");
    if (summaryContainer && !gridSubContainer.querySelector("#select-grid-limit-consolidado")) {
      const selectHtml = `
        <span class="ml-4 inline-flex items-center gap-1 text-xs text-slate-500">
          Mostrar:
          <select id="select-grid-limit-consolidado" class="border border-slate-300 rounded px-1.5 py-0.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer">
            <option value="5" ${window.limiteTablaConsolidado === 5 ? 'selected' : ''}>5</option>
            <option value="10" ${window.limiteTablaConsolidado === 10 ? 'selected' : ''}>10</option>
            <option value="15" ${window.limiteTablaConsolidado === 15 ? 'selected' : ''}>15</option>
            <option value="20" ${window.limiteTablaConsolidado === 20 ? 'selected' : ''}>20</option>
            <option value="30" ${window.limiteTablaConsolidado === 30 ? 'selected' : ''}>30</option>
            <option value="10000" ${window.limiteTablaConsolidado === 10000 ? 'selected' : ''}>Todos</option>
          </select>
          filas
        </span>
      `;
      summaryContainer.insertAdjacentHTML("beforeend", selectHtml);

      const selectEl = gridSubContainer.querySelector("#select-grid-limit-consolidado");
      if (selectEl) {
        selectEl.addEventListener("change", (e) => {
          const valor = e.target.value;
          window.limiteTablaConsolidado = parseInt(valor, 10);
          
          window.gridConsolidadoInstance
            .updateConfig({
              pagination: { limit: window.limiteTablaConsolidado },
            })
            .forceRender();
        });
      }
    }

    // Agregar la fila de totales generales al pie de la tabla de Grid.js si no existe
    const tableEl = gridSubContainer.querySelector("table");
    if (tableEl && !tableEl.querySelector("tfoot")) {
      const tfoot = document.createElement("tfoot");
      tfoot.className = "bg-slate-100 font-bold text-slate-800 border-t border-slate-200";
      tfoot.innerHTML = `
        <tr>
          <td colspan="20" class="p-2.5 text-right tracking-wide">TOTALES GENERALES:</td>
          <td class="p-2.5 border-r border-slate-200 text-right text-amber-700">${totalPeso.toFixed(2)}</td>
          <td class="p-2.5 text-right text-blue-700">${totalCantidad}</td>
        </tr>
      `;
      tableEl.appendChild(tfoot);
    }
  });
};
// ==========================================
// 5. EVENTOS GLOBALES (CLICKS Y CAMBIOS)
// ==========================================
document.addEventListener("click", function (e) {
  const btnBuscar = e.target.closest("#btn-buscar-fechas");
  if (btnBuscar) {
    console.log("🖱️ Botón 'Buscar' presionado.");
    if (typeof window.buscarConsolidado === "function") {
      window.buscarConsolidado();
    }
  }
});

document.addEventListener("change", function (e) {
  // Si marcan o desmarcan un checkbox de estado, filtramos localmente sin ir a la BD
  if (e.target && e.target.name === "filtro-estado") {
    if (typeof window.filtrarPorEstadoLocal === "function") {
      window.filtrarPorEstadoLocal();
    }
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const btnExportar = document.getElementById("btn-exportar-excel");

  if (btnExportar) {
    btnExportar.addEventListener("click", () => {
      if (typeof window.exportarExcelDistribucion === "function") {
        window.exportarExcelDistribucion();
      } else {
        console.error("La función exportarExcelDistribucion no está definida.");
      }
    });
  }
});

window.exportarExcelDistribucion = function () {
  const tabla = document.querySelector("#wrapper-grid-table-consolidado table");
  
  if (!tabla) {
    if (typeof window.mostrarToast === "function") {
      window.mostrarToast("No hay registros en la tabla para exportar.", "warning");
    } else {
      alert("No hay registros en la tabla para exportar.");
    }
    return;
  }

  // 1. Obtener las filas del cuerpo de la tabla (tbody)
  const filas = tabla.querySelectorAll("tbody tr");
  
  if (filas.length === 0 || (filas.length === 1 && filas[0].innerText.includes("No se encontraron"))) {
    alert("No hay registros para exportar.");
    return;
  }

  const datosMapeados = [];

  // 2. Recorrer cada fila visible en el grid para extraer sus datos exactos (omitimos celdas[0] que es el servicio duplicado)
  filas.forEach((tr, index) => {
    const celdas = tr.querySelectorAll("td");
    if (celdas.length < 21) return; // Asegurar que tenga todas las columnas

    datosMapeados.push({
      "N°": index + 1, // Numeración correlativa automática (1, 2, 3...)
      // Omitimos celdas[0] ("Servicio (Código)")
      "Hoja Ruta": celdas[1].innerText.trim(),
      "Doc. Emitido": celdas[2].innerText.trim(),
      "Guia Adm.": celdas[3].innerText.trim(),
      "Código Barras": celdas[4].innerText.trim(),
      "Orden": celdas[5].innerText.trim(),
      "Destinatario": celdas[6].innerText.trim(),
      "Dirección / Ubigeo": celdas[7].innerText.trim(),
      "Departamento": celdas[8].innerText.trim(),
      "Provincia": celdas[9].innerText.trim(),
      "Distrito": celdas[10].innerText.trim(),
      "Estado": celdas[11].innerText.trim(),
      "Acceso": celdas[12].innerText.trim(),
      "Servicio (Desc)": celdas[13].innerText.trim(),
      "Fecha Admisión": celdas[14].innerText.trim(),
      "Fecha Entrega": celdas[15].innerText.trim(),
      "Fecha Descargo": celdas[16].innerText.trim(),
      "Fecha Devolución": celdas[17].innerText.trim(),
      "Guia Dev.": celdas[18].innerText.trim(),
      "Peso": celdas[19].innerText.trim(),
      "Cantidad": celdas[20].innerText.trim()
    });
  });

  // 3. Validar si la librería XLSX está cargada
  if (typeof XLSX === "undefined") {
    alert("La librería XLSX no está cargada en el sistema.");
    return;
  }

  const fechaDesdeInput = document.getElementById("fecha-desde").value || "N/A";
  const fechaHastaInput = document.getElementById("fecha-hasta").value || "N/A";
  const nombreSucursal = sessionStorage.getItem("sucursal_nombre") || "Sin Sucursal";

  const wb = XLSX.utils.book_new();

  // Encabezado del reporte
  const headerRows = [
    [
      `REPORTE DE DISTRIBUCIÓN DE ENVÍOS\n` +
        ` ${nombreSucursal} | ` +
        ` Desde ${fechaDesdeInput} Hasta ${fechaHastaInput} | ` +
        `Fecha de Generación: ${new Date().toLocaleDateString()}`,
    ],
    [], // Fila vacía de separación
  ];

  // Convertimos los datos mapeados iniciando en la fila 3
  const wsData = XLSX.utils.json_to_sheet(datosMapeados, { origin: "A3" });
  XLSX.utils.sheet_add_aoa(wsData, headerRows, { origin: "A1" });

  // Ajuste visual de anchos de columnas (sin la columna de código de servicio)
  wsData["!cols"] = [
    { wch: 5 },  // N°
    { wch: 15 }, // Hoja Ruta
    { wch: 12 }, // Doc. Emitido
    { wch: 15 }, // Guia Adm.
    { wch: 18 }, // Código Barras
    { wch: 8 },  // Orden
    { wch: 25 }, // Destinatario
    { wch: 30 }, // Dirección / Ubigeo
    { wch: 15 }, // Departamento
    { wch: 15 }, // Provincia
    { wch: 15 }, // Distrito
    { wch: 15 }, // Estado
    { wch: 12 }, // Acceso
    { wch: 15 }, // Servicio (Desc)
    { wch: 15 }, // Fecha Admisión
    { wch: 15 }, // Fecha Entrega
    { wch: 15 }, // Fecha Descargo
    { wch: 15 }, // Fecha Devolución
    { wch: 15 }, // Guia Dev.
    { wch: 10 }, // Peso
    { wch: 10 }, // Cantidad
  ];

  XLSX.utils.book_append_sheet(wb, wsData, "Distribucion");

  const nombreArchivo = `Reporte_Distribucion_${fechaDesdeInput}_al_${fechaHastaInput}.xlsx`;
  XLSX.writeFile(wb, nombreArchivo);
};
