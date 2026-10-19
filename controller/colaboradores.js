// ==========================================
// VARIABLES GLOBALES - COLABORADORES
// ==========================================
let idColaboradorEditando = null; // Controla si estamos creando (null) o editando (ID)
let gridColaboradoresInstance = null;

// ==========================================
// 1. GESTIÓN DEL MODAL (Crear y Editar)
// ==========================================

function abrirModalColaborador() {
  // 1. Limpiar el ID para asegurar modo "Creación"
  idColaboradorEditando = null;

  // 2. Resetear todos los campos del formulario (Nombre y Cargo)
  const form = document.getElementById("formColaborador");
  if (form) form.reset();

  // 3. Restablecer el título y texto del botón
  const titulo = document.getElementById("tituloModalColaborador");
  const btnAccion = document.getElementById("btnAccionColaborador");
  
  if (titulo) titulo.innerText = "Registrar Nuevo Colaborador";
  if (btnAccion) btnAccion.innerText = "Guardar Colaborador";

  // 4. Mostrar el modal quitando la clase 'hidden'
  const modal = document.getElementById("modalColaborador");
  if (modal) modal.classList.remove("hidden");
}
// Abrir Modal para EDITAR colaborador (Rellena los datos actuales)
function prepararEdicionColaborador(id, nombres, cargo) {
  idColaboradorEditando = id; // Modo Edición guardando el ID

  // Rellenar los inputs con los datos que vienen de la tabla
  document.getElementById("nombreColaborador").value = nombres;
  document.getElementById("input-cargo").value = cargo;

  // Cambiar textos del modal a modo Edición
  document.getElementById("tituloModalColaborador").innerText = "Actualizar Colaborador";
  document.getElementById("btnAccionColaborador").innerText = "Actualizar Colaborador";

  // Mostrar el modal
  document.getElementById("modalColaborador").classList.remove("hidden");
}

// Cerrar el modal de colaborador
function cerrarModalColaborador() {
  const modal = document.getElementById("modalColaborador");
  if (modal) {
    modal.classList.add("hidden");
  }
  idColaboradorEditando = null;
}

// ==========================================
// 2. OPERACIONES CON SUPABASE (Guardar / Actualizar / Eliminar)
// ==========================================

// Guardar o Actualizar en Supabase según corresponda
async function guardarColaborador(event) {
  event.preventDefault();

  const nombres = document.getElementById("nombreColaborador").value.trim().toUpperCase();
  const cargo = document.getElementById("input-cargo").value; // Capturamos el cargo seleccionado

  try {
    if (idColaboradorEditando === null) {
      // --- INSERTAR NUEVO ---
      const { error } = await window.supabaseClient
        .from("colaborador")
        .insert([{ nombres: nombres, cargo: cargo }]); // Añadimos el campo cargo

      if (error) throw error;
      
      if (window.mostrarToast) {
        window.mostrarToast("¡Colaborador registrado con éxito!", "success");
      }
    } else {
      // --- ACTUALIZAR EXISTENTE ---
      const { error } = await window.supabaseClient
        .from("colaborador")
        .update({ nombres: nombres, cargo: cargo }) // Actualizamos también el cargo
        .eq("id", idColaboradorEditando);

      if (error) throw error;
      
      if (window.mostrarToast) {
        window.mostrarToast("¡Colaborador actualizado con éxito!", "success");
      }
    }

    cerrarModalColaborador();
    cargarTablaColaboradores(); // Recarga la tabla con los cambios

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
function eliminarColaborador(id) {
  confirmarAccion(
    "¿Estás seguro?",
    "¿Estás seguro de que deseas eliminar este colaborador?",
    async () => {
      try {
        const { error } = await window.supabaseClient
          .from("colaborador") //[cite: 1]
          .delete()
          .eq("id", id);

        if (error) throw error;

        if (window.mostrarToast) {
          window.mostrarToast("¡Colaborador eliminado correctamente!", "success");
        }

        cargarTablaColaboradores(); // Recarga la tabla automáticamente
      } catch (error) {
        console.error("Error al eliminar:", error.message);

        if (window.mostrarToast) {
          window.mostrarToast("Hubo un error al intentar eliminar el colaborador.", "error");
        } else {
          mostrarAlerta("Error", "No se pudo eliminar el colaborador.", "error");
        }
      }
    }
  );
}

// ==========================================
// 3. CARGAR TABLA CON GRID.JS
// ==========================================
async function cargarTablaColaboradores() {
  try {
    const { data: colaborador, error } = await window.supabaseClient
      .from("colaborador")
      .select("*")
      .order("id", { ascending: true });

    if (error) throw error;

    const rows = (colaborador || []).map((item) => [
      item.id,
      item.nombres,
      gridjs.html(`
        <span class="px-2 py-0.5 text-[11px] font-semibold rounded-md ${
          item.cargo === 'MENSAJERO' 
            ? 'bg-blue-100 text-blue-700 border border-blue-200' 
            : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
        }">
          ${item.cargo || 'NO ASIGNADO'}
        </span>
      `),
      gridjs.html(`
        <div class="flex items-center gap-2">
          <!-- Botón Editar -->
          <button type="button" onclick="prepararEdicionColaborador(${item.id}, '${item.nombres.replace(/'/g, "\\'")}', '${(item.cargo || "").replace(/'/g, "\\'")}')" 
            class="text-amber-500 hover:text-amber-700 p-1 transition-colors" title="Editar">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>

          <!-- Botón Eliminar -->
          <button type="button" onclick="eliminarColaborador(${item.id})" 
            class="text-red-500 hover:text-red-700 p-1 transition-colors" title="Eliminar">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1,1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      `),
    ]);

    const contenedor = document.getElementById("wrapper-grid-table-colaboradores");
    if (contenedor) contenedor.innerHTML = "";

    if (gridColaboradoresInstance) {
      gridColaboradoresInstance.destroy();
    }

    gridColaboradoresInstance = new gridjs.Grid({
      columns: [
        { name: "ID", width: "70px" },
        { name: "Nombres del Colaborador" },
        { name: "Cargo", width: "150px" },
        { name: "Acciones", width: "100px", sort: false },
      ],
      data: rows,
      pagination: { limit: 5 },
      search: true,
      sort: true,
      language: {
        search: { placeholder: "Buscar colaborador..." },
        pagination: {
          previous: "Anterior",
          next: "Siguiente",
          showing: "Mostrando",
          results: "registros",
        },
        noRecordsFound: "No se encontraron colaboradores registrados",
      },
    });

    gridColaboradoresInstance.render(contenedor);

  } catch (error) {
    console.error("Error al cargar la tabla de colaboradores:", error.message);
    alert("Hubo un error al cargar los colaboradores.");
  }
}