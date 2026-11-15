/**
 * Servicio de persistencia para fasTicket utilizando la File System Access API.
 *
 * Permite leer y escribir archivos .txt directamente desde el navegador en localhost.
 * El usuario debe seleccionar el archivo la primera vez mediante el selector nativo.
 */

/** @type {FileSystemFileHandle | null} Handle del archivo de tickets activos (en memoria durante la sesión). */
let handleTickets = null;

/** @type {FileSystemFileHandle | null} Handle del archivo de tickets cerrados de la semana (en memoria durante la sesión). */
let handleCerrados = null;

/** @type {Object<string, number>} Conteo de tickets cerrados por tipo (cargado del archivo + sesión actual). */
let conteoCerradosPorTipo = {};

/**
 * Abre el selector nativo del navegador para que el usuario elija el archivo tickets.txt.
 * @returns {Promise<FileSystemFileHandle>} Handle del archivo seleccionado.
 */
export async function seleccionarArchivoTickets() {
  const handle = await window.showOpenFilePicker({
    types: [
      {
        description: 'Archivos de texto',
        accept: { 'text/plain': ['.txt'] },
      },
    ],
    multiple: false,
  });
  handleTickets = handle[0];
  return handleTickets;
}

/**
 * Devuelve el handle del archivo de tickets activos guardado en memoria.
 * @returns {FileSystemFileHandle | null}
 */
export function obtenerHandleTickets() {
  return handleTickets;
}

/**
 * Lee el archivo tickets.txt y devuelve un arreglo de tickets.
 * Formato esperado: JSON Lines (un objeto JSON por línea).
 * @param {FileSystemFileHandle} handle - Handle del archivo.
 * @returns {Promise<Array<Object>>} Arreglo de tickets leídos.
 */
export async function leerTickets(handle) {
  if (!handle) {
    throw new Error('No se proporcionó un handle de archivo válido.');
  }

  const file = await handle.getFile();
  const texto = await file.text();

  if (!texto || texto.trim() === '') {
    return [];
  }

  const lineas = texto.split('\n');
  const tickets = [];

  for (const linea of lineas) {
    const lineaLimpia = linea.trim();
    if (lineaLimpia === '') continue;

    try {
      const ticket = JSON.parse(lineaLimpia);
      tickets.push(ticket);
    } catch (error) {
      // Línea corrupta: se salta para no romper la lectura completa
      console.warn('Línea corrupta ignorada en tickets.txt:', lineaLimpia);
    }
  }

  return tickets;
}

/**
 * Sobrescribe el archivo tickets.txt con todos los tickets activos.
 * Formato: JSON Lines (un objeto JSON por línea).
 * @param {FileSystemFileHandle} handle - Handle del archivo.
 * @param {Array<Object>} tickets - Arreglo de tickets a guardar.
 * @returns {Promise<void>}
 */
export async function guardarTickets(handle, tickets) {
  if (!handle) {
    throw new Error('No se proporcionó un handle de archivo válido.');
  }

  const lineas = tickets.map((t) => JSON.stringify(t));
  const contenido = lineas.join('\n') + (lineas.length > 0 ? '\n' : '');

  const writable = await handle.createWritable();
  await writable.write(contenido);
  await writable.close();

  handleTickets = handle;
}

/**
 * Extrae solo el resumen semanal de un texto plano (sección desde "RESUMEN FINAL").
 * Formato esperado:
 *   RESUMEN FINAL
 *   <Tipo>: <cantidad>
 *   ...
 *   Total: <numero>
 *
 * @param {string} texto - Contenido completo del archivo.
 * @returns {Object} { conteoPorTipo: { tipo: cantidad }, total: number }
 */
export function extraerResumenDeTexto(texto) {
  if (!texto || texto.trim() === '') {
    return { conteoPorTipo: {}, total: 0 };
  }

  const indiceResumen = texto.indexOf('RESUMEN FINAL');
  if (indiceResumen === -1) {
    return { conteoPorTipo: {}, total: 0 };
  }

  const seccionResumen = texto.slice(indiceResumen);
  const lineas = seccionResumen.split('\n').map((l) => l.trim()).filter((l) => l !== '');

  const conteoPorTipo = {};
  let total = 0;

  for (const linea of lineas) {
    if (linea === 'RESUMEN FINAL') continue;

    const matchTotal = linea.match(/^Total:\s*(\d+)$/);
    if (matchTotal) {
      total = parseInt(matchTotal[1], 10);
      continue;
    }

    const matchTipo = linea.match(/^(.+):\s*(\d+)$/);
    if (matchTipo) {
      const tipo = matchTipo[1].trim();
      const cantidad = parseInt(matchTipo[2], 10);
      if (!isNaN(cantidad)) {
        conteoPorTipo[tipo] = cantidad;
      }
    }
  }

  return { conteoPorTipo, total };
}

/**
 * Carga el resumen existente de un archivo de tickets cerrados en la memoria de sesión.
 * @param {FileSystemFileHandle} handle - Handle del archivo de cerrados.
 */
export async function cargarResumenDesdeArchivo(handle) {
  if (!handle) return;

  try {
    const file = await handle.getFile();
    const texto = await file.text();
    const { conteoPorTipo, total } = extraerResumenDeTexto(texto);

    conteoCerradosPorTipo = { ...conteoPorTipo };

    // Asegurar que el total sea consistente (suma de conteos o el total explícito)
    const sumaConteos = Object.values(conteoPorTipo).reduce((a, b) => a + b, 0);
    if (total > sumaConteos) {
      // Si el total explícito es mayor, asignar la diferencia a "Sin tipo"
      conteoCerradosPorTipo['Sin tipo'] = (conteoCerradosPorTipo['Sin tipo'] || 0) + (total - sumaConteos);
    }
  } catch (error) {
    console.warn('No se pudo cargar el resumen del archivo:', error.message);
    conteoCerradosPorTipo = {};
  }
}

/**
 * Abre el selector nativo para elegir un archivo de tickets cerrados YA CREADO.
 * Carga los tickets previos en memoria para que el resumen sea correcto.
 * @returns {Promise<FileSystemFileHandle>} Handle del archivo seleccionado.
 */
export async function abrirArchivoCerradosExistente() {
  const handle = await window.showOpenFilePicker({
    types: [
      {
        description: 'Archivos de texto',
        accept: { 'text/plain': ['.txt'] },
      },
    ],
    multiple: false,
  });
  handleCerrados = handle[0];
  await cargarResumenDesdeArchivo(handleCerrados);
  return handleCerrados;
}

/**
 * Crea un archivo nuevo de tickets cerrados semanal.
 * Si el archivo queda vacío, escribe inicialmente el resumen con Total: 0.
 * @param {string} nombreArchivo - Nombre sugerido para el archivo.
 * @returns {Promise<FileSystemFileHandle>} Handle del archivo creado.
 */
export async function crearArchivoCerrados(nombreArchivo) {
  const handle = await window.showSaveFilePicker({
    suggestedName: nombreArchivo,
    types: [
      {
        description: 'Archivos de texto',
        accept: { 'text/plain': ['.txt'] },
      },
    ],
  });

  // Si el archivo es nuevo o está vacío, escribir el resumen inicial
  try {
    const file = await handle.getFile();
    const texto = await file.text();
    if (!texto || texto.trim() === '') {
      const writable = await handle.createWritable();
      await writable.write('RESUMEN FINAL\nTotal: 0\n');
      await writable.close();
    }
  } catch (error) {
    const writable = await handle.createWritable();
    await writable.write('RESUMEN FINAL\nTotal: 0\n');
    await writable.close();
  }

  handleCerrados = handle;
  // Si el archivo ya tenía contenido, cargar su resumen en memoria
  await cargarResumenDesdeArchivo(handle);
  return handleCerrados;
}

/**
 * Devuelve el handle del archivo de tickets cerrados guardado en memoria.
 * @returns {FileSystemFileHandle | null}
 */
export function obtenerHandleCerrados() {
  return handleCerrados;
}

/**
 * Agrega un ticket cerrado al archivo semanal y actualiza el resumen automáticamente.
 * Formato por ticket (3 líneas):
 *   <URL>
 *   <Título>
 *   <ID>
 *   (línea en blanco)
 *   (línea en blanco)
 *
 * El resumen se recalcula sumando 1 al conteo del tipo del ticket cerrado.
 * @param {FileSystemFileHandle} handle - Handle del archivo de cerrados.
 * @param {Object} ticketCerrado - Objeto con { url, titulo, id, tipo }.
 * @returns {Promise<void>}
 */
export async function agregarTicketCerrado(handle, ticketCerrado) {
  if (!handle) {
    throw new Error('No se proporcionó un handle de archivo válido para tickets cerrados.');
  }

  const { url, titulo, id, tipo } = ticketCerrado;

  // Actualizar conteo en memoria: sumar 1 al tipo del nuevo ticket
  const tipoT = tipo || 'Sin tipo';
  conteoCerradosPorTipo[tipoT] = (conteoCerradosPorTipo[tipoT] || 0) + 1;

  // Leer contenido existente para insertar el nuevo ticket arriba del resumen
  let contenidoExistente = '';
  try {
    const file = await handle.getFile();
    contenidoExistente = await file.text();
  } catch (error) {
    contenidoExistente = '';
  }

  const bloqueTicket = `${url}\n${titulo}\n${id}\n\n\n`;

  const indiceResumen = contenidoExistente.indexOf('RESUMEN FINAL');

  let contenidoBase;
  if (indiceResumen !== -1) {
    contenidoBase = contenidoExistente.slice(0, indiceResumen).replace(/\n+$/, '');
  } else {
    contenidoBase = contenidoExistente.replace(/\n+$/, '');
  }

  // Calcular resumen desde la memoria actualizada
  const total = Object.values(conteoCerradosPorTipo).reduce((a, b) => a + b, 0);

  const lineasResumen = ['RESUMEN FINAL'];
  for (const [tipoT, cantidad] of Object.entries(conteoCerradosPorTipo)) {
    lineasResumen.push(`${tipoT}: ${cantidad}`);
  }
  lineasResumen.push(`Total: ${total}`);
  const nuevoResumen = lineasResumen.join('\n') + '\n';

  const contenidoFinal = contenidoBase + '\n\n' + bloqueTicket + nuevoResumen;

  const writable = await handle.createWritable();
  await writable.write(contenidoFinal);
  await writable.close();

  handleCerrados = handle;
}

/**
 * Devuelve el conteo de tickets cerrados por tipo.
 * @returns {Object<string, number>}
 */
export function obtenerConteoCerradosPorTipo() {
  return { ...conteoCerradosPorTipo };
}

/**
 * Limpia el conteo de tickets cerrados de la sesión (útil al iniciar una nueva semana).
 */
export function limpiarConteoCerrados() {
  conteoCerradosPorTipo = {};
}

/**
 * Limpia los handles guardados en memoria (útil al cerrar sesión o recargar).
 */
export function limpiarHandles() {
  handleTickets = null;
  handleCerrados = null;
}
