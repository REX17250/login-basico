// HOOK 4 · PostToolUse (*) + SubagentStop
// Registra en .claude/auditoria.log cada acción de Claude y cada subagente que termina.
// Responde a la pregunta: "¿qué hizo la IA en mi proyecto?"
const fs = require("node:fs");
const path = require("node:path");

let entrada = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (trozo) => (entrada += trozo));
process.stdin.on("end", () => {
  const datos = JSON.parse(entrada || "{}");
  const evento = datos.hook_event_name || "?";
  const herramienta = datos.tool_input || {};

  let accion;
  let detalle;
  if (evento === "SubagentStop") {
    accion = "SUBAGENTE terminó";
    detalle = datos.agent_type || datos.subagent_type || datos.agent_id || "";
  } else {
    accion = datos.tool_name || "?";
    detalle = herramienta.file_path || herramienta.command || herramienta.pattern || "";
  }

  const fecha = new Date().toLocaleString("sv-SE");
  const texto = String(detalle).replace(/\n/g, " ").slice(0, 120);
  const proyecto = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  fs.appendFileSync(path.join(proyecto, ".claude", "auditoria.log"), `${fecha} | ${accion.padEnd(18)} | ${texto}\n`);
  process.exit(0);
});
