/**
 * Tipos y fábricas para el modelo de datos de fasTicket.
 * Nota: este proyecto usa JavaScript plano. Los tipos se documentan con JSDoc.
 */

/**
 * Lista de prioridades válidas para un ticket.
 * @type {readonly string[]}
 */
export const PRIORIDADES = Object.freeze(['Baja', 'Media', 'Alta', 'Crítica']);

/**
 * Crea un objeto ticket con la estructura base requerida.
 * @param {Object} params
 * @param {string} params.id - ID del ticket (proveniente del sistema real, único)
 * @param {string} params.titulo - Título del ticket
 * @param {string} params.descripcion - Descripción del ticket
 * @param {string} params.url - URL del ticket en el sistema real
 * @param {string} params.prioridad - Una de: Baja, Media, Alta, Crítica
 * @param {string} params.tipo - Tipo del ticket (ej. Incidencia, Solicitud, Configuración)
 * @param {string[]} [params.comentarios=[]] - Lista de comentarios del ticket
 * @param {string[]} [params.fechas=[]] - Lista de fechas/horas (ISO)
 * @param {boolean} [params.compartir=false] - Bandera para compartir o no
 * @param {string} params.seccionId - ID de la sección a la que pertenece
 * @param {number} [params.orden=0] - Posición dentro de la sección
 * @returns {Object} Objeto ticket
 */
export function crearTicket({
  id,
  titulo,
  descripcion,
  url,
  prioridad,
  tipo,
  comentarios = [],
  fechas = [],
  compartir = false,
  seccionId,
  orden = 0,
}) {
  return {
    id,
    titulo,
    descripcion,
    url,
    prioridad,
    comentarios,
    fechas,
    tipo,
    compartir,
    seccionId,
    orden,
    fechaCreacion: new Date().toISOString(),
    fechaActualizacion: new Date().toISOString(),
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
