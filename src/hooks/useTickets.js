/**
 * Hook personalizado para manejar la lógica de tickets y secciones de fasTicket.
 * Incluye CRUD, búsqueda y persistencia automática.
 */
import { useState, useCallback } from 'react';
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
import { crearTicket, PRIORIDADES } from '../types/index.js';
import { validarTicketCompleto } from '../utils/validaciones.js';
import { parsearFechaParaComparar } from '../utils/fechas.js';

// Secciones predefinidas
const SECCIONES_PREDEFINIDAS = [
  { id: 'isma'},
  { id: 'mario'},
  { id: 'david'},
  { id: 'richard'},
  { id: 'lalo'},
  { id: 'otro'},
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
   * Si el Asignado A del ticket no coincide con ninguna de las secciones predefinidas,
   * se asigna a 'otro'.
   */
  const obtenerSeccionValida = useCallback((asignadoA) => {
    const idsValidos = SECCIONES_PREDEFINIDAS.map((seccion) => seccion.id);
    return idsValidos.includes(asignadoA) ? asignadoA : 'otro';
  }, []);



  /**
   * Selecciona el archivo tickets.txt y carga su contenido.
   */
  const inicializarArchivo = useCallback(async () => {
    try {
      await seleccionarArchivoTickets();
      const tickets = await leerTickets(obtenerHandleTickets());

      // Normalizar cada ticket: asegurar Asignado A válido
      const ticketsNormalizados = tickets.map((ticket) => ({
        ...ticket,
        'Asignado A': obtenerSeccionValida(ticket['Asignado A']),
      }));

      setTickets(ticketsNormalizados);
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
  const persistir = useCallback(async (listaTickets) => {
    if (!obtenerHandleTickets()) {
      setError('No hay archivo de tickets seleccionado.');
      return false;
    }

    try {
      await guardarTickets(obtenerHandleTickets(), listaTickets);
      setError(null);
      return true;

    } catch (err) {
      setError(err.message);
      return false;
    }
  }, []);



  /**
   * Agrupa tickets por sección aplicando filtro de búsqueda.
   * Ordena por fecha y hora de creación descendente (más reciente primero).
   */
  const obtenerTicketsPorSeccion = useCallback((seccionId) => {
    let filtrados = tickets.filter(
      (ticket) => ticket['Asignado A'] === seccionId
    );

    if (busqueda.trim() !== '') {
      const termino = busqueda.trim().toLowerCase();
      filtrados = filtrados.filter(
        (ticket) =>
          String(ticket.Codigo).toLowerCase().includes(termino) ||
          String(ticket.Asunto).toLowerCase().includes(termino)
      );
    }

    // Ordenar por fecha y hora de creación descendente (más reciente primero)
    return filtrados.sort((ticketA, ticketB) => parsearFechaParaComparar(ticketB) - parsearFechaParaComparar(ticketA));
  }, [tickets, busqueda]);



  /**
   * Crea un ticket y lo persiste. (SE ELIMINARÁ MÁS ADELANTE)
   */
  const agregarTicket = useCallback(
    async (datosNuevoTicket) => {
      const asignadoAValido = obtenerSeccionValida(datosNuevoTicket['Asignado A']);
      const existeTicket = tickets.find((ticket) => ticket.Codigo === datosNuevoTicket.Codigo);

      if (existeTicket) {
        setError(
          `Este ticket ya existe (Código: ${datosNuevoTicket.Codigo}). No se pueden crear tickets duplicados.`
        );
        return null;
      }

      const nuevoTicket = crearTicket({
        ...datosNuevoTicket,
        'Asignado A': asignadoAValido,
      });

      const validacion = validarTicketCompleto(nuevoTicket, tickets);
      if (!validacion.valido) {
        setError(validacion.errores.join(', '));
        return null;
      }

      const actualizados = [...tickets, nuevoTicket];
      setTickets(actualizados);
      setError(null);

      const ok = await persistir(actualizados);
      if (!ok) {
        // Revertir si falló la persistencia
        setTickets(tickets);
      }
      return nuevoTicket;
    },
    [tickets, persistir, obtenerSeccionValida]
  );



  /**
   * Edita un ticket existente y lo persiste.
   */
  const editarTicket = useCallback(
    async (codigo, datosActualizados) => {
      // Si se está cambiando el asignado, asegurar que sea válido
      const asignadoAValido = datosActualizados['Asignado A']
        ? obtenerSeccionValida(datosActualizados['Asignado A'])
        : undefined;

      const actualizados = tickets.map((ticket) =>
        ticket.Codigo === codigo
          ? {
              ...ticket,
              ...datosActualizados,
              ...(asignadoAValido ? { 'Asignado A': asignadoAValido } : {}),
            }
          : ticket
      );

      const validacion = validarTicketCompleto(
        { ...actualizados.find((t) => t.Codigo === codigo), Codigo: codigo },
        actualizados,
        codigo
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
   * Elimina un ticket y persiste el cambio
   */
  const eliminarTicket = useCallback(
    async (codigo) => {
      if (!window.confirm('¿Estás seguro de eliminar este ticket?')) {
        return false;
      }

      const actualizados = tickets.filter((t) => t.Codigo !== codigo);
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
    async (codigo) => {
      const ticket = tickets.find((t) => t.Codigo === codigo);
      if (!ticket) return false;

      // Si no hay archivo de cerrados seleccionado, no se puede cerrar
      if (!obtenerHandleCerrados()) {
        setError('Primero selecciona o crea un archivo de tickets cerrados.');
        return false;
      }

      try {
        // 1. Agregar al archivo de cerrados (con resumen automático)
        await agregarTicketCerrado(obtenerHandleCerrados(), {
          codigo: ticket.Codigo,
          asunto: ticket.Asunto,
          tipo: ticket.Tipo || 'Sin tipo',
        });

        // 2. Eliminar de tickets activos
        const actualizados = tickets.filter((t) => t.Codigo !== codigo);
        setTickets(actualizados);
        setError(null);
        await persistir(actualizados);
        return true;

      } catch (err) {
        setError(err.message);
        return false;
      }
    },
    [tickets, persistir]
  );



  /**
   * Crea un ticket y lo cierra inmediatamente (lo mueve al archivo de cerrados).
   * Operación atómica: no hay problema de estado desactualizado.
   *  
   *============ ESTO SE VA A ELIMINAR EN EL FUTURO=====================0
   * 
   */
  const crearYCerrarTicket = useCallback(
    async (datosTicket) => {
      // Verificar que el Asignado A sea válido
      const asignadoAValido = obtenerSeccionValida(datosTicket['Asignado A']);

      // Verificar que no exista ya un ticket con este Código (ni cerrado ni activo)
      const ticketExistente = tickets.find((t) => t.Codigo === datosTicket.Codigo);

      if (ticketExistente) {
        // Ya existe -> duplicado
        setError(
          `Este ticket ya existe (Código: ${datosTicket.Codigo}). No se pueden crear tickets duplicados.`
        );
        return false;
      }

      // Crear el nuevo ticket
      const nuevo = crearTicket({
        ...datosTicket,
        'Asignado A': asignadoAValido,
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
          codigo: nuevo.Codigo,
          asunto: nuevo.Asunto,
          tipo: nuevo.Tipo || 'Sin tipo',
        });

        // El ticket nunca se agregó a tickets activos, solo se fue directamente a cerrados
        setError(null);
        return true;
      } catch (err) {
        setError(err.message);
        return false;
      }
    },
    [tickets, obtenerSeccionValida]
  );



  /**
   * Cambia el estado de "resaltado" de un ticket.
   */
  const toggleAtencion = useCallback(async (codigo) => {
    const actualizados = tickets.map((ticket) =>
      ticket.Codigo === codigo ? { ...ticket, Resaltado: !ticket.Resaltado } : ticket
    );
    setTickets(actualizados);
    setError(null);
    return await persistir(actualizados);
  }, [tickets, persistir]);



  /**
   * Cambia la prioridad de un ticket en ciclo: baja -> media -> alta -> baja.
   */
  const cambiarPrioridad = useCallback(async (codigo) => {
    const ordenPrioridades = ['baja', 'media', 'alta', 'critica'];
    const ticket = tickets.find((ticket) => ticket.Codigo === codigo);
    if (!ticket) return false;

    const indiceActual = ordenPrioridades.indexOf(ticket.Prioridad);
    const siguienteIndice = (indiceActual + 1) % ordenPrioridades.length;
    const nuevaPrioridad = ordenPrioridades[siguienteIndice];

    const actualizados = tickets.map((ticket) =>
      ticket.Codigo === codigo ? { ...ticket, Prioridad: nuevaPrioridad } : ticket
    );
    setTickets(actualizados);
    setError(null);
    return await persistir(actualizados);
  }, [tickets, persistir]);



  /**
   * Edita la descripción de un ticket inline.
   */
  const editarDescripcion = useCallback(async (codigo, nuevaDescripcion) => {
    const actualizados = tickets.map((ticket) =>
      ticket.Codigo === codigo
        ? { ...ticket, Descripcion: nuevaDescripcion }
        : ticket
    );
    setTickets(actualizados);
    setError(null);
    return await persistir(actualizados);
  }, [tickets, persistir]);



  /**
   * Agrega un comentario a un ticket.
   */
  const agregarComentario = useCallback(async (codigo, comentario) => {
    const ticket = tickets.find((t) => t.Codigo === codigo);
    if (!ticket) return false;

    const nuevosComentarios = [...ticket.Comentarios, comentario];

    const actualizados = tickets.map((ticket) =>
      ticket.Codigo === codigo
        ? {
            ...ticket,
            Comentarios: nuevosComentarios,
          }
        : ticket
    );
    setTickets(actualizados);
    setError(null);
    return await persistir(actualizados);
  }, [tickets, persistir]);



  return {
    // Estado
    secciones,
    tickets,
    busqueda,
    setBusqueda,
    archivoListo,
    error,
    archivoCerradosListo,
    
    seccionExpandida,
    setSeccionExpandida,
    PRIORIDADES,

    // Acciones
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

    editarTicket,
    eliminarTicket
  };
}
