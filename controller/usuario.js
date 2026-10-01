// ==========================================
// VARIABLES GLOBALES - USUARIOS
// ==========================================
let idUsuarioEditando = null;
let gridUsuariosInstance = null;
let gridBuscarColaboradorInstance = null;
let gridBuscarSucursalInstance = null;
let idUsuarioPasswordCambio = null;

// ==========================================
// 1. GESTIÓN DEL MODAL DE USUARIO (Crear y Editar)
// ==========================================

function abrirModalUsuario() {
  idUsuarioEditando = null;
  document.getElementById("formUsuario").reset();
  document.getElementById("input-id-colaborador").value = "";
  document.getElementById("input-id-sucursal").value = "";
  document.getElementById("input-estado").checked = true;

  document.getElementById("tituloModalUsuario").innerText =
    "Registrar Nuevo Usuario";
  document.getElementById("btnAccionUsuario").innerText = "Guardar Usuario";

  document.getElementById("modalUsuario").classList.remove("hidden");
}

function cerrarModalUsuario() {
  const modal = document.getElementById("modalUsuario");
  if (modal) {
    modal.classList.add("hidden");
  }
  idUsuarioEditando = null;
}

// ==========================================
// 2. MODALES AUXILIARES DE BÚSQUEDA
// ==========================================

async function abrirModalBusquedaColaborador() {
  document.getElementById("modalBuscarColaborador").classList.remove("hidden");

  try {
    const { data: colaboradores, error } = await window.supabaseClient
      .from("colaborador")
      .select("*")
      .order("id", { ascending: true });

    if (error) throw error;

    const rows = (colaboradores || []).map((item) => [
      item.id,
      item.nombres,
      gridjs.html(`
        <button type="button" onclick="seleccionarColaborador(${item.id}, '${item.nombres.replace(/'/g, "\\'")}')" 
          class="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition">
          Seleccionar
        </button>
      `),
    ]);

    const contenedor = document.getElementById(
      "wrapper-grid-buscar-colaborador",
    );
    contenedor.innerHTML = "";

    if (gridBuscarColaboradorInstance) {
      gridBuscarColaboradorInstance.destroy();
    }

    gridBuscarColaboradorInstance = new gridjs.Grid({
      columns: ["ID", "Nombres", "Acción"],
      data: rows,
      pagination: { limit: 4 },
      search: true,
      language: {
        search: { placeholder: "Buscar..." },
        pagination: {
          previous: "Ant.",
          next: "Sig.",
          showing: "Mostrando",
          results: "reg.",
        },
        noRecordsFound: "No se encontraron colaboradores",
      },
    });

    gridBuscarColaboradorInstance.render(contenedor);
  } catch (error) {
    console.error("Error al cargar colaboradores:", error.message);
  }
}

function cerrarModalBusquedaColaborador() {
  document.getElementById("modalBuscarColaborador").classList.add("hidden");
}

function seleccionarColaborador(id, nombre) {
  document.getElementById("input-id-colaborador").value = id;
  document.getElementById("input-nombre-colaborador").value = nombre;
  cerrarModalBusquedaColaborador();
}

async function abrirModalBusquedaSucursal() {
  document.getElementById("modalBuscarSucursal").classList.remove("hidden");

  try {
    const { data: sucursales, error } = await window.supabaseClient
      .from("sucursal")
      .select("*")
      .order("id", { ascending: true });

    if (error) throw error;

    const rows = (sucursales || []).map((item) => [
      item.id,
      item.nombre,
      gridjs.html(`
        <button type="button" onclick="seleccionarSucursal(${item.id}, '${item.nombre.replace(/'/g, "\\'")}')" 
          class="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition">
          Seleccionar
        </button>
      `),
    ]);

    const contenedor = document.getElementById("wrapper-grid-buscar-sucursal");
    contenedor.innerHTML = "";

    if (gridBuscarSucursalInstance) {
      gridBuscarSucursalInstance.destroy();
    }

    gridBuscarSucursalInstance = new gridjs.Grid({
      columns: ["ID", "Sucursal", "Acción"],
      data: rows,
      pagination: { limit: 4 },
      search: true,
      language: {
        search: { placeholder: "Buscar..." },
        pagination: {
          previous: "Ant.",
          next: "Sig.",
          showing: "Mostrando",
          results: "reg.",
        },
        noRecordsFound: "No se encontraron sucursales",
      },
    });

    gridBuscarSucursalInstance.render(contenedor);
  } catch (error) {
    console.error("Error al cargar sucursales:", error.message);
  }
}

function cerrarModalBusquedaSucursal() {
  document.getElementById("modalBuscarSucursal").classList.add("hidden");
}

function seleccionarSucursal(id, nombre) {
  document.getElementById("input-id-sucursal").value = id;
  document.getElementById("input-nombre-sucursal").value = nombre;
  cerrarModalBusquedaSucursal();
}

// ==========================================
// 3. OPERACIONES CRUD CON SUPABASE (Usuarios)
// ==========================================

async function guardarUsuario(event) {
  event.preventDefault();

  const usuario = document
    .getElementById("input-usuario")
    .value.trim()
    .toUpperCase();
  const contrasena = document.getElementById("input-contrasena").value.trim();
  const id_colaborador = document.getElementById("input-id-colaborador").value;
  const sucursal_id = document.getElementById("input-id-sucursal").value;
  const perfil = document.getElementById("input-perfil").value;
  const estado = document.getElementById("input-estado").checked;

  const datosUsuario = {
    usuario: usuario,
    id_colaborador: parseInt(id_colaborador),
    sucursal_id: parseInt(sucursal_id),
    perfil: perfil,
    estado: estado,
  };

  if (contrasena) {
    datosUsuario.contrasena = await encriptarTexto(contrasena);
  }

  try {
    if (idUsuarioEditando === null) {
      if (!contrasena) {
        throw new Error("La contraseña es obligatoria para nuevos usuarios.");
      }
      const { error } = await window.supabaseClient
        .from("usuario")
        .insert([datosUsuario]);

      if (error) throw error;
      if (window.mostrarToast)
        window.mostrarToast("¡Usuario registrado con éxito!", "success");
    } else {
      if (!contrasena) {
        delete datosUsuario.contrasena; // Mantiene la clave anterior si no se escribe otra
      }
      const { error } = await window.supabaseClient
        .from("usuario")
        .update(datosUsuario)
        .eq("id", idUsuarioEditando);

      if (error) throw error;
      if (window.mostrarToast)
        window.mostrarToast("¡Usuario actualizado con éxito!", "success");
    }

    cerrarModalUsuario();
    cargarTablaUsuarios();
  } catch (error) {
    console.error("Error:", error.message);
    if (window.mostrarToast)
      window.mostrarToast("Error: " + error.message, "error");
  }
}

async function cargarTablaUsuarios() {
  try {
    const { data: usuarios, error } = await window.supabaseClient
      .from("usuario")
      .select(
        `
        id,
        usuario,
        contrasena,
        id_colaborador,
        sucursal_id,
        perfil,
        estado,
        colaborador ( nombres ),
        sucursal ( nombre )
      `,
      )
      .order("id", { ascending: true });

    if (error) throw error;

    const rows = (usuarios || []).map((item) => [
      item.id,
      item.usuario,
      item.colaborador?.nombres || "N/A",
      item.sucursal?.nombre || "N/A",
      item.perfil,
      item.estado
        ? gridjs.html(
            '<span class="px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-semibold text-[10px]">ACTIVO</span>',
          )
        : gridjs.html(
            '<span class="px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-semibold text-[10px]">INACTIVO</span>',
          ),
      gridjs.html(`
        <div class="flex items-center gap-1">
          <!-- Botón Editar -->
          <button type="button" onclick='prepararEdicionUsuario(${JSON.stringify(item)})' class="text-amber-500 hover:text-amber-700 p-1" title="Editar Usuario">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>

          <!-- Botón Cambiar Contraseña -->
          <button type="button" onclick="abrirModalCambiarPassword(${item.id}, '${item.usuario}')" class="text-blue-500 hover:text-blue-700 p-1" title="Cambiar Contraseña">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </button>

          <!-- Botón Eliminar -->
          <button type="button" onclick="eliminarUsuario(${item.id})" class="text-red-500 hover:text-red-700 p-1" title="Eliminar">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1,1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      `),
    ]);

    const contenedor = document.getElementById("wrapper-grid-table-usuarios");
    if (contenedor) contenedor.innerHTML = "";

    if (gridUsuariosInstance) {
      gridUsuariosInstance.destroy();
    }

    gridUsuariosInstance = new gridjs.Grid({
      columns: [
        "ID",
        "Usuario",
        "Colaborador",
        "Sucursal",
        "Perfil",
        "Estado",
        "Acciones",
      ],
      data: rows,
      pagination: { limit: 5 },
      search: true,
      sort: true,
      language: {
        search: { placeholder: "Buscar usuario..." },
        pagination: {
          previous: "Anterior",
          next: "Siguiente",
          showing: "Mostrando",
          results: "registros",
        },
        noRecordsFound: "No se encontraron usuarios",
      },
    });

    gridUsuariosInstance.render(contenedor);
  } catch (error) {
    console.error("Error al cargar la tabla de usuarios:", error.message);
  }
}

async function eliminarUsuario(id) {
  confirmarAccion(
    "¿Estás seguro?",
    "¿Estás seguro de que deseas eliminar este usuario?",
    async () => {
      try {
        const { error } = await window.supabaseClient
          .from("usuario")
          .delete()
          .eq("id", id);

        if (error) throw error;

        if (window.mostrarToast) {
          window.mostrarToast("¡Usuario eliminado correctamente!", "success");
        }

        cargarTablaUsuarios(); // Recarga la tabla automáticamente
      } catch (error) {
        console.error("Error al eliminar:", error.message);

        if (window.mostrarToast) {
          window.mostrarToast(
            "Hubo un error al intentar eliminar el usuario.",
            "error",
          );
        } else {
          mostrarAlerta("Error", "No se pudo eliminar el usuario.", "error");
        }
      }
    },
  );
}


function prepararEdicionUsuario(item) {
  idUsuarioEditando = item.id;

  document.getElementById("tituloModalUsuario").innerText =
    "Actualizar Usuario";
  document.getElementById("btnAccionUsuario").innerText = "Actualizar Usuario";

  document.getElementById("input-usuario").value = item.usuario || "";
  document.getElementById("input-contrasena").value = "";
  document.getElementById("input-id-colaborador").value =
    item.id_colaborador || "";
  document.getElementById("input-nombre-colaborador").value =
    item.colaborador?.nombres || "";
  document.getElementById("input-id-sucursal").value = item.sucursal_id || "";
  document.getElementById("input-nombre-sucursal").value =
    item.sucursal?.nombre || "";
  document.getElementById("input-perfil").value = item.perfil || "";
  document.getElementById("input-estado").checked = item.estado;

  document.getElementById("modalUsuario").classList.remove("hidden");
}

function abrirModalCambiarPassword(id, nombreUsuario) {
  idUsuarioPasswordCambio = id;
  document.getElementById("formCambiarPassword").reset();
  document.getElementById("label-usuario-pass").innerText = nombreUsuario;
  document.getElementById("modalCambiarPassword").classList.remove("hidden");
}

function cerrarModalCambiarPassword() {
  document.getElementById("modalCambiarPassword").classList.add("hidden");
  idUsuarioPasswordCambio = null;
}

async function encriptarTexto(texto) {
  const encoder = new TextEncoder();
  const data = encoder.encode(texto);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function guardarNuevaPassword(event) {
  event.preventDefault();

  const nuevaPass = document
    .getElementById("input-nueva-contrasena")
    .value.trim();

  try {
    const passwordEncriptada = await encriptarTexto(nuevaPass);

    const { error } = await window.supabaseClient
      .from("usuario")
      .update({ contrasena: passwordEncriptada })
      .eq("id", idUsuarioPasswordCambio);

    if (error) throw error;

    if (window.mostrarToast) {
      window.mostrarToast(
        "¡Contraseña actualizada y encriptada con éxito!",
        "success",
      );
    } else {
      alert("Contraseña actualizada con éxito");
    }

    cerrarModalCambiarPassword();
    cargarTablaUsuarios();
  } catch (error) {
    console.error("Error al actualizar contraseña:", error.message);
    if (window.mostrarToast) {
      window.mostrarToast("Error al actualizar la contraseña", "error");
    }
  }
}
