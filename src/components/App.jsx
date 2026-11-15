/**
 * Componente principal App de fasTicket.
 * Vista principal: tema oscuro, buscador, botón agregar ticket, checkboxes de visibilidad,
 * secciones desplegables y tarjetas de tickets.
 */
import { useState } from 'react';
import { Plus, Clipboard } from 'lucide-react';
import { useTickets } from '../hooks/useTickets.js';
import Buscador from './Buscador.jsx';
import Seccion from './Seccion.jsx';

export default function App() {
  const {
    secciones,
    tickets,
    busqueda,
    setBusqueda,
    archivoListo,
    error,
    PRIORIDADES,
    inicializarArchivo,
    obtenerTicketsPorSeccion,
    agregarTicket,
    editarTicket,
    eliminarTicket,
    cerrarTicket,
    toggleAtendido,
    toggleAtencion,
    toggleCompartido,
    editarDescripcion,
  } = useTickets();

  const [modalAbierto, setModalAbierto] = useState(false);
  const [notificacion, setNotificacion] = useState(null);

  // Qué secciones están expandidas (todas por defecto)
  const [seccionesExpandidas, setSeccionesExpandidas] = useState(
    new Set(secciones.map((s) => s.id))
  );

  // Qué sección está visible (null = mostrar todas, string = id de una sección)
  const [seccionVisible, setSeccionVisible] = useState(null);

  // Formulario de crear ticket (modal)
  const [formTicket, setFormTicket] = useState({
    id: '',
    titulo: '',
    descripcion: '',
    url: '',
    prioridad: 'Media',
    tipo: '',
    seccionId: '',
    compartir: false,
  });

  // Copiar al portapapeles
  const copiarPortapapeles = async (texto) => {
    try {
      await navigator.clipboard.writeText(texto);
      setNotificacion({ tipo: 'exito', mensaje: 'Copiado al portapapeles' });
      setTimeout(() => setNotificacion(null), 2000);
    } catch (err) {
      setNotificacion({ tipo: 'error', mensaje: 'No se pudo copiar' });
      setTimeout(() => setNotificacion(null), 2000);
    }
  };

  // Manejar acciones de las tarjetas de ticket
  const manejarAccionTicket = async (tipo, id) => {
    switch (tipo) {
      case 'copiar-url': {
        const t = tickets.find((x) => x.id === id);
        if (t) await copiarPortapapeles(t.url || '');
        break;
      }
      case 'copiar-datos': {
        const t = tickets.find((x) => x.id === id);
        if (t) {
          const datos = `ID: ${t.id}\nTítulo: ${t.titulo}\nURL: ${t.url || ''}`;
          await copiarPortapapeles(datos);
        }
        break;
      }
      case 'compartido':
        await toggleCompartido(id);
        break;
      case 'atendido':
        await toggleAtendido(id);
        break;
      case 'cerrar':
        await cerrarTicket(id);
        break;
      case 'atencion':
        await toggleAtencion(id);
        break;
      case 'mensajes':
        setNotificacion({ tipo: 'info', mensaje: 'Función de mensajes próximamente' });
        setTimeout(() => setNotificacion(null), 2000);
        break;
      default:
        break;
    }
  };

  // Guardar nuevo ticket desde el modal
  const manejarGuardarTicket = async (e) => {
    e.preventDefault();
    const seccionId = formTicket.seccionId || (secciones.length > 0 ? secciones[0].id : '');
    await agregarTicket({
      ...formTicket,
      seccionId,
    });
    setFormTicket({
      id: '',
      titulo: '',
      descripcion: '',
      url: '',
      prioridad: 'Media',
      tipo: '',
      seccionId: '',
      compartir: false,
    });
    setModalAbierto(false);
  };

  // Seleccionar qué sección mostrar (radiobutton: solo una a la vez)
  const toggleSeccionVisible = (id) => {
    setSeccionVisible((prev) => (prev === id ? null : id));
  };

  // Toggle expansión de una sección
  const toggleSeccionExpandida = (id) => {
    setSeccionesExpandidas((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(id)) {
        nuevo.delete(id);
      } else {
        nuevo.add(id);
      }
      return nuevo;
    });
  };

  return (
    <div className="app-container">
      {/* Notificación */}
      {notificacion && (
        <div className={`notificacion ${notificacion.tipo}`}>
          {notificacion.mensaje}
        </div>
      )}

      {/* Encabezado */}
      <header className="app-header">
        <div className="header-izquierda">
          <button
            className="btn-seleccionar-archivo"
            onClick={inicializarArchivo}
            title="Seleccionar archivo de tickets (.txt)"
          >
            <Clipboard size={18} />
            Seleccionar archivo
          </button>
        </div>
        <div className="header-centro">
          <Buscador
            valor={busqueda}
            onCambio={setBusqueda}
            onLimpiar={() => setBusqueda('')}
            disabled={!archivoListo}
          />
        </div>
        <div className="header-derecha">
          {!archivoListo && (
            <span className="estado-archivo" style={{ color: '#ef4444' }}>
              ⚠️ Sin archivo cargado
            </span>
          )}
          <button
            className={`btn-agregar-verde ${!archivoListo ? 'disabled' : ''}`}
            onClick={() => setModalAbierto(true)}
            disabled={!archivoListo}
            style={{ marginLeft: 'auto' }}
          >
            <Plus size={18} />
            Agregar ticket
          </button>
        </div>
      </header>

      {/* Radiobuttons de visibilidad de secciones (solo una a la vez) */}
      <div className="secciones-visibilidad">
        <span className="visibilidad-label">Mostrar sección:</span>
        <label className="radio-label">
          <input
            type="radio"
            name="seccion-visible"
            value=""
            checked={seccionVisible === null}
            onChange={() => setSeccionVisible(null)}
          />
          Todas
        </label>
        {secciones.map((seccion) => (
          <label key={seccion.id} className="radio-label">
            <input
              type="radio"
              name="seccion-visible"
              value={seccion.id}
              checked={seccionVisible === seccion.id}
              onChange={() => toggleSeccionVisible(seccion.id)}
            />
            {seccion.titulo}
          </label>
        ))}
      </div>

      {/* Modal de crear ticket */}
      {modalAbierto && (
        <div className="modal-overlay" onClick={() => setModalAbierto(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Nuevo ticket</h3>
            <form onSubmit={manejarGuardarTicket}>
              <div className="form-grupo">
                <label>ID *</label>
                <input
                  required
                  value={formTicket.id}
                  onChange={(e) => setFormTicket({ ...formTicket, id: e.target.value })}
                />
              </div>
              <div className="form-grupo">
                <label>Título *</label>
                <input
                  required
                  value={formTicket.titulo}
                  onChange={(e) => setFormTicket({ ...formTicket, titulo: e.target.value })}
                />
              </div>
              <div className="form-grupo">
                <label>Descripción</label>
                <textarea
                  value={formTicket.descripcion}
                  onChange={(e) => setFormTicket({ ...formTicket, descripcion: e.target.value })}
                />
              </div>
              <div className="form-grupo">
                <label>URL</label>
                <input
                  value={formTicket.url}
                  onChange={(e) => setFormTicket({ ...formTicket, url: e.target.value })}
                />
              </div>
              <div className="form-grupo">
                <label>Tipo *</label>
                <input
                  required
                  value={formTicket.tipo}
                  onChange={(e) => setFormTicket({ ...formTicket, tipo: e.target.value })}
                  placeholder="Ej. Incidencia, Solicitud, Configuración"
                />
              </div>
              <div className="form-grupo">
                <label>Prioridad *</label>
                <select
                  required
                  value={formTicket.prioridad}
                  onChange={(e) => setFormTicket({ ...formTicket, prioridad: e.target.value })}
                >
                  {PRIORIDADES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-grupo">
                <label>Sección</label>
                <select
                  value={formTicket.seccionId}
                  onChange={(e) => setFormTicket({ ...formTicket, seccionId: e.target.value })}
                >
                  <option value="">Sin sección (General)</option>
                  {secciones.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.titulo}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-check">
                <label>
                  <input
                    type="checkbox"
                    checked={formTicket.compartir}
                    onChange={(e) =>
                      setFormTicket({ ...formTicket, compartir: e.target.checked })
                    }
                  />
                  Compartir ticket
                </label>
              </div>
              <div className="form-botones">
                <button type="button" className="btn-cancelar" onClick={() => setModalAbierto(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-guardar-verde">
                  Guardar ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Secciones y tickets */}
      <main className="app-main">
        {secciones.length === 0 ? (
          <div className="estado-vacio">
            <p>No hay secciones creadas aún.</p>
            <button onClick={() => setModalAbierto(true)}>Crear primer ticket</button>
          </div>
        ) : (
          secciones
            .filter(
              (seccion) => seccionVisible === null || seccionVisible === seccion.id
            )
            .map((seccion) => {
              const ticketsSeccion = obtenerTicketsPorSeccion(seccion.id);
              const expandida = seccionesExpandidas.has(seccion.id);

              return (
                <Seccion
                  key={seccion.id}
                  seccion={seccion}
                  tickets={ticketsSeccion}
                  expandida={expandida}
                  onToggle={() => toggleSeccionExpandida(seccion.id)}
                  onEditarTitulo={(id, nuevoTitulo) => {
                    setSecciones((prev) =>
                      prev.map((s) =>
                        s.id === id ? { ...s, titulo: nuevoTitulo } : s
                      )
                    );
                  }}
                  onAccionTicket={manejarAccionTicket}
                  onEditarDescripcion={editarDescripcion}
                />
              );
            })
        )}
      </main>
    </div>
  );
}
