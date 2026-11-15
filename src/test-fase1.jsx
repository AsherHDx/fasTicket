import { crearTicket } from './types/index.js';
import { validarIdUnico } from './services/idService.js';
import { validarTicketCompleto } from './utils/validaciones.js';
import { fechaHoraActualISO, formatearFechaLegible, obtenerEtiquetaSemanaActual } from './utils/fechas.js';

// Pruebas
const t1 = crearTicket({ id: 'TICKET-100', titulo: 'Error de login', descripcion: 'No se puede iniciar sesión', url: 'https://sistema.com/t/100', prioridad: 'Alta', seccionId: 's1' });
const t2 = crearTicket({ id: 'TICKET-101', titulo: 'Pantalla en blanco', descripcion: 'La app no carga', url: 'https://sistema.com/t/101', prioridad: 'Crítica', seccionId: 's1' });
const tickets = [t1, t2];

console.log('Duplicado rechazado:', validarIdUnico('TICKET-100', tickets)); // false
console.log('ID nuevo aceptado:', validarIdUnico('TICKET-102', tickets)); // true
console.log('Campos vacíos:', validarTicketCompleto({ id: '', titulo: '', descripcion: '', url: '', prioridad: '', seccionId: 's1' }, tickets));
console.log('Fecha ISO:', fechaHoraActualISO());
console.log('Fecha legible:', formatearFechaLegible(fechaHoraActualISO()));
console.log('Etiqueta semana:', obtenerEtiquetaSemanaActual());

// Render mínimo para ver que no rompe la app
export default function TestFase1() {
  return (
    <div>
      <h1>Fase 1 - Pruebas en consola</h1>
      <p>Revisa la consola del desarrollador (F12) para ver los resultados.</p>
    </div>
  );
}