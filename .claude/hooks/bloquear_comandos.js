// HOOK 2 · PreToolUse (Bash|PowerShell)
// Bloquea comandos peligrosos antes de que se ejecuten.
// Entrada (stdin): JSON con tool_input.command
// Salida: exit 0 → se permite  |  exit 2 → se BLOQUEA y el mensaje de stderr le llega a Claude
const PELIGROSOS = [
  [/\brm\s+-[a-z]*r[a-z]*f|\brm\s+-[a-z]*f[a-z]*r/i, "borrado recursivo forzado (rm -rf)"],
  [/Remove-Item\b.*-Recurse/i, "borrado recursivo en PowerShell"],
  [/git\s+push\b.*(--force|-f\b)/i, "git push --force (reescribe la historia del equipo)"],
  [/git\s+reset\s+--hard/i, "git reset --hard (pierde cambios sin confirmar)"],
  [/DROP\s+(TABLE|DATABASE)/i, "eliminar tablas o bases de datos"],
  [/\bdel\s+\/[sq]/i, "borrado masivo en Windows"],
];

let entrada = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (trozo) => (entrada += trozo));
process.stdin.on("end", () => {
  const datos = JSON.parse(entrada || "{}");
  const comando = String((datos.tool_input && datos.tool_input.command) || "");

  for (const [patron, motivo] of PELIGROSOS) {
    if (patron.test(comando)) {
      console.error(
        `⛔ BLOQUEADO por hook: ${motivo}.\nComando: ${comando}\n` +
          "Si de verdad es necesario, pide al usuario que lo ejecute manualmente.",
      );
      process.exit(2);
    }
  }
  process.exit(0);
});
