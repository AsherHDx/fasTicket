/**
 * Componente principal App de fasTicket.
 * Vista principal: tema oscuro, buscador, botón agregar ticket, checkboxes de visibilidad,
 * secciones desplegables y tarjetas de tickets.
 */
import { useState } from 'react';
import { Plus, Clipboard } from 'lucide-react';
import { useTickets } from '../hooks/useTickets.js';
import { obtenerEtiquetaSemanaActual } from '../utils/fechas.js';
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
    archivoCerradosListo,
    inicializarArchivo,
    obtenerTicketsPorSeccion,
    agregarTicket,
    cerrarTicket,
    toggleAtencion,
    cambiarPrioridad,
    agregarComentario,
    editarDescripcion,
    abrirArchivoCerrados,
    crearNuevoArchivoCerrados,
    crearYCerrarTicket,
  } = useTickets();

  const [modalAbierto, setModalAbierto] = useState(false);
  const [notificacion, setNotificacion] = useState(null);

  // Modal de mensajes (comentarios)
  const [modalMensajesAbierto, setModalMensajesAbierto] = useState(false);
  const [ticketMensajesAbierto, setTicketMensajesAbierto] = useState(null);
  const [nuevoComentario, setNuevoComentario] = useState('');

  // Qué secciones están expandidas (todas por defecto)
  const [seccionesExpandidas, setSeccionesExpandidas] = useState(
    new Set(secciones.map((s) => s.id))
  );

  // Qué sección está visible (null = mostrar todas, string = id de una sección)
  const [seccionVisible, setSeccionVisible] = useState(null);

  // Tipos de ticket disponibles
  const TIPOS_TICKET = [
    'incidencia',
    'solicitud',
    'consulta',
    'seguridad',
    'configuración',
    'proyectos',
    'infraestructura',
  ];

  // Formulario de crear ticket (modal)
  const [textoLineas, setTextoLineas] = useState('');
  const [formSeccionId, setFormSeccionId] = useState(secciones.length > 0 ? secciones[0].id : '');
  const [formTipo, setFormTipo] = useState(TIPOS_TICKET[0]);

  // Copiar al portapapeles
  const copiarPortapapeles = async (texto) => {
    try {
      await navigator.clipboard.writeText(texto);
      setNotificacion({ tipo: 'exito', mensaje: 'Copiado al portapapeles' });
      setTimeout(() => setNotificacion(null), 2000);
    } catch (err) {
      setNotificacion({ tipo: 'error', mensaje: `No se pudo copiar: ${err}` });
      setTimeout(() => setNotificacion(null), 2000);
    }
  };

  // Manejar acciones de las tarjetas de ticket
  const manejarAccionTicket = async (tipo, codigo) => {
    switch (tipo) {
      case 'copiar-datos': {
        const t = tickets.find((x) => x.Codigo === codigo);
        if (t) {
          const datos = `${t.Codigo}\n${t.Asunto}\n${t.Tipo}`;
          await copiarPortapapeles(datos);
        }
        break;
      }
      case 'cerrar':
        await cerrarTicket(codigo);
        break;
      case 'atencion':
        await toggleAtencion(codigo);
        break;
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

  // Guardar nuevo ticket desde el modal
  const manejarGuardarTicket = async (e) => {
    e.preventDefault();

    // Procesar las líneas: Código, Asunto, Tipo, Asignado A, Descripción
    const lineas = textoLineas.split('\n').map((l) => l.trim()).filter((l) => l !== '');

    if (lineas.length < 4) {
      setNotificacion({ tipo: 'error', mensaje: 'Debes ingresar Código, Asunto, Tipo y Asignado A (una por línea)' });
      setTimeout(() => setNotificacion(null), 3000);
      return;
    }

    const codigo = lineas[0];
    const asunto = lineas[1];
    const tipo = lineas[2];
    const asignadoA = lineas[3];
    const descripcion = lineas.length > 4 ? lineas[4] : '';

    if (!codigo || !asunto || !tipo || !asignadoA) {
      setNotificacion({ tipo: 'error', mensaje: 'Código, Asunto, Tipo y Asignado A son obligatorios' });
      setTimeout(() => setNotificacion(null), 3000);
      return;
    }

    const nuevoTicket = {
      Codigo: codigo,
      Asunto: asunto,
      Descripcion: descripcion,
      Tipo: tipo,
      Prioridad: 'baja',
      Estado: 'Pendiente',
      'Fecha de creacion': '',
      'Hora de creacion': '',
      'Asignado A': asignadoA,
      Comentarios: [],
      Resaltado: false,
    };

    const resultado = await agregarTicket(nuevoTicket);

    if (!resultado) {
      // Ticket duplicado (error ya establecido en el hook)
      if (error) {
        setNotificacion({ tipo: 'error', mensaje: error });
        setTimeout(() => setNotificacion(null), 3000);
      }
      return;
    }

    setNotificacion({ tipo: 'exito', mensaje: 'Ticket creado exitosamente' });
    setTimeout(() => setNotificacion(null), 3000);

    setTextoLineas('');
    setFormSeccionId(secciones.length > 0 ? secciones[0].id : '');
    setFormTipo(TIPOS_TICKET[0]);
    setModalAbierto(false);
  };

  // Crear ticket y cerrarlo inmediatamente
  const manejarCrearYCerrarTicket = async (e) => {
    e.preventDefault();

    // Procesar las líneas: Código, Asunto, Tipo, Asignado A, Descripción
    const lineas = textoLineas.split('\n').map((l) => l.trim()).filter((l) => l !== '');

    if (lineas.length < 4) {
      setNotificacion({ tipo: 'error', mensaje: 'Debes ingresar Código, Asunto, Tipo y Asignado A (una por línea)' });
      setTimeout(() => setNotificacion(null), 3000);
      return;
    }

    const codigo = lineas[0];
    const asunto = lineas[1];
    const tipo = lineas[2];
    const asignadoA = lineas[3];
    const descripcion = lineas.length > 4 ? lineas[4] : '';

    if (!codigo || !asunto || !tipo || !asignadoA) {
      setNotificacion({ tipo: 'error', mensaje: 'Código, Asunto, Tipo y Asignado A son obligatorios' });
      setTimeout(() => setNotificacion(null), 3000);
      return;
    }

    const nuevoTicket = {
      Codigo: codigo,
      Asunto: asunto,
      Descripcion: descripcion,
      Tipo: tipo,
      Prioridad: 'baja',
      Estado: 'Pendiente',
      'Fecha de creacion': '',
      'Hora de creacion': '',
      'Asignado A': asignadoA,
      Comentarios: [],
      Resaltado: false,
    };

    const ok = await crearYCerrarTicket(nuevoTicket);

    if (!ok) {
      if (error) {
        setNotificacion({ tipo: 'error', mensaje: error });
        setTimeout(() => setNotificacion(null), 3000);
      }
      return;
    }

    setNotificacion({ tipo: 'exito', mensaje: 'Ticket creado y cerrado exitosamente' });
    setTimeout(() => setNotificacion(null), 3000);

    setTextoLineas('');
    setFormSeccionId(secciones.length > 0 ? secciones[0].id : '');
    setFormTipo(TIPOS_TICKET[0]);
    setModalAbierto(false);
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
      setTicketMensajesAbierto(prev => ({
        ...prev,
        Comentarios: [...(prev.Comentarios || []), comentarioConFecha]
      }));
      setNuevoComentario('');
      setNotificacion({ tipo: 'exito', mensaje: 'Comentario agregado' });
      setTimeout(() => setNotificacion(null), 2000);
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
                <label>Datos del ticket (una por línea) *</label>
                <textarea
                  className="textarea-datos-ticket"
                  value={textoLineas}
                  onChange={(e) => setTextoLineas(e.target.value)}
                  placeholder="Código del ticket\nAsunto del ticket\nTipo de ticket\nAsignado A\nDescripción (opcional)"
                  rows="5"
                />
                <span className="campo-ayuda">
                  Línea 1: Código | Línea 2: Asunto | Línea 3: Tipo | Línea 4: Asignado A | Línea 5: Descripción (opcional)
                </span>
              </div>

              <div className="form-grupo">
                <label>Sección *</label>
                <div className="radio-group">
                  {secciones.map((s) => (
                    <label key={s.id} className="radio-label">
                      <input
                        type="radio"
                        name="form-seccion"
                        value={s.id}
                        checked={formSeccionId === s.id}
                        onChange={() => setFormSeccionId(s.id)}
                      />
                      {s.titulo}
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-grupo">
                <label>Tipo de ticket *</label>
                <div className="radio-group">
                  {TIPOS_TICKET.map((t) => (
                    <label key={t} className="radio-label">
                      <input
                        type="radio"
                        name="form-tipo"
                        value={t}
                        checked={formTipo === t}
                        onChange={() => setFormTipo(t)}
                      />
                      {t}
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-botones">
                <button
                  type="button"
                  className={`btn-cerrar-creado ${!archivoCerradosListo ? 'disabled' : ''}`}
                  onClick={manejarCrearYCerrarTicket}
                  disabled={!archivoCerradosListo}
                  title={!archivoCerradosListo ? 'Primero selecciona o crea un archivo de tickets cerrados' : 'Crear y cerrar'}
                >
                  Crear y cerrar
                </button>
                <button type="submit" className="btn-guardar-verde">
                  Crear ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
              {ticketMensajesAbierto.Comentarios && ticketMensajesAbierto.Comentarios.length === 0 && (
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
