document.addEventListener("keydown", function (event) {
  // Verificamos si la tecla presionada es ENTER
  if (event.key === "Enter") {
    const activo = document.activeElement;

    // Lista exacta de los IDs de los inputs y selects en orden de navegación
    const idsCampos = [
      "modalCodigoInput",
      "input-motivo-descargo",
      "input-fecha-descargo",
    ];

    // Comprobamos si el elemento donde estás parado está dentro de la lista
    const indiceActual = idsCampos.indexOf(activo.id);

    if (indiceActual !== -1) {
      event.preventDefault(); // Evita envíos accidentales o recargas

      // Si estás en el ÚLTIMO campo de la lista
      if (indiceActual === idsCampos.length - 1) {
        // Aquí puedes invocar la función que confirma o procesa todo el formulario (ej: confirmarAccionModal)
        if (typeof window.confirmarAccionModal === "function") {
          window.confirmarAccionModal();
        }
      } else {
        // Si estás en campos intermedios, salta automáticamente al siguiente campo
        const siguienteId = idsCampos[indiceActual + 1];
        const siguienteElemento = document.getElementById(siguienteId);

        if (siguienteElemento) {
          siguienteElemento.focus();
          // Si es un input de texto, seleccionamos el texto para agilizar
          if (
            siguienteElemento.tagName === "INPUT" &&
            siguienteElemento.type === "text"
          ) {
            siguienteElemento.select();
          }
        }
      }
    }
  }
});

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
      .from("vista_detalles_envios")
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
      .from("vista_detalles_envios")
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

window.pintarTablaDocumentos = function (datos) {
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

  // Mapeo seguro usando los campos exactos de tu vista SQL
  const rowsData = datos.map((item) => {
    const itemString = encodeURIComponent(JSON.stringify(item));

    return [
      item.servicio || "", // Corresponde a ts.codigo AS servicio
      item.hoja_ruta || "", // Corresponde a d.hoja_ruta
      item.codigo_barras || "",
      item.doc_emitido || "",
      item.destinatario || "",
      item.direccion || "",
      `${item.departamento || ""} - ${item.provincia || ""} - ${item.distrito || ""}`, // Concatenación de ubigeo
      item.peso !== null && item.peso !== undefined
        ? Number(item.peso).toFixed(3)
        : "0.000",
      formatearFecha(item.fecha_ingreso),
      formatearFecha(item.fecha_descargo),
      formatearFecha(item.fecha_entrega),
      item.nombre_estado || "",
      // Columna de acciones pasando el objeto completo cifrado
      gridjs.html(`
        <div class="flex items-center justify-center">
          <button type="button" 
            onclick="window.abrirModalEditarRegistro(JSON.parse(decodeURIComponent('${itemString}')))"
            class="inline-flex items-center justify-center p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer" 
            title="Editar registro">
            <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
        </div>
      `),
    ];
  });

  if (window.gridInstance) {
    window.gridInstance.destroy();
    window.gridInstance = null;
  }

  // Inicializar Grid.js con las columnas ordenadas
  window.gridInstance = new gridjs.Grid({
    columns: [
      "Tipo",
      "Hoja Ruta",
      "Código de Barras",
      "Doc Emitido",
      "Destinatario",
      "Dirección",
      "Ubigeo",
      "Peso",
      "F. Ingreso",
      "F. Descargo",
      "F. Entrega",
      "Estado",
      "Acciones",
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

  window.gridInstance.render(contenedor);

  // Inserción del selector de límite dinámicamente
  setTimeout(() => {
    const summaryContainer = contenedor.querySelector(".gridjs-summary");
    if (summaryContainer && !contenedor.querySelector("#select-grid-limit")) {
      const selectHtml = `
        <span class="ml-4 inline-flex items-center gap-1 text-xs text-slate-500">
          Mostrar:
          <select id="select-grid-limit" class="border border-slate-300 rounded px-1.5 py-0.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer">
            <option value="10" selected>10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
          filas
        </span>
      `;
      summaryContainer.insertAdjacentHTML("beforeend", selectHtml);

      const selectEl = contenedor.querySelector("#select-grid-limit");
      if (selectEl) {
        selectEl.addEventListener("change", (e) => {
          const nuevoLimite = parseInt(e.target.value, 10);
          window.gridInstance
            .updateConfig({
              pagination: { limit: nuevoLimite },
            })
            .forceRender();

          setTimeout(() => {
            const nuevoSelect = contenedor.querySelector("#select-grid-limit");
            if (nuevoSelect) nuevoSelect.value = nuevoLimite;
          }, 50);
        });
      }
    }
  }, 100);
};

window.inicializarModuloEnvios = inicializarModuloEnvios;
// Funciones para el Modal de Devolución
window.abrirModalDevolucion = function () {
  const modal = document.getElementById("modal-devolucion");
  if (modal) modal.classList.remove("hidden");

  if (typeof lucide !== "undefined") lucide.createIcons();

  // 🚀 Enviar el foco automáticamente al campo de código de barras
  const codigoInput = document.getElementById("input-codigo-barras");
  if (codigoInput) {
    codigoInput.value = ""; // Limpia por si quedó algo anterior
    setTimeout(() => {
      codigoInput.focus();
    }, 50);
  }
};

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
window.abrirModalDescargo = function () {
  const modal = document.getElementById("modal-descargo");
  if (modal) modal.classList.remove("hidden");

  if (typeof window.cargarMotivoDescarga === "function") {
    window.cargarMotivoDescarga();
  }

  const codigoInput = document.getElementById("modalCodigoInput");
  if (codigoInput) {
    codigoInput.value = "";
  }

  window.idDocumentoSeleccionado = null;

  const contenidoDatos = document.getElementById("modalDatosContenido");
  if (contenidoDatos) {
    contenidoDatos.innerHTML = `
            <div class="flex items-center gap-1.5"><span class="font-semibold text-slate-600 min-w-[85px]">Destinatario:</span> <span class="text-slate-400">-</span></div>
            <div class="flex items-center gap-1.5"><span class="font-semibold text-slate-600 min-w-[85px]">Dirección:</span> <span class="text-slate-400">-</span></div>
            <div class="flex items-center gap-1.5"><span class="font-semibold text-slate-600 min-w-[85px]">Ubigeo:</span> <span class="text-slate-400">-</span></div>
        `;
  }

  // 🚀 Enviar el foco automáticamente al campo de código de barras
  if (codigoInput) {
    setTimeout(() => {
      codigoInput.focus();
    }, 50);
  }
};
function cerrarModalDescargo() {
  const modal = document.getElementById("modal-descargo");
  if (modal) modal.classList.add("hidden");
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

      // Limpiar input y enfocar nuevamente para el siguiente escaneo
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

    // 🚀 SALTO DE FOCO: Si la búsqueda fue exitosa, saltar al selector de Motivo de Descargo
    const selectMotivo = document.getElementById("input-motivo-descargo");
    if (selectMotivo) {
      selectMotivo.focus();
    }
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
// CONFIGURAR DETECCIÓN AUTOMÁTICA CON LA PISTOLA (ENTER)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  const codigoInput = document.getElementById("modalCodigoInput");
  if (codigoInput) {
    codigoInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault(); // Evita recargas o envíos accidentales de formularios
        window.buscarEnvioParaDescargo(); // Ejecuta la búsqueda automáticamente
      }
    });
  }
});

// ==========================================
// CONFIGURAR DETECCIÓN AUTOMÁTICA CON PISTOLA / ENTER
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  const codigoInput = document.getElementById("modalCodigoInput");
  if (codigoInput) {
    codigoInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault(); // Evita comportamientos por defecto del formulario
        window.buscarEnvioParaDescargo(); // Ejecuta la búsqueda automáticamente
      }
    });
  }
});
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
        mostrarToast("El documento debe ser descargado antes de devolver ");
      } else {
        alert("El documento debe ser descargado antes de devolverr");
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

/* ============================================================
   ABRIR MODAL EDITAR REGISTRO
============================================================ */
let itemActualEnEdicion = null;

window.abrirModalEditarRegistro = function (item) {
  console.log("Abriendo modal de edición para:", item);

  // 🎯 Guardamos el objeto completo en la variable global para acceder a su ID y demás datos
  itemActualEnEdicion = item;

  const modal = document.getElementById("modal-editar-registro");
  if (!modal) {
    console.error(
      "❌ No se encontró el elemento #modal-editar-registro en el DOM",
    );
    return;
  }

  // 1. Rellenar el código de barras en la cabecera
  const spanCodigo = document.getElementById("codigo-barras-editar");
  if (spanCodigo) {
    spanCodigo.textContent = item.codigo_barras || item.id || "---";
  }

  // 2. Rellenar los campos básicos del formulario
  const campos = {
    "input-hoja-ruta-edicion": item.hoja_ruta || "",
    "input-documento-edicion": item.doc_emitido || item.documento || "",
    "input-destinatario-edicion": item.destinatario || "",
    "input-direccion-edicion": item.direccion || "",
    "input-peso-edicion": item.peso || "",
  };

  for (const [id, valor] of Object.entries(campos)) {
    const elemento = document.getElementById(id);
    if (elemento) elemento.value = valor;
  }

  // 🎯 2.1 CARGAR EL TIPO DE SERVICIO REUTILIZANDO TU FUNCIÓN
  if (typeof cargarTiposDeServicio === "function") {
    const valorServicio =
      item.tipo_servicio_id || item.tipo_servicio || item.servicio || "";
    cargarTiposDeServicio("input-tipo-servicio-edicion", valorServicio);
  }

  // 3. Mostrar el Ubigeo actual fijo al abrir (Departamento, Provincia, Distrito)
  const inputDepartamento = document.getElementById(
    "input-departamento-edicion",
  );
  const inputProvincia = document.getElementById("input-provincia-edicion");
  const inputDistrito = document.getElementById("input-distrito-edicion");

  if (inputDepartamento) {
    inputDepartamento.innerHTML = `<option value="${item.departamento_id || item.departamento || ""}">${item.departamento || "Seleccione..."}</option>`;
    inputDepartamento.value = item.departamento_id || item.departamento || "";
  }

  if (inputProvincia) {
    inputProvincia.innerHTML = `<option value="${item.provincia_id || item.provincia || ""}">${item.provincia || "Seleccione..."}</option>`;
    inputProvincia.value = item.provincia_id || item.provincia || "";
  }

  if (inputDistrito) {
    inputDistrito.innerHTML = `<option value="${item.ubigeo_id || item.ubigeo || item.distrito_id || ""}">${item.distrito || item.ubigeo_nombre || "Seleccione..."}</option>`;
    inputDistrito.value =
      item.ubigeo_id || item.ubigeo || item.distrito_id || "";
  }

  // 4. Asegurar que al abrir el modal el checkbox esté inactivo y los selects bloqueados
  const checkUbicacion = document.getElementById("check-editar-ubicacion");
  if (checkUbicacion) {
    checkUbicacion.checked = false;
    window.toggleUbicacionEdicion(checkUbicacion);
  }

  // 5. Mostrar el modal y bloquear el scroll de fondo
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  document.body.classList.remove("overflow-hidden");
};

// Función para controlar la activación del Checkbox de Ubigeo
window.toggleUbicacionEdicion = function (checkbox) {
  const deptSelect = document.getElementById("input-departamento-edicion");
  const provSelect = document.getElementById("input-provincia-edicion");
  const distSelect = document.getElementById("input-distrito-edicion");

  const isEnabled = checkbox.checked;

  if (isEnabled) {
    // 1. Habilitar departamento
    if (deptSelect) {
      deptSelect.disabled = false;
      deptSelect.value = ""; // Limpiamos selección anterior para obligar a elegir
    }

    // 2. Bloquear y resetear provincia y distrito
    if (provSelect) {
      provSelect.innerHTML = '<option value="">Seleccione...</option>';
      provSelect.disabled = true;
    }
    if (distSelect) {
      distSelect.innerHTML = '<option value="">Seleccione...</option>';
      distSelect.disabled = true;
    }

    // 3. 🎯 CARGAR TODOS LOS DEPARTAMENTOS DESDE SUPABASE
    if (typeof window.cargarDepartamentos === "function") {
      window.cargarDepartamentos("-edicion");
    }
  } else {
    // Si se desmarca, restauramos los datos originales del envío
    if (itemActualEnEdicion) {
      if (deptSelect) {
        deptSelect.innerHTML = `<option value="${itemActualEnEdicion.departamento_id || itemActualEnEdicion.departamento || ""}">${itemActualEnEdicion.departamento || ""}</option>`;
        deptSelect.value =
          itemActualEnEdicion.departamento_id ||
          itemActualEnEdicion.departamento ||
          "";
        deptSelect.disabled = true;
      }
      if (provSelect) {
        provSelect.innerHTML = `<option value="${itemActualEnEdicion.provincia_id || itemActualEnEdicion.provincia || ""}">${itemActualEnEdicion.provincia || ""}</option>`;
        provSelect.value =
          itemActualEnEdicion.provincia_id ||
          itemActualEnEdicion.provincia ||
          "";
        provSelect.disabled = true;
      }
      if (distSelect) {
        distSelect.innerHTML = `<option value="${itemActualEnEdicion.ubigeo || itemActualEnEdicion.distrito_id || ""}">${itemActualEnEdicion.distrito || itemActualEnEdicion.ubigeo_nombre || ""}</option>`;
        distSelect.value =
          itemActualEnEdicion.ubigeo || itemActualEnEdicion.distrito_id || "";
        distSelect.disabled = true;
      }
    }
  }
};

// Función para guardar cambios (puedes adaptarla a tu endpoint)
window.guardarCambiosEdicionRegistro = async function () {
  if (!itemActualEnEdicion) {
    console.error("❌ No hay ningún ítem en edición.");
    alert("Error: No se encontró el registro a editar.");
    return;
  }

  // 🎯 Capturamos correctamente el ID usando 'documento_id' que es como viene en tu objeto
  const idRegistro = itemActualEnEdicion.documento_id || itemActualEnEdicion.id;

  if (!idRegistro) {
    alert("El registro actual no cuenta con un ID válido.");
    return;
  }

  // 1. Obtener los valores actualizados de los inputs del modal
  const hojaRuta =
    document.getElementById("input-hoja-ruta-edicion")?.value.trim() || "";
  const tipoServicio =
    document.getElementById("input-tipo-servicio-edicion")?.value || "";
  const documentoEm =
    document.getElementById("input-documento-edicion")?.value.trim() || "";
  const destinatario =
    document.getElementById("input-destinatario-edicion")?.value.trim() || "";
  const direccion =
    document.getElementById("input-direccion-edicion")?.value.trim() || "";
  const peso =
    parseFloat(document.getElementById("input-peso-edicion")?.value) || 0;

  // 2. Validaciones básicas obligatorias
  if (!hojaRuta) {
    if (window.mostrarToast)
      window.mostrarToast("La hoja de ruta es obligatoria.", "error");
    document.getElementById("input-hoja-ruta-edicion")?.focus();
    return;
  }

  if (!tipoServicio) {
    if (window.mostrarToast)
      window.mostrarToast("Debes seleccionar un tipo de servicio.", "error");
    document.getElementById("input-tipo-servicio-edicion")?.focus();
    return;
  }

  // 3. Manejar el Ubigeo según el estado del Checkbox de edición
  const checkUbicacion = document.getElementById("check-editar-ubicacion");
  let ubigeoFinal =
    itemActualEnEdicion.ubigeo_id || itemActualEnEdicion.ubigeo || "";

  if (checkUbicacion && checkUbicacion.checked) {
    const selectDistrito = document.getElementById("input-distrito-edicion");
    ubigeoFinal = selectDistrito ? selectDistrito.value : "";

    if (!ubigeoFinal) {
      if (window.mostrarToast) {
        window.mostrarToast(
          "Has activado la actualización de ubicación. Por favor, selecciona un departamento, provincia y distrito válidos.",
          "error",
        );
      }
      return;
    }
  }

  // 4. Construir el objeto con los campos exactos para Supabase
  const datosActualizados = {
    tipo_servicio_id: tipoServicio,
    doc_emitido: documentoEm,
    destinatario: destinatario,
    direccion: direccion,
    ubigeo_id: ubigeoFinal,
    peso: peso,
    hoja_ruta: hojaRuta,
  };

  // 5. Confirmar la acción antes de ejecutar el update en la base de datos
  confirmarAccion(
    "¿Estás seguro?",
    "¿Estás seguro de que deseas actualizar los datos?",
    async () => {
      try {
        console.log(
          "Enviando actualización a Supabase para el ID:",
          idRegistro,
          datosActualizados,
        );

        // 🎯 EJECUTAR EL UPDATE EN LA TABLA "documento"
        const { data, error } = await window.supabaseClient
          .from("documento")
          .update(datosActualizados)
          .eq("id", idRegistro);

        if (error) {
          throw new Error(error.message);
        }

        console.log(
          "✅ Registro actualizado correctamente en la base de datos:",
          data,
        );

        if (window.mostrarToast) {
          window.mostrarToast("¡Cambios guardados con éxito!", "success");
        }

        // Cerrar el modal de edición y limpiar la vista
        const modal = document.getElementById("modal-editar-registro");
        if (modal) {
          modal.classList.add("hidden");
          modal.classList.remove("flex");
          document.body.classList.remove("overflow-hidden");
        }

        // 🔄 Refrescar todas las tablas/listas posibles de la interfaz
        if (typeof window.pintarTablaDocumentos === "function") {
          window.pintarTablaDocumentos();
        }
        if (typeof window.buscarPendientes === "function") {
          await window.buscarPendientes();
        }
        if (typeof window.cargarRegistros === "function") {
          window.cargarRegistros();
        }
        if (typeof window.buscarEnvios === "function") {
          window.buscarEnvios();
        }
        if (typeof window.listarEnviosDiarios === "function") {
          window.listarEnviosDiarios();
        }

      } catch (err) {
        console.error("❌ Error al actualizar el registro:", err);
        alert(
          "Ocurrió un error al guardar en la base de datos: " + err.message,
        );
      }
    },
  );
};

window.cerrarModalEditarRegistro = function () {
  const modal = document.getElementById("modal-editar-registro");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    document.body.classList.remove("overflow-hidden");
  }
};
