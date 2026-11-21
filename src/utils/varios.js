//=========== Funciones de utilidad varias ==============================


// Copiar al portapapeles
export const copiarPortapapeles = async (texto, setToast) => {
  try {
    await navigator.clipboard.writeText(texto);
    setToast({ tipo: 'exito', mensaje: 'Copiado al portapapeles' });
    setTimeout(() => setToast(null), 2000);
  } catch (err) {
    setToast({ tipo: 'error', mensaje: `No se pudo copiar: ${err}` });
    setTimeout(() => setToast(null), 2000);
  }
};