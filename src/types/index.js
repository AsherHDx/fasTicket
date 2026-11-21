/**
 * Tipos y fábricas para el modelo de datos de fasTicket.
 * Nota: este proyecto usa JavaScript plano. Los tipos se documentan con JSDoc.
 */

/**
 * Lista de prioridades válidas para un ticket.
 * El valor por defecto es 'baja' (no se toma de la API).
 * @type {readonly string[]}
 */
export const PRIORIDADES = Object.freeze(['baja', 'media', 'alta', 'critica']);

/**
 * Crea un objeto ticket con la estructura base requerida.
 * Campos de API: Codigo, Asunto, Tipo, Prioridad, Estado, Fecha de creacion,
 * Hora de creacion, Asignado A.
 * Campos de interfaz (usuario coloca): Descripcion, Comentarios, Resaltado.
 *
 * @param {Object} params
 * @param {string} params.Codigo - Código del ticket (proveniente del sistema real, único)
 * @param {string} params.Asunto - Asunto del ticket
 * @param {string} params.Descripcion - Descripción del ticket (colocada por el usuario)
 * @param {string} params.Tipo - Tipo del ticket (ej. Incidencia, Solicitud, Configuración)
 * @param {string} [params.Prioridad='baja'] - Prioridad por defecto 'baja'
 * @param {string} [params.Estado='Pendiente'] - Estado del ticket
 * @param {string} [params.'Fecha de creacion'=''] - Fecha de creación
 * @param {string} [params.'Hora de creacion'=''] - Hora de creación
 * @param {string} [params.'Asignado A'] - A quién está asignado el ticket
 * @param {string[]} [params.Comentarios=[]] - Lista de comentarios del ticket
 * @param {boolean} [params.Resaltado=false] - Bandera para resaltar o no
 * @returns {Object} Objeto ticket
 */
export function crearTicket({
  Codigo,
  Asunto,
  Descripcion,
  Tipo,
  Prioridad = 'baja',
  Estado = 'Pendiente',
  'Fecha de creacion': FechaCreacion = '',
  'Hora de creacion': HoraCreacion = '',
  'Asignado A': AsignadoA,
  Comentarios = [],
  Resaltado = false,
}) {
  return {
    Codigo,
    Asunto,
    Descripcion: Descripcion || '',
    Tipo,
    Prioridad,
    Estado,
    'Fecha de creacion': FechaCreacion,
    'Hora de creacion': HoraCreacion,
    'Asignado A': AsignadoA,
    Comentarios,
    Resaltado,
  };
}

/**
 * Crea un objeto sección.
 * @param {Object} params
 * @param {string} params.id - ID único de la sección
 * @param {string} params.titulo - Título personalizable de la sección
 * @param {number} [params.orden=0] - Posición de la sección en la lista
 * @returns {Object} Objeto sección
 */
export function crearSeccion({ id, titulo, orden = 0 }) {
  return {
    id,
    titulo,
    orden,
  };
}
