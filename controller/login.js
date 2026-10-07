// ==========================================
// NAVEGACIÓN FLUIDA CON LA TECLA ENTER
// ==========================================
document.addEventListener("keydown", function (event) {
  // Verificamos si la tecla presionada es ENTER
  if (event.key === "Enter") {
    const activo = document.activeElement;

    // Campos en el orden correcto
    const idsCampos = ["username", "password"];

    // Buscamos en qué campo estamos
    const indiceActual = idsCampos.indexOf(activo.id);

    if (indiceActual !== -1) {
      event.preventDefault();

      // Si estamos en el último campo
      if (indiceActual === idsCampos.length - 1) {
        if (typeof window.handleLogin === "function") {
          window.handleLogin(event);
        }
      } else {
        // Pasamos al siguiente campo
        const siguienteId = idsCampos[indiceActual + 1];
        const siguienteElemento = document.getElementById(siguienteId);

        if (siguienteElemento) {
          siguienteElemento.focus();
        }
      }
    }
  }
});

async function handleLogin(event) {
  event.preventDefault();

  const userInput = document.getElementById("username").value.trim().toUpperCase();
  const passInput = document.getElementById("password").value.trim();

  try {
    // Llamamos a la función segura en la base de datos
    const { data, error } = await window.supabaseClient.rpc("login_usuario", {
      p_usuario: userInput,
      p_password: passInput
    });

    if (error || !data) {
      window.mostrarToast("Credenciales incorrectas o usuario inactivo.", "error");

      const form = document.getElementById("login-form");
      if (form) form.reset();

      const usernameInput = document.getElementById("username");
      if (usernameInput) usernameInput.focus();
      return;
    }

    // 🔑 1. Guardar la sesión limpia (la contraseña ya ni siquiera existe aquí)
    sessionStorage.setItem("sesion_usuario", JSON.stringify(data));

    if (data.sucursal && data.sucursal.id) {
      sessionStorage.setItem("sucursal_id", data.sucursal.id);
    }
    if (data.colaborador && data.colaborador.id) {
      sessionStorage.setItem("colaborador_id", data.colaborador.id);
    }

    // ✨ 2. Mostrar el mensaje de bienvenida personalizado
    const nombreColaborador = data.colaborador?.nombres || data.usuario || "USUARIO";
    if (typeof window.mostrarToast === "function") {
      window.mostrarToast(`¡Bienvenido, ${nombreColaborador}!`, "success");
    }

    // 🚀 3. Redirigir al dashboard
    setTimeout(() => {
      if (typeof SPA !== "undefined" && typeof SPA.mostrarDashboard === "function") {
        SPA.mostrarDashboard(data);
      } else if (typeof window.initDashboard === "function") {
        window.initDashboard(data);
      }
    }, 800);

  } catch (err) {
    console.error("Error en el proceso de autenticación:", err);
    if (typeof window.mostrarToast === "function") {
      window.mostrarToast("Ocurrió un error de conexión con el servidor.", "error");
    }
  }
}
// 2. Función para limpiar el formulario y los errores (Llamada al cerrar sesión)
function resetLogin() {
  const form = document.getElementById("login-form");
  if (form) form.reset();

  const errorDiv = document.getElementById("login-error");
  if (errorDiv) errorDiv.classList.add("hidden");
}

// 3. Función de inicialización automática al cargar el componente HTML del login
function initLogin() {
  console.log("Vista de login inicializada y lista correctamente.");

  // Opcional: Poner el cursor en el usuario apenas carga la pantalla de login
  const usernameInput = document.getElementById("username");
  if (usernameInput) usernameInput.focus();
}
// 4. Función global para alternar la visibilidad de la contraseña (Icono del Ojo)
window.togglePassword = function (idInput, idIcono) {
  const passwordInput = document.getElementById(idInput);
  const eyeIcon = document.getElementById(idIcono);

  if (!passwordInput || !eyeIcon) return;

  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    eyeIcon.setAttribute("data-lucide", "eye-off");
  } else {
    passwordInput.type = "password";
    eyeIcon.setAttribute("data-lucide", "eye");
  }

  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
};
