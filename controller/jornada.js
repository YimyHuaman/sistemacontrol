// Variable global para almacenar los carteros de la jornada actual
let carterosJornada = [];
let carteroEnEdicion = null;

// Esta función es llamada automáticamente por tu router al abrir "jornada"
window.cargarMensajeros = async function () {
  await obtenerCarterosDesdeSupabase();
  verificarCierreAutomatico();
};

// 1. Consulta a Supabase filtrando por cargo 'MENSAJERO'
async function obtenerCarterosDesdeSupabase() {
  if (typeof mostrarSpinner === "function") {
    mostrarSpinner("Cargando carteros...");
  }

  try {
    const { data, error } = await window.supabaseClient
      .from("colaborador")
      .select("*")
      .eq("cargo", "MENSAJERO") // <--- Aquí aplicamos tu filtro exacto
      .order("id", { ascending: true });

    if (error) throw error;

    // Mapeamos los datos de Supabase al formato que usa nuestra interfaz de jornada
    carterosJornada = (data || []).map((item) => ({
      id: item.id,
      nombre: item.nombres,
      cargo: item.cargo,
      estado: "pendiente", // Estado inicial del día
      entregados: 0,
      devueltos: 0,
      hora: null,
      tipoCierre: null,
    }));

    renderizarTarjetasCarteros();
  } catch (error) {
    console.error("Error al cargar carteros:", error.message);
    if (window.mostrarToast) {
      window.mostrarToast("Error al cargar los carteros", "error");
    } else {
      alert("Error al cargar los carteros: " + error.message);
    }
  } finally {
    if (typeof ocultarSpinner === "function") {
      ocultarSpinner();
    }
  }
}

// 2. Renderizar las tarjetas dinámicamente en el contenedor
// 2. Renderizar las tarjetas dinámicamente en el contenedor con ordenamiento y diseño compacto
async function obtenerCarterosDesdeSupabase() {
  if (typeof mostrarSpinner === "function") {
    mostrarSpinner("Cargando carteros y estados...");
  }

  try {
    // 1. Consultar carteros con cargo MENSAJERO
    const { data: carterosData, error: errorCarteros } =
      await window.supabaseClient
        .from("colaborador")
        .select("*")
        .eq("cargo", "MENSAJERO")
        .order("id", { ascending: true });

    if (errorCarteros) throw errorCarteros;

    // 2. Consultar las entregas realizadas hoy para cruzar la información
    const hoyInicio = new Date();
    hoyInicio.setHours(0, 0, 0, 0);

    const { data: entregasHoy, error: errorEntregas } =
      await window.supabaseClient
        .from("entregas")
        .select("*")
        .gte("fecha", hoyInicio.toISOString());

    if (errorEntregas) throw errorEntregas;

    // 3. Mapear y cruzar datos (si ya tiene entrega hoy, se marca como cerrado automáticamente)
    carterosJornada = (carterosData || []).map((item) => {
      const entregaHoy = (entregasHoy || []).find(
        (e) => e.colaborador_id === item.id,
      );
      const estaCerrado = !!entregaHoy;

      let horaFormateada = null;
      if (entregaHoy && entregaHoy.fecha) {
        const fechaObj = new Date(entregaHoy.fecha);
        horaFormateada = fechaObj.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      }

      return {
        id: item.id,
        nombre: item.nombres,
        cargo: item.cargo,
        estado: estaCerrado ? "cerrado" : "pendiente",
        entregados: entregaHoy ? entregaHoy.entregados : 0,
        devueltos: entregaHoy ? entregaHoy.devueltos : 0,
        total: entregaHoy ? entregaHoy.total : 0,
        hora: horaFormateada,
        tipoCierre: estaCerrado ? "MANUAL" : null,
      };
    });

    renderizarTarjetasCarteros();
  } catch (error) {
    console.error("Error al cargar carteros:", error.message);
    if (window.mostrarToast) {
      window.mostrarToast("Error al cargar la información", "error");
    } else {
      alert("Error al cargar los datos: " + error.message);
    }
  } finally {
    if (typeof ocultarSpinner === "function") {
      ocultarSpinner();
    }
  }
}

// 3. Funciones del Modal y Cierre Automático a las 6:00 PM
function abrirModalRendicion(id) {
  carteroEnEdicion = carterosJornada.find((c) => c.id === id);
  if (!carteroEnEdicion || carteroEnEdicion.estado === "cerrado") return;

  document.getElementById("modal-titulo-cartero").innerText =
    `Rendición: ${carteroEnEdicion.nombre}`;
  document.getElementById("input-cartero-id").value = id;
  document.getElementById("input-entregados").value = "";
  document.getElementById("input-devueltos").value = "";
  document.getElementById("label-total-modal").innerText = "0";
  document.getElementById("modal-rendicion").classList.remove("hidden");
  if (typeof lucide !== "undefined") lucide.createIcons();
}

function cerrarModalRendicion() {
  document.getElementById("modal-rendicion").classList.add("hidden");
}

function calcularTotalModal() {
  const entregados =
    parseInt(document.getElementById("input-entregados").value) || 0;
  const devueltos =
    parseInt(document.getElementById("input-devueltos").value) || 0;
  document.getElementById("label-total-modal").innerText =
    entregados + devueltos;
}

async function guardarRendicionCartero(e) {
  e.preventDefault();

  // 1. Bloquear de inmediato el botón para evitar doble clic accidental
  const btnSubmit = e.target.querySelector('button[type="submit"]');
  const textoOriginalBtn = btnSubmit ? btnSubmit.innerText : "Guardar Cierre";

  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.innerText = "Guardando...";
  }

  const entregados =
    parseInt(document.getElementById("input-entregados").value) || 0;
  const devueltos =
    parseInt(document.getElementById("input-devueltos").value) || 0;
  const totalCalculado = entregados + devueltos;

  if (!carteroEnEdicion) {
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerText = textoOriginalBtn;
    }
    return;
  }

  if (typeof mostrarSpinner === "function") {
    mostrarSpinner("Verificando y guardando cierre...");
  }

  try {
    // 2. Obtener la fecha actual (00:00:00) para validar el día en curso
    const hoyInicio = new Date();
    hoyInicio.setHours(0, 0, 0, 0);

    // 3. Consulta previa: Validar si ya existe un registro hoy para este cartero
    const { data: registrosExistentes, error: errorConsulta } =
      await window.supabaseClient
        .from("entregas")
        .select("id, fecha")
        .eq("colaborador_id", carteroEnEdicion.id)
        .gte("fecha", hoyInicio.toISOString());

    if (errorConsulta) throw errorConsulta;

    if (registrosExistentes && registrosExistentes.length > 0) {
      if (window.mostrarToast) {
        window.mostrarToast(
          "¡Ya existe un registro de cierre para este cartero hoy!",
          "error",
        );
      } else {
        alert(
          "Ya existe un registro de cierre para este cartero el día de hoy.",
        );
      }
      cerrarModalRendicion();
      return;
    }

    // 4. Inserción en Supabase con total explícito
    const { error: errorSupabase } = await window.supabaseClient
      .from("entregas")
      .insert([
        {
          colaborador_id: carteroEnEdicion.id,
          entregados: entregados,
          devueltos: devueltos,
          total: totalCalculado,
          fecha: new Date().toISOString(),
        },
      ]);

    if (errorSupabase) {
      // Capturar si la BD bloqueó un intento de duplicado concurrente
      if (errorSupabase.code === "23505") {
        throw new Error(
          "Ya existe un registro registrado para hoy en la base de datos.",
        );
      }
      throw errorSupabase;
    }

    // 5. Actualizar estado local en la interfaz
    const ahora = new Date();
    carteroEnEdicion.entregados = entregados;
    carteroEnEdicion.devueltos = devueltos;
    carteroEnEdicion.total = totalCalculado;
    carteroEnEdicion.estado = "cerrado";
    carteroEnEdicion.hora = ahora.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    carteroEnEdicion.tipoCierre = "MANUAL";

    if (window.mostrarToast) {
      window.mostrarToast("¡Rendición guardada con éxito!", "success");
    }

    cerrarModalRendicion();
    renderizarTarjetasCarteros();
  } catch (error) {
    console.error("Error al guardar la rendición:", error.message);
    if (window.mostrarToast) {
      window.mostrarToast("Error al guardar: " + error.message, "error");
    } else {
      alert("Hubo un error al guardar en la base de datos: " + error.message);
    }
  } finally {
    // Restaurar estado del botón y ocultar cargador
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerText = textoOriginalBtn;
    }
    if (typeof ocultarSpinner === "function") {
      ocultarSpinner();
    }
  }
}

// Variable para almacenar el texto de búsqueda actual
let textoBusquedaFiltro = "";

// Función que captura lo que escribes en el buscador
function filtrarCarteros() {
  const input = document.getElementById("input-buscar-cartero");
  textoBusquedaFiltro = input ? input.value.toLowerCase().trim() : "";
  renderizarTarjetasCarteros();
}

function renderizarTarjetasCarteros() {
  const contenedor = document.getElementById("contenedor-tarjetas-carteros");
  if (!contenedor) return;

  contenedor.innerHTML = "";

  // 1. Filtrar por el texto de búsqueda
  const carterosFiltrados = carterosJornada.filter((c) =>
    c.nombre.toLowerCase().includes(textoBusquedaFiltro),
  );

  if (carterosFiltrados.length === 0) {
    contenedor.innerHTML = `
      <div class="col-span-full bg-white p-3 rounded-xl border border-slate-200 text-center text-slate-500 text-xs">
        No se encontraron carteros que coincidan con la búsqueda.
      </div>
    `;
    return;
  }

  // 2. ORDENAR: Pendientes primero
  const carterosOrdenados = [...carterosFiltrados].sort((a, b) => {
    if (a.estado === "pendiente" && b.estado !== "pendiente") return -1;
    if (a.estado !== "pendiente" && b.estado === "pendiente") return 1;
    return 0;
  });

  carterosOrdenados.forEach((c) => {
    const estaCerrado = c.estado === "cerrado";

    contenedor.innerHTML += `
      <div class="bg-white p-2 rounded-xl shadow-xs border ${estaCerrado ? "bg-slate-50/70 border-slate-200 opacity-80" : "border-slate-200 hover:border-red-300"} transition flex flex-col justify-between h-full text-center">
        <div>
          <!-- Cabecera compacta de la tarjeta -->
          <div class="flex justify-between items-center mb-1.5 gap-1">
            <span class="text-[8px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase truncate">#${c.id}</span>
            
            <span class="text-[8px] font-semibold px-1.5 py-0.5 rounded leading-none ${
              estaCerrado
                ? c.tipoCierre === "AUTOMATICO_7PM"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                : "bg-red-100 text-red-600 border border-red-200 animate-pulse"
            }">
              ${estaCerrado ? (c.tipoCierre === "AUTOMATICO_7PM" ? "7 PM" : "Cerrado") : "Pendiente"}
            </span>
          </div>

          <!-- Avatar / Imagen + Nombre centrados -->
          <div class="flex flex-col items-center justify-center my-1.5 gap-1">
            <div class="w-8 h-8 flex-shrink-0 bg-blue-50 border border-blue-100 rounded-full overflow-hidden flex items-center justify-center p-0.5 shadow-xs">
              <img src="resources/avatar.png" alt="Avatar" class="w-full h-full object-cover">
            </div>
            <h3 class="text-[10px] font-bold text-slate-800 leading-tight line-clamp-2 px-1" title="${c.nombre}">
              ${c.nombre}
            </h3>
          </div>

          <!-- Resumen si ya rindió -->
          ${
            estaCerrado
              ? `
            <div class="text-[9px] text-slate-600 space-y-0.5 bg-slate-50 p-1.5 rounded-md border border-slate-200/80 my-1.5 text-left">
              <div class="flex justify-between"><span>Entregados:</span> <b class="text-slate-800">${c.entregados}</b></div>
              <div class="flex justify-between"><span>Devueltos:</span> <b class="text-slate-800">${c.devueltos}</b></div>
              <div class="flex justify-between border-t pt-0.5 font-semibold text-slate-700"><span>Total:</span> <b class="text-blue-600">${c.total}</b></div>
              <div class="flex justify-between text-slate-400 text-[8px] border-t pt-0.5"><span>Hora:</span> <span>${c.hora}</span></div>
            </div>
          `
              : ""
          }
        </div>

        <!-- Botón o indicador final -->
        <div class="mt-1.5">
          ${
            !estaCerrado
              ? `
            <button onclick="abrirModalRendicion(${c.id})" 
              class="w-full py-1.5 bg-red-50 text-red-600 font-semibold text-[10px] rounded-lg hover:bg-red-600 hover:text-white transition flex items-center justify-center gap-1 border border-red-100 shadow-xs">
              <i data-lucide="package-check" class="w-3 h-3"></i> Cierre
            </button>
          `
              : `
            <div class="text-center text-[9px] text-emerald-600 font-medium py-1 flex items-center justify-center gap-1 bg-emerald-50/50 rounded-lg border border-emerald-100">
              <i data-lucide="check-circle-2" class="w-3 h-3 text-emerald-500"></i> Listo
            </div>
          `
          }
        </div>
      </div>
    `;
  });

  if (typeof lucide !== "undefined") lucide.createIcons();
}
// Reloj y verificación del límite de las 6:00 PM (18:00 hrs)
function verificarCierreAutomatico() {
  const ahora = new Date();
  const relojEl = document.getElementById("reloj-jornada");
  if (relojEl) relojEl.innerText = ahora.toLocaleTimeString();

  const horaActual = ahora.getHours();

  // Cambiamos de 18 (6 PM) a 19 (7 PM)
  if (horaActual >= 19) {
    const badge = document.getElementById("badge-estado-jornada");
    if (badge) {
      badge.innerText = "Jornada Cerrada (7 PM)";
      badge.className =
        "text-[11px] font-medium px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800";
    }

    let huboCambios = false;
    carterosJornada.forEach((c) => {
      if (c.estado === "pendiente") {
        c.estado = "cerrado";
        c.entregados = 0;
        c.devueltos = 0;
        c.total = 0; // Incluimos el total en 0 por seguridad
        c.hora = "19:00 PM";
        c.tipoCierre = "AUTOMATICO_7PM";
        huboCambios = true;
      }
    });

    if (huboCambios) {
      cerrarModalRendicion();
      renderizarTarjetasCarteros();
    }
  }
}

// Inicializar el intervalo con la nueva función
setInterval(verificarCierreAutomatico, 1000);
verificarCierreAutomatico();
