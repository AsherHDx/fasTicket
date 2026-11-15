/**
 * Componente Buscador: barra de búsqueda por título o ID de ticket.
 */
import { Search, X } from 'lucide-react';

export default function Buscador({ valor, onCambio, onLimpiar }) {
  return (
    <div className="buscador-container">
      <div className="buscador-wrapper">
        <Search size={18} className="buscador-icono" />
        <input
          className="buscador-input"
          type="text"
          placeholder="Buscar ticket por título o ID..."
          value={valor}
          onChange={(e) => onCambio(e.target.value)}
        />
        {valor.trim() !== '' && (
          <button
            className="btn-limpiar-busqueda"
            title="Limpiar búsqueda"
            onClick={onLimpiar}
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
