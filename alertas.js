/**
 * Muestra una alerta informativa o de éxito/error genérica.
 * @param {string} titulo - Título principal de la alerta.
 * @param {string} texto - Mensaje descriptivo.
 * @param {('success'|'error'|'warning'|'info'|'question')} icono - Tipo de ícono.
 */
function mostrarAlerta(titulo, texto, icono = "success") {
  return Swal.fire({
    title: titulo,
    text: texto,
    icon: icono,
    confirmButtonColor: "#2563eb", // Color azul corporativo (Tailwind blue-600)
    confirmButtonText: "Aceptar",
  });
}

/**
 * Muestra una ventana de confirmación genérica (Ideal para eliminar o cambiar estados).
 * @param {string} titulo - Título de la advertencia.
 * @param {string} texto - Texto secundario o consecuencia.
 * @param {Function} funcionEjecutar - Función que se ejecutará si el usuario confirma.
 */
async function confirmarAccion(titulo, texto, funcionEjecutar) {
  const resultado = await Swal.fire({
    title: titulo || "¿Estás seguro?",
    text: texto || "¡Esta acción no se puede revertir!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#2563eb", // Azul Tailwind
    cancelButtonColor: "#64748b", // Gris Tailwind (slate-500)
    confirmButtonText: "Sí, confirmar",
    cancelButtonText: "Cancelar",
  });

  if (resultado.isConfirmed) {
    // Ejecuta la función que le pases como parámetro (por ejemplo, tu lógica de eliminación)
    if (typeof funcionEjecutar === "function") {
      funcionEjecutar();
    }
  }
}

