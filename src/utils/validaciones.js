
// ===== Validaciones de datos para tickets de fasTicket =====

import { validarIdUnico } from '../services/idService.js';



/**
 * Valida que los campos requeridos de un ticket estén presentes.
 * @param {Object} ticket
 * @returns {Object} { valido: boolean, errores: string[] }
 */
export function validarCamposRequeridos(ticket) {
  const errores = [];

  if (!ticket || typeof ticket !== 'object') {
    return { valido: false, errores: ['El ticket no es válido.'] };
  }

  if (!ticket.Asunto || String(ticket.Asunto).trim() === '') {
    errores.push('El asunto es obligatorio.');
  }

  if (!ticket.Codigo || String(ticket.Codigo).trim() === '') {
    errores.push('El código es obligatorio.');
  }

  if (!ticket.Prioridad) {
    errores.push('La prioridad es obligatoria.');
  }

  if (!ticket.Tipo || String(ticket.Tipo).trim() === '') {
    errores.push('El tipo es obligatorio.');
  }

  return {
    valido: errores.length === 0,
    errores,
  };
}


/**
 * Valida un ticket completo antes de guardarlo: campos requeridos + ID único.
 * @param {Object} ticket - Ticket a validar
 * @param {Array<Object>} ticketsExistentes - Lista de tickets ya guardados
 * @param {string|null} idExcluir - Código del ticket que se está editando (opcional)
 * @returns {Object} { valido: boolean, errores: string[] }
 */
export function validarTicketCompleto(ticket, ticketsExistentes, idExcluir = null) {
  const resultadoCampos = validarCamposRequeridos(ticket);
  const errores = [...resultadoCampos.errores];

  if (ticket && ticket.Codigo) {
    const resultadoId = validarIdUnico(String(ticket.Codigo).trim(), ticketsExistentes, idExcluir);
    if (!resultadoId.valido) {
      errores.push(resultadoId.mensaje);
    }
  }

  return {
    valido: errores.length === 0,
    errores,
  };
}
