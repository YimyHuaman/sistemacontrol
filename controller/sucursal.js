// ==========================================
// VARIABLES GLOBALES
// ==========================================
let idSucursalEditando = null; // Controla si estamos creando (null) o editando (ID)
let gridSucursalesInstance = null;

// ==========================================
// 1. GESTIÓN DEL MODAL (Crear y Editar)
// ==========================================

// Abrir Modal para CREAR nueva sucursal
function abrirModalSucursal() {
  idSucursalEditando = null; // Modo Creación
  document.getElementById("formSucursal").reset();

  // Cambiar textos del modal a modo Creación
  document.getElementById("tituloModalSucursal").innerText = "Registrar Nueva Sucursal";
  document.getElementById("btnAccionSucursal").innerText = "Guardar Sucursal";

  document.getElementById("modalSucursal").classList.remove("hidden");
}

// Abrir Modal para EDITAR sucursal (Rellena los datos actuales)
function prepararEdicionSucursal(id, nombre, iniciales) {
  idSucursalEditando = id; // Modo Edición guardando el ID

  // Rellenar los inputs con los datos que vienen de la tabla
  document.getElementById("nombreSucursal").value = nombre;
  document.getElementById("inicialesSucursal").value = iniciales;

  // Cambiar textos del modal a modo Edición
  document.getElementById("tituloModalSucursal").innerText = "Actualizar Sucursal";
  document.getElementById("btnAccionSucursal").innerText = "Actualizar Sucursal";

  // Mostrar el modal
  document.getElementById("modalSucursal").classList.remove("hidden");
}

// Cerrar el modal de sucursal
function cerrarModalSucursal() {
  const modal = document.getElementById("modalSucursal");
  if (modal) {
    modal.classList.add("hidden");
  }
  idSucursalEditando = null;
}

// ==========================================
// 2. OPERACIONES CON SUPABASE (Guardar / Actualizar / Eliminar)
// ==========================================

// Guardar o Actualizar en Supabase según corresponda
async function guardarSucursal(event) {
  event.preventDefault();

  const nombre = document.getElementById("nombreSucursal").value.trim();
  const iniciales = document.getElementById("inicialesSucursal").value.trim().toUpperCase();

  try {
    if (idSucursalEditando === null) {
      // --- INSERTAR NUEVO ---
      const { error } = await window.supabaseClient
        .from("sucursal")
        .insert([{ nombre: nombre, iniciales: iniciales }]);

      if (error) throw error;
      
      if (window.mostrarToast) {
        window.mostrarToast("¡Sucursal registrada con éxito!", "success");
      }
    } else {
      // --- ACTUALIZAR EXISTENTE ---
      const { error } = await window.supabaseClient
        .from("sucursal")
        .update({ nombre: nombre, iniciales: iniciales })
        .eq("id", idSucursalEditando);

      if (error) throw error;
      
      if (window.mostrarToast) {
        window.mostrarToast("¡Sucursal actualizada con éxito!", "success");
      }
    }

    cerrarModalSucursal();
    cargarTablaSucursales(); // Recarga la tabla con los cambios

  } catch (error) {
    console.error("Error en la operación:", error.message);
    if (window.mostrarToast) {
      window.mostrarToast("Hubo un error: " + error.message, "error");
    } else {
      alert("Hubo un error: " + error.message);
    }
  }
}

// Función para Eliminar usando confirmación y tu toast personalizado
function eliminarSucursal(id) {
  confirmarAccion(
    "¿Estás seguro?",
    "¿Estás seguro de que deseas eliminar esta sucursal?",
    async () => {
      try {
        const { error } = await window.supabaseClient
          .from("sucursal")
          .delete()
          .eq("id", id);

        if (error) throw error;

        if (window.mostrarToast) {
          window.mostrarToast("¡Sucursal eliminada correctamente!", "success");
        }

        cargarTablaSucursales(); // Recarga la tabla automáticamente
      } catch (error) {
        console.error("Error al eliminar:", error.message);

        if (window.mostrarToast) {
          window.mostrarToast("Hubo un error al intentar eliminar la sucursal.", "error");
        } else {
          mostrarAlerta("Error", "No se pudo eliminar la sucursal.", "error");
        }
      }
    }
  );
}

// ==========================================
// 3. CARGAR TABLA CON GRID.JS
// ==========================================
async function cargarTablaSucursales() {
  try {
    const { data: sucursal, error } = await window.supabaseClient
      .from("sucursal")
      .select("*")
      .order("id", { ascending: true });

    if (error) throw error;

    const rows = (sucursal || []).map((item) => [
      item.id,
      item.nombre,
      item.iniciales || "N/A",
      gridjs.html(`
        <div class="flex items-center gap-2">
          <!-- Botón Editar -->
          <button type="button" onclick="prepararEdicionSucursal(${item.id}, '${item.nombre}', '${item.iniciales || ""}')" 
            class="text-amber-500 hover:text-amber-700 p-1 transition-colors" title="Editar">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>

          <!-- Botón Eliminar -->
          <button type="button" onclick="eliminarSucursal(${item.id})" 
            class="text-red-500 hover:text-red-700 p-1 transition-colors" title="Eliminar">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1,1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      `),
    ]);

    const contenedor = document.getElementById("wrapper-grid-table-sucursales");
    if (contenedor) contenedor.innerHTML = "";

    if (gridSucursalesInstance) {
      gridSucursalesInstance.destroy();
    }

    gridSucursalesInstance = new gridjs.Grid({
      columns: [
        { name: "ID", width: "70px" },
        { name: "Nombre de la Sucursal" },
        { name: "Iniciales", width: "120px" },
        { name: "Acciones", width: "100px", sort: false },
      ],
      data: rows,
      pagination: { limit: 5 },
      search: true,
      sort: true,
      language: {
        search: { placeholder: "Buscar sucursal..." },
        pagination: {
          previous: "Anterior",
          next: "Siguiente",
          showing: "Mostrando",
          results: "registros",
        },
        noRecordsFound: "No se encontraron sucursales registradas",
      },
    });

    gridSucursalesInstance.render(contenedor);

  } catch (error) {
    console.error("Error al cargar la tabla de sucursal:", error.message);
    alert("Hubo un error al cargar las sucursales.");
  }
}