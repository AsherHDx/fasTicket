/**
 * Hook personalizado para manejar la lógica de tickets y secciones de fasTicket.
 * Incluye CRUD, búsqueda y persistencia automática.
 */
import { useState, useCallback, useEffect } from 'react';
import {
  seleccionarArchivoTickets,
  obtenerHandleTickets,
  leerTickets,
  guardarTickets,
  abrirArchivoCerradosExistente,
  crearArchivoCerrados,
  obtenerHandleCerrados,
  agregarTicketCerrado,
} from '../services/fileService.js';
import { crearTicket, crearSeccion, PRIORIDADES } from '../types/index.js';
import { validarTicketCompleto } from '../utils/validaciones.js';

// Secciones predefinidas
const SECCIONES_PREDEFINIDAS = [
  { id: 'isma', titulo: 'Isma', orden: 0 },
  { id: 'mario', titulo: 'Mario', orden: 1 },
  { id: 'david', titulo: 'David', orden: 2 },
  { id: 'richard', titulo: 'Richard', orden: 3 },
  { id: 'lalo', titulo: 'Lalo', orden: 4 },
  { id: 'otro', titulo: 'otro', orden: 5 },
];

export function useTickets() {
  const [secciones, setSecciones] = useState(SECCIONES_PREDEFINIDAS);
  const [tickets, setTickets] = useState([]);
  const [seccionExpandida, setSeccionExpandida] = useState(null); // id de sección desplegada o null
  const [busqueda, setBusqueda] = useState('');
  const [archivoListo, setArchivoListo] = useState(false);
  const [archivoCerradosListo, setArchivoCerradosListo] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Obtiene el ID de sección válido para un ticket.
   * Si el seccionId del ticket no coincide con ninguna de las 5 secciones predefinidas,
   * se asigna a 'otro'.
   */
  const obtenerSeccionValida = useCallback((seccionId) => {
    const idsValidos = SECCIONES_PREDEFINIDAS.map((s) => s.id);
    return idsValidos.includes(seccionId) ? seccionId : 'otro';
  }, []);

  /**
   * Selecciona el archivo tickets.txt y carga su contenido.
   */
  const inicializarArchivo = useCallback(async () => {
    try {
      await seleccionarArchivoTickets();
      const datos = await leerTickets(obtenerHandleTickets());

      // Asignar cada ticket a su sección válida (o 'otro')
      const datosNormalizados = datos.map((t) => ({
        ...t,
        seccionId: obtenerSeccionValida(t.seccionId),
      }));

      setTickets(datosNormalizados);
      setArchivoListo(true);
      setError(null);
    } catch (err) {
      setError(err.message);
      setArchivoListo(false);
    }
  }, [obtenerSeccionValida]);

  /**
   * Guarda todos los tickets en el archivo automáticamente.
   */
  const persistir = useCallback(async (ticketsLista) => {
    if (!obtenerHandleTickets()) {
      setError('No hay archivo de tickets seleccionado.');
      return false;
    }
    try {
      await guardarTickets(obtenerHandleTickets(), ticketsLista);
      setError(null);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, []);

  /**
   * Agrupa tickets por sección aplicando filtro de búsqueda.
   */
  const obtenerTicketsPorSeccion = useCallback((seccionId) => {
    let filtrados = tickets.filter(
      (t) => t.seccionId === seccionId && t.atendido !== true
    );

    if (busqueda.trim() !== '') {
      const termino = busqueda.trim().toLowerCase();
      filtrados = filtrados.filter(
        (t) =>
          String(t.id).toLowerCase().includes(termino) ||
          String(t.titulo).toLowerCase().includes(termino)
      );
    }

    // Ordenar por campo orden
    return filtrados.sort((a, b) => (a.orden || 0) - (b.orden || 0));
  }, [tickets, busqueda]);

  /**
   * Crea un ticket y lo guarda automáticamente.
   */
  const agregarTicket = useCallback(
    async (datosTicket) => {
      // Asegurar que el seccionId sea válido
      const seccionIdValida = obtenerSeccionValida(datosTicket.seccionId);

      // Verificar si el ticket ya existe por ID
      const ticketExistente = tickets.find((t) => t.id === datosTicket.id);

      if (ticketExistente) {
        // Si el ticket ya existe y está atendido, reactivarlo (cambiar a false)
        if (ticketExistente.atendido === true) {
          const actualizados = tickets.map((t) =>
            t.id === datosTicket.id
              ? {
                  ...t,
                  atendido: false,
                  fechaActualizacion: new Date().toISOString(),
                }
              : t
          );
          setTickets(actualizados);
          setError(null);
          await persistir(actualizados);
          return ticketExistente;
        } else {
          // El ticket ya existe y no está atendido, mostrar error de duplicado
          setError(
            `Este ticket ya existe (ID: ${datosTicket.id}). No se pueden crear tickets duplicados.`
          );
          return null;
        }
      }

      const nuevo = crearTicket({
        ...datosTicket,
        seccionId: seccionIdValida,
      });

      const validacion = validarTicketCompleto(nuevo, tickets);
      if (!validacion.valido) {
        setError(validacion.errores.join(', '));
        return null;
      }

      const actualizados = [...tickets, nuevo];
      setTickets(actualizados);
      setError(null);

      const ok = await persistir(actualizados);
      if (!ok) {
        // Revertir si falló la persistencia
        setTickets(tickets);
      }
      return nuevo;
    },
    [tickets, persistir, obtenerSeccionValida]
  );

  /**
   * Edita un ticket existente y lo guarda.
   */
  const editarTicket = useCallback(
    async (id, datosActualizados) => {
      // Si se está cambiando la sección, asegurar que sea válida
      const seccionIdValida = datosActualizados.seccionId
        ? obtenerSeccionValida(datosActualizados.seccionId)
        : undefined;

      const actualizados = tickets.map((t) =>
        t.id === id
          ? {
              ...t,
              ...datosActualizados,
              ...(seccionIdValida ? { seccionId: seccionIdValida } : {}),
              fechaActualizacion: new Date().toISOString(),
            }
          : t
      );

      const validacion = validarTicketCompleto(
        { ...actualizados.find((t) => t.id === id), id },
        actualizados,
        id
      );
      if (!validacion.valido) {
        setError(validacion.errores.join(', '));
        return false;
      }

      setTickets(actualizados);
      setError(null);
      return await persistir(actualizados);
    },
    [tickets, persistir, obtenerSeccionValida]
  );

  /**
   * Elimina un ticket y lo guarda.
   */
  const eliminarTicket = useCallback(
    async (id) => {
      if (!window.confirm('¿Estás seguro de eliminar este ticket?')) {
        return false;
      }

      const actualizados = tickets.filter((t) => t.id !== id);
      setTickets(actualizados);
      setError(null);
      return await persistir(actualizados);
    },
    [tickets, persistir]
  );

  /**
   * Abre un archivo de tickets cerrados existente.
   */
  const abrirArchivoCerrados = useCallback(async () => {
    try {
      const handle = await abrirArchivoCerradosExistente();
      setArchivoCerradosListo(true);
      setError(null);
      return handle;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  /**
   * Crea un nuevo archivo de tickets cerrados semanal.
   */
  const crearNuevoArchivoCerrados = useCallback(async (nombreArchivo) => {
    try {
      const handle = await crearArchivoCerrados(nombreArchivo);
      setArchivoCerradosListo(true);
      setError(null);
      return handle;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  /**
   * Cierra un ticket: lo elimina de activos, lo escribe en el archivo de cerrados
   * y actualiza el resumen semanal.
   */
  const cerrarTicket = useCallback(
    async (id) => {
      const ticket = tickets.find((t) => t.id === id);
      if (!ticket) return false;

      // Si no hay archivo de cerrados seleccionado, no se puede cerrar
      if (!obtenerHandleCerrados()) {
        setError('Primero selecciona o crea un archivo de tickets cerrados.');
        return false;
      }

      try {
        // 1. Agregar al archivo de cerrados (con resumen automático)
        await agregarTicketCerrado(obtenerHandleCerrados(), {
          url: ticket.url,
          titulo: ticket.titulo,
          id: ticket.id,
          tipo: ticket.tipo || 'Sin tipo',
        });

        // 2. Eliminar de tickets activos
        const actualizados = tickets.filter((t) => t.id !== id);
        setTickets(actualizados);
        setError(null);
        await persistir(actualizados);
        return true;
      } catch (err) {
        setError(err.message);
        return false;
      }
    },
    [tickets, persistir, obtenerHandleCerrados, agregarTicketCerrado]
  );

  /**
   * Crea un ticket y lo cierra inmediatamente (lo mueve al archivo de cerrados).
   * Operación atómica: no hay problema de estado desactualizado.
   */
  const crearYCerrarTicket = useCallback(
    async (datosTicket) => {
      // Verificar que el seccionId sea válido
      const seccionIdValida = obtenerSeccionValida(datosTicket.seccionId);

      // Verificar que no exista ya un ticket con este ID (ni atendido ni no atendido)
      const ticketExistente = tickets.find((t) => t.id === datosTicket.id);

      if (ticketExistente) {
        // Si ya existe y está atendido, reactivarlo y luego cerrarlo
        if (ticketExistente.atendido === true) {
          const actualizados = tickets.map((t) =>
            t.id === datosTicket.id
              ? { ...t, atendido: false, fechaActualizacion: new Date().toISOString() }
              : t
          );
          setTickets(actualizados);

          // Ahora cerrarlo
          return await cerrarTicket(datosTicket.id);
        } else {
          // Ya existe y no está atendido -> duplicado
          setError(
            `Este ticket ya existe (ID: ${datosTicket.id}). No se pueden crear tickets duplicados.`
          );
          return false;
        }
      }

      // Crear el nuevo ticket
      const nuevo = crearTicket({
        ...datosTicket,
        seccionId: seccionIdValida,
      });

      const validacion = validarTicketCompleto(nuevo, tickets);
      if (!validacion.valido) {
        setError(validacion.errores.join(', '));
        return false;
      }

      // Si no hay archivo de cerrados seleccionado, no se puede cerrar
      if (!obtenerHandleCerrados()) {
        setError('Primero selecciona o crea un archivo de tickets cerrados.');
        return false;
      }

      try {
        // Agregar al archivo de cerrados (con resumen automático)
        await agregarTicketCerrado(obtenerHandleCerrados(), {
          url: nuevo.url,
          titulo: nuevo.titulo,
          id: nuevo.id,
          tipo: nuevo.tipo || 'Sin tipo',
        });

        // El ticket nunca se agregó a tickets activos, solo se fue directamente a cerrados
        setError(null);
        return true;
      } catch (err) {
        setError(err.message);
        return false;
      }
    },
    [tickets, persistir, obtenerHandleCerrados, agregarTicketCerrado, obtenerSeccionValida]
  );

  /**
   * Cambia el estado de "atendido" de un ticket.
   */
  const toggleAtendido = useCallback(async (id) => {
    const actualizados = tickets.map((t) =>
      t.id === id ? { ...t, atendido: !t.atendido } : t
    );
    setTickets(actualizados);
    setError(null);
    return await persistir(actualizados);
  }, [tickets, persistir]);

  /**
   * Cambia el estado de "atención/resaltado" de un ticket.
   */
  const toggleAtencion = useCallback(async (id) => {
    const actualizados = tickets.map((t) =>
      t.id === id ? { ...t, resaltado: !t.resaltado } : t
    );
    setTickets(actualizados);
    setError(null);
    return await persistir(actualizados);
  }, [tickets, persistir]);

  /**
   * Marca un ticket como compartido agregando la fecha y hora actual a su lista de fechas.
   * No es toggle: cada vez que se presiona se agrega una nueva fecha.
   */
  const agregarCompartido = useCallback(async (id) => {
    const ticket = tickets.find((t) => t.id === id);
    if (!ticket) return false;

    const fechaActual = new Date().toISOString();
    const fechas = [...ticket.fechas, fechaActual];

    const actualizados = tickets.map((t) =>
      t.id === id ? { ...t, compartir: true, fechas } : t
    );
    setTickets(actualizados);
    setError(null);
    return await persistir(actualizados);
  }, [tickets, persistir]);

  /**
   * Cambia la prioridad de un ticket en ciclo: Baja -> Media -> Alta -> Baja.
   */
  const cambiarPrioridad = useCallback(async (id) => {
    const ordenPrioridades = ['Baja', 'Media', 'Alta'];
    const ticket = tickets.find((t) => t.id === id);
    if (!ticket) return false;

    const indiceActual = ordenPrioridades.indexOf(ticket.prioridad);
    const siguienteIndice = (indiceActual + 1) % ordenPrioridades.length;
    const nuevaPrioridad = ordenPrioridades[siguienteIndice];

    const actualizados = tickets.map((t) =>
      t.id === id ? { ...t, prioridad: nuevaPrioridad, fechaActualizacion: new Date().toISOString() } : t
    );
    setTickets(actualizados);
    setError(null);
    return await persistir(actualizados);
  }, [tickets, persistir]);

  /**
   * Edita la descripción de un ticket inline.
   */
  const editarDescripcion = useCallback(async (id, nuevaDescripcion) => {
    const actualizados = tickets.map((t) =>
      t.id === id
        ? { ...t, descripcion: nuevaDescripcion, fechaActualizacion: new Date().toISOString() }
        : t
    );
    setTickets(actualizados);
    setError(null);
    return await persistir(actualizados);
  }, [tickets, persistir]);

  /**
   * Agrega un comentario a un ticket.
   */
  const agregarComentario = useCallback(async (id, comentario) => {
    const ticket = tickets.find((t) => t.id === id);
    if (!ticket) return false;

    const nuevosComentarios = [...ticket.comentarios, comentario];

    const actualizados = tickets.map((t) =>
      t.id === id
        ? {
            ...t,
            comentarios: nuevosComentarios,
            fechaActualizacion: new Date().toISOString(),
          }
        : t
    );
    setTickets(actualizados);
    setError(null);
    return await persistir(actualizados);
  }, [tickets, persistir]);

  /**
   * Mueve un ticket a otra sección y/o reordena.
   */
  const moverTicket = useCallback(async (id, nuevaSeccionId, nuevoOrden) => {
    const seccionIdValida = obtenerSeccionValida(nuevaSeccionId);
    const actualizados = tickets.map((t) =>
      t.id === id ? { ...t, seccionId: seccionIdValida, orden: nuevoOrden } : t
    );
    setTickets(actualizados);
    setError(null);
    return await persistir(actualizados);
  }, [tickets, persistir, obtenerSeccionValida]);

  /**
   * Reordena secciones.
   */
  const reordenarSecciones = useCallback(async (nuevasSecciones) => {
    setSecciones(nuevasSecciones);
  }, []);

  return {
    // Estado
    secciones,
    tickets,
    seccionExpandida,
    setSeccionExpandida,
    busqueda,
    setBusqueda,
    archivoListo,
    archivoCerradosListo,
    error,
    PRIORIDADES,

    // Acciones
    inicializarArchivo,
    abrirArchivoCerrados,
    crearNuevoArchivoCerrados,
    obtenerTicketsPorSeccion,
    agregarTicket,
    editarTicket,
    eliminarTicket,
    cerrarTicket,
    toggleAtendido,
    toggleAtencion,
    agregarCompartido,
    cambiarPrioridad,
    editarDescripcion,
    agregarComentario,
    moverTicket,
    reordenarSecciones,
    crearYCerrarTicket,
  };
}
