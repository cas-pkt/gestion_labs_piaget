require("dotenv").config();
const express = require("express");
const PORT = process.env.PORT || 3000;
const path = require("path");
const sql = require("mssql");
const cors = require("cors");
const app = express();
const bcrypt = require("bcrypt");

app.use(express.json());
app.use(cors());

// Middleware para servir archivos estáticos
app.use(express.static(path.join(__dirname, "public")));

// Ruta para abrir login.html
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Configuración de la base de datos
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER, 
    database: process.env.DB_NAME,
    options: {
        encrypt: true,
        trustServerCertificate: true,
    }
};

sql.connect(dbConfig)
    .then(() => console.log("✅ Conexión exitosa a SQL Server"))
    .catch(err => console.error("❌ Error en la conexión a SQL Server:", err));

// REGISTRAR
app.post("/register", async (req, res) => {
    const { nombre, correo, password, id_laboratorio, id_nivel } = req.body; 

    try {
        let hashedPassword = await bcrypt.hash(password, 10); // Hashear la contraseña mmkey

        let pool = await sql.connect(dbConfig);
        await pool.request()
            .input("nombre", sql.NVarChar, nombre)
            .input("correo", sql.NVarChar, correo)
            .input("password_hash", sql.NVarChar, hashedPassword)
            .input("id_laboratorio", sql.Int, id_laboratorio)
            .input("id_nivel", sql.Int, id_nivel)
            .query(`
                INSERT INTO Usuarios (nombre, correo, password_hash, id_laboratorio, id_nivel) 
                VALUES (@nombre, @correo, @password_hash, @id_laboratorio, @id_nivel)
            `);

        res.json({ message: "Usuario registrado exitosamente" });
    } catch (err) {
        res.status(500).json({ message: "Error en el servidor", error: err.message });
    }
});

//  Iniciar sesión
app.post("/login", async (req, res) => {
    const { correo, password } = req.body;
    try {
        let pool = await sql.connect(dbConfig);
        let result = await pool.request()
            .input("correo", sql.NVarChar, correo)
            .query("SELECT * FROM Usuarios WHERE correo = @correo");

        if (result.recordset.length === 0) {
            return res.status(400).json({ message: "Correo no registrado" });
        }

        let user = result.recordset[0];

        // Verificar la contraseña encriptada
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: "Contraseña incorrecta" });
        }
        res.json({
            message: "Inicio de sesión exitoso",
            user: {
                id_usuario: user.id_usuario,
                correo: user.correo
            }
        });

    } catch (err) {
        res.status(500).json({ message: "Error en el servidor", error: err.message });
    }
});

const open = require("open");

// Iniciar el servidor
app.listen(PORT, async () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);

});

//PARA INICIAR EL SERVIDOR RUN EN TERMINAL node server.js
