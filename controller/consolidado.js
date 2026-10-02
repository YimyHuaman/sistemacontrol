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
window.renderizarGridConsolidado = function (data) {
  const contenedor = document.getElementById("wrapper-grid-table-consolidado");

  if (!contenedor) return;

  if (!data || data.length === 0) {
    contenedor.innerHTML = `
      <div class="p-8 text-center text-slate-400 text-xs">
        No se encontraron registros para el rango de fechas y filtros seleccionados en esta sucursal.
      </div>
    `;
    return;
  }

  let html = `
    <div class="overflow-x-auto max-h-[500px]">
      <table class="w-full text-left border-collapse text-[11px]">
        <thead class="bg-slate-100 text-slate-700 sticky top-0 z-10 border-b border-slate-200">
          <tr>
            <th class="p-2 border-r border-slate-200">Servicio</th>
            <th class="p-2 border-r border-slate-200">Hoja Ruta</th>
            <th class="p-2 border-r border-slate-200">Doc. Emitido</th>
            <th class="p-2 border-r border-slate-200">Guia Adm.</th>
            <th class="p-2 border-r border-slate-200">Código Barras</th>
            <th class="p-2 border-r border-slate-200">Orden</th>
            <th class="p-2 border-r border-slate-200">Destinatario</th>
            <th class="p-2 border-r border-slate-200">Dirección / Ubigeo</th>
            <th class="p-2 border-r border-slate-200">Departamento</th>
            <th class="p-2 border-r border-slate-200">Provincia</th>
            <th class="p-2 border-r border-slate-200">Distrito</th>
            <th class="p-2 border-r border-slate-200">Estado</th>
            <th class="p-2 border-r border-slate-200">Acceso</th>
            <th class="p-2 border-r border-slate-200">Servicio</th>
            <th class="p-2 border-r border-slate-200">Fecha Admisión</th>
            <th class="p-2 border-r border-slate-200">Fecha Entrega</th>
            <th class="p-2 border-r border-slate-200">Fecha Descargo</th>
            <th class="p-2 border-r border-slate-200">Fecha Devolución</th>
            <th class="p-2 border-r border-slate-200">Guia Dev.</th>
            <th class="p-2 border-r border-slate-200">Peso</th>
            <th class="p-2">Cantidad</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200 bg-white">
  `;

  data.forEach((row) => {
    const fechaAdm = row.fecha_admision
      ? row.fecha_admision.split("T")[0]
      : "-";
    const fechaEnt = row.fecha_entrega ? row.fecha_entrega.split("T")[0] : "-";
    const fechaDes = row.fecha_descargo
      ? row.fecha_descargo.split("T")[0]
      : "-";
    const fechaDev = row.fecha_devolucion
      ? row.fecha_devolucion.split("T")[0]
      : "-";

    html += `
      <tr class="hover:bg-slate-50 transition-colors">
       <td class="p-2 border-r border-slate-200 font-medium text-slate-800">${row.codigo || "-"}</td>
        <td class="p-2 border-r border-slate-200 font-medium text-slate-800">${row.hoja_ruta || "-"}</td>
        <td class="p-2 border-r border-slate-200">${row.doc_emitido || "-"}</td>
        <td class="p-2 border-r border-slate-200 text-blue-600 font-semibold">${row.guia_admision || "-"}</td>
        <td class="p-2 border-r border-slate-200 font-mono text-[10px]">${row.codigo_barras || "-"}</td>
        <td class="p-2 border-r border-slate-200">${row.orden || "-"}</td>
        <td class="p-2 border-r border-slate-200 font-medium text-slate-900">${row.destinatario || "-"}</td>
        <td class="p-2 border-r border-slate-200 text-slate-600">${row.direccion || "-"}</td>
        <td class="p-2 border-r border-slate-200">${row.departamento || "-"}</td>
        <td class="p-2 border-r border-slate-200">${row.provincia || "-"}</td>
        <td class="p-2 border-r border-slate-200">${row.distrito || "-"}</td>
        <td class="p-2 border-r border-slate-200 font-semibold text-indigo-700">${row.nombre_estado || "-"}</td>
        <td class="p-2 border-r border-slate-200">${row.acceso || "-"}</td>
        <td class="p-2 border-r border-slate-200">${row.descripcion || "-"}</td>
        <td class="p-2 border-r border-slate-200">${fechaAdm}</td>
        <td class="p-2 border-r border-slate-200">${fechaEnt}</td>
        <td class="p-2 border-r border-slate-200">${fechaDes}</td>
        <td class="p-2 border-r border-slate-200">${fechaDev}</td>
        <td class="p-2 border-r border-slate-200 text-amber-600 font-semibold">${row.guia_devolucion || "-"}</td>
        <td class="p-2 border-r border-slate-200 text-right">${row.peso !== null && row.peso !== undefined ? row.peso : "0.00"}</td>
        <td class="p-2 text-right">${row.cantidad !== null && row.cantidad !== undefined ? row.cantidad : "0"}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  contenedor.innerHTML = html;
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
  // 1. Validar si hay datos en pantalla para exportar
  const datos = window.datosConsolidadoGlobal || [];
  if (datos.length === 0) {
    if (typeof window.mostrarToast === "function") {
      window.mostrarToast("No hay registros para exportar.", "warning");
    } else {
      alert("No hay registros para exportar.");
    }
    return;
  }

  // Función auxiliar para formatear fechas solo como DD/MM/YYYY
  function formatearSoloFecha(fechaStr) {
    if (!fechaStr) return "";
    const fecha = new Date(fechaStr);
    if (isNaN(fecha)) return fechaStr; // Si ya es texto o formato extraño
    const dia = String(fecha.getDate()).padStart(2, "0");
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const anio = fecha.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }

  // 2. Obtener fechas de los inputs para el encabezado
  const fechaDesdeInput = document.getElementById("fecha-desde").value || "N/A";
  const fechaHastaInput = document.getElementById("fecha-hasta").value || "N/A";

  // 3. Obtener el nombre de la sucursal de la sesión de manera segura
  const nombreSucursal =
    sessionStorage.getItem("sucursal_nombre") || "Sin Sucursal";

  // 4. Preparar los datos limpios para la tabla de Excel (con fechas sin horas)
  const datosMapeados = datos.map((item, index) => ({
    "N°": index + 1,
    "Hoja de Ruta": item.hoja_ruta || "SIN GUÍA",
    "Doc. Emitido": item.doc_emitido || "",
    "Guia Admisión": item.correlativo_admision || "",
    "Código de Barras": item.codigo_barras || "",
    Orden: item.orden || "",
    Destinatario: item.destinatario || "",
    Dirección: item.direccion || "",
    Departamento: item.departamento || "",
    Provincia: item.provincia || "",
    Distrito: item.distrito || "",
    Estado: item.nombre_estado || "",
    Acceso: item.acceso || "",
    "Tipo Servicio": item.descripcion || "",
    "Fecha Admisión": formatearSoloFecha(item.fecha_admision),
    "Fecha Entrega": formatearSoloFecha(item.fecha_entrega),
    "Fecha Descargo": formatearSoloFecha(item.fecha_descargo),
    "Guia Devolución": formatearSoloFecha(item.fecha_devolucion),
    "Correlativo Devolución": item.correlativo_devolucion || "",
    Peso: item.peso || 0,
    Cantidad: item.cantidad || 0,
  }));

  // 5. Validar si la librería XLSX está cargada
  if (typeof XLSX === "undefined") {
    alert("La librería XLSX no está cargada en el sistema.");
    return;
  }

  const wb = XLSX.utils.book_new();

  // Todo el encabezado agrupado utilizando la variable correcta (nombreSucursal)
  const headerRows = [
    [
      `REPORTE DE DISTRIBUCIÓN DE ENVÍOS\n` +
        ` ${nombreSucursal} | ` +
        ` D ${fechaDesdeInput} Hasta ${fechaHastaInput} | ` +
        `Fecha de Generación: ${formatearSoloFecha(new Date())}`,
    ],
    [], // Fila vacía de separación antes de la tabla
  ];

  // Convertimos los datos mapeados a formato de hoja de cálculo iniciando en la fila 3
  const wsData = XLSX.utils.json_to_sheet(datosMapeados, { origin: "A3" });

  // Añadimos el encabezado único arriba
  XLSX.utils.sheet_add_aoa(wsData, headerRows, { origin: "A1" });

  // Ajuste visual de anchos de columnas
  const colWidths = [
    { wch: 5 }, // N°
    { wch: 15 }, // Hoja de Ruta
    { wch: 12 }, // Doc Emitido
    { wch: 18 }, // Guia Admision
    { wch: 18 }, // Código de Barras
    { wch: 8 }, // Orden
    { wch: 25 }, // Destinatario
    { wch: 30 }, // Dirección
    { wch: 15 }, // Departamento
    { wch: 15 }, // Provincia
    { wch: 15 }, // Distrito
    { wch: 15 }, // Estado
    { wch: 12 }, // Acceso
    { wch: 15 }, // Tipo Servicio
    { wch: 15 }, // Fecha Admisión
    { wch: 15 }, // Fecha Entrega
    { wch: 15 }, // Fecha Descargo
    { wch: 15 }, // Fecha Devolución
    { wch: 20 }, // Correlativo Devolución
    { wch: 10 }, // Peso
    { wch: 10 }, // Cantidad
  ];
  wsData["!cols"] = colWidths;

  // 6. Adjuntar la hoja al libro y descargar el archivo
  XLSX.utils.book_append_sheet(wb, wsData, "Distribucion");

  const nombreArchivo = `Reporte_Distribucion_${fechaDesdeInput}_al_${fechaHastaInput}.xlsx`;
  XLSX.writeFile(wb, nombreArchivo);
};
