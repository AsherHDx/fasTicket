/**
 * Componente TEMPORAL para probar la Fase 2 (persistencia con File System Access API).
 * No es parte de la interfaz final; sirve para validar lectura/escritura de archivos .txt.
 */
import { useState } from 'react';
import {
  seleccionarArchivoTickets,
  obtenerHandleTickets,
  leerTickets,
  guardarTickets,
  abrirArchivoCerradosExistente,
  crearArchivoCerrados,
  obtenerHandleCerrados,
  agregarTicketCerrado,
} from './services/fileService.js';
import { crearTicket } from './types/index.js';
import { validarTicketCompleto } from './utils/validaciones.js';
import { obtenerEtiquetaSemanaActual } from './utils/fechas.js';

export default function TestFase2() {
  const [tickets, setTickets] = useState([]);
  const [mensaje, setMensaje] = useState('');
  const [cerrados, setCerrados] = useState([]);

  const log = (texto) => {
    setMensaje((prev) => prev + '\n' + texto);
    console.log(texto);
  };

  const manejarSeleccionarTickets = async () => {
    try {
      await seleccionarArchivoTickets();
      const datos = await leerTickets(obtenerHandleTickets());
      setTickets(datos);
      log(`✅ Se leyeron ${datos.length} tickets del archivo.`);
    } catch (error) {
      log(`❌ Error al seleccionar/leer: ${error.message}`);
    }
  };

  const manejarAgregarTicketPrueba = async () => {
    if (!obtenerHandleTickets()) {
      log('❌ Primero selecciona un archivo de tickets.');
      return;
    }

    const nuevo = crearTicket({
      id: `TEST-${Date.now()}`,
      titulo: 'Ticket de prueba',
      descripcion: 'Descripción de prueba',
      url: 'https://sistema.com/ticket-prueba',
      prioridad: 'Media',
      tipo: 'Incidencia',
      seccionId: 'seccion-1',
    });

    const validacion = validarTicketCompleto(nuevo, tickets);
    if (!validacion.valido) {
      log(`❌ Ticket inválido: ${validacion.errores.join(', ')}`);
      return;
    }

    const ticketsActualizados = [...tickets, nuevo];
    setTickets(ticketsActualizados);

    try {
      await guardarTickets(obtenerHandleTickets(), ticketsActualizados);
      log(`✅ Ticket guardado automáticamente en archivo: ${nuevo.id}`);
    } catch (error) {
      log(`❌ Error al guardar automáticamente: ${error.message}`);
    }
  };

  const manejarAbrirArchivoCerradosExistente = async () => {
    try {
      await abrirArchivoCerradosExistente();
      log(`✅ Archivo de cerrados existente abierto.`);
    } catch (error) {
      log(`❌ Error al abrir archivo de cerrados: ${error.message}`);
    }
  };

  const manejarCrearArchivoCerrados = async () => {
    try {
      const nombre = obtenerEtiquetaSemanaActual();
      await crearArchivoCerrados(nombre);
      log(`✅ Archivo de cerrados creado: ${nombre}`);
    } catch (error) {
      log(`❌ Error al crear archivo de cerrados: ${error.message}`);
    }
  };

  const manejarCerrarTicketPrueba = async () => {
    if (!obtenerHandleCerrados()) {
      log('❌ Primero crea/selecciona el archivo de cerrados.');
      return;
    }

    const ticketParaCerrar = tickets[0];
    if (!ticketParaCerrar) {
      log('❌ No hay tickets para cerrar.');
      return;
    }

    const cerrado = {
      url: ticketParaCerrar.url,
      titulo: ticketParaCerrar.titulo,
      id: ticketParaCerrar.id,
      tipo: ticketParaCerrar.tipo,
    };

    try {
      await agregarTicketCerrado(obtenerHandleCerrados(), cerrado);
      setCerrados([...cerrados, cerrado]);
      log(`✅ Ticket cerrado agregado al archivo semanal: ${cerrado.id}`);
    } catch (error) {
      log(`❌ Error al cerrar ticket: ${error.message}`);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '700px' }}>
      <h2>🧪 Prueba Fase 2 - Persistencia de archivos</h2>

      <h3>1. Archivo de tickets activos</h3>
      <button onClick={manejarSeleccionarTickets}>
        📁 Seleccionar tickets.txt
      </button>

      <button onClick={manejarAgregarTicketPrueba} disabled={!obtenerHandleTickets()}>
        ➕ Agregar ticket de prueba (se guarda automáticamente)
      </button>

      <p>Tickets en memoria: {tickets.length}</p>
      {tickets.map((t) => (
        <div key={t.id} style={{ marginBottom: '4px', fontSize: '12px' }}>
          {t.id} - {t.titulo} ({t.tipo})
        </div>
      ))}

      <h3>2. Archivo de tickets cerrados (semanal)</h3>
      <button onClick={manejarAbrirArchivoCerradosExistente} disabled={!!obtenerHandleCerrados()}>
        📂 Abrir archivo de cerrados existente
      </button>

      <button onClick={manejarCrearArchivoCerrados} disabled={!!obtenerHandleCerrados()}>
        📄 Crear archivo de cerrados nuevo
      </button>

      <button onClick={manejarCerrarTicketPrueba} disabled={!obtenerHandleCerrados() || tickets.length === 0}>
        🔒 Cerrar primer ticket (se actualiza el archivo automáticamente)
      </button>

      <p>Tickets cerrados esta sesión: {cerrados.length}</p>

      <h3>📋 Log</h3>
      <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px', overflow: 'auto', maxHeight: '200px' }}>
        {mensaje}
      </pre>

      <p style={{ fontSize: '12px', color: '#666', marginTop: '20px' }}>
        ⚠️ Este componente es solo para pruebas. Abre la consola del navegador (F12) para ver los logs detallados.
      </p>
    </div>
  );
}
