let gridInstance = null;

// Función auxiliar para convertir fechas de 'YYYY-MM-DD' a 'DD/MM/YYYY'
function formatearFecha(fechaStr) {
  if (!fechaStr) return "";
  // Si viene con hora (ej: 2026-06-07T00:00:00), cortamos solo la parte de la fecha
  const soloFecha = fechaStr.split("T")[0];
  const partes = soloFecha.split("-");
  if (partes.length !== 3) return fechaStr; // Si no tiene el formato esperado, lo retorna tal cual
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function inicializarModuloEnvios() {
  console.log("🔄 Inicializando módulo de envíos...");

  const radioPendientes = document.getElementById("radio-pendientes");
  const radioTodos = document.getElementById("radio-todos");
  const btnBuscar = document.getElementById("btn-buscar-fechas");

  if (!radioPendientes || !radioTodos) return;

  radioPendientes.removeEventListener("change", cambiarModoOperacionEnvio);
  radioTodos.removeEventListener("change", cambiarModoOperacionEnvio);
  radioPendientes.addEventListener("change", cambiarModoOperacionEnvio);
  radioTodos.addEventListener("change", cambiarModoOperacionEnvio);

  if (btnBuscar) {
    btnBuscar.removeEventListener("click", buscarPorFechas);
    btnBuscar.addEventListener("click", buscarPorFechas);
  }

  cambiarModoOperacionEnvio();
}

function cambiarModoOperacionEnvio() {
  const radioPendientes = document.getElementById("radio-pendientes");
  const fechaDesde = document.getElementById("fecha-desde");
  const fechaHasta = document.getElementById("fecha-hasta");
  const btnBuscar = document.getElementById("btn-buscar-fechas");
  const wrapperTabla = document.getElementById("wrapper-grid-table-documentos");

  if (!radioPendientes) return;

  if (radioPendientes.checked) {
    if (fechaDesde) {
      fechaDesde.disabled = true;
      fechaDesde.value = "";
    }
    if (fechaHasta) {
      fechaHasta.disabled = true;
      fechaHasta.value = "";
    }
    if (btnBuscar) btnBuscar.disabled = true;

    buscarPendientes();
  } else {
    if (fechaDesde) fechaDesde.disabled = false;
    if (fechaHasta) fechaHasta.disabled = false;
    if (btnBuscar) btnBuscar.disabled = false;

    if (wrapperTabla) {
      wrapperTabla.innerHTML = `
        <div class="flex items-center justify-center p-8 text-slate-400 text-xs">
          Selecciona un rango de fechas (Desde / Hasta) y haz clic en Buscar.
        </div>`;
    }
  }
}

async function buscarPendientes() {
  const wrapperTabla = document.getElementById("wrapper-grid-table-documentos");
  if (!wrapperTabla) return;

  try {
    const clienteSupabase =
      window.supabaseClient ||
      window.supabase ||
      (typeof supabase !== "undefined" ? supabase : null);
    if (!clienteSupabase) return;

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

    wrapperTabla.innerHTML = `<div class="p-4 text-center text-slate-400 text-xs">Cargando Envíos pendientes...</div>`;

    // Consulta directa a la vista filtrando por sucursal y estado pendiente (1)
    const { data, error } = await clienteSupabase
      .from("vw_documentos_detallados")
      .select("*")
      .eq("sucursal_id", parseInt(sucursalIdLogueada))
      .eq("estado_id", 1);

    if (error) throw new Error(error.message);

    pintarTablaDocumentos(data);
  } catch (error) {
    console.error("❌ Error al cargar pendientes:", error);
    wrapperTabla.innerHTML = `<div class="p-4 text-center text-red-500 text-xs">Error al cargar registros: ${error.message}</div>`;
  }
}

async function buscarPorFechas() {
  const fechaDesdeEl = document.getElementById("fecha-desde");
  const fechaHastaEl = document.getElementById("fecha-hasta");
  const wrapperTabla = document.getElementById("wrapper-grid-table-documentos");

  if (!fechaDesdeEl || !fechaHastaEl || !wrapperTabla) return;

  const fechaDesde = fechaDesdeEl.value;
  const fechaHasta = fechaHastaEl.value;

  if (!fechaDesde || !fechaHasta) {
    alert('Por favor, selecciona las fechas "Desde" y "Hasta".');
    return;
  }
  if (fechaDesde > fechaHasta) {
    alert('La fecha "Desde" no puede ser mayor que la fecha "Hasta".');
    return;
  }

  try {
    const clienteSupabase =
      window.supabaseClient ||
      window.supabase ||
      (typeof supabase !== "undefined" ? supabase : null);
    if (!clienteSupabase) return;

    const sesionUsuario = JSON.parse(
      sessionStorage.getItem("sesion_usuario") || "{}",
    );
    const sucursalIdLogueada =
      sesionUsuario.sucursal?.id ||
      localStorage.getItem("sucursal_id") ||
      sessionStorage.getItem("sucursal_id");

    if (!sucursalIdLogueada) {
      alert("No se encontró la sucursal activa en la sesión.");
      return;
    }

    wrapperTabla.innerHTML = `<div class="p-4 text-center text-slate-400 text-xs">Buscando registros por fecha...</div>`;

    // Consulta a la vista filtrando por sucursal y rango de fechas de ingreso
    const { data, error } = await clienteSupabase
      .from("vw_documentos_detallados")
      .select("*")
      .eq("sucursal_id", parseInt(sucursalIdLogueada))
      .gte("fecha_ingreso", fechaDesde + " 00:00:00")
      .lte("fecha_ingreso", fechaHasta + " 23:59:59");

    if (error) throw new Error(error.message);

    pintarTablaDocumentos(data);
  } catch (error) {
    console.error("❌ Error al buscar por fechas:", error);
    wrapperTabla.innerHTML = `<div class="p-4 text-center text-red-500 text-xs">Error al consultar los registros.</div>`;
  }
}

function pintarTablaDocumentos(datos) {
  const contenedor = document.getElementById("wrapper-grid-table-documentos");
  if (!contenedor) return;

  if (!datos || datos.length === 0) {
    contenedor.innerHTML = `
      <div class="flex items-center justify-center p-8 text-slate-400 text-xs">
        No se encontraron registros.
      </div>`;
    return;
  }

  contenedor.innerHTML = "";

  const rowsData = datos.map((item) => [
    item.codigo || "",
    item.correlativo || "",
    item.codigo_barras || "",
    item.doc_emitido || "",
    item.destinatario || "",
    item.direccion || "",
    `${item.departamento || ""} - ${item.provincia || ""} - ${item.distrito || ""}`,
    item.peso !== null && item.peso !== undefined
      ? Number(item.peso).toFixed(3)
      : "0.000",
    formatearFecha(item.fecha_ingreso),
    formatearFecha(item.fecha_descargo),
    formatearFecha(item.fecha_entrega),
    item.nombre_estado || "",
  ]);

  if (gridInstance) {
    gridInstance.destroy();
    gridInstance = null;
  }

  // Inicializar Grid.js con límite por defecto de 10
  gridInstance = new gridjs.Grid({
    columns: [
      "Tipo",
      "Guia",
      "Código de Barras",
      "Doc Emitido",
      "Destinatario",
      "Dirección",
      "Ubigeo",
      "Peso",
      "F. Ingreso",
      "F. Descargo",
      "F. Entrega",
      "Motivo",
    ],
    data: rowsData,
    pagination: { limit: 10 },
    search: true,
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
      table: { "font-size": "12px", width: "100%" },
      th: {
        "background-color": "#f8fafc",
        color: "#475569",
        "border-bottom": "1px solid #e2e8f0",
        padding: "10px",
      },
      td: {
        padding: "10px",
        "border-bottom": "1px solid #f1f5f9",
        color: "#334155",
      },
    },
  });

  gridInstance.render(contenedor);

  // 🔹 Insertar el selector de límite dinámicamente en el footer de la tabla
  setTimeout(() => {
    const summaryContainer = contenedor.querySelector(".gridjs-summary");
    if (summaryContainer && !contenedor.querySelector("#select-grid-limit")) {
      const selectHtml = `
        <span class="ml-4 inline-flex items-center gap-1 text-xs text-slate-500">
          Mostrar:
          <select id="select-grid-limit" class="border border-slate-300 rounded px-1 py-0.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option value="10" selected>10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
          filas
        </span>
      `;
      summaryContainer.insertAdjacentHTML("beforeend", selectHtml);

      // Evento al cambiar la cantidad
      const selectEl = contenedor.querySelector("#select-grid-limit");
      if (selectEl) {
        selectEl.addEventListener("change", (e) => {
          const nuevoLimite = parseInt(e.target.value, 10);
          gridInstance
            .updateConfig({
              pagination: { limit: nuevoLimite },
            })
            .forceRender();

          // Mantener el valor seleccionado después de redibujar
          setTimeout(() => {
            const nuevoSelect = contenedor.querySelector("#select-grid-limit");
            if (nuevoSelect) nuevoSelect.value = nuevoLimite;
          }, 50);
        });
      }
    }
  }, 100);
}

window.inicializarModuloEnvios = inicializarModuloEnvios;
// Funciones para el Modal de Descargo
function abrirModalDescargo() {
  // 1. Mostrar el modal (quitar la clase 'hidden')
  document.getElementById("modal-descargo").classList.remove("hidden");

  // 2. Cargar los motivos en el select desde Supabase
  window.cargarMotivoDescarga();

  // 3. Limpiar inputs previos si es necesario
  document.getElementById("modalCodigoInput").value = "";
  document.getElementById("lblDestinatario").textContent = "-";
  document.getElementById("lblDireccion").textContent = "-";
  document.getElementById("lblUbigeo").textContent = "-";
  document.getElementById("modalCodigoInput").focus();
}

function cerrarModalDescargo() {
  const modal = document.getElementById("modal-descargo");
  if (modal) modal.classList.add("hidden");
}

// Funciones para el Modal de Devolución
function abrirModalDevolucion() {
  const modal = document.getElementById("modal-devolucion");
  if (modal) modal.classList.remove("hidden");
  if (typeof lucide !== "undefined") lucide.createIcons();
}

function cerrarModalDevolucion() {
  const modal = document.getElementById("modal-devolucion");
  if (modal) modal.classList.add("hidden");
}

window.cargarMotivoDescarga = async function () {
  const selects = document.querySelectorAll(
    "#input-motivo-descargo, .input-motivo-descargo",
  );

  if (selects.length === 0) return;

  try {
    // 🛡️ Filtramos directamente en Supabase para que no traiga el ID 1
    const { data: estados, error } = await window.supabaseClient
      .from("estado")
      .select("*")
      .neq("id", 1); // Excluye el estado con ID 1

    if (error) throw new Error(error.message);

    let opcionesHtml = '<option value="">Seleccione...</option>';

    if (estados && estados.length > 0) {
      estados.forEach((estado) => {
        const idEstado = estado.id;
        const nombreEstado = (estado.nombre_estado || "").toUpperCase();

        if (idEstado && nombreEstado) {
          opcionesHtml += `<option value="${idEstado}">${nombreEstado}</option>`;
        }
      });
    }

    selects.forEach((select) => {
      select.innerHTML = opcionesHtml;
      select.disabled = false;
    });

    console.log(
      "✅ Tipos de Estado cargados correctamente (excluyendo ID 1 desde la consulta).",
    );
  } catch (error) {
    console.error("❌ Error al cargar tipos de estados:", error);
  }
};

// 2. Variable global para almacenar el ID del documento encontrado
window.idDocumentoSeleccionado = null;

// 3. Función para abrir el modal limpiando y preparando todo
function abrirModalDescargo() {
  const modal = document.getElementById("modal-descargo");
  if (modal) modal.classList.remove("hidden");

  if (typeof window.cargarMotivoDescarga === "function") {
    window.cargarMotivoDescarga();
  }

  const codigoInput = document.getElementById("modalCodigoInput");
  if (codigoInput) codigoInput.value = "";

  window.idDocumentoSeleccionado = null;

  const contenidoDatos = document.getElementById("modalDatosContenido");
  if (contenidoDatos) {
    contenidoDatos.innerHTML = `
            <div class="flex items-center gap-1.5"><span class="font-semibold text-slate-600 min-w-[85px]">Destinatario:</span> <span class="text-slate-400">-</span></div>
            <div class="flex items-center gap-1.5"><span class="font-semibold text-slate-600 min-w-[85px]">Dirección:</span> <span class="text-slate-400">-</span></div>
            <div class="flex items-center gap-1.5"><span class="font-semibold text-slate-600 min-w-[85px]">Ubigeo:</span> <span class="text-slate-400">-</span></div>
        `;
  }
}

// ==========================================
// 4. BUSCAR ENVÍO POR CÓDIGO DE BARRAS
// ==========================================
window.buscarEnvioParaDescargo = async function () {
  const codigoInput = document.getElementById("modalCodigoInput");
  const codigo = codigoInput ? codigoInput.value.trim() : "";

  if (!codigo) {
    mostrarToast(
      "Por favor, digite o escanee un código de barras o referencia.",
      "error",
    );
    if (codigoInput) codigoInput.focus();
    return;
  }

  const contenidoDatos = document.getElementById("modalDatosContenido");
  if (contenidoDatos) {
    contenidoDatos.innerHTML = `
            <div class="flex items-center gap-1.5"><span class="font-semibold text-slate-600 min-w-[85px]">Destinatario:</span> <span class="text-slate-400">Buscando...</span></div>
            <div class="flex items-center gap-1.5"><span class="font-semibold text-slate-600 min-w-[85px]">Dirección:</span> <span class="text-slate-400">...</span></div>
            <div class="flex items-center gap-1.5"><span class="font-semibold text-slate-600 min-w-[85px]">Ubigeo:</span> <span class="text-slate-400">...</span></div>
        `;
  }

  try {
    const { data, error } = await window.supabaseClient
      .from("documento")
      .select(
        `
                id,
                doc_emitido,
                destinatario,
                direccion,
                peso,
                estado_id,
                ubigeo_id,
                ubigeo:ubigeo_id (
                    departamento,
                    provincia,
                    distrito
                )
            `,
      )
      .eq("codigo_barras", codigo)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data)
      throw new Error(
        "No se encontró ningún envío con el código especificado.",
      );

    // 🛑 VALIDACIÓN: Si el estado es distinto de 1, ya fue descargado -> Limpiar campos
    if (Number(data.estado_id) !== 1) {
      window.idDocumentoSeleccionado = null;

      if (contenidoDatos) {
        contenidoDatos.innerHTML = `
                    <div class="flex items-center gap-1.5"><span class="font-semibold text-slate-600 min-w-[85px]">Destinatario:</span> <span class="text-amber-600 font-semibold">Ya fue descargado</span></div>
                    <div class="flex items-center gap-1.5"><span class="font-semibold text-slate-600 min-w-[85px]">Dirección:</span> <span class="text-slate-400">-</span></div>
                    <div class="flex items-center gap-1.5"><span class="font-semibold text-slate-600 min-w-[85px]">Ubigeo:</span> <span class="text-slate-400">-</span></div>
                `;
      }

      mostrarToast("El envío ya fue descargado anteriormente.", "error");

      // Limpiar input y enfocar para el siguiente escaneo
      if (codigoInput) {
        codigoInput.value = "";
        codigoInput.focus();
      }
      return;
    }

    // Si pasa la validación (estado_id === 1)
    window.idDocumentoSeleccionado = data.id;

    const ubigeoTexto = data.ubigeo
      ? `${data.ubigeo.departamento || ""} - ${data.ubigeo.provincia || ""} - ${data.ubigeo.distrito || ""}`
      : "No especificado";

    if (contenidoDatos) {
      contenidoDatos.innerHTML = `
                <div class="flex items-center gap-1.5">
                    <span class="font-semibold text-slate-600 min-w-[85px]">Destinatario:</span>
                    <span class="text-slate-800 font-medium">${data.destinatario || "-"}</span>
                </div>
                <div class="flex items-center gap-1.5">
                    <span class="font-semibold text-slate-600 min-w-[85px]">Dirección:</span>
                    <span class="text-slate-800">${data.direccion || "-"}</span>
                </div>
                <div class="flex items-center gap-1.5">
                    <span class="font-semibold text-slate-600 min-w-[85px]">Ubigeo:</span>
                    <span class="text-slate-800">${ubigeoTexto}</span>
                </div>
            `;
    }

    mostrarToast("Búsqueda satisfactoria.", "éxito");
    console.log("✅ Envío válido encontrado:", data);
  } catch (error) {
    console.error("❌ Error al buscar:", error);
    mostrarToast(error.message, "error");
    window.idDocumentoSeleccionado = null;

    if (contenidoDatos) {
      contenidoDatos.innerHTML = `
                <div class="flex items-center gap-1.5"><span class="font-semibold text-slate-600 min-w-[85px]">Destinatario:</span> <span class="text-rose-500">No encontrado</span></div>
                <div class="flex items-center gap-1.5"><span class="font-semibold text-slate-600 min-w-[85px]">Dirección:</span> <span class="text-slate-400">-</span></div>
                <div class="flex items-center gap-1.5"><span class="font-semibold text-slate-600 min-w-[85px]">Ubigeo:</span> <span class="text-slate-400">-</span></div>
            `;
    }

    if (codigoInput) {
      codigoInput.value = "";
      codigoInput.focus();
    }
  }
};

// ==========================================
// 5. CONFIRMAR Y ACTUALIZAR (UPDATE)
// ==========================================
window.confirmarAccionModal = async function () {
  if (!window.idDocumentoSeleccionado) {
    mostrarToast(
      "Primero debes buscar y seleccionar un envío pendiente válido.",
      "error",
    );
    return;
  }

  const fechaEntregaInput = document.getElementById("input-fecha-descargo");
  const estadoInput = document.getElementById("input-motivo-descargo");

  const fechaEntrega = fechaEntregaInput ? fechaEntregaInput.value : "";
  const estadoId = estadoInput ? estadoInput.value : "";

  if (!fechaEntrega) {
    mostrarToast("Por favor, selecciona la Fecha de Entrega.", "error");
    if (fechaEntregaInput) fechaEntregaInput.focus();
    return;
  }

  if (!estadoId) {
    mostrarToast("Por favor, selecciona un Motivo de Descargo.", "error");
    if (estadoInput) estadoInput.focus();
    return;
  }

  try {
    // Uso directo del UUID de Supabase y conversión del estado a número
    const idDocumento = window.idDocumentoSeleccionado;
    const idEstado = Number(estadoId);

    console.log("🚀 Ejecutando UPDATE para el ID UUID:", idDocumento);

    const { data, error } = await window.supabaseClient
      .from("documento")
      .update({
        fecha_entrega: fechaEntrega,
        estado_id: idEstado,
        fecha_descargo: new Date().toISOString(),
      })
      .eq("id", idDocumento)
      .select();

    if (error) throw new Error(error.message);

    if (!data || data.length === 0) {
      throw new Error(
        "No se encontró el registro para actualizar en la base de datos.",
      );
    }

    mostrarToast("Se descargó satisfactoriamente.", "éxito");
    console.log("✅ Documento actualizado con éxito:", data);

    if (typeof buscarPendientes === "function") {
      await buscarPendientes();
    }
    // 🧹 LIMPIAR TODOS LOS CAMPOS (Mantiene el modal abierto para continuar)
    window.idDocumentoSeleccionado = null;

    if (fechaEntregaInput) fechaEntregaInput.value = "";
    if (estadoInput) estadoInput.value = "";

    const codigoInput = document.getElementById("modalCodigoInput");
    if (codigoInput) {
      codigoInput.value = "";
      codigoInput.focus();
    }

    const contenidoDatos = document.getElementById("modalDatosContenido");
    if (contenidoDatos) {
      contenidoDatos.innerHTML = `
                <div class="flex items-center gap-1.5"><span class="font-semibold text-slate-600 min-w-[85px]">Destinatario:</span> <span class="text-slate-400">-</span></div>
                <div class="flex items-center gap-1.5"><span class="font-semibold text-slate-600 min-w-[85px]">Dirección:</span> <span class="text-slate-400">-</span></div>
                <div class="flex items-center gap-1.5"><span class="font-semibold text-slate-600 min-w-[85px]">Ubigeo:</span> <span class="text-slate-400">-</span></div>
            `;
    }
  } catch (error) {
    console.error("❌ Error al actualizar:", error);
    mostrarToast("Error al guardar: " + error.message, "error");
  }
};

// ==========================================
// MÓDULO DE DEVOLUCIÓN - VARIABLES GLOBALES
// ==========================================
let itemsDevolucionTemporal = [];
let gridInstanceDevolucion = null;

// Inicializar Grid.js para el modal de devolución
function inicializarGridDevolucion() {
  const contenedor = document.getElementById(
    "wrapper-gridjs-listado-devolucion",
  );
  if (!contenedor) return;

  const dataGrid = itemsDevolucionTemporal.map((item, index) => [
    item.codigo_barras,
    item.doc_emitido,
    item.destinatario,
    item.nombre_estado,
    index, // Pasamos el índice actual para identificar la fila a eliminar
  ]);

  if (gridInstanceDevolucion) {
    gridInstanceDevolucion.updateConfig({ data: dataGrid }).forceRender();
    return;
  }

  gridInstanceDevolucion = new gridjs.Grid({
    columns: [
      { name: "Código", width: "25%" },
      { name: "Doc Emitido", width: "20%" },
      { name: "Destinatario", width: "25%" },
      { name: "Estado", width: "20%" },
      {
        name: "Acción",
        width: "10%",
        formatter: (cell) => {
          // Aquí integramos tu botón con el SVG exacto que pediste
          return gridjs.html(`
            <button type="button" onclick="eliminarItemTemporal(${cell})" class="text-red-500 hover:text-red-700 p-1 transition-colors" title="Eliminar">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1,1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          `);
        },
      },
    ],
    data: dataGrid,
    style: {
      table: {
        "font-size": "11px",
        width: "100%",
      },
      th: {
        "background-color": "#f8fafc",
        color: "#475569",
        "font-weight": "600",
        padding: "6px 8px",
      },
      td: {
        padding: "5px 8px",
        color: "#334155",
      },
    },
    pagination: false,
    search: false,
    sort: false,
  }).render(contenedor);
}
// Cerrar modal
function cerrarModalDevolucion() {
  const modal = document.getElementById("modal-devolucion");
  if (modal) modal.classList.add("hidden");
}

// Función principal de búsqueda y agregado (con Supabase)
async function procesarBusquedaYAgregar() {
  const inputCodigo = document.getElementById("input-codigo-barras");
  const codigoBarras = inputCodigo ? inputCodigo.value.trim() : "";

  if (!codigoBarras) {
    if (typeof mostrarToast === "function") {
      mostrarToast("Por favor ingrese o escanee un código de barras.");
    } else {
      alert("Por favor ingrese o escanee un código de barras.");
    }
    return;
  }

  try {
    const { data, error } = await window.supabaseClient
      .from("documento")
      .select(
        `
        id,
        codigo_barras,
        doc_emitido,
        destinatario,
        direccion,
        estado_id,
        estado:estado_id ( nombre_estado )
      `,
      )
      .eq("codigo_barras", codigoBarras)
      .single();

    // 1. Si el código no existe
    if (error || !data) {
      if (typeof mostrarToast === "function") {
        mostrarToast("El código no existe");
      } else {
        alert("El código no existe");
      }
      inputCodigo.value = "";
      inputCodigo.focus();
      return;
    }

    // 2. Si el estado_id es igual a 1
    if (data.estado_id === 1) {
      if (typeof mostrarToast === "function") {
        mostrarToast("El documento debe de descargar y no agregar");
      } else {
        alert("El documento debe de descargar y no agregar");
      }
      inputCodigo.value = "";
      inputCodigo.focus();
      return;
    }

    // 3. Si ya existe en la lista temporal
    const yaExiste = itemsDevolucionTemporal.some(
      (item) => item.id === data.id,
    );
    if (yaExiste) {
      if (typeof mostrarToast === "function") {
        mostrarToast("Este documento ya ha sido agregado a la lista.");
      } else {
        alert("Este documento ya ha sido agregado a la lista.");
      }
      inputCodigo.value = "";
      inputCodigo.focus();
      return;
    }

    // Agregar al arreglo temporal
    itemsDevolucionTemporal.push({
      id: data.id,
      codigo_barras: data.codigo_barras,
      doc_emitido: data.doc_emitido || "-",
      destinatario: data.destinatario || "-",
      direccion: data.direccion || "-",
      nombre_estado: data.estado?.nombre_estado || "Desconocido",
    });

    // Actualizar cantidad superior
    const inputCantidad = document.getElementById("modal-cantidad-devolucion");
    if (inputCantidad) {
      inputCantidad.value = itemsDevolucionTemporal.length;
    }

    // Actualizar Grid.js interno del modal
    inicializarGridDevolucion();

    inputCodigo.value = "";
    inputCodigo.focus();
  } catch (err) {
    console.error("Error al consultar Supabase:", err);
    alert("Ocurrió un error al procesar la búsqueda.");
  }
}

// Eliminar item de la tabla temporal
function eliminarItemTemporal(index) {
  itemsDevolucionTemporal.splice(index, 1);

  const inputCantidad = document.getElementById("modal-cantidad-devolucion");
  if (inputCantidad) {
    inputCantidad.value = itemsDevolucionTemporal.length;
  }

  inicializarGridDevolucion();
}

// Guardado definitivo
window.guardarDevolucionesTotales = async function () {
  const tipoGuia = "devolucion";

  // Validación: asegura que existan ítems en la lista temporal de devoluciones
  if (
    typeof itemsDevolucionTemporal === "undefined" ||
    !itemsDevolucionTemporal ||
    itemsDevolucionTemporal.length === 0
  ) {
    if (typeof window.mostrarToast === "function") {
      window.mostrarToast(
        "Debe agregar al menos un envío antes de realizar el guardado definitivo.",
        "error",
      );
    } else {
      alert(
        "Debe agregar al menos un envío antes de realizar el guardado definitivo.",
      );
    }
    return;
  }

  let guiaIdGenerado = null;

  try {
    // 1. Recuperar los datos de sesión y sucursal activa
    const sesionUsuario = JSON.parse(
      sessionStorage.getItem("sesion_usuario") || "{}",
    );

    const sucursalId =
      sessionStorage.getItem("sucursal_id") ||
      sesionUsuario.sucursal?.id ||
      sesionUsuario.sucursal_id ||
      null;

    if (!sucursalId) {
      if (typeof window.mostrarToast === "function") {
        window.mostrarToast(
          "No se encontró la sucursal activa en la sesión. Vuelva a iniciar sesión.",
          "error",
        );
      }
      return;
    }

    // 2. Obtener el siguiente número correlativo filtrando por SUCURSAL y TIPO ('devolucion')
    const { data: ultimoCorrelativo, error: errCorr } =
      await window.supabaseClient
        .from("guia")
        .select("correlativo")
        .eq("tipo", tipoGuia)
        .eq("sucursal_id", sucursalId)
        .order("correlativo", { ascending: false })
        .limit(1);

    if (errCorr) throw errCorr;

    const siguienteCorrelativo =
      ultimoCorrelativo && ultimoCorrelativo.length > 0
        ? ultimoCorrelativo[0].correlativo + 1
        : 1;

    // 3. Insertar la guía maestra de tipo 'devolucion' (sin hoja de ruta)
    const { data: guiaInsertada, error: errGuia } = await window.supabaseClient
      .from("guia")
      .insert([
        {
          tipo: tipoGuia,
          correlativo: siguienteCorrelativo,
          cantidad: itemsDevolucionTemporal.length,
          sucursal_id: sucursalId,
        },
      ])
      .select()
      .single();

    if (errGuia) throw errGuia;

    guiaIdGenerado = guiaInsertada.id;

    // 4. Mapear los IDs de los documentos ya existentes en la lista temporal
    const relacionesGuiaDocumento = itemsDevolucionTemporal.map((item) => ({
      guia_id: guiaIdGenerado,
      documento_id: item.id, // ID real obtenido al buscar por código de barras
    }));

    // 5. Registrar las relaciones en la tabla intermedia 'guia_documento'
    const { error: errRelacion } = await window.supabaseClient
      .from("guia_documento")
      .insert(relacionesGuiaDocumento);

    // 🛑 ROLLBACK: Si falla la inserción en la tabla intermedia, borramos la guía creada
    if (errRelacion) {
      if (guiaIdGenerado) {
        await window.supabaseClient
          .from("guia")
          .delete()
          .eq("id", guiaIdGenerado);
      }
      throw errRelacion;
    }

    // Mensaje de éxito
    if (typeof window.mostrarToast === "function") {
      window.mostrarToast(
        `¡Guía de Devolución N° ${siguienteCorrelativo} guardada con éxito!`,
        "success",
      );
    } else {
      alert("¡Guía de devolución y relaciones guardadas con éxito!");
    }

    // ==========================================
    // 📄 GENERAR Y MOSTRAR EL REPORTE AUTOMÁTICAMENTE
    // ==========================================
    if (
      typeof window.generarReporteGuiaDevolucion === "function" &&
      guiaIdGenerado
    ) {
      await window.generarReporteGuiaDevolucion(guiaIdGenerado);
    } else {
      console.warn(
        "La función generarReporteGuiaDevolucion no está disponible globalmente.",
      );
    }

    // ==========================================
    // 🧹 LIMPIEZA Y RESTABLECIMIENTO DE INTERFAZ
    // ==========================================
    itemsDevolucionTemporal = [];

    const inputCantidad = document.getElementById("modal-cantidad-devolucion");
    if (inputCantidad) inputCantidad.value = 0;

    if (typeof inicializarGridDevolucion === "function") {
      inicializarGridDevolucion();
    }

    if (typeof cerrarModalDevolucion === "function") {
      cerrarModalDevolucion();
    }

    // Refrescar listados si aplica
    if (typeof window.listarEnviosDiarios === "function") {
      window.listarEnviosDiarios();
    }
  } catch (err) {
    console.error("Error al guardar devolución:", err);
    if (typeof window.mostrarToast === "function") {
      window.mostrarToast(
        "Hubo un error al registrar la devolución: " + err.message,
        "error",
      );
    } else {
      alert("Hubo un error al registrar la devolución: " + err.message);
    }
  }
};
// Evento Enter key
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(inicializarGridDevolucion, 100);

  const inputCodigo = document.getElementById("input-codigo-barras");
  if (inputCodigo) {
    inputCodigo.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        procesarBusquedaYAgregar();
      }
    });
  }
});
