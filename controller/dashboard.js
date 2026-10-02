window.initDashboard = function (userData) {
  console.log("Dashboard inicializado con:", userData);

  // 1. Mostrar el nombre del colaborador o usuario
  const sesionUserLabel = document.getElementById("sesion-user");
  if (sesionUserLabel && userData) {
    const nombreMostrar =
      userData.colaborador?.nombres || userData.usuario || "USUARIO";
    sesionUserLabel.textContent = nombreMostrar;
  }

  // 2. Mostrar y GUARDAR el nombre de la sucursal
  const sesionSucursalLabel = document.getElementById("sesion-sucursal");
  if (userData) {
    // Obtenemos el nombre de la sucursal de forma segura
    const sucursalMostrar = userData.sucursal?.nombre || "SIN SUCURSAL";

    // 📍 ¡ESTO FALTABA! Guardarlo en el sessionStorage para que el Excel lo lea
    sessionStorage.setItem("sucursal_nombre", sucursalMostrar);

    // Si existe el elemento en el HTML, lo pintamos visualmente
    if (sesionSucursalLabel) {
      sesionSucursalLabel.textContent = sucursalMostrar;
    }
  }
};

// Función principal unificada para cambiar secciones, cargar HTML y activar iconos automáticamente
async function cargarSeccion(seccion, elemento) {
  const contenedor = document.getElementById("app-view");

  // Diccionario de rutas HTML para cada sección
  const rutasHtml = {
    admision: "view/admission.html",
    envios: "view/document.html",
    devolucion: "view/devolucion.html",
    guias: "view/guia.html",
    consolidado: "view/consolidado.html",
    sucursales: "view/sucursales.html",
    colaboradores: "view/colaboradores.html",
    usuarios: "view/usuario.html"
  };

  try {
    const archivoHtml = rutasHtml[seccion];

    if (archivoHtml) {
      // Petición fetch al HTML de la vista
      const respuesta = await fetch(archivoHtml);
      if (!respuesta.ok) {
        throw new Error(`No se pudo cargar el archivo ${archivoHtml}`);
      }

      // Inyectamos el HTML en el contenedor principal
      contenedor.innerHTML = await respuesta.text();

      // Damos un tiempo (50ms) para que el DOM se renderice antes de reasociar eventos/datos
      setTimeout(() => {
        // 1. Iconos de Lucide
        if (typeof lucide !== "undefined" && typeof lucide.createIcons === "function") {
          lucide.createIcons();
        }

        // 2. Inicialización según la sección activa
        switch (seccion) {
          case "admision":
            if (typeof window.listarEnviosDiarios === "function") {
              try {
                window.listarEnviosDiarios();
              } catch (error) {
                console.error("Error al ejecutar listarEnviosDiarios:", error);
              }
            } else {
              console.warn("window.listarEnviosDiarios no está definida.");
            }
            break;

          case "envios":
            if (typeof window.inicializarModuloEnvios === "function") {
              window.inicializarModuloEnvios();
              if (typeof window.listarEnviosDiarios === "function") {
                window.listarEnviosDiarios();
              }
            } else {
              console.warn("window.inicializarModuloEnvios no está definida.");
            }
            break;

          case "guias":
            if (typeof window.inicializarModuloGuias === "function") {
              window.inicializarModuloGuias();
            } else {
              console.warn("window.inicializarModuloGuias no está definida.");
            }
            break;

          case "consolidado":
            window.datosConsolidadoGlobal = [];
            if (typeof window.listarMotivoDescarga === "function") {
              window.listarMotivoDescarga();
              window.listarTipoServicio();
            }
            if (typeof window.renderizarGridConsolidado === "function") {
              window.renderizarGridConsolidado(null);
            }
            break;

          case "sucursales":
            if (typeof window.cargarTablaSucursales === "function") {
              window.cargarTablaSucursales();
            } else {
              console.warn("window.cargarTablaSucursales no está definida.");
            }
            break;

          case "colaboradores":
            if (typeof window.cargarTablaColaboradores === "function") {
              window.cargarTablaColaboradores();
            } else {
              console.warn("window.cargarTablaColaboradores no está definida.");
            }
            break;

          case "usuarios":
            if (typeof window.cargarTablaUsuarios === "function") {
              window.cargarTablaUsuarios();
            } else {
              console.warn("window.cargarTablaUsuarios no está definida.");
            }
            break;
        }
      }, 50);

    } else {
      // Vista inicial / por defecto
      contenedor.innerHTML = `
        <h1 class="text-2xl font-bold text-slate-800 mb-4">Bienvenido al Panel</h1>
        <p class="text-slate-600">Selecciona una opción del menú lateral para comenzar a operar.</p>
      `;
      setTimeout(() => {
        if (typeof lucide !== "undefined" && typeof lucide.createIcons === "function") {
          lucide.createIcons();
        }
      }, 50);
    }
  } catch (error) {
    contenedor.innerHTML = `
      <h1 class="text-2xl font-bold text-red-600 mb-4">Error de Carga</h1>
      <p class="text-slate-600">No se pudo cargar el archivo. Verifica que estés ejecutando desde un servidor local.</p>
    `;
    console.error(error);
  }

  // Marcar visualmente el elemento activo en el menú lateral
  document.querySelectorAll(".nav-item").forEach((el) => {
    el.classList.remove("bg-blue-50", "text-blue-600", "font-semibold");
    el.classList.add("text-slate-600");
    const icon = el.querySelector("i");
    if (icon) icon.classList.remove("text-blue-600");
  });

  if (elemento) {
    elemento.classList.add("bg-blue-50", "text-blue-600", "font-semibold");
    elemento.classList.remove("text-slate-600");
    const icon = elemento.querySelector("i");
    if (icon) icon.classList.add("text-blue-600");
  }
}

function toggleSidebar() {
  const aside = document.getElementById("app-aside");
  const texts = document.querySelectorAll(".aside-text");
  const labels = document.querySelectorAll(".aside-label");
  const headerContent = document.getElementById("aside-header-content");
  const indicators = document.querySelectorAll(".submenu-indicator");
  const submenuEnvios = document.getElementById("submenu-envios");
  const arrowEnvios = document.getElementById("arrow-envios");

  if (aside.classList.contains("w-56")) {
    aside.classList.remove("w-56");
    aside.classList.add("w-20");
    texts.forEach((el) => el.classList.add("hidden"));
    if (labels) labels.forEach((el) => el.classList.add("hidden"));
    if (headerContent) headerContent.classList.add("hidden");

    // Mostramos el punto indicador en modo mínimo y cerramos submenús abiertos
    indicators.forEach((el) => el.classList.remove("hidden"));
    if (submenuEnvios) submenuEnvios.classList.add("hidden");
    if (arrowEnvios) arrowEnvios.classList.remove("rotate-180");
  } else {
    aside.classList.remove("w-20");
    aside.classList.add("w-56");

    // Ocultamos el indicador al abrir la barra
    indicators.forEach((el) => el.classList.add("hidden"));

    setTimeout(() => {
      texts.forEach((el) => el.classList.remove("hidden"));
      if (labels) labels.forEach((el) => el.classList.remove("hidden"));
      if (headerContent) headerContent.classList.remove("hidden");
    }, 150);
  }
}

// Función para desplegar u ocultar el submenú de envíos y rotar la flecha
function toggleSubmenu(submenuId, arrowId) {
  const submenu = document.getElementById(submenuId);
  const arrow = document.getElementById(arrowId);

  if (submenu.classList.contains("hidden")) {
    submenu.classList.remove("hidden");
    if (arrow) arrow.classList.add("rotate-180");
  } else {
    submenu.classList.add("hidden");
    if (arrow) arrow.classList.remove("rotate-180");
  }
}
// Función para mostrar u ocultar el formulario de forma interactiva
function toggleFormulario() {
  const contenedor = document.getElementById("contenedor-formulario");
  const textoBtn = document.getElementById("texto-btn-form");

  if (contenedor.classList.contains("hidden")) {
    contenedor.classList.remove("hidden");
    textoBtn.textContent = "Ocultar Formulario";

    // ⭐ Limpiamos y cargamos los datos iniciales frescos al abrir
    limpiarFormulario();
  } else {
    contenedor.classList.add("hidden");
    textoBtn.textContent = "Nuevo Envío";
  }
}

if (window.lucide) {
  lucide.createIcons();
}
// Script para asegurar que los iconos de Lucide se rendericen correctamente
document.addEventListener("DOMContentLoaded", () => {
  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
});

// Si cargas esta vista mediante fetch o AJAX, ejecuta esto inmediatamente después de insertarla:
if (typeof lucide !== "undefined") {
  lucide.createIcons();
}

/**
 * Función global para cerrar sesión de forma limpia
 */
window.handleLogout = function () {
  // 1. Borramos el registro del usuario guardado en el navegador
  localStorage.removeItem("usuario_actual");

  // 2. Mostrar toast informativo de cierre de sesión
  if (typeof window.mostrarToast === "function") {
    window.mostrarToast("Sesión cerrada correctamente.", "info");
  }

  // 3. Volver a la vista del login mediante el objeto SPA
  if (typeof SPA !== "undefined" && SPA.mostrarLogin) {
    SPA.mostrarLogin();
  }
};
function limpiarFormulario() {
  // 1. Limpiar todos los inputs y selects del formulario
  const formulario = document.getElementById("contenedor-formulario"); // O el ID específico de tu <form>
  if (formulario) {
    // Si tienes un elemento <form> dentro, puedes usar formulario.reset()
    // o limpiar manualmente los campos uno por uno si prefieres:
    const inputs = formulario.querySelectorAll("input, select, textarea");
    inputs.forEach((input) => {
      if (input.type === "checkbox" || input.type === "radio") {
        input.checked = false;
      } else {
        input.value = "";
      }
    });
  }
  // 2. Bloquear nuevamente Provincia y Distrito y vaciarlos
  const selectProv = document.getElementById("input-provincia");
  const selectDist = document.getElementById("input-distrito");

  if (selectProv) {
    selectProv.innerHTML = '<option value="">Seleccione...</option>';
    selectProv.disabled = true;
  }

  if (selectDist) {
    selectDist.innerHTML = '<option value="">Seleccione...</option>';
    selectDist.disabled = true;
  }

  // 3. Volver a cargar los departamentos frescos desde Supabase por si hubo cambios
  cargarTiposDeServicio();
  cargarDepartamentos();
}
