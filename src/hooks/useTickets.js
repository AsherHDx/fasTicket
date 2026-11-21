/**
 * Hook personalizado para manejar la lógica de tickets y secciones de fasTicket.
 * Incluye búsqueda, persistencia automática y sincronización con la API externa.
 *
 * Los tickets ya no se crean ni cierran manualmente desde la UI.
 * La sincronización con la API se ejecuta automáticamente cada minuto
 * solo cuando ambos archivos (fuente y cerrados) están seleccionados.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
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
import { PRIORIDADES } from '../types/index.js';
import { parsearFechaParaComparar } from '../utils/fechas.js';
import { consultarAPI, ticketsTienenCambios } from '../services/apiService.js';

// Secciones predefinidas
const SECCIONES_PREDEFINIDAS = [
  { id: 'isma' },
  { id: 'mario' },
  { id: 'david' },
  { id: 'richard' },
  { id: 'lalo' },
  { id: 'otro' },
];

export function useTickets() {
  const [secciones, setSecciones] = useState(SECCIONES_PREDEFINIDAS);
  const [tickets, setTickets] = useState([]);
  const [seccionExpandida, setSeccionExpandida] = useState(null); // id de sección desplegada o null
  const [busqueda, setBusqueda] = useState('');
  const [archivoListo, setArchivoListo] = useState(false);
  const [archivoCerradosListo, setArchivoCerradosListo] = useState(false);
  const [error, setError] = useState(null);
  const [sincronizando, setSincronizando] = useState(false);
  const [ultimoSincronizado, setUltimoSincronizado] = useState(null);

  const intervaloRef = useRef(null);

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
      const datos = await leerTickets(obtenerHandleTickets());

      // Normalizar cada ticket: asegurar Asignado A válido
      const ticketsNormalizados = datos.map((ticket) => ({
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
   * Sincroniza los tickets de la API con el archivo fuente local.
   * Reglas:
   *  - Si en la API viene un ticket que no existe en el archivo fuente → agregarlo.
   *  - Si en la API viene un ticket que ya existe y tiene cambios → actualizarlo.
   *  - Si en la API viene un ticket igual al del archivo fuente → no hacer nada.
   *  - Los tickets de la API con Estado === "terminado" no se muestran en la UI.
   *  - Los tickets locales activos que en la API pasaron a "terminado" se cierran
   *    automáticamente (se agregan al archivo de cerrados y se quitan del fuente).
   */
  const sincronizarConAPI = useCallback(async () => {
    if (!obtenerHandleTickets() || !obtenerHandleCerrados()) {
      setError('No se pueden sincronizar: selecciona ambos archivos (fuente y cerrados) primero.');
      return;
    }

    setSincronizando(true);
    setError(null);

    try {
      const ticketsAPI = await consultarAPI();

      // Filtrar tickets terminados de la API (no se visualizan en la UI)
      const ticketsActivosAPI = ticketsAPI.filter((t) => t.Estado !== 'terminado');

      // Trabajar sobre una copia de los tickets actuales
      let actualizados = [...tickets];
      let cambios = false;

      // 1. Procesar tickets activos de la API
      for (const ticketAPI of ticketsActivosAPI) {
        const existe = actualizados.find((t) => t.Codigo === ticketAPI.Codigo);

        if (!existe) {
          // Ticket nuevo de la API: agregarlo al archivo fuente
          const nuevo = {
            Codigo: ticketAPI.Codigo,
            Asunto: ticketAPI.Asunto,
            Tipo: ticketAPI.Tipo,
            Prioridad: ticketAPI.Prioridad || 'baja',
            Estado: ticketAPI.Estado,
            'Fecha de creacion': ticketAPI['Fecha de creacion'],
            'Hora de creacion': ticketAPI['Hora de creacion'],
            'Asignado A': ticketAPI['Asignado A'],
            Descripcion: '',
            Comentarios: [],
            Resaltado: false,
          };
          actualizados.push(nuevo);
          cambios = true;
        } else if (ticketsTienenCambios(existe, ticketAPI)) {
          // Ticket existente con cambios: actualizar campos de la API,
          // preservar campos de interfaz (Descripcion, Comentarios, Resaltado)
          const actualizado = {
            ...existe,
            Asunto: ticketAPI.Asunto,
            Tipo: ticketAPI.Tipo,
            Prioridad: ticketAPI.Prioridad || existe.Prioridad,
            Estado: ticketAPI.Estado,
            'Fecha de creacion': ticketAPI['Fecha de creacion'],
            'Hora de creacion': ticketAPI['Hora de creacion'],
            'Asignado A': ticketAPI['Asignado A'],
          };
          actualizados = actualizados.map((t) =>
            t.Codigo === ticketAPI.Codigo ? actualizado : t
          );
          cambios = true;
        }
        // Si es igual, no hacer nada
      }

      // 2. Detectar tickets locales que pasaron a "terminado" en la API
      const codigosTerminadosAPI = new Set(
        ticketsAPI
          .filter((t) => t.Estado === 'terminado')
          .map((t) => t.Codigo)
      );

      const ticketsParaCerrar = actualizados.filter((t) =>
        codigosTerminadosAPI.has(t.Codigo)
      );

      // Cerrar automáticamente los que pasaron a terminado
      for (const ticketCerrar of ticketsParaCerrar) {
        try {
          await agregarTicketCerrado(obtenerHandleCerrados(), {
            codigo: ticketCerrar.Codigo,
            asunto: ticketCerrar.Asunto,
            tipo: ticketCerrar.Tipo || 'Sin tipo',
          });
        } catch (err) {
          console.error('Error al cerrar automáticamente:', err.message);
        }
      }

      // Quitar los cerrados de la lista activa
      actualizados = actualizados.filter((t) => !codigosTerminadosAPI.has(t.Codigo));

      // 3. Guardar si hubo cambios
      if (cambios || ticketsParaCerrar.length > 0) {
        setTickets(actualizados);
        await persistir(actualizados);
      }

      setUltimoSincronizado(new Date().toISOString());
    } catch (err) {
      setError(err.message);
    } finally {
      setSincronizando(false);
    }
  }, [tickets, persistir, obtenerHandleTickets, obtenerHandleCerrados, agregarTicketCerrado]);

  /**
   * Inicia la sincronización automática cada minuto.
   * Se ejecuta inmediatamente una vez al iniciar.
   */
  const iniciarSincronizacionAutomatica = useCallback(() => {
    if (intervaloRef.current) return;
    // Ejecutar inmediatamente una vez
    sincronizarConAPI();
    // Luego cada minuto
    intervaloRef.current = setInterval(() => {
      sincronizarConAPI();
    }, 60000);
  }, [sincronizarConAPI]);

  /**
   * Detiene la sincronización automática.
   */
  const detenerSincronizacionAutomatica = useCallback(() => {
    if (intervaloRef.current) {
      clearInterval(intervaloRef.current);
      intervaloRef.current = null;
    }
  }, []);

  /**
   * Inicia o detiene la sincronización automática según si ambos archivos están listos.
   */
  useEffect(() => {
    if (archivoListo && archivoCerradosListo) {
      iniciarSincronizacionAutomatica();
    } else {
      detenerSincronizacionAutomatica();
    }
    return () => detenerSincronizacionAutomatica();
  }, [archivoListo, archivoCerradosListo, iniciarSincronizacionAutomatica, detenerSincronizacionAutomatica]);

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

  /**
   * Mueve un ticket a otra sección (Asignado A).
   */
  const moverTicket = useCallback(async (codigo, nuevaSeccionId) => {
    const asignadoAValido = obtenerSeccionValida(nuevaSeccionId);
    const actualizados = tickets.map((t) =>
      t.Codigo === codigo ? { ...t, 'Asignado A': asignadoAValido } : t
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
    busqueda,
    setBusqueda,
    archivoListo,
    archivoCerradosListo,
    error,
    sincronizando,
    ultimoSincronizado,
    puedeSincronizar: Boolean(archivoListo && archivoCerradosListo),

    seccionExpandida,
    setSeccionExpandida,
    PRIORIDADES,

    // Acciones
    inicializarArchivo,
    obtenerTicketsPorSeccion,
    sincronizarConAPI,
    iniciarSincronizacionAutomatica,
    detenerSincronizacionAutomatica,
    toggleAtencion,
    cambiarPrioridad,
    agregarComentario,
    editarDescripcion,
    abrirArchivoCerrados,
    crearNuevoArchivoCerrados,
    moverTicket,
    reordenarSecciones,
  };
}
