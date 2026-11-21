/**
 * Servicio de comunicación con la API de tickets.
 *
 * Provee funciones puras para consultar la API y comparar tickets.
 * No maneja estado de React ni persistencia en archivos.
 */

/**
 * URL base de la API de tickets.
 */
const PARAMS = new URLSearchParams({
  groupId:"1789411244979-m7e87glkv"
});
const API_URL = `http://10.23.105.36:4001/api/export/tickets?${PARAMS}`;
const API_KEY = import.meta.env.VITE_API_KEY;

/**
 * Consulta la API y devuelve el arreglo de tickets recibido.
 * @returns {Promise<Array<Object>>} Arreglo de tickets de la API.
 */
export async function consultarAPI() {
  const response = await fetch(API_URL, {
    headers:{
      "X-API-Key": API_KEY
    }
  });
  if (!response.ok) {
    throw new Error(`Error al consultar la API: ${response.statusText}`);
  }
  return await response.json();
}

/**
 * Compara dos tickets y devuelve true si tienen cambios en los campos relevantes.
 * Los campos comparados son los que provienen de la API (excluyendo campos de interfaz
 * como Descripcion, Comentarios y Resaltado).
 * @param {Object} ticketArchivo - Ticket tal como está en el archivo fuente local.
 * @param {Object} ticketAPI - Ticket tal como viene de la API.
 * @returns {boolean} true si al menos un campo relevante cambió.
 */
export function ticketsTienenCambios(ticketArchivo, ticketAPI) {
  const camposComparar = [
    'Asunto',
    'Tipo',
    'Prioridad',
    'Estado',
    'Fecha de creacion',
    'Hora de creacion',
    'Asignado A',
  ];

  for (const campo of camposComparar) {
    if (String(ticketArchivo[campo] || '') !== String(ticketAPI[campo] || '')) {
      return true;
    }
  }
  return false;
}
