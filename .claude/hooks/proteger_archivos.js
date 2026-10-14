// HOOK 1 · PreToolUse (Edit|Write)
// Bloquea modificar las pruebas, los secretos, el workflow de GitHub y la configuración de los propios hooks.
// Entrada (stdin): JSON con tool_input.file_path
// Salida: exit 0 → se permite  |  exit 2 → se BLOQUEA y el mensaje de stderr le llega a Claude
let entrada = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (trozo) => (entrada += trozo));
process.stdin.on("end", () => {
  const datos = JSON.parse(entrada || "{}");
  const ruta = String((datos.tool_input && datos.tool_input.file_path) || "").replace(/\\/g, "/");
  const nombre = ruta.split("/").pop();

  const bloquear = (motivo) => {
    console.error(`⛔ BLOQUEADO por hook: ${motivo}`);
    process.exit(2);
  };

  if (/(^|\/)tests\//.test(ruta)) {
    bloquear(
      `'${nombre}' es una prueba y las pruebas están protegidas. ` +
        "Las pruebas definen las reglas de negocio: si una falla, corrige el código, no la prueba.",
    );
  }
  if (nombre.startsWith(".env") && nombre !== ".env.example") {
    bloquear(`'${nombre}' contiene secretos y no se puede modificar.`);
  }
  if (/(^|\/)\.github\/workflows\//.test(ruta)) {
    bloquear(`'${nombre}' es el workflow de GitHub Actions. No se puede cambiar para esquivar las pruebas.`);
  }
  if (/(^|\/)\.claude\/(hooks\/|settings\.json$)/.test(ruta)) {
    bloquear(`'${nombre}' es parte de la configuración de los hooks y no se puede desactivar ni modificar.`);
  }
  process.exit(0);
});
