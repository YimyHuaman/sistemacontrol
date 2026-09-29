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
  // 1. Manejo del contenido dinámico (SPA cargando archivos desde la carpeta view)
  const contenedor = document.getElementById("app-view");

  try {
    let archivoHtml = "";

    // Evaluamos qué sección se solicitó para determinar qué archivo HTML cargar
    if (
      seccion === "admision" ||
      seccion === "nuevos" ||
      seccion === "ingreso"
    ) {
      archivoHtml = "view/admission.html";
    } else if (seccion === "envios") {
      archivoHtml = "view/document.html";
    } else if (seccion === "devolucion") {
      archivoHtml = "view/devolucion.html";
    } else if (seccion === "guias") {
      archivoHtml = "view/guia.html";
    } else if (seccion === "consolidado") {
      archivoHtml = "view/consolidado.html";
    }

    // Si se encontró un archivo válido para la sección
    if (archivoHtml) {
      // Petición fetch apuntando al archivo HTML de la vista
      const respuesta = await fetch(archivoHtml);
      if (!respuesta.ok)
        throw new Error(`No se pudo cargar el archivo ${archivoHtml}`);

      // Inyectamos el contenido HTML descargado dentro del contenedor principal de la SPA
      contenedor.innerHTML = await respuesta.text();

      // 🔑 SOLUCIÓN SPA: Damos un pequeño respiro (50ms) para que el DOM pinte los elementos y ejecutamos los scripts de la vista
      setTimeout(() => {
        // 1. Convierte todos los <i data-lucide="..."></i> en vectores visuales de Lucide
        if (
          typeof lucide !== "undefined" &&
          typeof lucide.createIcons === "function"
        ) {
          lucide.createIcons();
        }

        // 2. Si la sección es de admisión, disparamos la función que trae y pinta los datos
        if (
          (seccion === "admision" ||
            seccion === "nuevos" ||
            seccion === "ingreso") &&
          typeof window.listarEnviosDiarios === "function"
        ) {
          window.listarEnviosDiarios();
        }

        // 3. 🚀 SI LA SECCIÓN ES ENVÍOS: Llamamos al inicializador global que enlazará los eventos y cargará los pendientes
        if (seccion === "envios") {
          if (typeof window.inicializarModuloEnvios === "function") {
            window.inicializarModuloEnvios();
          } else {
            console.warn(
              "La función window.inicializarModuloEnvios no está definida. Verifica que document.js esté cargado.",
            );
          }
        }
        // 4. 🚀 SI LA SECCIÓN ES GUÍAS: Llamamos al inicializador del módulo de guías corregido
        else if (seccion === "guias") {
          if (typeof window.inicializarModuloGuias === "function") {
            window.inicializarModuloGuias();
          } else {
            console.warn(
              "La función inicializarModuloGuias no está definida. Verifica que el controlador de guías esté cargado.",
            );
          }
        }
        // 5. 🚀 SI LA SECCIÓN ES CONSOLIDADO: Llamamos correctamente al inicializador y validamos su función correspondiente
        else if (seccion === "consolidado") {
          if (typeof window.listarMotivoDescarga === "function") {
            window.listarMotivoDescarga();
          } else {
            console.warn(
              "La función inicializarModuloConsolidado no está definida. Verifica que el controlador de consolidado esté cargado.",
            );
          }
        }
      }, 50);
    } else {
      // Vista por defecto (Home / Panel principal) si no coincide con ninguna ruta anterior
      contenedor.innerHTML = `
        <h1 class="text-2xl font-bold text-slate-800 mb-4">Bienvenido al Panel</h1>
        <p class="text-slate-600">Selecciona una opción del menú lateral para comenzar a operar.</p>
      `;
      setTimeout(() => {
        if (typeof lucide !== "undefined") lucide.createIcons();
      }, 50);
    }
  } catch (error) {
    // Manejo de errores en caso de que el fetch falle (por ejemplo, ejecutar sin Live Server)
    contenedor.innerHTML = `
      <h1 class="text-2xl font-bold text-red-600 mb-4">Error de Carga</h1>
      <p class="text-slate-600">No se pudo cargar el archivo. Verifica que exista y que estés ejecutando el proyecto desde un servidor local (Live Server).</p>
    `;
    console.error(error);
  }

  // 2. Limpiar el estado activo (clases de selección) de todos los botones del menú lateral
  document.querySelectorAll(".nav-item").forEach((el) => {
    el.classList.remove("bg-blue-50", "text-blue-600", "font-semibold");
    el.classList.add("text-slate-600");
    const icon = el.querySelector("i");
    if (icon) icon.classList.remove("text-blue-600");
  });

  // 3. Marcar visualmente de manera permanente el botón que el usuario acaba de seleccionar en el menú
  if (elemento) {
    elemento.classList.add("bg-blue-50", "text-blue-600", "font-semibold");
    elemento.classList.remove("text-slate-600");
    const icon = elemento.querySelector("i");
    if (icon) icon.classList.add("text-blue-600");
  }
}
// 👈 Corregido el cierre de la función (eliminado el paréntesis extra)
// Función para colapsar o expandir la barra lateral completa (Ajustada a w-56)
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
