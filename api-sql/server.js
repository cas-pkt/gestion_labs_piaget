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
app.post("/api/register", async (req, res) => {
    const { nombre, correo, password, id_laboratorio, id_rol } = req.body;

    try {
        let pool = await sql.connect(dbConfig);

        // 🔍 Verificar si el correo ya está registrado
        let checkUser = await pool.request()
            .input("correo", sql.NVarChar, correo)
            .query("SELECT id_usuario FROM Usuarios WHERE correo = @correo");

        if (checkUser.recordset.length > 0) {
            return res.status(400).json({ message: "❌ El correo ya está registrado. Usa otro correo." });
        }

        // 🔍 Verificar si el id_laboratorio existe en la tabla Laboratorios
        let checkLab = await pool.request()
            .input("id_laboratorio", sql.Int, id_laboratorio)
            .query("SELECT id_laboratorio FROM Laboratorios WHERE id_laboratorio = @id_laboratorio");

        if (checkLab.recordset.length === 0) {
            return res.status(400).json({ message: "❌ El laboratorio seleccionado no existe." });
        }

        // 🔒 Hashear la contraseña
        let hashedPassword = await bcrypt.hash(password, 10);

        // 📝 Insertar usuario
        let result = await pool.request()
            .input("nombre", sql.NVarChar, nombre)
            .input("correo", sql.NVarChar, correo)
            .input("password_hash", sql.NVarChar, hashedPassword)
            .input("id_laboratorio", sql.Int, id_laboratorio)
            .query(`
                INSERT INTO Usuarios (nombre, correo, password_hash, id_laboratorio) 
                OUTPUT INSERTED.id_usuario
                VALUES (@nombre, @correo, @password_hash, @id_laboratorio)
            `);

        const id_usuario = result.recordset[0].id_usuario;

        // 🔗 Insertar el rol en UsuarioRoles
        await pool.request()
            .input("id_usuario", sql.Int, id_usuario)
            .input("id_rol", sql.Int, id_rol)
            .query(`
                INSERT INTO UsuarioRoles (id_usuario, id_rol) 
                VALUES (@id_usuario, @id_rol)
            `);

        res.json({ message: `✅ Usuario registrado con éxito en el laboratorio ${id_laboratorio} y rol ${id_rol}` });

    } catch (err) {
        console.error("❌ Error en el registro:", err);
        res.status(500).json({ message: "Error al registrar usuario.", error: err.message });
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

//Main page del Admin
app.get("/gestionReportes.html", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "gestionReportes.html"));
});

// Obtener TODOS los reportes para el Administrador
app.get("/api/reportes", async (req, res) => {
    try {
        let pool = await sql.connect(dbConfig);
        let result = await pool.request().query(`
            SELECT r.id_reporte, r.descripcion, r.fecha_hora, r.estatus, 
                   e.numero_equipo, l.nombre_laboratorio
            FROM Reportes r
            INNER JOIN Equipos e ON r.id_equipo = e.id_equipo
            INNER JOIN Laboratorios l ON r.id_laboratorio = l.id_laboratorio
            ORDER BY r.fecha_hora DESC
        `);

        res.json(result.recordset);  // ✅ Devuelve JSON correctamente
    } catch (error) {
        console.error("❌ Error al obtener reportes:", error);
        res.status(500).json({ message: "Error al obtener reportes", error: error.message });
    }
});

// Actualizar el estado de un reporte
app.put("/api/reportes/:id", async (req, res) => {
    const { id } = req.params;
    const { estatus } = req.body;

    try {
        let pool = await sql.connect(dbConfig);
        await pool.request()
            .input("id", sql.Int, id)
            .input("estatus", sql.NVarChar, estatus)
            .query("UPDATE Reportes SET estatus = @estatus WHERE id_reporte = @id");

        res.json({ message: `✅ Reporte ${id} actualizado a '${estatus}'` });
    } catch (error) {
        res.status(500).json({ message: "Error al actualizar el estado", error: error.message });
    }
});

// Historial de reportes
app.get("/api/historialReportes", async (req, res) => {
    try {
        let pool = await sql.connect(dbConfig);
        let result = await pool.request().query(`
            SELECT r.id_reporte, e.numero_equipo, l.nombre_laboratorio, r.descripcion, r.fecha_hora, r.estatus
            FROM Reportes r
            INNER JOIN Equipos e ON r.id_equipo = e.id_equipo
            INNER JOIN Laboratorios l ON r.id_laboratorio = l.id_laboratorio
            ORDER BY r.fecha_hora DESC
        `);

        res.json(result.recordset);
    } catch (error) {
        console.error("❌ Error al obtener historial de reportes:", error);
        res.status(500).json({ message: "Error al obtener historial de reportes", error: error.message });
    }
});



import("open").then((open) => {
    open.default(`http://localhost:${PORT}`);
});


// Iniciar el servidor
app.listen(PORT, async () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);

});

//PARA INICIAR EL SERVIDOR RUN EN TERMINAL node server.js
