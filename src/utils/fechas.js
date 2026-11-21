//===== Utilidades de manejo de fechas y horas para fasTicket ======


/**
 * Devuelve la fecha y hora actual en formato ISO 8601.
 * Ejemplo: "2026-11-11T14:30:00.000Z"
 * @returns {string}
 */
export function fechaHoraActualISO() {
  return new Date().toISOString();
}



/**
 * Formatea una fecha ISO en un string legible para mostrar en pantalla.
 * Ejemplo: "11/11/2026 14:30"
 * @param {string} isoString - Fecha en formato ISO
 * @returns {string}
 */
export function formatearFechaLegible(isoString) {
  if (!isoString) return '';

  try {
    const fecha = new Date(isoString);
    if (isNaN(fecha.getTime())) return '';

    return fecha.toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    return error;
  }
}



/**
 * Devuelve la etiqueta de la semana actual para usarla como nombre de archivo
 * de tickets cerrados. Patrón:
 * "tickets cerrados del {inicio dd-mm-yyyy} al {fin viernes dd-mm-yyyy}.txt"
 *
 * El inicio de semana se considera lunes y el fin, viernes.
 * @returns {string}
 */
export function obtenerEtiquetaSemanaActual() {
  const ahora = new Date();
  const diaSemana = ahora.getDay(); // 0=domingo, 1=lunes, ..., 6=sábado

  // Si es domingo o sábado, el inicio es el siguiente lunes
  let offsetALunes;
  if (diaSemana === 0) {
    // Domingo -> siguiente lunes (+1 día)
    offsetALunes = 1;
  } else if (diaSemana === 6) {
    // Sábado -> siguiente lunes (+2 días)
    offsetALunes = 2;
  } else {
    // Lunes a viernes -> lunes de la semana actual
    offsetALunes = 1 - diaSemana;
  }

  const lunes = new Date(ahora);
  lunes.setDate(ahora.getDate() + offsetALunes);

  // Viernes es lunes + 4 días
  const viernes = new Date(lunes);
  viernes.setDate(lunes.getDate() + 4);

  const formatear = (fecha) => {
    const d = String(fecha.getDate()).padStart(2, '0');
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const y = fecha.getFullYear();
    return `${d}-${m}-${y}`;
  };

  return `tickets cerrados del ${formatear(lunes)} al ${formatear(viernes)}.txt`;
}



/**
 * Parsea la fecha y hora de creación de un ticket a un timestamp comparable.
 * Formato esperado: fecha "DD/MM/YYYY", hora "H:MM:SS p.m./a.m."
 */
export const parsearFechaParaComparar = (ticket) => {
  const fecha = ticket["Fecha de creacion"] || "";
  const hora = ticket["Hora de creacion"] || "";
  if (!fecha || !hora) return 0;
  const [dia, mes, anio] = fecha.split("/").map(Number);
  const [hms, periodo] = hora.split(" ");
  const [h, m, s] = hms.split(":").map(Number);
  let hora24 = h;
  if (periodo === "p.m." && h < 12) hora24 = h + 12;
  if (periodo === "a.m." && h === 12) hora24 = 0;
  return new Date(anio, mes - 1, dia, hora24, m, s).getTime();
};
