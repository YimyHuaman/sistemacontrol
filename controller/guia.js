let gridGuiasInstance = null;

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

// Consulta a Supabase según el tipo seleccionado
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

// Dibuja la tabla Grid.js y adapta dinámicamente los botones según Admisión o Devolución
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
    const hojaRuta = item.hoja_ruta || "-";
    const cantidad = item.cantidad ?? "-";
    const fecha = typeof formatearFechaHoraGuia === "function" ? formatearFechaHoraGuia(item.fecha) : item.fecha;

    // Funciones dinámicas según el modo activo
    const funcionDetalle = tipoFiltro === "devolucion" ? "imprimirGuiaDevolucion" : "imprimirGuiaDevolucion";
    const funcionImprimir = tipoFiltro === "devolucion" ? "imprimirGuiaDevolucion" : "imprimirGuiaAdmision";

    let accionesHtml = `
      <div class="flex items-center gap-1.5">
        <button onclick="${funcionDetalle}('${idGuia}')" title="Ver Listado / Detalles" class="p-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
          </svg>
        </button>
    `;

    // Código de barras exclusivo para Admisión
    if (tipoFiltro === "admision") {
      accionesHtml += `
        <button onclick="imprimirCodigoBarrasGuia('${idGuia}', '${correlativo}')" title="Código de Barras" class="p-1 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 4v16M10 4v16M14 4v16M18 4v16"></path>
          </svg>
        </button>
      `;
    }

    accionesHtml += `
        <button onclick="${funcionImprimir}('${idGuia}')" title="Imprimir Guía de ${tipoFiltro}" class="p-1 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded transition">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z"></path>
          </svg>
        </button>
      </div>
    `;

    return [correlativo, tipo, hojaRuta, cantidad, fecha, gridjs.html(accionesHtml)];
  });

  if (window.gridGuiasInstance) {
    window.gridGuiasInstance.destroy();
    window.gridGuiasInstance = null;
  }

  window.gridGuiasInstance = new gridjs.Grid({
    columns: ["Correlativo", "Tipo", "Hoja de Ruta", "Cantidad", "Fecha", { name: "Acciones", sort: false }],
    data: rowsData,
    pagination: { limit: 10 },
    search: true,
    sort: true,
  }).render(contenedor);
}



// Funciones globales de acción
function verDetalleGuia(id) {
  console.log("Ver detalle:", id);
}




window.inicializarModuloGuias = inicializarModuloGuias;
window.verDetalleGuia = verDetalleGuia;
window.verCodigoBarrasGuia = verCodigoBarrasGuia;

