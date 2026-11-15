/**
 * Hook personalizado para manejar la lógica de tickets y secciones de fasTicket.
 * Incluye CRUD, búsqueda, drag & drop entre secciones y persistencia automática.
 */
import { useState, useCallback, useEffect } from 'react';
import {
  seleccionarArchivoTickets,
  obtenerHandleTickets,
  leerTickets,
  guardarTickets,
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
    let filtrados = tickets.filter((t) => t.seccionId === seccionId);

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
   * Cierra un ticket (lo elimina de activos y se envía al archivo de cerrados).
   */
  const cerrarTicket = useCallback(
    async (id) => {
      const actualizados = tickets.filter((t) => t.id !== id);
      setTickets(actualizados);
      setError(null);
      return await persistir(actualizados);
    },
    [tickets, persistir]
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
    error,
    PRIORIDADES,

    // Acciones
    inicializarArchivo,
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
    moverTicket,
    reordenarSecciones,
  };
}
