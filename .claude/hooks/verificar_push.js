// HOOK 2b · PreToolUse (Bash|PowerShell)
// Antes de un `git push` ejecuta las pruebas. Si fallan, el push se BLOQUEA (exit 2) y Claude recibe el reporte.
// No ejecuta Git ni modifica archivos: solo corre `npm test`.
const { spawnSync } = require("node:child_process");

// ¿Algún tramo del comando es un `git push`? (admite git.exe y opciones como `git -C ruta push`)
const ESPUSH = /^\s*git(?:\.exe)?(?:\s+(?:-C|-c)\s+\S+|\s+--[\w-]+(?:=\S+)?)*\s+push\b/i;

let entrada = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (trozo) => (entrada += trozo));
process.stdin.on("end", () => {
  const datos = JSON.parse(entrada || "{}");
  const comando = String((datos.tool_input && datos.tool_input.command) || "");
  if (!comando.split(/&&|\|\||;|\||\r?\n/).some((tramo) => ESPUSH.test(tramo))) process.exit(0);

  const proyecto = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const resultado = spawnSync("npm test", { cwd: proyecto, shell: true, encoding: "utf8", timeout: 50_000 });
  const salida = `${resultado.stdout || ""}${resultado.stderr || ""}`;

  const hayPruebas = /ℹ tests [1-9]\d*/.test(salida);
  if (resultado.status !== 0 || !hayPruebas) {
    console.error(
      "⛔ PUSH BLOQUEADO por hook: las pruebas fallaron o no se encontraron pruebas.\n" +
        "Corrige el código SIN modificar los tests, ejecuta `npm test` hasta que pasen, " +
        "haz un commit con la corrección y reintenta el push.\n\n" +
        salida.slice(-3000),
    );
    process.exit(2);
  }

  console.log(JSON.stringify({ systemMessage: "✅ Hook previo al push: pruebas aprobadas, se permite continuar." }));
  process.exit(0);
});
