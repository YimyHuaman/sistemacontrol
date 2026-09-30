let gridGuiasInstance = null;
const funcionDetalle = "verDetalleGuiaModal";
// Función auxiliar para formatear fechas a DD/MM/YYYY HH:mm
function formatearFechaHoraGuia(fechaStr) {
  if (!fechaStr) return "";
  const [fecha, horaCompleta] = fechaStr.split("T");
  const partes = fecha.split("-");
  if (partes.length !== 3) return fechaStr;
  const hora = horaCompleta ? horaCompleta.substring(0, 5) : "";
  return `${partes[2]}/${partes[1]}/${partes[0]} ${hora}`.trim();
}

// Inicialización del módulo de guías
function inicializarModuloGuias() {
  console.log("🔄 Inicializando módulo de guías...");

  const radioAdmision = document.getElementById("radio-admision");
  const radioDevolucion = document.getElementById("radio-devolucion");

  if (!radioAdmision || !radioDevolucion) {
    console.warn("⚠️ Los radios de guías aún no están en el DOM.");
    return;
  }

  if (!radioAdmision.checked && !radioDevolucion.checked) {
    radioAdmision.checked = true;
  }

  radioAdmision.removeEventListener("change", cambiarModoOperacionGuia);
  radioDevolucion.removeEventListener("change", cambiarModoOperacionGuia);

  radioAdmision.addEventListener("change", cambiarModoOperacionGuia);
  radioDevolucion.addEventListener("change", cambiarModoOperacionGuia);

  cambiarModoOperacionGuia();
}

// Captura el valor del radio seleccionado y carga las guías
function cambiarModoOperacionGuia() {
  const radioSeleccionado = document.querySelector(
    'input[name="modo-guia"]:checked',
  );
  if (!radioSeleccionado) return;

  const tipoFiltro = radioSeleccionado.value;
  const nombreModo =
    tipoFiltro === "admision" ? "Guías de Admisión" : "Devoluciones";

  cargarGuiasPorTipo(tipoFiltro, nombreModo);
}

async function cargarGuiasPorTipo(tipoFiltro, nombreModo) {
  const wrapperTabla = document.getElementById("wrapper-grid-table-guias");
  if (!wrapperTabla) return;

  try {
    const clienteSupabase =
      window.supabaseClient ||
      window.supabase ||
      (typeof supabase !== "undefined" ? supabase : null);
    if (!clienteSupabase) {
      wrapperTabla.innerHTML = `<div class="p-4 text-center text-red-500 text-xs">Error: Supabase no está disponible.</div>`;
      return;
    }

    const sesionUsuario = JSON.parse(
      sessionStorage.getItem("sesion_usuario") || "{}",
    );
    const sucursalIdLogueada =
      sesionUsuario.sucursal?.id ||
      localStorage.getItem("sucursal_id") ||
      sessionStorage.getItem("sucursal_id");

    if (!sucursalIdLogueada) {
      wrapperTabla.innerHTML = `<div class="p-4 text-center text-red-500 text-xs">No se encontró la sucursal activa en la sesión.</div>`;
      return;
    }

    wrapperTabla.innerHTML = `<div class="p-4 text-center text-slate-400 text-xs">Cargando ${nombreModo}...</div>`;

    // Consulta directa a la tabla guía sin requerir la hoja de ruta
    const { data, error } = await clienteSupabase
      .from("guia")
      .select("*")
      .eq("sucursal_id", parseInt(sucursalIdLogueada))
      .eq("tipo", tipoFiltro);

    if (error) throw new Error(error.message);

    pintarTablaGuias(data, tipoFiltro);
  } catch (error) {
    console.error(`❌ Error al cargar ${nombreModo}:`, error);
    wrapperTabla.innerHTML = `<div class="p-4 text-center text-red-500 text-xs">Error al cargar registros: ${error.message}</div>`;
  }
}

function pintarTablaGuias(datos, tipoFiltro) {
  const contenedor = document.getElementById("wrapper-grid-table-guias");
  if (!contenedor) return;

  if (!datos || datos.length === 0) {
    contenedor.innerHTML = `
      <div class="flex items-center justify-center p-8 text-slate-400 text-xs">
        No se encontraron registros.
      </div>`;
    return;
  }

  contenedor.innerHTML = "";

  const rowsData = datos.map((item) => {
    const idGuia = item.id;
    const correlativo = item.correlativo || "S/N";
    const tipo = item.tipo || "";
    const cantidad = item.cantidad ?? "-";
    const fecha =
      typeof formatearFechaHoraGuia === "function"
        ? formatearFechaHoraGuia(item.fecha)
        : item.fecha;

    // Normalizar el filtro a minúsculas para comparaciones seguras
    const modoFiltro = String(tipoFiltro || "").toLowerCase();

    // 1. La función de impresión varía según el modo
    const funcionImprimir =
      modoFiltro === "devolucion"
        ? "imprimirGuiaDevolucion"
        : "imprimirGuiaAdmision";

    // 2. Primer Botón: Llama al Modal de Detalles para AMBOS modos
    let accionesHtml = `
      <div class="flex items-center gap-1.5">
        <button onclick="verDetalleGuiaModal('${idGuia}')" title="Ver Listado / Detalles" class="p-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
          </svg>
        </button>
    `;

    // 3. Segundo Botón: Código de Barras exclusivo para Admisión (no aparece en Devolución)
    if (modoFiltro === "admision") {
      accionesHtml += `
        <button onclick="imprimirCodigoBarrasGuia('${idGuia}', '${correlativo}')" title="Código de Barras" class="p-1 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 4v16M10 4v16M14 4v16M18 4v16"></path>
          </svg>
        </button>
      `;
    }

    // 4. Tercer Botón: Imprimir Guía PDF (Admisión o Devolución)
    accionesHtml += `
        <button onclick="${funcionImprimir}('${idGuia}')" title="Imprimir Guía de ${tipoFiltro}" class="p-1 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded transition">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z"></path>
          </svg>
        </button>
      </div>
    `;

    return [correlativo, tipo, cantidad, fecha, gridjs.html(accionesHtml)];
  });

  if (window.gridGuiasInstance) {
    window.gridGuiasInstance.destroy();
    window.gridGuiasInstance = null;
  }

  window.gridGuiasInstance = new gridjs.Grid({
    columns: [
      "Correlativo",
      "Tipo",
      "Cantidad",
      "Fecha",
      { name: "Acciones", sort: false },
    ],
    data: rowsData,
    pagination: { limit: 10 },
    search: true,
    sort: true,
  }).render(contenedor);
}

window.verDetalleGuiaModal = async function (idGuia) {
  try {
    const clienteSupabase =
      window.supabaseClient ||
      window.supabase ||
      (typeof supabase !== "undefined" ? supabase : null);

    if (!clienteSupabase) {
      alert("⚠️ No se encontró la instancia de Supabase.");
      return;
    }

    // 1. Mostrar un indicador de carga o abrir el modal vacío con "Cargando..."
    let modalContainer = document.getElementById("modal-detalle-guia");
    if (!modalContainer) {
      modalContainer = crearEstructuraModalHtml();
    }

    const cuerpoTablaModal = document.getElementById(
      "cuerpo-tabla-detalle-modal",
    );
    cuerpoTablaModal.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-slate-400 text-xs">Cargando detalles de la guía...</td></tr>`;

    // Mostrar el modal (usando clases de Tailwind para mostrarlo)
    modalContainer.classList.remove("hidden");
    modalContainer.classList.add("flex");

    // 2. Consultar los documentos asociados a esta guía usando la relación
    const { data, error } = await clienteSupabase
      .from("guia_documento")
      .select(
        `
        documento (
          codigo_barras,
          doc_emitido,
          destinatario,
          direccion,
          peso,
          tipo_servicio_id,
          ubigeo_id,
          tipo_servicio ( codigo ),
          ubigeo ( departamento, provincia, distrito )
        )
      `,
      )
      .eq("guia_id", idGuia);

    if (error) throw new Error(error.message);

    // 3. Limpiar y rellenar la tabla del modal
    cuerpoTablaModal.innerHTML = "";

    if (!data || data.length === 0) {
      cuerpoTablaModal.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-slate-400 text-xs">No se encontraron documentos para esta guía.</td></tr>`;
      return;
    }

    data.forEach((item, index) => {
      const doc = item.documento;
      if (!doc) return;

      const servicio = doc.tipo_servicio?.codigo || "N/A";
      const docEmitido = doc.doc_emitido || "S/N";
      const destinatario = doc.destinatario || "";
      const direccion = doc.direccion || "";
      const ubigeoTexto = doc.ubigeo
        ? `${doc.ubigeo.departamento || ""} / ${doc.ubigeo.provincia || ""} / ${doc.ubigeo.distrito || ""}`
        : "";
      const peso =
        doc.peso !== null && doc.peso !== undefined
          ? Number(doc.peso).toFixed(3)
          : "0.000";

      const fila = `
        <tr class="border-b hover:bg-slate-50">
          <td class="p-2 text-center font-medium text-slate-600">${index + 1}</td>
          <td class="p-2 text-slate-700">${docEmitido}</td>
          <td class="p-2 text-slate-700">${destinatario}</td>
          <td class="p-2 text-slate-700">${direccion} (${ubigeoTexto})</td>
          <td class="p-2 text-center text-slate-600">${servicio}</td>
          <td class="p-2 text-right font-semibold text-slate-700">${peso} kg</td>
        </tr>
      `;
      cuerpoTablaModal.insertAdjacentHTML("beforeend", fila);
    });
  } catch (err) {
    console.error("❌ Error al cargar detalles de la guía:", err);
    alert("Hubo un error al cargar los detalles.");
  }
};

// Función auxiliar que inyecta el HTML del modal en el DOM si no existe
function crearEstructuraModalHtml() {
  const div = document.createElement("div");
  div.id = "modal-detalle-guia";
  div.className =
    "fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm hidden";
  div.innerHTML = `
    <div class="bg-white rounded-lg shadow-xl w-11/12 max-w-4xl overflow-hidden flex flex-col max-h-[85vh]">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 bg-slate-100 border-b">
        <h3 class="text-sm font-bold text-slate-800">📋 Detalle de Documentos de la Guía</h3>
        <button onclick="cerrarModalDetalleGuia()" class="text-slate-400 hover:text-slate-600 text-lg font-bold">&times;</button>
      </div>
      <!-- Body -->
      <div class="p-6 overflow-y-auto flex-1">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="bg-slate-50 text-slate-600 border-b">
              <th class="p-2 text-center">#</th>
              <th class="p-2">N° Documento</th>
              <th class="p-2">Destinatario</th>
              <th class="p-2">Dirección / Ubigeo</th>
              <th class="p-2 text-center">Servicio</th>
              <th class="p-2 text-right">Peso</th>
            </tr>
          </thead>
          <tbody id="cuerpo-tabla-detalle-modal">
            <!-- Dinámico -->
          </tbody>
        </table>
      </div>
      <!-- Footer -->
      <div class="px-6 py-3 bg-slate-50 border-t flex justify-end">
        <button onclick="cerrarModalDetalleGuia()" class="px-4 py-1.5 bg-slate-800 text-white rounded text-xs hover:bg-slate-700 transition">Cerrar</button>
      </div>
    </div>
  `;
  document.body.appendChild(div);
  return div;
}

window.cerrarModalDetalleGuia = function () {
  const modal = document.getElementById("modal-detalle-guia");
  if (modal) {
    modal.classList.remove("flex");
    modal.classList.add("hidden");
  }
};

window.inicializarModuloGuias = inicializarModuloGuias;
window.verDetalleGuia = verDetalleGuia;
window.verCodigoBarrasGuia = verCodigoBarrasGuia;
