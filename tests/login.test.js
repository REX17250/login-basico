// Pruebas del login. Reglas: contraseña de 8 a 72 caracteres, correo único, error genérico en el login.
// Usan una base de datos temporal (DB_PATH), nunca la de desarrollo.
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const carpetaTemporal = fs.mkdtempSync(path.join(os.tmpdir(), "login-test-"));
process.env.DB_PATH = path.join(carpetaTemporal, "test.db");
process.env.JWT_SECRET = "secreto-solo-para-pruebas-0123456789";

const app = require("../backend/server");

let servidor;
let base;

before(async () => {
  servidor = app.listen(0);
  await new Promise((resolver) => servidor.once("listening", resolver));
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(() => {
  servidor.close();
  servidor.closeAllConnections();
  try {
    fs.rmSync(carpetaTemporal, { recursive: true, force: true });
  } catch {
    // en Windows el archivo puede seguir abierto; la carpeta es temporal
  }
});

const enviar = (ruta, cuerpo, cabeceras = {}) =>
  fetch(base + ruta, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...cabeceras },
    body: JSON.stringify(cuerpo),
  });

test("registro: un correo y una contraseña válidos crean la cuenta (201)", async () => {
  const res = await enviar("/api/register", { email: "ana@correo.com", password: "Clave1234" });
  assert.equal(res.status, 201);
});

test("registro: un correo repetido responde 409", async () => {
  const datos = { email: "repetido@correo.com", password: "Clave1234" };
  await enviar("/api/register", datos);
  const res = await enviar("/api/register", datos);
  assert.equal(res.status, 409);
});

test("login: credenciales correctas devuelven un token que abre /api/me", async () => {
  await enviar("/api/register", { email: "luis@correo.com", password: "Clave1234" });
  const login = await enviar("/api/login", { email: "luis@correo.com", password: "Clave1234" });
  assert.equal(login.status, 200);
  const { token } = await login.json();
  assert.ok(token, "el login debe devolver un token");

  const me = await fetch(base + "/api/me", { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(me.status, 200);
  assert.deepEqual(await me.json(), { email: "luis@correo.com" });
});

test("login: contraseña incorrecta y usuario inexistente dan el mismo 401 genérico", async () => {
  await enviar("/api/register", { email: "sofia@correo.com", password: "Clave1234" });
  const claveMala = await enviar("/api/login", { email: "sofia@correo.com", password: "OtraClave99" });
  const sinUsuario = await enviar("/api/login", { email: "nadie@correo.com", password: "Clave1234" });
  assert.equal(claveMala.status, 401);
  assert.equal(sinUsuario.status, 401);
  assert.deepEqual(await claveMala.json(), await sinUsuario.json());
});

test("registro: una contraseña de 7 caracteres se rechaza (400)", async () => {
  const res = await enviar("/api/register", { email: "corta@correo.com", password: "Abcd123" });
  assert.equal(res.status, 400);
});
