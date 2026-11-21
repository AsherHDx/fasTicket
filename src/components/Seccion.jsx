/**
 * Componente Seccion: contenedor desplegable de tickets.
 * Permite editar el título de la sección y contraer/desplegar.
 */
import { ChevronDown, ChevronUp} from 'lucide-react';
import TicketCard from './TicketCard.jsx';

export default function Seccion({
  seccion,
  tickets,
  expandida,
  onToggle,
  onAccionTicket,
  onEditarDescripcion,
  onCambiarPrioridad,
  archivoCerradosListo,
}) {

  return (
    <div className="seccion">
      {/* Encabezado de sección */}
      <div className="seccion-header" onClick={onToggle} style={{ cursor: 'pointer' }}>
        <div className="seccion-titulo-container">

          <div className="seccion-titulo-texto">
            {seccion.id}
          </div>

        </div>
        <button
          className="btn-toggle-seccion"
          title={expandida ? 'Contraer sección' : 'Desplegar sección'}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
        >
          {expandida ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {/* Contenido de tickets */}
      {expandida && (
        <div className="seccion-contenido">
          {tickets.length === 0 ? (
            <div className="seccion-vacia">No hay tickets en esta sección.</div>
          ) : (
            <div className="lista-tickets">
              {tickets.map((ticket) => (
                <div key={ticket.Codigo} className="ticket-wrapper">
                  <TicketCard
                    ticket={ticket}
                    onAccion={(tipo, id) => onAccionTicket(tipo, id)}
                    onEditarDescripcion={(id, nuevaDescripcion) =>
                      onEditarDescripcion(id, nuevaDescripcion)
                    }
                    onCambiarPrioridad={onCambiarPrioridad}
                    archivoCerradosListo={archivoCerradosListo}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
