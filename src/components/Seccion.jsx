/**
 * Componente Seccion: contenedor desplegable de tickets.
 * Permite editar el título de la sección y contraer/desplegar.
 */
import { useState } from 'react';
import { ChevronDown, ChevronUp, Edit2 } from 'lucide-react';
import TicketCard from './TicketCard.jsx';

export default function Seccion({
  seccion,
  tickets,
  expandida,
  onToggle,
  onEditarTitulo,
  onAccionTicket,
  onEditarDescripcion,
}) {
  const [editando, setEditando] = useState(false);
  const [valorTitulo, setValorTitulo] = useState(seccion.titulo);

  const guardarTitulo = () => {
    if (valorTitulo.trim() !== '') {
      onEditarTitulo(seccion.id, valorTitulo.trim());
    }
    setEditando(false);
  };

  return (
    <div className="seccion">
      {/* Encabezado de sección */}
      <div className="seccion-header" onClick={onToggle} style={{ cursor: 'pointer' }}>
        <div className="seccion-titulo-container">
          {editando ? (
            <input
              className="seccion-titulo-input"
              autoFocus
              value={valorTitulo}
              onChange={(e) => setValorTitulo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') guardarTitulo();
                if (e.key === 'Escape') {
                  setValorTitulo(seccion.titulo);
                  setEditando(false);
                }
              }}
              onBlur={guardarTitulo}
            />
          ) : (
            <div className="seccion-titulo-texto">
              {seccion.titulo}
              <button
                className="btn-editar-titulo"
                title="Editar título de sección"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditando(true);
                }}
              >
                <Edit2 size={16} />
              </button>
            </div>
          )}
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
                <div key={ticket.id} className="ticket-wrapper">
                  <TicketCard
                    ticket={ticket}
                    onAccion={(tipo, id) => onAccionTicket(tipo, id)}
                    onEditarDescripcion={(id, nuevaDescripcion) =>
                      onEditarDescripcion(id, nuevaDescripcion)
                    }
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
