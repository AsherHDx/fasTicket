/**
 * Componente TicketCard: tarjeta horizontal de un ticket.
 * Diseño: tema oscuro, borde izquierdo grueso por prioridad, info en filas centro, iconos a la derecha.
 * Permite editar la descripción inline al hacer clic.
 */
import { useState } from 'react';
import {
  Copy,
  FileText,
  Share2,
  CheckCircle,
  X,
  AlertTriangle,
  MessageSquare,
  Edit,
} from 'lucide-react';
import { formatearFechaLegible } from '../utils/fechas.js';

const COLOR_PRIORIDAD = {
  Baja: '#22c55e',      // verde
  Media: '#eab308',     // amarillo
  Alta: '#ef4444',      // rojo
  Critica: '#dc2626',   // rojo más oscuro
};

export default function TicketCard({ ticket, onAccion, onEditarDescripcion, onCambiarPrioridad }) {
  const colorPrioridad = COLOR_PRIORIDAD[ticket.prioridad] || '#94a3b8';
  const esAtendido = ticket.atendido === true;
  const esResaltado = ticket.resaltado === true;
  const esCompartido = ticket.compartir === true;
  const [editandoDescripcion, setEditandoDescripcion] = useState(false);
  const [valorDescripcion, setValorDescripcion] = useState(ticket.descripcion || '');

  const manejarAccion = (tipo) => {
    onAccion(tipo, ticket.id);
  };

  const guardarDescripcion = async () => {
    if (valorDescripcion.trim() !== ticket.descripcion) {
      await onEditarDescripcion(ticket.id, valorDescripcion.trim());
    }
    setEditandoDescripcion(false);
  };

  return (
    <div className="ticket-card-wrapper">
      <div
        className="ticket-priority-border"
        style={{ backgroundColor: colorPrioridad }}
        onClick={() => onCambiarPrioridad(ticket.id)}
        title="Cambiar prioridad"
      />
      <div className={`ticket-card-content ${esResaltado ? 'resaltado' : ''} ${esAtendido ? 'atendido' : ''}`}>
      {/* Información central */}
      <div className="ticket-info">
        <div className="ticket-field ticket-titulo">
          <span className="field-label">Título:</span> {ticket.titulo}
        </div>
        <div className="ticket-field ticket-id">
          <span className="field-label">ID:</span> {ticket.id}
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
                  setValorDescripcion(ticket.descripcion || '');
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
            {ticket.descripcion || 'Sin descripción'}
            <Edit size={12} className="icon-editar-desc" />
          </div>
        )}
      </div>

      {/* Fechas de compartir (mostrado a la izquierda de los botones) */}
      {ticket.fechas && ticket.fechas.length > 0 ? (
        <div className="ticket-fechas-compartido">
          <div className="leyenda-compartido">compartido por última vez:</div>
          <div className="fecha-compartido-simple" title="Ver todas las fechas de compartir">
            {formatearFechaLegible(ticket.fechas[ticket.fechas.length - 1])}
          </div>
          <div className="fecha-compartido-detalle">
            <div className="leyenda-detalle">Fechas en las que se compartió:</div>
            {[...ticket.fechas].reverse().map((fecha, index) => (
              <div key={index} className="fecha-item">
                {formatearFechaLegible(fecha)}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Botones iconos a la derecha */}
      <div className="ticket-acciones">
        {/* Fila 1 */}
        <div className="accion-fila">
          <button
            className="icon-btn btn-copy-url"
            title="Copiar URL"
            onClick={() => manejarAccion('copiar-url')}
          >
            <Copy size={16} />
          </button>
          <button
            className="icon-btn btn-copy-datos"
            title="Copiar datos del ticket"
            onClick={() => manejarAccion('copiar-datos')}
          >
            <FileText size={16} />
          </button>
        </div>

        {/* Fila 2 */}
        <div className="accion-fila">
          <button
            className="icon-btn btn-compartido"
            title="Marcar como compartido"
            onClick={() => manejarAccion('compartido')}
            style={{ transform: 'scale(1)' }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.9)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <Share2 size={16} />
          </button>
          <button
            className={`icon-btn btn-atendido ${esAtendido ? 'activo' : ''}`}
            title={esAtendido ? 'Marcar como no atendido' : 'Marcar como atendido'}
            onClick={() => manejarAccion('atendido')}
          >
            <CheckCircle size={16} />
          </button>
          <button
            className="icon-btn btn-cerrar"
            title="Cerrar ticket"
            onClick={() => manejarAccion('cerrar')}
          >
            <X size={16} />
          </button>
        </div>

        {/* Fila 3 */}
        <div className="accion-fila">
          <button
            className={`icon-btn btn-atencion ${esResaltado ? 'activo' : ''}`}
            title={esResaltado ? 'Quitar resaltado' : 'Resaltar ticket'}
            onClick={() => manejarAccion('atencion')}
          >
            <AlertTriangle size={16} />
          </button>
          <button
            className="icon-btn btn-mensajes"
            title="Ver mensajes"
            onClick={() => manejarAccion('mensajes')}
          >
            <MessageSquare size={16} />
          </button>
        </div>
      </div>
    </div>
    </div>
  );
}
