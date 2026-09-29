// Al cargar la página por completo (incluyendo si presionas F5)
document.addEventListener("DOMContentLoaded", async () => {
  // 1. Buscamos si hay un usuario guardado en el almacenamiento local del navegador
  const usuarioGuardado = localStorage.getItem("usuario_actual");

  if (usuarioGuardado) {
    try {
      const data = JSON.parse(usuarioGuardado);
      
      // 2. Si existe, restauramos el estado directamente llamando al SPA
      if (typeof SPA !== "undefined" && typeof SPA.mostrarDashboard === "function") {
        SPA.mostrarDashboard(data);
      }
    } catch (e) {
      console.error("Error al leer la sesión guardada:", e);
      localStorage.removeItem("usuario_actual");
      if (typeof SPA !== "undefined" && typeof SPA.mostrarLogin === "function") {
        SPA.mostrarLogin();
      }
    }
  } else {
    // 3. Si no hay nada guardado, mostramos el login por defecto
    if (typeof SPA !== "undefined" && typeof SPA.mostrarLogin === "function") {
      SPA.mostrarLogin();
    }
  }
});
// Objeto SPA global para gestionar la visibilidad de las vistas
const SPA = {
  mostrarDashboard: function (userData) {
    document.getElementById("view-login").classList.add("hidden");
    document.getElementById("view-dashboard").classList.remove("hidden");
    if (typeof initDashboard === "function") initDashboard(userData);
  },
  mostrarLogin: function () {
    document.getElementById("view-dashboard").classList.add("hidden");
    document.getElementById("view-login").classList.remove("hidden");
    if (typeof resetLogin === "function") resetLogin();
  },
};

// Función para cargar los archivos HTML externos en los contenedores del index
async function loadViews() {
  try {
    const loginRes = await fetch("view/login.html");
    document.getElementById("view-login").innerHTML = await loginRes.text();

    const dashRes = await fetch("view/dashboard.html");
    document.getElementById("view-dashboard").innerHTML = await dashRes.text();

    // Inicializar iconos de Lucide al cargar las vistas
    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }

    // Mostrar el login por defecto al arrancar
    SPA.mostrarLogin();

    if (typeof initLogin === "function") {
      initLogin();
    }
  } catch (err) {
    console.error("Error al cargar las vistas de la SPA:", err);
  }
}

// Ejecutar la carga de vistas al iniciar la aplicación
document.addEventListener("DOMContentLoaded", () => {
  loadViews();
});

/**
 * Muestra un mensaje flotante (Toast) reutilizable en la esquina inferior derecha.
 * @param {string} mensaje - El texto que mostrará la notificación.
 * @param {string} tipo - El estado del toast: 'success' (verde), 'error' (rojo), 'warning' (amarillo) o 'info' (azul).
 */
window.mostrarToast = function (mensaje, tipo = "success") {
  // 1. Crear el contenedor flotante global si no existe en el DOM
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className =
      "fixed bottom-5 right-5 z-50 flex flex-col space-y-2 pointer-events-none";
    document.body.appendChild(container);
  }

  // 2. Definir los estilos e iconos según el tipo de mensaje solicitado
  let bgColor = "bg-slate-800 text-white";
  let iconName = "info";

  switch (tipo) {
    case "success": // Éxito (Verde esmeralda)
      bgColor = "bg-emerald-600 text-white shadow-emerald-900/10";
      iconName = "check-circle";
      break;
    case "error": // Error (Rojo institucional)
      bgColor = "bg-red-600 text-white shadow-red-900/10";
      iconName = "alert-circle";
      break;
    case "warning": // Advertencia (Ámbar / Amarillo oscuro legible)
      bgColor = "bg-amber-600 text-white shadow-amber-900/10";
      iconName = "alert-triangle";
      break;
    case "info": // Información (Azul corporativo)
    default:
      bgColor = "bg-blue-600 text-white shadow-blue-900/10";
      iconName = "info";
      break;
  }

  // 3. Crear el elemento visual del Toast con Tailwind
  const toast = document.createElement("div");
  toast.className = `pointer-events-auto flex items-center space-x-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium transition-all transform translate-y-3 opacity-0 ${bgColor}`;
  toast.innerHTML = `
        <i data-lucide="${iconName}" class="w-5 h-5 flex-shrink-0"></i>
        <span class="leading-tight">${mensaje}</span>
    `;

  container.appendChild(toast);

  // Renderizar el icono de Lucide correspondiente
  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }

  // 4. Activar la animación de entrada (deslizar hacia arriba y mostrar opacidad)
  setTimeout(() => {
    toast.classList.remove("translate-y-3", "opacity-0");
  }, 15);

  // 5. Ocultar y eliminar el toast automáticamente después de 4 segundos
  setTimeout(() => {
    toast.classList.add("translate-y-3", "opacity-0");
    setTimeout(() => {
      toast.remove();
    }, 300); // Tiempo de espera para que termine la transición de salida
  }, 4000);
};
