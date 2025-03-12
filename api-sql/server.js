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
    .then(() => console.log("Conexión exitosa a SQL Server :3!"))
    .catch(err => console.error(" :( Error en la conexión a SQL Server:", err));

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
            .query(`
                SELECT u.id_usuario, u.nombre, u.correo, u.password_hash, r.id_rol 
                FROM Usuarios u
                INNER JOIN UsuarioRoles r ON u.id_usuario = r.id_usuario
                WHERE u.correo = @correo
            `);

        if (result.recordset.length === 0) {
            return res.status(400).json({ message: "Correo no registrado" });
        }

        let user = result.recordset[0];

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: "Contraseña incorrecta" });
        }

        
        res.json({
            message: "Inicio de sesión exitoso",
            user: {
                id_usuario: user.id_usuario,
                nombre: user.nombre,  
                correo: user.correo,
                id_rol: user.id_rol
            }
        });

    } catch (err) {
        console.error("Error en el servidor:", err);
        res.status(500).json({ message: "Error en el servidor", error: err.message });
    }
});

//Crear Reportes

app.post("/crearReporte", async (req, res) => {
    const { id_usuario, id_equipo, id_laboratorio, descripcion } = req.body;

    try {
        let pool = await sql.connect(dbConfig);
        await pool.request()
            .input("id_usuario", sql.Int, id_usuario)
            .input("id_equipo", sql.Int, id_equipo)
            .input("id_laboratorio", sql.Int, id_laboratorio)
            .input("descripcion", sql.NVarChar, descripcion)
            .input("fecha_hora", sql.DateTime, new Date()) // Fecha y hora actuales
            .input("estatus", sql.NVarChar, "Pendiente") // Estatus por defecto
            .query(`
                INSERT INTO Reportes (id_usuario, id_equipo, id_laboratorio, descripcion, fecha_hora, estatus) 
                VALUES (@id_usuario, @id_equipo, @id_laboratorio, @descripcion, @fecha_hora, @estatus)
            `);

        res.json({ message: "✅ Reporte creado exitosamente", estatus: "Pendiente" });
    } catch (err) {
        res.status(500).json({ message: "❌ Error en el servidor", error: err.message });
    }
});


//obtener equipos para verlos en el dropdown
app.get("/equipos", async (req, res) => {
    try {
        let pool = await sql.connect(dbConfig);
        let result = await pool.request().query("SELECT id_equipo, numero_equipo FROM Equipos");

        res.json(result.recordset); 
    } catch (err) {
        res.status(500).json({ message: "Error al obtener los equipos", error: err.message });
    }
});

//obtener laboratorios para verlos en el dropdown

app.get("/laboratorios", async (req, res) => {
    try {
        let pool = await sql.connect(dbConfig);
        let result = await pool.request().query("SELECT id_laboratorio, nombre_laboratorio FROM Laboratorios");

        res.json(result.recordset); 
    } catch (err) {
        res.status(500).json({ message: "Error al obtener los laboratorios", error: err.message });
    }
});

//Equipos segun el laboratorio
app.get("/equipos/:id_laboratorio", async (req, res) => {
    const { id_laboratorio } = req.params;

    try {
        let pool = await sql.connect(dbConfig);
        let result = await pool.request()
            .input("id_laboratorio", sql.Int, id_laboratorio)
            .query("SELECT id_equipo, numero_equipo FROM Equipos WHERE id_laboratorio = @id_laboratorio");

        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: "Error al obtener equipos", error: err.message });
    }
});

//Ver reportes
app.get("/reportes/:id_usuario", async (req, res) => {
    const { id_usuario } = req.params;

    try {
        let pool = await sql.connect(dbConfig);
        let result = await pool.request()
            .input("id_usuario", sql.Int, id_usuario)
            .query(`
                SELECT r.id_reporte, r.descripcion, r.fecha_hora, r.estatus, 
                       e.numero_equipo, l.nombre_laboratorio
                FROM Reportes r
                INNER JOIN Equipos e ON r.id_equipo = e.id_equipo
                INNER JOIN Laboratorios l ON r.id_laboratorio = l.id_laboratorio
                WHERE r.id_usuario = @id_usuario
                ORDER BY r.fecha_hora DESC
            `);

        res.json(result.recordset);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener reportes", error: error.message });
    }
});




const open = require("open");

// Iniciar el servidor
app.listen(PORT, async () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);

});

//PARA INICIAR EL SERVIDOR RUN EN TERMINAL node server.js
