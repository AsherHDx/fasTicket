/**
 * Componente TicketCard: tarjeta horizontal de un ticket.
 * Diseño: tema oscuro, borde izquierdo grueso por prioridad, info en filas centro, iconos a la derecha.
 * Permite editar la descripción inline al hacer clic.
 */
import { useState } from 'react';
import {
  FileText,
  AlertTriangle,
  MessageSquare,
  Edit,
} from 'lucide-react';

const COLOR_PRIORIDAD = {
  baja: '#22c55e',
  media: '#eab308',
  alta: '#ef4444',
  critica: '#dc2626',
};

export default function TicketCard({ ticket, onAccion, onEditarDescripcion, onCambiarPrioridad }) {
  const colorPrioridad = COLOR_PRIORIDAD[ticket.Prioridad] || '#94a3b8';
  const esResaltado = ticket.Resaltado === true;
  const [editandoDescripcion, setEditandoDescripcion] = useState(false);
  const [valorDescripcion, setValorDescripcion] = useState(ticket.Descripcion || '');

  const manejarAccion = (tipo) => {
    onAccion(tipo, ticket.Codigo);
  };

  const guardarDescripcion = async () => {
    if (valorDescripcion.trim() !== ticket.Descripcion) {
      await onEditarDescripcion(ticket.Codigo, valorDescripcion.trim());
    }
    setEditandoDescripcion(false);
  };

  return (
    <div className="ticket-card-wrapper">
      <div
        className="ticket-priority-border"
        style={{ backgroundColor: colorPrioridad }}
        onClick={() => onCambiarPrioridad(ticket.Codigo)}
        title="Cambiar prioridad"
      />
      <div className={`ticket-card-content ${esResaltado ? 'resaltado' : ''}`}>
        <div className="ticket-info">
          <div className="ticket-field ticket-titulo">
            <span className="field-label">Asunto:</span> {ticket.Asunto}
          </div>
          <div className="ticket-field ticket-codigo">
            <span className="field-label">Código:</span> {ticket.Codigo}
          </div>
          {editandoDescripcion ? (
            <div className="ticket-field ticket-descripcion-editable">
              <input
                className="input-descripcion"
                autoFocus
                value={valorDescripcion}
                onChange={(e) => setValorDescripcion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') guardarDescripcion();
                  if (e.key === 'Escape') {
                    setValorDescripcion(ticket.Descripcion || '');
                    setEditandoDescripcion(false);
                  }
                }}
                onBlur={guardarDescripcion}
              />
            </div>
          ) : (
            <div
              className="ticket-field ticket-descripcion"
              onClick={() => setEditandoDescripcion(true)}
              style={{ cursor: 'pointer' }}
              title="Haz clic para editar la descripción"
            >
              <span className="field-label">Descripción:</span>
              {ticket.Descripcion || 'Sin descripción'}
              <Edit size={12} className="icon-editar-desc" />
            </div>
          )}
        </div>
        <div className="ticket-acciones">
          <div className="accion-fila">
            <button
              className="icon-btn btn-mensajes"
              title="Ver mensajes"
              onClick={() => manejarAccion('mensajes')}
            >
              <MessageSquare size={16} />
            </button>
            <button
              className="icon-btn btn-copy-datos"
              title="Copiar datos del ticket"
              onClick={() => manejarAccion('copiar-datos')}
            >
              <FileText size={16} />
            </button>
          </div>
          <div className="accion-fila">
            <button
              className={`icon-btn btn-atencion ${esResaltado ? 'activo' : ''}`}
              title={esResaltado ? 'Quitar resaltado' : 'Resaltar ticket'}
              onClick={() => manejarAccion('atencion')}
            >
              <AlertTriangle size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
