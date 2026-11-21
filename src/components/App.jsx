/**
 * Componente principal App de fasTicket.
 * Vista principal: tema oscuro, buscador, checkboxes de visibilidad,
 * secciones desplegables y tarjetas de tickets.
 *
 * Los tickets ya no se crean ni cierran manualmente desde la UI.
 * Se sincronizan automáticamente con la API cada minuto cuando ambos
 * archivos (fuente y cerrados) están seleccionados.
 */
import { useState } from 'react';
import { Clipboard } from 'lucide-react';
import { useTickets } from '../hooks/useTickets.js';
import { obtenerEtiquetaSemanaActual } from '../utils/fechas.js';
import { copiarPortapapeles } from '../utils/varios.js';
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
    sincronizando,
    ultimoSincronizado,
    puedeSincronizar,
    inicializarArchivo,
    obtenerTicketsPorSeccion,
    sincronizarConAPI,
    toggleAtencion,
    cambiarPrioridad,
    agregarComentario,
    editarDescripcion,
    abrirArchivoCerrados,
    crearNuevoArchivoCerrados,
    archivoCerradosListo,
  } = useTickets();

  const [toast, setToast] = useState(null);

  // Qué secciones están expandidas (todas por defecto)
  const [seccionesExpandidas, setSeccionesExpandidas] = useState(
    new Set(secciones.map((s) => s.id))
  );

  // Qué sección está visible (null = mostrar todas, string = id de una sección)
  const [seccionVisible, setSeccionVisible] = useState(null);

  // Modal de mensajes (comentarios)
  const [modalMensajesAbierto, setModalMensajesAbierto] = useState(false);
  const [ticketMensajesAbierto, setTicketMensajesAbierto] = useState(null);
  const [nuevoComentario, setNuevoComentario] = useState('');

  /**
   * Función que maneja los botones de la tarjeta del ticket
   * @param {string} tipo tipo de botón (copiar-datos, atencion, mensajes)
   * @param {string} código código del ticket (ej, #VD-OPS-000567)
   */
  const manejarAccionTicket = async (tipo, codigo) => {
    switch (tipo) {
      /*
      Copia los datos del ticket en el porta papeles con el formato:
      ASUNTO
      CÓDIGO
      TIPO
      */
      case 'copiar-datos': {
        const ticket = tickets.find((t) => t.Codigo === codigo);
        if (ticket) {
          const datos = `http://10.23.105.36:5174/tickets/${ticket.Codigo}\n${ticket.Asunto}\n${ticket.Codigo}`;
          await copiarPortapapeles(datos, setToast);
        }
        break;
      }

      // Resalta el ticket en naranja
      case 'atencion':
        await toggleAtencion(codigo);
        break;

      // Abre modal de mensajes del ticket
      case 'mensajes': {
        const t = tickets.find((x) => x.Codigo === codigo);
        if (t) {
          setTicketMensajesAbierto(t);
          setModalMensajesAbierto(true);
        }
        break;
      }

      default:
        break;
    }
  };

  // Guardar nuevo comentario en un ticket
  const manejarGuardarComentario = async (e) => {
    e.preventDefault();
    if (!nuevoComentario.trim()) return;
    if (!ticketMensajesAbierto) return;

    const comentarioConFecha = nuevoComentario.trim();

    const ok = await agregarComentario(ticketMensajesAbierto.Codigo, comentarioConFecha);
    if (ok) {
      // Actualizar inmediatamente en el modal para mostrar sin cerrar y volver a abrir
      setTicketMensajesAbierto((prev) => ({
        ...prev,
        Comentarios: [...(prev.Comentarios || []), comentarioConFecha],
      }));
      setNuevoComentario('');
      setToast({ tipo: 'exito', mensaje: 'Comentario agregado' });
      setTimeout(() => setToast(null), 2000);
    }
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
      {toast && (
        <div className={`notificacion ${toast.tipo}`}>
          {toast.mensaje}
        </div>
      )}

      {/* Encabezado */}
      <header className="app-header">
        <div className="header-izquierda">
          <button
            className="btn-seleccionar-archivo"
            onClick={inicializarArchivo}
            title="Seleccionar archivo fuente de tickets (.txt)"
          >
            <Clipboard size={18} />
            Seleccionar archivo fuente
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginLeft: 8 }}>
            <button
              className="btn-seleccionar-cerrados"
              onClick={abrirArchivoCerrados}
              title="Seleccionar archivo de tickets cerrados existente"
            >
              📂 Abrir cerrados
            </button>
            <button
              className="btn-seleccionar-cerrados"
              onClick={() => crearNuevoArchivoCerrados(obtenerEtiquetaSemanaActual())}
              title="Crear archivo de tickets cerrados nuevo"
            >
              📄 Crear cerrados
            </button>
          </div>
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
          {puedeSincronizar && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 10 }}>
              <span
                className="estado-sincronizacion"
                style={{
                  color: sincronizando ? '#3b82f6' : '#22c55e',
                  fontSize: 13,
                }}
              >
                {sincronizando ? '⟳ Sincronizando...' : 'Sincronización automática activa'}
              </span>
              {ultimoSincronizado && (
                <span style={{ fontSize: 12, color: '#94a3b8' }}>
                  Última sync: {new Date(ultimoSincronizado).toLocaleTimeString('es-MX', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </div>
          )}
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
            {seccion.id}
          </label>
        ))}
      </div>

      {/* Modal de mensajes (comentarios) */}
      {modalMensajesAbierto && ticketMensajesAbierto && (
        <div className="modal-overlay" onClick={() => setModalMensajesAbierto(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ marginBottom: 16 }}>
              <h3>Mensajes - Ticket #{ticketMensajesAbierto.Codigo}</h3>
            </div>

            <div className="mensajes-lista">
              {(ticketMensajesAbierto.Comentarios || []).map((comentario, index) => (
                <div key={index} className="mensaje-item">
                  <div className="mensaje-texto">{comentario}</div>
                </div>
              ))}
              {ticketMensajesAbierto.Comentarios &&
                ticketMensajesAbierto.Comentarios.length === 0 && (
                  <div className="mensaje-vacio">No hay comentarios aún.</div>
                )}
            </div>

            <div className="mensaje-formulario">
              <form onSubmit={manejarGuardarComentario}>
                <textarea
                  className="textarea-comentario"
                  value={nuevoComentario}
                  onChange={(e) => setNuevoComentario(e.target.value)}
                  placeholder="Escribe un nuevo comentario..."
                  rows="3"
                  required
                />
                <div className="form-botones">
                  <button type="submit" className="btn-guardar-verde">
                    Agregar comentario
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Secciones y tickets */}
      <main className="app-main">
        {secciones.length === 0 ? (
          <div className="estado-vacio">
            <p>No hay secciones creadas aún.</p>
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
                  onCambiarPrioridad={cambiarPrioridad}
                  archivoCerradosListo={archivoCerradosListo}
                />
              );
            })
        )}
      </main>
    </div>
  );
}
