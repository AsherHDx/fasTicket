/**
 * Servicio de control de IDs de tickets.
 *
 * IMPORTANTE: el ID del ticket NO se autogenera aquí. El usuario lo ingresa
 * manualmente porque debe coincidir con el ID del sistema de tickets real.
 * Este servicio solo valida que no haya duplicados dentro de la aplicación.
 */

/**
 * Verifica si un ID ya está siendo usado por algún ticket de la lista.
 * @param {string} id - ID a verificar
 * @param {Array<Object>} tickets - Lista de tickets existentes
 * @param {string|null} idExcluir - ID del ticket que se está editando (para ignorarse a sí mismo)
 * @returns {boolean} true si el ID ya existe en otro ticket
 */
export function idYaExiste(id, tickets, idExcluir = null) {
  if (!id || !Array.isArray(tickets)) {
    return false;
  }

  return tickets.some((ticket) => ticket.id === id && ticket.id !== idExcluir);
}

/**
 * Valida que un ID sea único dentro de la lista de tickets.
 * @param {string} id - ID a validar
 * @param {Array<Object>} tickets - Lista de tickets existentes
 * @param {string|null} idExcluir - ID del ticket que se está editando (opcional)
 * @returns {Object} { valido: boolean, mensaje: string|null }
 */
export function validarIdUnico(id, tickets, idExcluir = null) {
  if (!id || typeof id !== 'string' || id.trim() === '') {
    return {
      valido: false,
      mensaje: 'El ID del ticket es obligatorio.',
    };
  }

  const idLimpio = id.trim();

  if (idYaExiste(idLimpio, tickets, idExcluir)) {
    return {
      valido: false,
      mensaje: `Ya existe un ticket con el ID "${idLimpio}". No se permiten IDs duplicados.`,
    };
  }

  return {
    valido: true,
    mensaje: null,
  };
}
