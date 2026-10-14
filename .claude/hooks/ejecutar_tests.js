// HOOK 3 · PostToolUse (Edit|Write)
// Después de CADA edición a un archivo .js del código (no a las pruebas) ejecuta las pruebas automáticamente.
// Si fallan → exit 2: el resultado le llega a Claude. Si pasan → aviso verde para el usuario.
const { spawnSync } = require("node:child_process");

let entrada = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (trozo) => (entrada += trozo));
process.stdin.on("end", () => {
  const datos = JSON.parse(entrada || "{}");
  const ruta = String((datos.tool_input && datos.tool_input.file_path) || "").replace(/\\/g, "/");
  if (!ruta.endsWith(".js") || /(^|\/)(tests|node_modules|\.claude)\//.test(ruta)) process.exit(0);

  const proyecto = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const resultado = spawnSync("npm test", { cwd: proyecto, shell: true, encoding: "utf8", timeout: 50_000 });
  const salida = `${resultado.stdout || ""}${resultado.stderr || ""}`;

  if (resultado.status !== 0) {
    console.error(
      "❌ El hook ejecutó las pruebas después de tu cambio y FALLARON.\n" +
        "Revisa el error y corrige el código (las pruebas no se pueden modificar):\n\n" +
        salida.slice(-3000),
    );
    process.exit(2);
  }

  const total = (salida.match(/ℹ tests (\d+)/) || [])[1] || "?";
  const aprobadas = (salida.match(/ℹ pass (\d+)/) || [])[1] || "?";
  console.log(JSON.stringify({ systemMessage: `✅ Hook de pruebas: ${aprobadas}/${total} pruebas → OK` }));
  process.exit(0);
});
