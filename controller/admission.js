// 1. VARIABLE GLOBAL UNIFICADA
window.listaEnviosTemporal = window.listaEnviosTemporal || [];

document.addEventListener("keydown", function (event) {
  // Verificamos si la tecla presionada es ENTER
  if (event.key === "Enter") {
    const activo = document.activeElement;

    // Lista de los IDs de los inputs y selects de tu formulario en el orden correcto
    const idsCampos = [
      "input-hoja-ruta",
      "input-tipo-servicio",
      "input-documento",
      "input-destinatario",
      "input-direccion",
      "input-departamento",
      "input-provincia",
      "input-distrito",
      "input-peso",
    ];

    // Comprobamos si el elemento donde estás parado actualmente está dentro de nuestra lista
    const indiceActual = idsCampos.indexOf(activo.id);

    if (indiceActual !== -1) {
      event.preventDefault(); // Evita que se envíe el formulario o lance el Toast por error

      // Si estás en el ÚLTIMO campo (el peso), ejecutamos directamente la función de guardar/añadir
      if (indiceActual === idsCampos.length - 1) {
        if (typeof window.agregarEnvioTemporal === "function") {
          window.agregarEnvioTemporal(event);
        }
      } else {
        // Si estás en cualquier otro campo, salta automáticamente al siguiente campo de la lista
        const siguienteId = idsCampos[indiceActual + 1];
        const siguienteElemento = document.getElementById(siguienteId);

        if (siguienteElemento) {
          siguienteElemento.focus();
        }
      }
    }
  }
});
// Dentro de admission.js, define esta función principal:
window.inicializarModuloAdmision = function () {
  console.log("🔄 Reiniciando módulo de admisión por completo...");

  // 1. Vuelve a cargar las variables o fechas de filtrado inicial (ej. la fecha de hoy)
  if (typeof establecerFechaHoy === "function") {
    establecerFechaHoy();
  }

  // 2. Vuelve a disparar la consulta a Supabase para refrescar los datos globales de la sucursal
  if (typeof cargarDatosSucursal === "function") {
    cargarDatosSucursal();
  } else if (typeof window.listarEnviosDiarios === "function") {
    window.listarEnviosDiarios();
  }

  // 3. Vuelve a cargar los selects (tipos de servicio)
  if (typeof window.cargarTiposDeServicio === "function") {
    window.cargarTiposDeServicio();
  }
};

function cambiarModoOperacion() {
  // Obtenemos los elementos de los radio buttons
  const radioBarras = document.getElementById("radio-generar-barras");
  const radioExcel = document.getElementById("radio-exportar-excel");

  // Elementos de la sección "Generar Barras"
  const btnGenerarBarras = document.getElementById("btn-generar-barras");

  // Elementos de la sección "Exportar Excel"
  const fieldsetTipoServicio = document.getElementById(
    "fieldset-tipo-servicio",
  );
  const selectTipoServicio = document.getElementById(
    "input-tipo-servicio-exportar",
  );

  const fieldsetGuia = document.getElementById("fieldset-guia");
  const inputSim = document.getElementById("input-sim");

  const btnExportarExcel = document.getElementById("btn-exportar-excel");

  if (radioBarras && radioBarras.checked) {
    // --- MODO 1: GENERAR BARRAS ACTIVO ---

    // 1. Activar botón de barras
    btnGenerarBarras.disabled = false;
    btnGenerarBarras.classList.remove("opacity-40", "cursor-not-allowed");

    // 2. Desactivar y limpiar campos de Exportar Excel
    selectTipoServicio.value = "";
    selectTipoServicio.disabled = true;

    inputSim.value = "";
    inputSim.disabled = true;

    btnExportarExcel.disabled = true;

    // 3. Aplicar estilos visuales de desactivado (opacidad y fondo) a los fieldsets de Excel
    fieldsetTipoServicio.classList.add("bg-slate-100", "opacity-60");
    fieldsetTipoServicio.classList.remove(
      "bg-white",
      "opacity-100",
      "border-blue-500",
      "ring-1",
      "ring-blue-500",
    );

    fieldsetGuia.classList.add("bg-slate-100", "opacity-60");
    fieldsetGuia.classList.remove(
      "bg-white",
      "opacity-100",
      "border-blue-500",
      "ring-1",
      "ring-blue-500",
    );
  } else if (radioExcel && radioExcel.checked) {
    // --- MODO 2: EXPORTAR EXCEL ACTIVO ---

    // 1. Desactivar botón de barras
    btnGenerarBarras.disabled = true;
    btnGenerarBarras.classList.add("opacity-40", "cursor-not-allowed");

    // 2. Activar campos de Exportar Excel
    selectTipoServicio.disabled = false;
    inputSim.disabled = false;
    btnExportarExcel.disabled = false;

    // 3. Aplicar estilos visuales de activo a los fieldsets
    fieldsetTipoServicio.classList.remove("bg-slate-100", "opacity-60");
    fieldsetTipoServicio.classList.add("bg-white", "opacity-100");

    fieldsetGuia.classList.remove("bg-slate-100", "opacity-60");
    fieldsetGuia.classList.add("bg-white", "opacity-100");
  }
}

// Ejecutar al cargar la página por si el navegador mantiene el estado inicial
document.addEventListener("DOMContentLoaded", () => {
  cambiarModoOperacion();
});

// Declaración de la variable para la instancia de Grid.js del listado diario (corregida a null para evitar conflictos de tipo)
let gridInstanceListadoDiario = null;

// Variable global para almacenar y rastrear el ID de la sucursal actual
let sucursalActualId = null;

// Variable global para almacenar y rastrear el ID del colaborador actual
let colaboradorActualId = null;

window.limpiarModalEnvios = function () {
  // 1. Vaciar el arreglo temporal
  if (typeof listaEnviosTemporal !== "undefined") {
    listaEnviosTemporal = [];
  }

  // 2. Destruir formalmente la instancia de Grid.js liberando memoria
  if (typeof gridInstanceEnvios !== "undefined" && gridInstanceEnvios) {
    try {
      gridInstanceEnvios.destroy();
    } catch (e) {
      console.warn("Aviso al destruir Grid.js:", e);
    }
    gridInstanceEnvios = null;
  }

  // 3. Limpiar físicamente el HTML interno del contenedor de la tabla
  const contenedor = document.getElementById("wrapper-gridjs-envios");
  if (contenedor) {
    contenedor.innerHTML = "";
  }

  // 4. Restablecer todos los campos del formulario de ingreso a su estado original
  const formIngreso = document.getElementById("form-ingreso-envio");
  if (formIngreso) {
    formIngreso.reset();
  }

  // 5. Limpiar explícitamente el input de hoja de ruta por si acaso
  const inputHojaRuta = document.getElementById("input-hoja-ruta");
  if (inputHojaRuta) {
    inputHojaRuta.value = "";
  }

  // 6. Restablecer contadores visuales a 0
  const inputTotal = document.getElementById("modal-total-envios");
  const inputSen = document.getElementById("modal-total-envios-sen");
  const inputSel = document.getElementById("modal-total-envios-sel");

  if (inputTotal) inputTotal.value = 0;
  if (inputSen) inputSen.value = 0;
  if (inputSel) inputSel.value = 0;
};

function abrirModalEnvio() {
  // 1. Limpiamos todo previamente usando la función centralizada
  if (typeof window.limpiarModalEnvios === "function") {
    window.limpiarModalEnvios();
  }

  // 2. Validar y asignar los datos del usuario logueado de forma global
  if (window.usuarioLogueado) {
    window.sucursalActualId = window.usuarioLogueado.sucursal?.id;
    window.colaboradorActualId = window.usuarioLogueado.colaborador?.id;

    const inputSucursalText = document.getElementById("modal-sucursal-text");
    if (inputSucursalText) {
      inputSucursalText.value =
        window.usuarioLogueado.sucursal?.nombre || "SIN SUCURSAL";
    }
  }

  // 3. Mostrar el modal en pantalla removiendo la clase 'hidden'
  const modalEnvio = document.getElementById("modal-envio");
  if (modalEnvio) {
    modalEnvio.classList.remove("hidden");
  }

  // 4. Poblar los selectores del formulario de forma automática
  if (typeof cargarDepartamentos === "function") {
    cargarDepartamentos();
  }

  if (typeof cargarTiposDeServicio === "function") {
    cargarTiposDeServicio();
  }
  // 5. 🎯 ENFOQUE AUTOMÁTICO EN EL INPUT DE HOJA DE RUTA
  setTimeout(() => {
    const inputHojaRuta = document.getElementById("input-hoja-ruta");
    if (inputHojaRuta) {
      inputHojaRuta.focus();
      // Opcional: si deseas que también seleccione el texto que tuviera dentro, descomenta la siguiente línea:
      // inputHojaRuta.select();
    }
  }, 50);
}

function cerrarModalEnvio() {
  // 1. Ocultar el modal visualmente agregando la clase 'hidden'
  const modalEnvio = document.getElementById("modal-envio");
  if (modalEnvio) {
    modalEnvio.classList.add("hidden");
  }

  // 2. Ejecutar la misma limpieza total al cerrar
  if (typeof window.limpiarModalEnvios === "function") {
    window.limpiarModalEnvios();
  }
}

window.agregarEnvioTemporal = async function (event) {
  if (event) event.preventDefault();
  const inputHojaRuta = document.getElementById("input-hoja-ruta");
  const selectServicio = document.getElementById("input-tipo-servicio");
  const inputDocumento = document.getElementById("input-documento");
  const inputDestinatario = document.getElementById("input-destinatario");
  const inputDireccion = document.getElementById("input-direccion");
  const selectDep = document.getElementById("input-departamento");
  const selectProv = document.getElementById("input-provincia");
  const selectDistrito = document.getElementById("input-distrito");
  const inputPeso = document.getElementById("input-peso");

  // 1. VALIDACIÓN SECUENCIAL CAMPO POR CAMPO CON FOCO AUTOMÁTICO
  if (!inputHojaRuta || !inputHojaRuta.value.trim()) {
    if (typeof window.mostrarToast === "function")
      window.mostrarToast("Por favor, ingrese la hoja de ruta.", "error");
    if (inputHojaRuta) inputHojaRuta.focus();
    return;
  }
  if (!selectServicio || !selectServicio.value) {
    if (typeof window.mostrarToast === "function")
      window.mostrarToast(
        "Por favor, seleccione un tipo de servicio.",
        "error",
      );
    if (selectServicio) selectServicio.focus();
    return;
  }
  if (!inputDocumento || !inputDocumento.value.trim()) {
    if (typeof window.mostrarToast === "function")
      window.mostrarToast(
        "Por favor, ingrese el número de documento.",
        "error",
      );
    if (inputDocumento) inputDocumento.focus();
    return;
  }
  if (!inputDestinatario || !inputDestinatario.value.trim()) {
    if (typeof window.mostrarToast === "function")
      window.mostrarToast(
        "Por favor, ingrese el nombre del destinatario.",
        "error",
      );
    if (inputDestinatario) inputDestinatario.focus();
    return;
  }
  if (!inputDireccion || !inputDireccion.value.trim()) {
    if (typeof window.mostrarToast === "function")
      window.mostrarToast("Por favor, ingrese la dirección.", "error");
    if (inputDireccion) inputDireccion.focus();
    return;
  }
  if (!selectDistrito || !selectDistrito.value) {
    if (typeof window.mostrarToast === "function")
      window.mostrarToast(
        "Por favor, seleccione el distrito de destino.",
        "error",
      );
    if (selectDistrito) selectDistrito.focus();
    return;
  }
  if (
    !inputPeso ||
    !inputPeso.value.trim() ||
    parseFloat(inputPeso.value) <= 0
  ) {
    if (typeof window.mostrarToast === "function")
      window.mostrarToast("Por favor, ingrese un peso válido.", "error");
    if (inputPeso) inputPeso.focus();
    return;
  }

  const tipoServicioId = selectServicio.value;
  const textoServicio = selectServicio.selectedOptions[0]
    ? selectServicio.selectedOptions[0].text.trim().toUpperCase()
    : "";

  try {
    // 2. Obtener la sucursal activa de la sesión
    const sesionUsuario = JSON.parse(
      sessionStorage.getItem("sesion_usuario") || "{}",
    );
    const sucursalId =
      sessionStorage.getItem("sucursal_id") ||
      sesionUsuario.sucursal?.id ||
      sesionUsuario.sucursal_id ||
      null;

    if (!sucursalId) {
      if (typeof window.mostrarToast === "function")
        window.mostrarToast(
          "No se encontró la sucursal activa en la sesión.",
          "error",
        );
      return;
    }

    const hoyStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    let maxOrdenBD = 0;

    // 3. CONSULTA RELACIONAL USANDO LA TABLA 'guia_documento' PARA UNIR 'guia' Y 'documento'
    try {
      const { data: relacionBD, error: queryError } =
        await window.supabaseClient
          .from("guia_documento")
          .select(
            `
            documento_id,
            guia_id,
            documento!inner (
              id,
              orden,
              tipo_servicio_id
            ),
            guia!inner (
              id,
              tipo,
              fecha,
              sucursal_id
            )
          `,
          )
          .eq("guia.sucursal_id", parseInt(sucursalId))
          .eq("guia.tipo", "admision")
          .eq("documento.tipo_servicio_id", parseInt(tipoServicioId));

      if (!queryError && relacionBD) {
        // Filtramos en JavaScript los registros que correspondan estrictamente a la fecha de hoy
        const registrosDeHoy = relacionBD.filter((item) => {
          const fechaGuia = item.guia?.fecha;
          if (!fechaGuia) return false;
          return String(fechaGuia).startsWith(hoyStr);
        });

        if (registrosDeHoy.length > 0) {
          maxOrdenBD = Math.max(
            ...registrosDeHoy.map((i) => parseInt(i.documento?.orden) || 0),
          );
        }
      }
    } catch (dbErr) {
      console.warn(
        "Aviso: No se pudo consultar la relación de guías y documentos en BD.",
        dbErr,
      );
    }

    // 4. BUSCAR EL ORDEN MÁS ALTO EN LOS REGISTROS TEMPORALES PENDIENTES EN PANTALLA
    let maxOrdenTemporal = 0;
    if (!window.listaEnviosTemporal) window.listaEnviosTemporal = [];

    const temporalesDeEsteServicio = window.listaEnviosTemporal.filter(
      (item) => String(item.tipo_servicio_id) === String(tipoServicioId),
    );

    if (temporalesDeEsteServicio.length > 0) {
      maxOrdenTemporal = Math.max(
        ...temporalesDeEsteServicio.map((i) => parseInt(i.orden) || 0),
      );
    }

    // 5. EL NUEVO ORDEN CORRECTO (MÁXIMO ENTRE BD Y PANTALLA + 1)
    const maxGlobal = Math.max(maxOrdenBD, maxOrdenTemporal);
    const nuevoOrden = maxGlobal + 1;

    const valorPesoInput = parseFloat(inputPeso.value) || 0;
    const pesoTransformado = (valorPesoInput / 1000).toFixed(3);

    const textoDep =
      selectDep && selectDep.selectedOptions[0]
        ? selectDep.selectedOptions[0].text.trim()
        : "";
    const textoProv =
      selectProv && selectProv.selectedOptions[0]
        ? selectProv.selectedOptions[0].text.trim()
        : "";
    const textoDist =
      selectDistrito && selectDistrito.selectedOptions[0]
        ? selectDistrito.selectedOptions[0].text.trim()
        : "";
    const ubigeoCompleto = [textoDep, textoProv, textoDist]
      .filter(Boolean)
      .join(" / ");

    const nuevoItem = {
      hoja_ruta: inputHojaRuta.value.trim().toUpperCase(),
      id_temporal: Date.now(),
      tipo_servicio_id: tipoServicioId,
      tipo_servicio_texto: textoServicio,
      orden: nuevoOrden,
      documento: inputDocumento.value.toUpperCase(),
      destinatario: inputDestinatario.value.toUpperCase(),
      direccion: inputDireccion.value.toUpperCase(),
      ubigeo_id: selectDistrito.value,
      ubigeo_texto: ubigeoCompleto,
      peso: pesoTransformado,
      cantidad: 1,
    };

    // 6. Agregamos al array temporal
    window.listaEnviosTemporal.push(nuevoItem);

    // 7. Renderizamos inmediatamente
    if (typeof window.renderizarTablaTemporal === "function") {
      window.renderizarTablaTemporal();
    }

    // 8. 🧹 LIMPIEZA TOTAL DE TODOS LOS CAMPOS
    const formIngreso = document.getElementById("form-ingreso-envio");
    if (formIngreso) formIngreso.reset();

    // Restablecer selects dependientes
    if (selectProv) {
      selectProv.innerHTML = '<option value="">Seleccione...</option>';
      selectProv.disabled = true;
    }
    if (selectDistrito) {
      selectDistrito.innerHTML = '<option value="">Seleccione...</option>';
      selectDistrito.disabled = true;
    }

    // Limpiar explícitamente el input de la Hoja de Ruta
    if (inputHojaRuta) {
      inputHojaRuta.value = "";
      inputHojaRuta.focus();
    }
  } catch (err) {
    console.error("Error al procesar el envío temporal:", err);
    if (typeof window.mostrarToast === "function") {
      window.mostrarToast("No se pudo procesar el registro temporal.", "error");
    }
  }
};

let gridInstanceEnvios = null;

window.renderizarTablaTemporal = function () {
  const contenedor = document.getElementById("wrapper-gridjs-envios");

  if (!contenedor) return;
  if (!window.listaEnviosTemporal) window.listaEnviosTemporal = [];

  // 1. Calcular totales reales
  const totalGral = window.listaEnviosTemporal.length;

  const totalSen = window.listaEnviosTemporal.filter((i) => {
    const texto = (i.tipo_servicio_texto || "").toUpperCase();
    return texto.includes("SEN");
  }).length;

  const totalSel = window.listaEnviosTemporal.filter((i) => {
    const texto = (i.tipo_servicio_texto || "").toUpperCase();
    return texto.includes("SEL");
  }).length;

  // 2. Asignar de forma explícita a los inputs de la interfaz
  const inputTotal = document.getElementById("modal-total-envios");
  const inputSen = document.getElementById("modal-total-envios-sen");
  const inputSel = document.getElementById("modal-total-envios-sel");

  if (inputTotal) {
    inputTotal.value = totalGral;
    inputTotal.setAttribute("value", totalGral);
  }

  if (inputSen) {
    inputSen.value = totalSen;
    inputSen.setAttribute("value", totalSen);
  }

  if (inputSel) {
    inputSel.value = totalSel;
    inputSel.setAttribute("value", totalSel);
  }

  // 3. Preparar datos para Grid.js
  const datosParaGrid = window.listaEnviosTemporal.map((item) => [
    item.orden, // 1. Ord
    item.hoja_ruta, // 2. Hoja Ruta
    item.tipo_servicio_texto, // 3. Servicio
    item.documento, // 4. Doc Emitido
    item.destinatario, // 5. Destinatario
    `${item.direccion} (${item.ubigeo_texto})`, // 6. Dirección / Ubigeo
    `${item.peso} kg`, // 7. Peso
    `<button type="button" onclick="eliminarEnvioTemporal(${item.id_temporal})" class="text-red-500 hover:text-red-700 p-1 transition-colors" title="Eliminar">
       <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1,1 0 00-1 1v3M4 7h16" />
       </svg>
     </button>`, // 8. Acciones
  ]);

  // 4. Renderizado seguro con Grid.js
  if (gridInstanceEnvios) {
    gridInstanceEnvios
      .updateConfig({
        data: datosParaGrid,
      })
      .forceRender();
  } else {
    contenedor.innerHTML = "";

    gridInstanceEnvios = new gridjs.Grid({
      columns: [
        { name: "Ord", width: "60px" },
        { name: "Hoja Ruta", width: "100px" },
        { name: "Servicio", width: "110px" },
        { name: "Doc Emitido", width: "110px" },
        { name: "Destinatario", width: "150px" },
        { name: "Dirección / Ubigeo", width: "auto" },
        { name: "Peso", width: "80px" },
        {
          name: "Acciones",
          width: "80px",
          formatter: (cell) => gridjs.html(cell),
        },
      ],
      data: datosParaGrid,
      pagination: false,
      search: false,
      sort: true,
      language: {
        noRecordsFound: "No hay envíos agregados en este lote.",
      },
      style: {
        table: { "font-size": "11px", width: "100%" },
        th: {
          "background-color": "#f8fafc",
          color: "#334155",
          "font-weight": "600",
          padding: "8px",
        },
        td: { padding: "6px 8px" },
      },
    }).render(contenedor);
  }
};

function eliminarEnvioTemporal(idTemporal) {
  // Filtrar el array quitando el elemento seleccionado

  listaEnviosTemporal = listaEnviosTemporal.filter(
    (item) => item.id_temporal !== idTemporal,
  );
  // Actualizar la tabla y los contadores inmediatamente

  renderizarTablaTemporal();
}
// Función asíncrona principal encargada de guardar de forma definitiva la guía y sus documentos asociados en Supabase
async function guardarGuiaYDocumentosDefinitivo() {
  // 1. Validación: asegura que el arreglo temporal contenga al menos un envío antes de proceder
  if (
    typeof listaEnviosTemporal === "undefined" ||
    !listaEnviosTemporal ||
    listaEnviosTemporal.length === 0
  ) {
    if (typeof window.mostrarToast === "function") {
      window.mostrarToast(
        "Debe agregar al menos un envío a la lista.",
        "error",
      );
    }
    return;
  }

  // Validación previa de que los ítems tengan hoja de ruta en el array temporal
  const hojasRutaUnicas = [
    ...new Set(
      listaEnviosTemporal.map((item) => item.hoja_ruta).filter(Boolean),
    ),
  ];

  if (hojasRutaUnicas.length === 0) {
    if (typeof window.mostrarToast === "function") {
      window.mostrarToast(
        "Los envíos de la lista deben tener una Hoja de Ruta válida.",
        "error",
      );
    }
    return;
  }

  // Busca el selector del tipo de guía; por defecto toma "admision" si no se encuentra en el DOM
  const selectTipoGuia =
    document.getElementById("modal-tipo-guia") ||
    document.getElementById("input-tipo-guia");
  const tipoGuia =
    selectTipoGuia && selectTipoGuia.value
      ? selectTipoGuia.value.trim().toLowerCase()
      : "admision";

  // Variables para almacenar temporalmente los IDs creados por si se requiere rollback
  let guiaIdGenerado = null;
  let idsDocumentosInsertados = [];

  try {
    // 3. Recuperar los datos de la sesión del usuario y la sucursal activa desde el almacenamiento local
    const sesionUsuario = JSON.parse(
      sessionStorage.getItem("sesion_usuario") || "{}",
    );

    const sucursalId =
      sessionStorage.getItem("sucursal_id") ||
      sesionUsuario.sucursal?.id ||
      sesionUsuario.sucursal_id ||
      null;
    const colaboradorId =
      sessionStorage.getItem("colaborador_id") ||
      sesionUsuario.colaborador?.id ||
      sesionUsuario.colaborador_id ||
      null;

    // Validación de seguridad: si no se detecta la sucursal activa, interrumpe el proceso
    if (!sucursalId) {
      if (typeof window.mostrarToast === "function") {
        window.mostrarToast(
          "No se encontró la sucursal activa en la sesión. Vuelva a iniciar sesión.",
          "error",
        );
      }
      return;
    }

    // Validación de seguridad: si no se detecta el ID del colaborador, interrumpe el proceso
    if (!colaboradorId) {
      if (typeof window.mostrarToast === "function") {
        window.mostrarToast(
          "No se encontró el ID del colaborador en la sesión. Vuelva a iniciar sesión.",
          "error",
        );
      }
      return;
    }

    // 4. Obtener el siguiente número correlativo independiente filtrando por SUCURSAL y por TIPO de guía
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

    // 5. Insertar el encabezado de la guía maestra (SOLO campos permitidos: tipo, correlativo, cantidad, sucursal_id)
    const { data: guiaInsertada, error: errGuia } = await window.supabaseClient
      .from("guia")
      .insert([
        {
          tipo: tipoGuia,
          correlativo: siguienteCorrelativo,
          cantidad: listaEnviosTemporal.length,
          sucursal_id: sucursalId,
        },
      ])
      .select()
      .single();

    if (errGuia) throw errGuia;

    guiaIdGenerado = guiaInsertada.id;

    // 6. Mapear y preparar la estructura de los documentos incluyendo la hoja de ruta individual
    const documentosParaInsertar = listaEnviosTemporal.map((item) => ({
      tipo_servicio_id: item.tipo_servicio_id,
      orden: parseInt(item.orden),
      doc_emitido: item.documento,
      destinatario: item.destinatario,
      direccion: item.direccion,
      ubigeo_id: parseInt(item.ubigeo_id),
      peso: String(item.peso),
      cantidad: parseInt(item.cantidad),
      colaborador_id: colaboradorId,
      hoja_ruta: item.hoja_ruta,
      estado_id: 1, // Mantenido por seguridad relacional si tu BD lo usa
    }));

    // 7. Insertar los documentos en la tabla 'documento'
    const { data: docsInsertados, error: errDocs } = await window.supabaseClient
      .from("documento")
      .insert(documentosParaInsertar)
      .select("id");

    if (errDocs) throw errDocs;

    idsDocumentosInsertados = docsInsertados.map((doc) => doc.id);

    // 8. Crear las relaciones en la tabla intermedia 'guia_documento'
    const relacionesGuiaDocumento = idsDocumentosInsertados.map((docId) => ({
      guia_id: guiaIdGenerado,
      documento_id: docId,
    }));

    const { error: errRelacion } = await window.supabaseClient
      .from("guia_documento")
      .insert(relacionesGuiaDocumento);

    // 🛑 ROLLBACK ESTRICTO si falla la inserción intermedia
    if (errRelacion) {
      if (idsDocumentosInsertados.length > 0) {
        await window.supabaseClient
          .from("documento")
          .delete()
          .in("id", idsDocumentosInsertados);
      }
      if (guiaIdGenerado) {
        await window.supabaseClient
          .from("guia")
          .delete()
          .eq("id", guiaIdGenerado);
      }
      throw errRelacion;
    }

    if (typeof window.mostrarToast === "function") {
      window.mostrarToast(
        `¡Guía de ${tipoGuia} N° ${siguienteCorrelativo} guardada con éxito!`,
        "success",
      );
    }

    // ==========================================
    // 🧹 LIMPIEZA GENERAL DESPUÉS DE GUARDAR
    // ==========================================
    listaEnviosTemporal = [];

    // Llamar a tu función centralizada de limpieza si existe
    if (typeof window.limpiarModalEnvios === "function") {
      window.limpiarModalEnvios();
    } else {
      const formEnvio = document.getElementById("form-ingreso-envio");
      if (formEnvio) formEnvio.reset();

      const inputHojaRuta = document.getElementById("input-hoja-ruta");
      if (inputHojaRuta) inputHojaRuta.value = "";

      if (typeof renderizarTablaTemporal === "function") {
        renderizarTablaTemporal();
      }
    }

    // Cierra el modal de envíos de manera automática
    if (typeof cerrarModalEnvio === "function") {
      cerrarModalEnvio();
    }

    // Refrescar listados generales de la interfaz
    if (typeof window.listarEnviosDiarios === "function") {
      await window.listarEnviosDiarios();
    }

    // ==========================================
    // 🚀 GENERAR REPORTE PDF AUTOMÁTICAMENTE
    // ==========================================
    if (
      typeof window.generarReporteGuiaAdmision === "function" &&
      guiaIdGenerado
    ) {
      await window.generarReporteGuiaAdmision(guiaIdGenerado);
    } else {
      console.warn(
        "La función generarReporteGuiaAdmision no está disponible globalmente.",
      );
    }
  } catch (error) {
    console.error("Error en la transacción:", error);
    if (typeof window.mostrarToast === "function") {
      window.mostrarToast(
        "Error al registrar. Se aplicó rollback y no se guardó nada: " +
          error.message,
        "error",
      );
    }
  }
}

// Asignamos la función de manera global si es necesario
window.guardarGuiaYDocumentosDefinitivo = guardarGuiaYDocumentosDefinitivo;

async function cargarDepartamentos() {
  // Captura el elemento select de departamentos en el DOM
  const selectDep = document.getElementById("input-departamento");
  // Captura el elemento select de provincias en el DOM
  const selectProv = document.getElementById("input-provincia");
  // Captura el elemento select de distritos en el DOM
  const selectDist = document.getElementById("input-distrito");

  // Si el selector de departamentos no existe físicamente, detiene la ejecución
  if (!selectDep) return;

  // 1. Resetea los campos dependientes de forma segura (ya sea con Tom Select o de forma nativa)
  if (typeof selectProvInstance !== "undefined") {
    selectProvInstance.clear();
    selectProvInstance.clearOptions();
    selectProvInstance.disable();
  } else if (selectProv) {
    selectProv.innerHTML = '<option value="">Seleccione...</option>';
    selectProv.disabled = true;
  }

  if (typeof selectDistInstance !== "undefined") {
    selectDistInstance.clear();
    selectDistInstance.clearOptions();
    selectDistInstance.disable();
  } else if (selectDist) {
    selectDist.innerHTML = '<option value="">Seleccione...</option>';
    selectDist.disabled = true;
  }

  try {
    // 2. Realiza la llamada a la función RPC de Supabase para obtener los departamentos
    const { data, error } =
      await window.supabaseClient.rpc("get_departamentos");

    // Si Supabase devuelve un error en la ejecución RPC, lanza una excepción
    if (error) throw new Error(error.message);

    // 3. Filtra la data obtenida para asegurar que sean elementos únicos utilizando un Set
    const departamentosUnicos = [...new Set(data)];

    // 4. Llena el select evaluando si utiliza Tom Select o si emplea el respaldo HTML nativo
    if (typeof selectDepInstance !== "undefined") {
      selectDepInstance.clearOptions();
      departamentosUnicos.forEach((dep) => {
        // Asegura que el texto y el valor estén siempre en mayúsculas y limpios de espacios
        const depMayus = String(dep).trim().toUpperCase();
        selectDepInstance.addOption({ value: depMayus, text: depMayus });
      });
      selectDepInstance.refreshOptions();
    } else {
      // Respaldo nativo de HTML por si no está activa la librería Tom Select
      let html = '<option value="">Seleccione...</option>';
      departamentosUnicos.forEach((dep) => {
        const depMayus = String(dep).trim().toUpperCase();
        html += `<option value="${depMayus}">${depMayus}</option>`;
      });
      selectDep.innerHTML = html;
    }
  } catch (err) {
    // Captura y muestra en consola cualquier error ocurrido al cargar los departamentos
    console.error("Error al cargar departamentos:", err);
  }
}

async function cargarProvincias() {
  // Captura los elementos select del formulario de ubicación
  const selectDep = document.getElementById("input-departamento");
  const selectProv = document.getElementById("input-provincia");
  const selectDist = document.getElementById("input-distrito");

  // Obtiene el valor actual del departamento seleccionado en el DOM
  const departamentoSeleccionado = selectDep.value;

  // Restablece y deshabilita el selector de provincias preventivamente
  selectProv.innerHTML = '<option value="">Seleccione...</option>';
  selectProv.disabled = true;
  // Restablece y deshabilita el selector de distritos preventivamente
  selectDist.innerHTML = '<option value="">Seleccione...</option>';
  selectDist.disabled = true;

  // Si no hay ningún departamento seleccionado, interrumpe el proceso de inmediato
  if (!departamentoSeleccionado) return;

  try {
    // Consulta a la tabla 'ubigeo' de Supabase filtrando estrictamente por el departamento elegido
    const { data, error } = await window.supabaseClient
      .from("ubigeo")
      .select("provincia")
      .eq("departamento", departamentoSeleccionado)
      .order("provincia", { ascending: true });

    // Si ocurre un error en la consulta a la base de datos, lanza una excepción
    if (error) throw new Error(error.message);

    // Filtra el resultado para extraer una lista única de provincias
    const provinciasUnicas = [...new Set(data.map((item) => item.provincia))];

    // Construye las opciones en formato HTML para el select nativo de provincias
    let html = '<option value="">Seleccione...</option>';
    provinciasUnicas.forEach((prov) => {
      html += `<option value="${prov}">${prov}</option>`;
    });
    selectProv.innerHTML = html;
    selectProv.disabled = false; // Habilita el selector de provincias para el usuario
  } catch (err) {
    // Muestra en consola un mensaje de error si la carga de provincias falla
    console.error("Error al cargar provincias:", err);
  }
}

async function cargarDistritos() {
  // Captura los tres elementos select de la jerarquía geográfica
  const selectDep = document.getElementById("input-departamento");
  const selectProv = document.getElementById("input-provincia");
  const selectDist = document.getElementById("input-distrito");

  // Obtiene los valores seleccionados tanto de departamento como de provincia
  const departamentoSeleccionado = selectDep.value;
  const provinciaSeleccionada = selectProv.value;

  // Restablece y deshabilita el selector de distritos preventivamente
  selectDist.innerHTML = '<option value="">Seleccione...</option>';
  selectDist.disabled = true;

  // Si no hay ninguna provincia seleccionada, detiene la ejecución
  if (!provinciaSeleccionada) return;

  try {
    // Trae tanto el ID como el nombre del distrito filtrando por depto y provincia en Supabase
    const { data, error } = await window.supabaseClient
      .from("ubigeo")
      .select("id, distrito")
      .eq("departamento", departamentoSeleccionado)
      .eq("provincia", provinciaSeleccionada)
      .order("distrito", { ascending: true });

    // Si ocurre un error en la consulta, lanza una excepción
    if (error) throw new Error(error.message);

    let html = '<option value="">Seleccione...</option>';
    data.forEach((item) => {
      // ⭐ AQUÍ ESTÁ LA CLAVE: El value del option es el ID numérico real (ej. 45) y lo visible es el nombre del distrito
      html += `<option value="${item.id}">${item.distrito}</option>`;
    });
    selectDist.innerHTML = html;
    selectDist.disabled = false; // Habilita el selector de distritos para el usuario
  } catch (err) {
    // Muestra errores en consola si falla la consulta de distritos
    console.error("Error al cargar distritos:", err);
  }
}

window.cargarTiposDeServicio = async function () {
  // Busca elementos con CUALQUIERA de las dos clases
  const selects = document.querySelectorAll(
    ".select-tipo-servicio-update, .select-tipo-servicio",
  );

  if (selects.length === 0) return;

  try {
    const { data: servicios, error } = await window.supabaseClient
      .from("tipo_servicio")
      .select("*");

    if (error) throw new Error(error.message);

    let opcionesHtml = '<option value="">Seleccione...</option>';

    if (servicios && servicios.length > 0) {
      servicios.forEach((servicio) => {
        const idServicio = servicio.id;
        const codigoServicio = (servicio.codigo || "").toUpperCase();

        if (idServicio && codigoServicio) {
          opcionesHtml += `<option value="${idServicio}">${codigoServicio}</option>`;
        }
      });
    }

    selects.forEach((select) => {
      select.innerHTML = opcionesHtml;
      select.disabled = false;
    });

    console.log("✅ Tipos de servicio cargados correctamente.");
  } catch (error) {
    console.error("❌ Error al cargar tipos de servicio:", error);
  }
};

window.listarEnviosDiarios = async function () {
  console.log("🔄 Ejecutando listarEnviosDiarios...");

  const contenedor = document.getElementById("wrapper-gridjs-listado");
  if (!contenedor) {
    return;
  }

  try {
    // 🔍 DETECTOR AUTOMÁTICO DE SUPABASE
    const clienteSupabase =
      window.supabaseClient ||
      window.supabase ||
      (typeof supabase !== "undefined" ? supabase : null);

    if (!clienteSupabase) {
      console.error(
        "❌ Error crítico: No se encontró ninguna instancia de Supabase en el scope global.",
      );
      return;
    }

    // 1. Obtener la sucursal del usuario logueado
    const sesionUsuario = JSON.parse(
      sessionStorage.getItem("sesion_usuario") || "{}",
    );
    const sucursalIdLogueada =
      sesionUsuario.sucursal?.id ||
      sessionStorage.getItem("sucursal_id") ||
      null;

    console.log("🏢 Sucursal ID:", sucursalIdLogueada);

    if (!sucursalIdLogueada) {
      console.warn(
        "⚠️ No se encontró el ID de la sucursal en el almacenamiento de la sesión.",
      );
      return;
    }

    // 2. OBTENER FECHA DEL EQUIPO (YYYY-MM-DD)
    const fechaEquipo = new Date();
    const anio = fechaEquipo.getFullYear();
    const mes = String(fechaEquipo.getMonth() + 1).padStart(2, "0");
    const dia = String(fechaEquipo.getDate()).padStart(2, "0");
    const fechaEquipoStr = `${anio}-${mes}-${dia}`;
    console.log("💻 Fecha del equipo:", fechaEquipoStr);

    // 3. CONSULTAR LOS ENVÍOS DE LA SUCURSAL DESDE LA VISTA
    const { data, error } = await clienteSupabase
      .from("vista_envios_diarios")
      .select("*")
      .eq("sucursal_id", sucursalIdLogueada);

    if (error) {
      throw new Error(error.message);
    }

    console.log("📦 Datos totales de la sucursal:", data);

    // 4. COMPARAR LA FECHA DE LA VISTA CON LA DEL EQUIPO
    const datosFiltrados = (data || []).filter((item) => {
      const fechaDoc = item.fecha_ingreso || item.fecha;
      if (!fechaDoc) return false;

      const fechaVistaStr = String(fechaDoc).substring(0, 10);
      return fechaVistaStr === fechaEquipoStr;
    });

    console.log("📅 Datos filtrados para hoy:", datosFiltrados);

    // 📊 CALCULAR CONTADORES (SEL, SEN y TOTAL) Y ACTUALIZAR EL DOM
    let totalSel = 0;
    let totalSen = 0;

    datosFiltrados.forEach((item) => {
      const servicio = (item.tipo_servicio_codigo || item.codigo || "").toUpperCase();
      if (servicio === "SEL") {
        totalSel++;
      } else if (servicio === "SEN") {
        totalSen++;
      }
    });

    const totalGeneral = datosFiltrados.length;

    // Actualizar los valores en los elementos del DOM superior
    if (document.getElementById("contador-sel")) {
      document.getElementById("contador-sel").textContent = totalSel;
      document.getElementById("contador-sen").textContent = totalSen;
      document.getElementById("contador-total").textContent = totalGeneral;
    }

    // 5. ORDENAR LOS DATOS: Primero por Servicio y luego por N° de Orden
    datosFiltrados.sort((a, b) => {
      const servicioA = a.tipo_servicio_codigo || a.codigo || "";
      const servicioB = b.tipo_servicio_codigo || b.codigo || "";

      if (servicioA !== servicioB) {
        return servicioA.localeCompare(servicioB);
      }

      return (parseInt(a.orden) || 0) - (parseInt(b.orden) || 0);
    });

    // 6. PREPARAR DATOS PARA GRID.JS
    const filasTabla = datosFiltrados.map((item) => [
      item.tipo_servicio_codigo || item.codigo || "N/A", // 1. Servicio
      item.orden || "N/A", // 2. N° Orden
      item.doc_emitido || "", // 3. N° Documento
      item.destinatario || "", // 4. Destinatario
      item.direccion || "", // 5. Dirección
      item.departamento || "", // 6. Departamento
      item.provincia || "", // 7. Provincia
      item.distrito || "", // 8. Distrito
      item.peso !== null && item.peso !== undefined ? item.peso : "0", // 9. Peso
    ]);

    // 7. SI YA EXISTE UNA INSTANCIA PREVIA, ACTUALIZAMOS CONFIGURACIÓN
    if (
      typeof gridInstanceListadoDiario !== "undefined" &&
      gridInstanceListadoDiario
    ) {
      gridInstanceListadoDiario
        .updateConfig({ data: filasTabla })
        .forceRender();
      return;
    }

    // 8. CREAR GRID.JS CON BUSCADOR EN ESPAÑOL ("Buscar envío...")
    gridInstanceListadoDiario = new gridjs.Grid({
      columns: [
        { name: "Servicio", width: "8%" },
        { name: "N° Orden", width: "7%" },
        { name: "N° Documento", width: "12%" },
        { name: "Destinatario", width: "20%" },
        { name: "Dirección", width: "20%" },
        { name: "Departamento", width: "11%" },
        { name: "Provincia", width: "11%" },
        { name: "Distrito", width: "11%" },
        { name: "Peso", width: "7%" },
      ],
      data: filasTabla,
      search: true,
      sort: true,
      pagination: false,
      style: {
        table: {
          "font-size": "11px",
          width: "100%",
          "max-height": "400px",
          "overflow-y": "auto",
        },
        th: {
          "background-color": "#f8fafc",
          color: "#475569",
          "font-weight": "600",
          padding: "6px 8px",
          position: "sticky",
          top: "0",
          "z-index": "10",
        },
        td: {
          padding: "5px 8px",
          color: "#334155",
        },
      },
      language: {
        search: {
          placeholder: "Buscar envío...",
        },
        noRecordsFound:
          "No hay envíos registrados con la fecha de hoy en esta sucursal.",
      },
    }).render(contenedor);
  } catch (error) {
    console.error("❌ Error al cargar los envíos diarios:", error);
  }
};

window.exportarYActualizarGuiaSim = async function (
  tipoServicioFiltro,
  numeroGuiaSimInput,
) {
  console.log(
    "⚡ [Inicio] Procesando exportación con formato de 3 decimales fijos en PESO...",
  );

  try {
    const clienteSupabase =
      window.supabaseClient ||
      window.supabase ||
      (typeof supabase !== "undefined" ? supabase : null);

    if (!clienteSupabase) {
      alert("⚠️️ No se encontró la instancia de Supabase.");
      return;
    }

    const sesionUsuario = JSON.parse(
      sessionStorage.getItem("sesion_usuario") || "{}",
    );
    const sucursalId =
      sesionUsuario.sucursal?.id ||
      sessionStorage.getItem("sucursal_id") ||
      null;
    const prefijoSucursal = sesionUsuario.sucursal?.iniciales || "";

    if (!sucursalId) {
      alert("⚠️ No se encontró la sucursal activa en la sesión.");
      return;
    }
    if (!prefijoSucursal) {
      alert("⚠️ No se encontraron las iniciales de la sucursal en la sesión.");
      return;
    }

    // 1. Capturar automáticamente la Guía SIM si viene vacía
    if (!numeroGuiaSimInput) {
      const inputElem = document.getElementById("input-sim");
      numeroGuiaSimInput = inputElem ? inputElem.value.trim() : "";
    }

    if (!numeroGuiaSimInput) {
      const msg =
        "⚠️ Por favor, ingresa el número de Guía SIM en la caja de texto.";
      if (typeof window.mostrarToast === "function") {
        window.mostrarToast(msg, "warning");
      } else {
        alert(msg);
      }
      return;
    }

    // 2. Capturar automáticamente el Tipo de Servicio usando el TEXTO visible (ej. "SEL")
    if (!tipoServicioFiltro) {
      const selectElem = document.getElementById(
        "input-tipo-servicio-exportar",
      );
      if (selectElem && selectElem.selectedIndex >= 0) {
        tipoServicioFiltro =
          selectElem.options[selectElem.selectedIndex].text.trim();
      }
    }

    if (!tipoServicioFiltro || tipoServicioFiltro === "Seleccione...") {
      const msg = "⚠️️ Por favor, selecciona el tipo de servicio.";
      if (typeof window.mostrarToast === "function") {
        window.mostrarToast(msg, "warning");
      } else {
        alert(msg);
      }
      return;
    }

    // Obtener fecha actual de hoy (YYYY-MM-DD)
    const fechaEquipo = new Date();
    const anio = fechaEquipo.getFullYear();
    const mes = String(fechaEquipo.getMonth() + 1).padStart(2, "0");
    const dia = String(fechaEquipo.getDate()).padStart(2, "0");
    const fechaHoyStr = `${anio}-${mes}-${dia}`;

    // 3. Consultar la vista de envíos diarios filtrando por sucursal
    const { data: envios, error: errorVista } = await clienteSupabase
      .from("vista_envios_diarios")
      .select("*")
      .eq("sucursal_id", parseInt(sucursalId));

    if (errorVista)
      throw new Error("Error al consultar la vista: " + errorVista.message);

    console.log("📦 Datos totales de la sucursal en la vista:", envios);

    // 4. Filtrar por fecha de hoy y por tipo de servicio usando las columnas estandarizadas
    const enviosFiltrados = (envios || []).filter((item) => {
      const fechaDoc = item.fecha_ingreso || item.fecha;
      if (!fechaDoc) return false;

      const fechaItemStr = String(fechaDoc).substring(0, 10);
      const esHoy = fechaItemStr === fechaHoyStr;

      const servicioItem = String(
        item.tipo_servicio_codigo || item.codigo || "",
      )
        .trim()
        .toUpperCase();

      const coincideServicio =
        servicioItem === String(tipoServicioFiltro).trim().toUpperCase();

      return esHoy && coincideServicio;
    });

    console.log("🎯 Datos filtrados para hoy y servicio:", enviosFiltrados);

    if (enviosFiltrados.length === 0) {
      const msgNoReg = `⚠️ No hay registros para el tipo de servicio ${tipoServicioFiltro} el día de hoy.`;
      if (typeof window.mostrarToast === "function") {
        window.mostrarToast(msgNoReg, "warning");
      } else {
        alert(msgNoReg);
      }
      return;
    }

    // 5. Verificación previa de duplicados
    const sucPaddedCheck = String(prefijoSucursal)
      .toUpperCase()
      .slice(0, 3)
      .padEnd(3, "X");
    const guiaSimPaddedCheck = String(numeroGuiaSimInput)
      .slice(-5)
      .padStart(5, "0");
    const primerOrdenCheck = String(enviosFiltrados[0].orden || 1).padStart(
      5,
      "0",
    );
    const codigoPruebaCheck = `${sucPaddedCheck}${guiaSimPaddedCheck}${primerOrdenCheck}`;

    const { data: existeCodigo } = await clienteSupabase
      .from("documento")
      .select("id")
      .eq("codigo_barras", codigoPruebaCheck)
      .maybeSingle();

    if (existeCodigo) {
      const msgDuplicado = `⚠️ La Guía SIM "${numeroGuiaSimInput}" (o su código de barras) ya existe. Por favor, ingresa otro número.`;
      if (typeof window.mostrarToast === "function") {
        window.mostrarToast(msgDuplicado, "error");
      } else {
        alert(msgDuplicado);
      }
      return;
    }

    let actualizadosExitosos = 0;
    const operacionesFallidas = [];
    const datosParaExcel = [];

    for (const [index, item] of enviosFiltrados.entries()) {
      const sucPadded = String(prefijoSucursal)
        .toUpperCase()
        .slice(0, 3)
        .padEnd(3, "X");
      const guiaSimPadded = String(numeroGuiaSimInput)
        .slice(-5)
        .padStart(5, "0");

      const ordenValor = item.orden || index + 1;
      const ordenPadded = String(ordenValor).padStart(5, "0");

      const codigoBarras14 = `${sucPadded}${guiaSimPadded}${ordenPadded}`;
      const idDocumento = item.id_documento || item.id;

      if (!idDocumento) {
        throw new Error(
          "El registro actual no posee un ID de documento válido.",
        );
      }

      // Doble update: codigo_barras y guia_sim en la tabla documento
      const { data: updateData, error: errorUpdate } = await clienteSupabase
        .from("documento")
        .update({
          codigo_barras: codigoBarras14,
          guia_sim: numeroGuiaSimInput,
        })
        .eq("id", idDocumento)
        .select();

      if (errorUpdate) {
        operacionesFallidas.push({
          id: idDocumento,
          error: errorUpdate.message,
        });
        break;
      } else if (!updateData || updateData.length === 0) {
        operacionesFallidas.push({
          id: idDocumento,
          error: "No se encontró el registro o RLS bloqueó el update.",
        });
        break;
      } else {
        actualizadosExitosos++;
      }

      // Formatear el peso asegurando 3 decimales exactos (ej. 0.04 -> "0.040")
      let pesoFormateado = "";
      if (item.peso !== null && item.peso !== undefined && item.peso !== "") {
        const numeroPeso = parseFloat(item.peso);
        pesoFormateado = isNaN(numeroPeso) ? item.peso : numeroPeso.toFixed(3);
      }

      datosParaExcel.push({
        ORDEN: ordenPadded,
        DOCUMENTO: item.doc_emitido || "",
        DESTINATARIO: item.destinatario || "",
        DIRECCION: item.direccion || "",
        DEPARTAMENTO: item.departamento || "",
        PROVINCIA: item.provincia || "",
        DISTRITO: item.distrito || "",
        PESO: pesoFormateado,
      });
    }

    if (operacionesFallidas.length > 0) {
      const msgError = `⚠️ La Guía SIM ingresada ya existe o está en uso. Por favor, verifique el número.`;
      if (typeof window.mostrarToast === "function") {
        window.mostrarToast(msgError, "error");
      } else {
        alert("❌ " + msgError);
      }
      return;
    }

    // Descarga del Excel sin bordes y con formato forzado de 3 decimales
    descargarExcelSinBordes(
      datosParaExcel,
      `Envios_${tipoServicioFiltro}_${fechaHoyStr}.xls`,
    );

    if (typeof window.mostrarToast === "function") {
      window.mostrarToast("¡Proceso completado con éxito!", "success");
    } else {
      alert(
        `✅ ¡Se actualizaron y exportaron ${actualizadosExitosos} registros con éxito!`,
      );
    }

    if (typeof window.listarEnviosDiarios === "function") {
      await window.listarEnviosDiarios();
    }
  } catch (err) {
    console.error("❌ Error en la exportación:", err);
    if (typeof window.mostrarToast === "function") {
      window.mostrarToast("Error en el proceso: " + err.message, "error");
    } else {
      alert("❌ Ocurrió un error: " + err.message);
    }
  }
};

window.exportarYActualizarGuiaSim = async function (
  tipoServicioFiltro,
  numeroGuiaSimInput,
) {
  console.log(
    "⚡ [Inicio] Procesando exportación con formato de 3 decimales fijos en PESO...",
  );

  try {
    const clienteSupabase =
      window.supabaseClient ||
      window.supabase ||
      (typeof supabase !== "undefined" ? supabase : null);

    if (!clienteSupabase) {
      alert("⚠️️ No se encontró la instancia de Supabase.");
      return;
    }

    const sesionUsuario = JSON.parse(
      sessionStorage.getItem("sesion_usuario") || "{}",
    );
    const sucursalId =
      sesionUsuario.sucursal?.id ||
      sessionStorage.getItem("sucursal_id") ||
      null;
    const prefijoSucursal = sesionUsuario.sucursal?.iniciales || "";

    if (!sucursalId) {
      alert("⚠️ No se encontró la sucursal activa en la sesión.");
      return;
    }
    if (!prefijoSucursal) {
      alert("⚠️ No se encontraron las iniciales de la sucursal en la sesión.");
      return;
    }

    // 1. Capturar automáticamente la Guía SIM si viene vacía
    if (!numeroGuiaSimInput) {
      const inputElem = document.getElementById("input-sim");
      numeroGuiaSimInput = inputElem ? inputElem.value.trim() : "";
    }

    if (!numeroGuiaSimInput) {
      const msg =
        "⚠️ Por favor, ingresa el número de Guía SIM en la caja de texto.";
      if (typeof window.mostrarToast === "function") {
        window.mostrarToast(msg, "warning");
      } else {
        alert(msg);
      }
      return;
    }

    // 2. Capturar automáticamente el Tipo de Servicio usando el TEXTO visible (ej. "SEL")
    if (!tipoServicioFiltro) {
      const selectElem = document.getElementById(
        "input-tipo-servicio-exportar",
      );
      if (selectElem && selectElem.selectedIndex >= 0) {
        tipoServicioFiltro =
          selectElem.options[selectElem.selectedIndex].text.trim();
      }
    }

    if (!tipoServicioFiltro || tipoServicioFiltro === "Seleccione...") {
      const msg = "⚠️️ Por favor, selecciona el tipo de servicio.";
      if (typeof window.mostrarToast === "function") {
        window.mostrarToast(msg, "warning");
      } else {
        alert(msg);
      }
      return;
    }

    // Obtener fecha actual de hoy (YYYY-MM-DD)
    const fechaEquipo = new Date();
    const anio = fechaEquipo.getFullYear();
    const mes = String(fechaEquipo.getMonth() + 1).padStart(2, "0");
    const dia = String(fechaEquipo.getDate()).padStart(2, "0");
    const fechaHoyStr = `${anio}-${mes}-${dia}`;

    // 3. Consultar la vista de envíos diarios filtrando por sucursal
    const { data: envios, error: errorVista } = await clienteSupabase
      .from("vista_envios_diarios")
      .select("*")
      .eq("sucursal_id", parseInt(sucursalId));

    if (errorVista)
      throw new Error("Error al consultar la vista: " + errorVista.message);

    console.log("📦 Datos totales de la sucursal en la vista:", envios);

    // 4. Filtrar por fecha de hoy y por tipo de servicio usando las columnas estandarizadas
    const enviosFiltrados = (envios || []).filter((item) => {
      const fechaDoc = item.fecha_ingreso || item.fecha;
      if (!fechaDoc) return false;

      const fechaItemStr = String(fechaDoc).substring(0, 10);
      const esHoy = fechaItemStr === fechaHoyStr;

      const servicioItem = String(
        item.tipo_servicio_codigo || item.codigo || "",
      )
        .trim()
        .toUpperCase();

      const coincideServicio =
        servicioItem === String(tipoServicioFiltro).trim().toUpperCase();

      return esHoy && coincideServicio;
    });

    console.log("🎯 Datos filtrados para hoy y servicio:", enviosFiltrados);

    if (enviosFiltrados.length === 0) {
      const msgNoReg = `⚠️ No hay registros para el tipo de servicio ${tipoServicioFiltro} el día de hoy.`;
      if (typeof window.mostrarToast === "function") {
        window.mostrarToast(msgNoReg, "warning");
      } else {
        alert(msgNoReg);
      }
      return;
    }

    // 5. Verificación previa de duplicados
    const sucPaddedCheck = String(prefijoSucursal)
      .toUpperCase()
      .slice(0, 3)
      .padEnd(3, "X");
    const guiaSimPaddedCheck = String(numeroGuiaSimInput)
      .slice(-5)
      .padStart(5, "0");
    const primerOrdenCheck = String(enviosFiltrados[0].orden || 1).padStart(
      5,
      "0",
    );
    const codigoPruebaCheck = `${sucPaddedCheck}${guiaSimPaddedCheck}${primerOrdenCheck}`;

    const { data: existeCodigo } = await clienteSupabase
      .from("documento")
      .select("id")
      .eq("codigo_barras", codigoPruebaCheck)
      .maybeSingle();

    if (existeCodigo) {
      const msgDuplicado = `⚠️ La Guía SIM "${numeroGuiaSimInput}" (o su código de barras) ya existe. Por favor, ingresa otro número.`;
      if (typeof window.mostrarToast === "function") {
        window.mostrarToast(msgDuplicado, "error");
      } else {
        alert(msgDuplicado);
      }
      return;
    }

    let actualizadosExitosos = 0;
    const operacionesFallidas = [];
    const datosParaExcel = [];

    for (const [index, item] of enviosFiltrados.entries()) {
      const sucPadded = String(prefijoSucursal)
        .toUpperCase()
        .slice(0, 3)
        .padEnd(3, "X");
      const guiaSimPadded = String(numeroGuiaSimInput)
        .slice(-5)
        .padStart(5, "0");

      const ordenValor = item.orden || index + 1;
      const ordenPadded = String(ordenValor).padStart(5, "0");

      const codigoBarras14 = `${sucPadded}${guiaSimPadded}${ordenPadded}`;
      const idDocumento = item.id_documento || item.id;

      if (!idDocumento) {
        throw new Error(
          "El registro actual no posee un ID de documento válido.",
        );
      }

      // Doble update: codigo_barras y guia_sim en la tabla documento
      const { data: updateData, error: errorUpdate } = await clienteSupabase
        .from("documento")
        .update({
          codigo_barras: codigoBarras14,
          guia_sim: numeroGuiaSimInput,
        })
        .eq("id", idDocumento)
        .select();

      if (errorUpdate) {
        operacionesFallidas.push({
          id: idDocumento,
          error: errorUpdate.message,
        });
        break;
      } else if (!updateData || updateData.length === 0) {
        operacionesFallidas.push({
          id: idDocumento,
          error: "No se encontró el registro o RLS bloqueó el update.",
        });
        break;
      } else {
        actualizadosExitosos++;
      }

      // Formatear el peso asegurando 3 decimales exactos (ej. 0.04 -> "0.040")
      let pesoFormateado = "";
      if (item.peso !== null && item.peso !== undefined && item.peso !== "") {
        const numeroPeso = parseFloat(item.peso);
        pesoFormateado = isNaN(numeroPeso) ? item.peso : numeroPeso.toFixed(3);
      }

      datosParaExcel.push({
        ORDEN: ordenPadded,
        DOCUMENTO: item.doc_emitido || "",
        DESTINATARIO: item.destinatario || "",
        DIRECCION: item.direccion || "",
        DEPARTAMENTO: item.departamento || "",
        PROVINCIA: item.provincia || "",
        DISTRITO: item.distrito || "",
        PESO: pesoFormateado,
      });
    }

    if (operacionesFallidas.length > 0) {
      const msgError = `⚠️ La Guía SIM ingresada ya existe o está en uso. Por favor, verifique el número.`;
      if (typeof window.mostrarToast === "function") {
        window.mostrarToast(msgError, "error");
      } else {
        alert("❌ " + msgError);
      }
      return;
    }

    // Descarga del Excel sin bordes y con formato forzado de 3 decimales
    descargarExcelSinBordes(
      datosParaExcel,
      `Envios_${tipoServicioFiltro}_${fechaHoyStr}.xls`,
    );

    if (typeof window.mostrarToast === "function") {
      window.mostrarToast("¡Proceso completado con éxito!", "success");
    } else {
      alert(
        `✅ ¡Se actualizaron y exportaron ${actualizadosExitosos} registros con éxito!`,
      );
    }

    if (typeof window.listarEnviosDiarios === "function") {
      await window.listarEnviosDiarios();
    }
  } catch (err) {
    console.error("❌ Error en la exportación:", err);
    if (typeof window.mostrarToast === "function") {
      window.mostrarToast("Error en el proceso: " + err.message, "error");
    } else {
      alert("❌ Ocurrió un error: " + err.message);
    }
  }
};

function descargarExcelSinBordes(data, nombreArchivo) {
  let tablaHtml = "<table border='0'>\r";
  tablaHtml += "<tr>";
  Object.keys(data[0]).forEach((key) => {
    tablaHtml += `<th>${key}</th>`;
  });
  tablaHtml += "</tr>\r";

  data.forEach((fila) => {
    tablaHtml += "<tr>";
    Object.keys(fila).forEach((key) => {
      let val = fila[key];
      let valStr = val !== null && val !== undefined ? val : "";

      // Si la columna es PESO, le inyectamos la propiedad CSS mso-number-format para forzar los 3 decimales en Excel
      if (key === "PESO" && !isNaN(val) && valStr !== "") {
        tablaHtml += `<td style='mso-number-format:"0\\.000";'>${valStr}</td>`;
      } else {
        tablaHtml += `<td>${valStr}</td>`;
      }
    });
    tablaHtml += "</tr>\r";
  });
  tablaHtml += "</table>";

  const blob = new Blob(["\ufeff" + tablaHtml], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 📊 CALCULAR CONTADORES (SEL, SEN y TOTAL)
    let totalSel = 0;
    let totalSen = 0;

    datosFiltrados.forEach((item) => {
      const servicio = (item.tipo_servicio_codigo || item.codigo || "").toUpperCase();
      if (servicio === "SEL") {
        totalSel++;
      } else if (servicio === "SEN") {
        totalSen++;
      }
    });

    const totalGeneral = datosFiltrados.length;

    // Actualizar los valores en los elementos del DOM superior
    if (document.getElementById("contador-sel")) {
      document.getElementById("contador-sel").textContent = totalSel;
      document.getElementById("contador-sen").textContent = totalSen;
      document.getElementById("contador-total").textContent = totalGeneral;
    }