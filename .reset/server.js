require("dotenv").config();
const path = require("path");
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { createUser, findUserByEmail } = require("../db/database");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("Error: falta JWT_SECRET. Defínelo en el archivo .env (ver .env.example).");
  process.exit(1);
}
const PORT = process.env.PORT || 3000;
const ROUNDS = 10;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Hash de relleno para igualar tiempos cuando el usuario no existe
const DUMMY_HASH = bcrypt.hashSync("relleno-no-usar", ROUNDS);

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "10kb" }));

function validate(body) {
  const { email, password } = body || {};
  if (typeof email !== "string" || typeof password !== "string") {
    return { error: "email y password deben ser texto" };
  }
  const e = email.trim().toLowerCase();
  if (!EMAIL_RE.test(e) || e.length > 254) return { error: "Correo inválido" };
  if (password.length < 8 || password.length > 72) {
    return { error: "La contraseña debe tener entre 8 y 72 caracteres" };
  }
  return { email: e, password };
}

app.post("/api/register", async (req, res) => {
  const v = validate(req.body);
  if (v.error) return res.status(400).json({ error: v.error });
  try {
    const hash = await bcrypt.hash(v.password, ROUNDS);
    createUser(v.email, hash);
    res.status(201).json({ message: "Usuario registrado" });
  } catch (err) {
    if (err && (err.code === "SQLITE_CONSTRAINT_UNIQUE" || err.code === "SQLITE_CONSTRAINT")) {
      return res.status(409).json({ error: "El correo ya está registrado" });
    }
    console.error("Error en registro:", err.message);
    res.status(500).json({ error: "Error interno" });
  }
});

app.post("/api/login", async (req, res) => {
  const invalid = () => res.status(401).json({ error: "Credenciales inválidas" });
  const { email, password } = req.body || {};
  if (typeof email !== "string" || typeof password !== "string" || password.length > 72) {
    return invalid();
  }
  try {
    const user = findUserByEmail(email.trim().toLowerCase());
    const ok = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
    if (!user || !ok) return invalid();
    const token = jwt.sign({ sub: String(user.id), email: user.email }, JWT_SECRET, { expiresIn: "1h" });
    res.json({ token });
  } catch (err) {
    console.error("Error en login:", err.message);
    res.status(500).json({ error: "Error interno" });
  }
});

app.get("/api/me", (req, res) => {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || "");
  if (!m) return res.status(401).json({ error: "No autorizado" });
  try {
    const p = jwt.verify(m[1], JWT_SECRET, { algorithms: ["HS256"] });
    res.json({ email: p.email });
  } catch {
    res.status(401).json({ error: "No autorizado" });
  }
});

app.use(express.static(path.join(__dirname, "..", "frontend")));

app.use("/api", (req, res) => res.status(404).json({ error: "No encontrado" }));

// Errores (JSON mal formado, cuerpo demasiado grande, etc.)
app.use((err, req, res, next) => {
  const status = err.status >= 400 && err.status < 500 ? err.status : 500;
  res.status(status).json({ error: status === 500 ? "Error interno" : "Petición inválida" });
});

// Solo escucha un puerto si se ejecuta directo; las pruebas importan `app` sin levantar nada
if (require.main === module) {
  app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));
}

module.exports = app;
