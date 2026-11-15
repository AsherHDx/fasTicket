/**
 * Validaciones de datos para tickets de fasTicket.
 */
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

  if (!ticket.titulo || String(ticket.titulo).trim() === '') {
    errores.push('El título es obligatorio.');
  }

  if (!ticket.id || String(ticket.id).trim() === '') {
    errores.push('El ID es obligatorio.');
  }

  if (!ticket.prioridad) {
    errores.push('La prioridad es obligatoria.');
  }

  if (!ticket.tipo || String(ticket.tipo).trim() === '') {
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
 * @param {string|null} idExcluir - ID del ticket que se está editando (opcional)
 * @returns {Object} { valido: boolean, errores: string[] }
 */
export function validarTicketCompleto(ticket, ticketsExistentes, idExcluir = null) {
  const resultadoCampos = validarCamposRequeridos(ticket);
  const errores = [...resultadoCampos.errores];

  if (ticket && ticket.id) {
    const resultadoId = validarIdUnico(String(ticket.id).trim(), ticketsExistentes, idExcluir);
    if (!resultadoId.valido) {
      errores.push(resultadoId.mensaje);
    }
  }

  return {
    valido: errores.length === 0,
    errores,
  };
}
