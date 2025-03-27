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

app.get("/api/niveles", async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
            SELECT id_nivel, nombre_nivel FROM Niveles ORDER BY id_nivel ASC
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: "Error al obtener niveles", error: err.message });
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

// ✅ Agregar nuevo equipo a un laboratorio
app.post("/api/equipos", async (req, res) => {
    try {
        const { numero_equipo, id_laboratorio, estado } = req.body;

        // Validación básica
        if (!numero_equipo || !id_laboratorio) {
            return res.status(400).json({ message: "⚠️ Todos los campos son obligatorios (excepto estado)." });
        }

        let pool = await sql.connect(dbConfig);

        await pool.request()
            .input("numero_equipo", sql.NVarChar, numero_equipo)
            .input("id_laboratorio", sql.Int, id_laboratorio)
            .input("estado", sql.NVarChar, estado || "Desconocido") // Si no mandas estado, pone "Desconocido"
            .query(`
                INSERT INTO Equipos (numero_equipo, id_laboratorio, estado)
                VALUES (@numero_equipo, @id_laboratorio, @estado)
            `);

        res.status(201).json({ message: "✅ Equipo agregado exitosamente." });
    } catch (err) {
        console.error("❌ Error al agregar equipo:", err);
        res.status(500).json({ message: "Error interno del servidor", error: err.message });
    }
});

app.put("/api/equipos/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { numero_equipo } = req.body;

        if (!numero_equipo) {
            return res.status(400).json({ message: "El nombre del equipo es obligatorio" });
        }

        let pool = await sql.connect(dbConfig);
        await pool.request()
            .input("id_equipo", sql.Int, id)
            .input("numero_equipo", sql.NVarChar, numero_equipo)
            .query(`
                UPDATE Equipos 
                SET numero_equipo = @numero_equipo 
                WHERE id_equipo = @id_equipo
            `);

        res.json({ message: "✅ Nombre del equipo actualizado correctamente" });
    } catch (err) {
        res.status(500).json({ message: "❌ Error al actualizar nombre del equipo", error: err.message });
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

//reportes por id de equipo
app.get("/api/reportesPorEquipo/:id_equipo", async (req, res) => {
    const { id_equipo } = req.params;
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input("id_equipo", sql.Int, id_equipo)
            .query(`
                SELECT id_reporte, descripcion, fecha_hora, estatus, observaciones
                FROM Reportes 
                WHERE id_equipo = @id_equipo
                ORDER BY fecha_hora DESC
            `);

        res.json(result.recordset);
    } catch (err) {
        console.error("❌ Error al obtener reportes del equipo:", err);
        res.status(500).json({ message: "Error al obtener reportes del equipo", error: err.message });
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

app.get("/api/reportes/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input("id", sql.Int, id)
            .query(`
                SELECT r.*, e.numero_equipo, l.nombre_laboratorio, u.nombre AS nombre_usuario
                FROM Reportes r
                JOIN Equipos e ON r.id_equipo = e.id_equipo
                JOIN Laboratorios l ON r.id_laboratorio = l.id_laboratorio
                JOIN Usuarios u ON r.id_usuario = u.id_usuario
                WHERE r.id_reporte = @id
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: "Reporte no encontrado" });
        }

        res.json(result.recordset[0]);
    } catch (err) {
        console.error("❌ Error al obtener reporte:", err);
        res.status(500).json({ message: "Error al obtener reporte", error: err.message });
    }
});

// Actualizar el estado de un reporte
app.put("/api/reportes/:id", async (req, res) => {
    const { id } = req.params;
    const { estatus, observaciones } = req.body;

    try {
        const pool = await sql.connect(dbConfig);

        // Obtener id_usuario del reporte
        const usuarioResult = await pool.request()
            .input("id", sql.Int, id)
            .query("SELECT id_usuario FROM Reportes WHERE id_reporte = @id");

        const id_usuario = usuarioResult.recordset[0]?.id_usuario;

        // Actualizar el reporte
        await pool.request()
            .input("id", sql.Int, id)
            .input("estatus", sql.NVarChar, estatus)
            .input("observaciones", sql.NVarChar, observaciones || null)
            .query("UPDATE Reportes SET estatus = @estatus, observaciones = @observaciones WHERE id_reporte = @id");

        // Insertar notificación para el usuario
        if (id_usuario) {
            const mensaje = `El estado de tu reporte #${id} ha sido actualizado a: ${estatus}`;
            await pool.request()
                .input("id_usuario", sql.Int, id_usuario)
                .input("mensaje", sql.NVarChar, mensaje)
                .query("INSERT INTO Notificaciones (id_usuario, mensaje) VALUES (@id_usuario, @mensaje)");
        }

        // Notificación general para admins (usuario 0 por ejemplo)
        await pool.request()
            .input("id_usuario", sql.Int, 0)
            .input("mensaje", sql.NVarChar, `Se actualizó el reporte #${id} a: ${estatus}`)
            .query("INSERT INTO Notificaciones (id_usuario, mensaje) VALUES (@id_usuario, @mensaje)");

        res.json({ message: "✅ Reporte actualizado correctamente" });

    } catch (error) {
        console.error("❌ Error al actualizar reporte:", error);
        res.status(500).json({ message: "❌ Error al actualizar reporte", error: error.message });
    }
});


// 👉 Agregar o actualizar la observación de un reporte
app.put("/api/reportes/:id/observaciones", async (req, res) => {
    const { id } = req.params;
    const { observaciones } = req.body;

    if (!observaciones || observaciones.trim() === "") {
        return res.status(400).json({ message: "La observación no puede estar vacía." });
    }

    try {
        let pool = await sql.connect(dbConfig);
        await pool.request()
            .input("id", sql.Int, id)
            .input("observaciones", sql.NVarChar, observacioneses)
            .query("UPDATE Reportes SET observacioneses = @observacioneses WHERE id_reporte = @id");

        res.json({ message: "✅ Observación guardada correctamente." });
    } catch (error) {
        console.error("❌ Error al guardar observación:", error);
        res.status(500).json({ message: "Error al guardar observación", error: error.message });
    }
});


// Historial de reportes
app.get("/api/historialReportes", async (req, res) => {
    try {
        let pool = await sql.connect(dbConfig);
        let result = await pool.request().query(`
            SELECT 
                r.id_reporte,
                e.numero_equipo,
                l.nombre_laboratorio,
                r.descripcion,
                r.fecha_hora,
                r.estatus,
                r.observaciones,
                u.nombre,
                n.nombre_nivel AS nivel_usuario
            FROM Reportes r
            INNER JOIN Equipos e ON r.id_equipo = e.id_equipo
            INNER JOIN Laboratorios l ON r.id_laboratorio = l.id_laboratorio
            LEFT JOIN Usuarios u ON r.id_usuario = u.id_usuario
            LEFT JOIN Niveles n ON u.id_nivel = n.id_nivel
            ORDER BY r.fecha_hora DESC
        `);

        res.json(result.recordset);
    } catch (error) {
        console.error("❌ Error al obtener historial de reportes:", error);
        res.status(500).json({ message: "Error al obtener historial de reportes", error: error.message });
    }
});

// Obtener usuarios
app.get("/api/usuarios", async (req, res) => {
    try {
        let pool = await sql.connect(dbConfig);
        let result = await pool.request().query(`
            SELECT 
                u.id_usuario, 
                u.nombre, 
                u.correo,
                l.nombre_laboratorio AS laboratorio,
                n.nombre_nivel AS nivel,
                r.nombre_rol AS rol
            FROM Usuarios u
            LEFT JOIN Laboratorios l ON u.id_laboratorio = l.id_laboratorio
            LEFT JOIN Niveles n ON u.id_nivel = n.id_nivel
            LEFT JOIN UsuarioRoles ur ON u.id_usuario = ur.id_usuario
            LEFT JOIN Roles r ON ur.id_rol = r.id_rol
        `);

        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: "Error al obtener los usuarios", error: err.message });
    }
});

app.get("/api/usuarios/:id", async (req, res) => {
    try {
        const { id } = req.params;
        let pool = await sql.connect(dbConfig);
        let result = await pool.request()
            .input("id", sql.Int, id)
            .query(`
                SELECT u.id_usuario, u.nombre, u.correo, 
                    l.nombre_laboratorio AS laboratorio, 
                    n.nombre_nivel AS nivel,   -- ⚠️ Aquí cambiamos 'nivel' por 'nombre_nivel'
                    r.nombre_rol AS rol
                FROM Usuarios u
                LEFT JOIN Laboratorios l ON u.id_laboratorio = l.id_laboratorio
                LEFT JOIN Niveles n ON u.id_nivel = n.id_nivel  -- ⚠️ Esto obtiene 'nombre_nivel'
                LEFT JOIN UsuarioRoles ur ON u.id_usuario = ur.id_usuario
                LEFT JOIN Roles r ON ur.id_rol = r.id_rol
                WHERE u.id_usuario = @id
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        res.json(result.recordset[0]);  // 🔥 Enviamos el usuario con el nivel correcto
    } catch (err) {
        console.error("❌ Error al obtener el usuario:", err);
        res.status(500).json({ message: "Error al obtener el usuario", error: err.message });
    }
});

//Agregar un usuario
app.post("/api/usuarios", async (req, res) => {
    try {
        console.log("📩 Recibiendo datos:", req.body);
        const { nombre, correo, laboratorio, nivel, rol } = req.body;

        if (!nombre || !correo || !laboratorio || !nivel || !rol) {
            return res.status(400).json({ message: "Todos los campos son obligatorios" });
        }

        // Validar datos
        if (isNaN(nivel) || nivel < 1 || nivel > 9) {
            return res.status(400).json({ message: "El nivel debe estar entre 1 y 9" });
        }

        if (isNaN(rol) || ![1, 2].includes(parseInt(rol))) {
            return res.status(400).json({ message: "El rol debe ser 1 (Usuario) o 2 (Administrador)" });
        }

        const pool = await sql.connect(dbConfig);

        // Verificar si el correo ya existe
        const checkCorreo = await pool.request()
            .input("correo", sql.NVarChar, correo)
            .query("SELECT * FROM Usuarios WHERE correo = @correo");

        if (checkCorreo.recordset.length > 0) {
            return res.status(400).json({ message: "❌ Este correo ya está registrado" });
        }

        // 🔐 Generar contraseña temporal y hashearla
        const passwordTemporal = "Temp1234";
        const passwordHash = await bcrypt.hash(passwordTemporal, 10);

        // 📝 Insertar usuario
        const result = await pool.request()
            .input("nombre", sql.NVarChar, nombre)
            .input("correo", sql.NVarChar, correo)
            .input("password_hash", sql.NVarChar, passwordHash)
            .input("id_laboratorio", sql.Int, laboratorio)
            .input("id_nivel", sql.Int, nivel)
            .query(`
                INSERT INTO Usuarios (nombre, correo, password_hash, id_laboratorio, id_nivel)
                OUTPUT INSERTED.id_usuario
                VALUES (@nombre, @correo, @password_hash, @id_laboratorio, @id_nivel)
            `);

        const id_usuario = result.recordset[0].id_usuario;

        // Rol
        await pool.request()
            .input("id_usuario", sql.Int, id_usuario)
            .input("id_rol", sql.Int, rol)
            .query("INSERT INTO UsuarioRoles (id_usuario, id_rol) VALUES (@id_usuario, @id_rol)");

        res.status(201).json({
            message: "✅ Usuario creado exitosamente",
            password_temporal: passwordTemporal
        });

    } catch (err) {
        console.error("❌ Error al agregar usuario:", err.message);
        res.status(500).json({ message: "Error interno del servidor", error: err.message });
    }
});

// 🔔 Obtener notificaciones por usuario
app.get("/api/notificaciones/:id_usuario", async (req, res) => {
    const { id_usuario } = req.params;
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input("id_usuario", sql.Int, id_usuario)
            .query(`
                SELECT id_notificacion, mensaje, fecha, leida
                FROM Notificaciones
                WHERE (id_usuario = @id_usuario OR id_usuario = 0)
                ORDER BY fecha DESC
            `);
        res.json(result.recordset);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener notificaciones", error: error.message });
    }
});

app.put("/api/notificaciones/:id/leida", async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input("id", sql.Int, id)
            .query("UPDATE Notificaciones SET leida = 1 WHERE id_notificacion = @id");

        res.json({ message: "✅ Notificación marcada como leída" });
    } catch (err) {
        console.error("❌ Error al marcar como leída:", err);
        res.status(500).json({ message: "Error al actualizar notificación", error: err.message });
    }
});


app.delete("/api/notificaciones/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input("id", sql.Int, id)
            .query("DELETE FROM Notificaciones WHERE id_notificacion = @id");

        res.json({ message: "🗑️ Notificación eliminada correctamente" });
    } catch (err) {
        console.error("❌ Error al eliminar notificación:", err);
        res.status(500).json({ message: "Error al eliminar notificación", error: err.message });
    }
});



app.post("/api/recuperar-password", async (req, res) => {
    const { correo } = req.body;

    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input("correo", sql.VarChar, correo)
            .query("SELECT id_usuario FROM Usuarios WHERE correo = @correo");

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: "Correo no encontrado" });
        }

        // Aquí puedes generar un token temporal (por simplicidad usamos uno fijo)
        const token = Math.random().toString(36).substr(2, 8);

        // Aquí puedes guardar el token en BD (tabla tokens_recuperacion por ejemplo)

        // Simulación de envío de correo (o usar nodemailer)
        console.log(`🔐 Token para ${correo}: ${token}`);

        res.json({ message: "Correo de recuperación enviado. (simulado)" });
    } catch (err) {
        res.status(500).json({ message: "Error interno", error: err.message });
    }
});


// Actualizar un usuario
app.put("/api/usuarios/:id", async (req, res) => {
    try {
        const { id } = req.params;
        let { nombre, correo, laboratorio, nivel, rol } = req.body;

        laboratorio = laboratorio ? parseInt(laboratorio) : null;
        nivel = nivel ? parseInt(nivel) : null;
        rol = rol ? parseInt(rol) : null;

        if (!nombre || !correo || !laboratorio || !nivel || !rol) {
            return res.status(400).json({ message: "Todos los campos son obligatorios" });
        }

        if (isNaN(nivel) || nivel < 1 || nivel > 9) {
            return res.status(400).json({ message: "El nivel debe estar entre 1 y 9" });
        }

        if (isNaN(rol) || ![1, 2].includes(rol)) {
            return res.status(400).json({ message: "El rol debe ser 1 (Usuario) o 2 (Administrador)" });
        }

        let pool = await sql.connect(dbConfig);

        let result = await pool.request()
            .input("id", sql.Int, id)
            .input("nombre", sql.NVarChar, nombre)
            .input("correo", sql.NVarChar, correo)
            .input("id_laboratorio", sql.Int, laboratorio)
            .input("id_nivel", sql.Int, nivel)
            .query(`
                UPDATE Usuarios 
                SET nombre = @nombre, correo = @correo, id_laboratorio = @id_laboratorio, id_nivel = @id_nivel
                WHERE id_usuario = @id
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: "Usuario no encontrado." });
        }

        let checkRole = await pool.request()
            .input("id_usuario", sql.Int, id)
            .query("SELECT id_rol FROM UsuarioRoles WHERE id_usuario = @id_usuario");

        if (checkRole.recordset.length > 0) {
            await pool.request()
                .input("id_usuario", sql.Int, id)
                .input("id_rol", sql.Int, rol)
                .query("UPDATE UsuarioRoles SET id_rol = @id_rol WHERE id_usuario = @id_usuario");
        } else {
            await pool.request()
                .input("id_usuario", sql.Int, id)
                .input("id_rol", sql.Int, rol)
                .query("INSERT INTO UsuarioRoles (id_usuario, id_rol) VALUES (@id_usuario, @id_rol)");
        }

        res.json({ message: "✅ Usuario actualizado correctamente" });

    } catch (err) {
        console.error("❌ Error al actualizar usuario:", err.message);
        res.status(500).json({ message: "❌ Error al actualizar el usuario", error: err.message });
    }
});

// Eliminar un usuario
app.delete("/api/usuarios/:id", async (req, res) => {
    try {
        const { id } = req.params;

        let pool = await sql.connect(dbConfig);

        // Primero eliminamos el rol del usuario en UsuarioRoles
        await pool.request()
            .input("id_usuario", sql.Int, id)
            .query("DELETE FROM UsuarioRoles WHERE id_usuario = @id_usuario");

        // Luego eliminamos al usuario en Usuarios
        let result = await pool.request()
            .input("id", sql.Int, id)
            .query("DELETE FROM Usuarios WHERE id_usuario = @id");

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        res.json({ message: "✅ Usuario eliminado correctamente" });
    } catch (err) {
        res.status(500).json({ message: "❌ Error al eliminar el usuario", error: err.message });
    }
});

// Obtener lista de laboratorios
app.get("/api/laboratorios", async (req, res) => {
    try {
        let pool = await sql.connect(dbConfig);
        let result = await pool.request().query("SELECT id_laboratorio, nombre_laboratorio, id_nivel FROM Laboratorios");

        // Asegurar que el JSON usa claves correctas
        const laboratorios = result.recordset.map(lab => ({
            id_laboratorio: lab.id_laboratorio,  // 👈 Ajustar el nombre de clave
            nombre_laboratorio: lab.nombre_laboratorio,
            id_nivel: lab.id_nivel
        }));

        res.json(laboratorios);
    } catch (err) {
        res.status(500).json({ message: "Error al obtener laboratorios", error: err.message });
    }
});

// 👉 Obtener todos los laboratorios con su nivel
app.get("/api/laboratorios", async (req, res) => {
    try {
        let pool = await sql.connect(dbConfig);
        let result = await pool.request().query("SELECT id_laboratorio, nombre_laboratorio, id_nivel FROM Laboratorios");

        res.json(result.recordset); // 👈 Aquí se envían los datos al frontend
    } catch (err) {
        console.error("❌ Error al obtener laboratorios:", err);
        res.status(500).json({ message: "Error al obtener laboratorios", error: err.message });
    }
});

app.get('/api/roles', async (req, res) => {
    try {
        let pool = await sql.connect(dbConfig);  // Aseguramos que se usa sql.connect correctamente
        let result = await pool.request().query("SELECT id_rol, nombre_rol FROM Roles");

        res.json(result.recordset);  // Devuelve la lista de roles correctamente
    } catch (error) {
        console.error("❌ Error al obtener roles:", error);
        res.status(500).json({ message: "Error al obtener roles", error: error.message });
    }
});

app.get("/api/laboratorios/:id/equipos", async (req, res) => {
    const { id } = req.params;

    if (!id || isNaN(id)) {
        return res.status(400).json({ message: "ID de laboratorio no válido" });
    }

    try {
        const pool = await sql.connect(dbConfig);

        // Obtener todos los equipos del laboratorio
        const equiposResult = await pool.request()
            .input("id_laboratorio", sql.Int, id)
            .query("SELECT id_equipo, numero_equipo FROM Equipos WHERE id_laboratorio = @id_laboratorio");

        const equipos = equiposResult.recordset;

        // Recorremos cada equipo y buscamos su último estado desde Reportes
        for (let equipo of equipos) {
            const estadoResult = await pool.request()
                .input("id_equipo", sql.Int, equipo.id_equipo)
                .query(`
                    SELECT TOP 1 estatus 
                    FROM Reportes 
                    WHERE id_equipo = @id_equipo 
                    ORDER BY fecha_hora DESC
                `);

            equipo.estado = estadoResult.recordset.length > 0
                ? estadoResult.recordset[0].estatus
                : "Sin reportes";
        }

        res.json(equipos);
    } catch (error) {
        console.error("❌ Error al obtener equipos con estados:", error);
        res.status(500).json({ message: "Error al obtener equipos", error: error.message });
    }
});


app.get("/api/reportesPorEquipo/:id_equipo", async (req, res) => {
    const { id_equipo } = req.params;
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input("id_equipo", sql.Int, id_equipo)
            .query(`
                SELECT id_reporte, descripcion, fecha_hora, estatus, observaciones
                FROM Reportes 
                WHERE id_equipo = @id_equipo
                ORDER BY fecha_hora DESC
            `);

        res.json(result.recordset);
    } catch (err) {
        console.error("❌ Error al obtener reportes del equipo:", err);
        res.status(500).json({ message: "Error al obtener reportes del equipo", error: err.message });
    }
});

app.post("/api/laboratorios", async (req, res) => {
    try {
        const { nombre_laboratorio, id_nivel } = req.body;

        if (!nombre_laboratorio || !id_nivel) {
            return res.status(400).json({ message: "⚠️ Todos los campos son obligatorios." });
        }

        let pool = await sql.connect(dbConfig);
        let result = await pool.request()
            .input("nombre_laboratorio", sql.NVarChar, nombre_laboratorio)
            .input("id_nivel", sql.Int, id_nivel)
            .query("INSERT INTO Laboratorios (nombre_laboratorio, id_nivel) VALUES (@nombre_laboratorio, @id_nivel)");

        res.json({ message: "✅ Laboratorio agregado exitosamente." });
    } catch (err) {
        console.error("❌ Error al agregar laboratorio:", err);
        res.status(500).json({ message: "Error en el servidor", error: err.message });
    }
});

// Actualizar un laboratorio
app.put("/api/laboratorios/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, nivel } = req.body;

        if (!nombre || !nivel) {
            return res.status(400).json({ message: "Nombre y nivel son obligatorios." });
        }

        let pool = await sql.connect(dbConfig);
        let result = await pool.request()
            .input("id", sql.Int, id)
            .input("nombre", sql.NVarChar, nombre)
            .input("nivel", sql.Int, nivel)
            .query("UPDATE Laboratorios SET nombre = @nombre, nivel = @nivel WHERE id_laboratorio = @id");

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: "Laboratorio no encontrado." });
        }

        res.json({ message: "Laboratorio actualizado correctamente" });

    } catch (err) {
        res.status(500).json({ message: "Error al actualizar laboratorio", error: err.message });
    }
});

// Eliminar un laboratorio
app.delete("/api/laboratorios/:id", async (req, res) => {
    try {
        const { id } = req.params;
        let pool = await sql.connect(dbConfig);

        await pool.request()
            .input("id", sql.Int, id)
            .query("DELETE FROM Laboratorios WHERE id_laboratorio = @id");

        res.json({ message: "Laboratorio eliminado correctamente" });
    } catch (error) {
        console.error("❌ Error al eliminar laboratorio:", error);
        res.status(500).json({ message: "No se pudo eliminar", error: error.message });
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
