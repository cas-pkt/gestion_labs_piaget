// 🔹 GESTIÓN DE USUARIOS Y LABORATORIOS (gestionUsuarios.js)

document.addEventListener("DOMContentLoaded", async function () {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    document.getElementById("userName").textContent = user.nombre;
    document.getElementById("userBoxName").textContent = user.nombre;
    document.getElementById("userEmail").textContent = user.correo;
    document.getElementById("btnLimpiarFiltros").addEventListener("click", () => {
        document.getElementById("filtroUsuario").value = "";
        document.getElementById("filtroLaboratorio").value = "";
        document.getElementById("filtroNivel").value = "";
        document.getElementById("filtroRol").value = "";
        aplicarFiltros();
    });


    const listaUsuarios = document.getElementById("listaUsuarios");
    const btnAgregarUsuario = document.getElementById("btnAgregarUsuario");
    const modalUsuario = new bootstrap.Modal(document.getElementById("modalUsuario"));
    const formUsuario = document.getElementById("formUsuario");


    let usuarios = [];
    let usuariosOriginales = []; // guardará todos los usuarios
    let editandoUsuario = null;

    async function cargarUsuarios() {
        try {
            const response = await fetch("http://localhost:3000/api/usuarios");
            if (!response.ok) throw new Error("Error al obtener los usuarios");

            const usuarios = await response.json();
            usuariosOriginales = usuarios;
            mostrarUsuarios(usuariosOriginales);
        } catch (error) {
            console.error("❌ Error al obtener usuarios:", error);
        }
    }

    function cargarOpcionesFiltros() {
        const laboratorioSet = new Set();
        const nivelSet = new Set();
        const rolSet = new Set();

        usuariosOriginales.forEach(user => {
            if (user.laboratorio) laboratorioSet.add(user.laboratorio);
            if (user.nivel) nivelSet.add(user.nivel);
            if (user.rol) rolSet.add(user.rol);
        });

        popularSelect("filtroLaboratorio", laboratorioSet);
        popularSelect("filtroNivel", nivelSet);
        popularSelect("filtroRol", rolSet);
    }

    function popularSelect(id, valores) {
        const select = document.getElementById(id);
        select.innerHTML = '<option value="">Todos</option>';
        Array.from(valores).forEach(valor => {
            const option = document.createElement("option");
            option.value = valor;
            option.textContent = valor;
            select.appendChild(option);
        });
    }

    function aplicarFiltros() {
        const usuarioInput = document.getElementById("filtroUsuario").value.toLowerCase();
        const labFiltro = document.getElementById("filtroLaboratorio").value;
        const nivelFiltro = document.getElementById("filtroNivel").value;
        const rolFiltro = document.getElementById("filtroRol").value;

        const filtrados = usuariosOriginales.filter(u => {
            const coincideUsuario = u.nombre.toLowerCase().includes(usuarioInput) || u.correo.toLowerCase().includes(usuarioInput);
            const coincideLab = !labFiltro || u.laboratorio === labFiltro;
            const coincideNivel = !nivelFiltro || u.nivel === nivelFiltro;
            const coincideRol = !rolFiltro || u.rol === rolFiltro;

            return coincideUsuario && coincideLab && coincideNivel && coincideRol;
        });

        mostrarUsuarios(filtrados);
    }

    ["filtroUsuario", "filtroLaboratorio", "filtroNivel", "filtroRol"].forEach(id => {
        document.getElementById(id).addEventListener("input", aplicarFiltros);
    });

    function obtenerClaseNivel(nivelNombre) {
        const niveles = {
            "Primero Primaria": 1,
            "Segundo Primaria": 2,
            "Tercero Primaria": 3,
            "Cuarto Primaria": 4,
            "Quinto Primaria": 5,
            "Sexto Primaria": 6,
            "Primero Secundaria": 7,
            "Segundo Secundaria": 8,
            "Tercero Secundaria": 9
        };

        const id = niveles[nivelNombre];
        return id ? `bg-custom-nivel-${id}` : "bg-secondary";
    }

    function mostrarUsuarios(lista) {
        listaUsuarios.innerHTML = "";

        lista.forEach(usuario => {
            const item = document.createElement("div");
            item.classList.add("list-group-item", "p-3", "mb-3", "shadow-sm", "rounded", "border", "position-relative");

            // Determinar la clase de nivel personalizada
            const nivelClase = obtenerClaseNivel(usuario.nivel);

            item.innerHTML = `
                <!-- Botones en esquina superior derecha -->
                <div class="position-absolute top-0 end-0 m-2">
                    <button class="btn btn-sm btn-outline-warning me-1 btnEditar" data-id="${usuario.id_usuario}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger btnEliminar" data-id="${usuario.id_usuario}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
    
                <div>
                    <h5 class="mb-1 text-primary fw-semibold">
                        <i class="fas fa-user-circle me-2"></i>${usuario.nombre}
                    </h5>
                    <p class="mb-1 text-dark">
                        <i class="fas fa-envelope me-2 text-muted"></i>${usuario.correo}
                    </p>
                    <div class="d-flex flex-wrap gap-2 mt-2">
                        <span class="badge bg-secondary">
                            <i class="fas fa-desktop me-1"></i>${usuario.laboratorio || "Sin asignar"}
                        </span>
                        <span class="badge ${nivelClase} nivel-badge">
                            <i class="fas fa-layer-group me-1"></i>${usuario.nivel || "Sin asignar"}
                        </span>
                        <span class="badge bg-primary">
                            <i class="fas fa-user-tag me-1"></i>${usuario.rol || "Sin rol"}
                        </span>
                    </div>
                </div>
            `;

            listaUsuarios.appendChild(item);
        });
    }

    btnAgregarUsuario.addEventListener("click", () => {
        editandoUsuario = null;
        formUsuario.reset();
        modalUsuario.show();
    });

    formUsuario.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!validarFormulario()) {
            return;
        }

        const datosUsuario = {
            nombre: document.getElementById("nombre").value.trim(),
            correo: document.getElementById("correo").value.trim(),
            laboratorio: parseInt(document.getElementById("laboratorio").value) || null,
            nivel: parseInt(document.getElementById("nivel").value) || null,
            rol: parseInt(document.getElementById("rol").value) || null,
        };

        console.log("📤 Enviando datos:", datosUsuario);

        const url = editandoUsuario
            ? `http://localhost:3000/api/usuarios/${editandoUsuario}`
            : "http://localhost:3000/api/usuarios";

        const opciones = {
            method: editandoUsuario ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datosUsuario),
        };

        await fetch(url, opciones)
            .then(async response => {
                const resJson = await response.json();

                if (!response.ok) {
                    throw new Error(resJson.message || "Error desconocido");
                }

                Swal.fire({
                    icon: "success",
                    title: "¡Usuario guardado!",
                    text: resJson.message,
                    showConfirmButton: false,
                    timer: 1500,
                    toast: true,
                    position: "top-end"
                });
                modalUsuario.hide();
                cargarUsuarios();
                
            })
            .catch(error => {
                console.error("❌ Error al guardar usuario:", error);
                Swal.fire("❌ Error", error.message, "error");
            });
    });

    listaUsuarios.addEventListener("click", async (e) => {
        if (e.target.classList.contains("btnEditar")) {
            const id = e.target.dataset.id;
            try {
                const response = await fetch(`http://localhost:3000/api/usuarios/${id}`);
                const usuario = await response.json();

                if (!response.ok) {
                    console.error("❌ Error al obtener usuario:", usuario.message);
                    return;
                }
                document.getElementById("nombre").value = usuario.nombre || "";
                document.getElementById("correo").value = usuario.correo || "";

                await cargarLaboratorios(usuario.laboratorio);
                await cargarNiveles(usuario.nivel);
                await cargarRoles(usuario.rol);

                editandoUsuario = id;
                modalUsuario.show();
            } catch (error) {
                console.error("❌ Error al cargar usuario:", error);
            }
        }
    });

    // Evento para eliminar usuario con SweetAlert2
    listaUsuarios.addEventListener("click", async (e) => {
    if (e.target.classList.contains("btnEliminar")) {
        const id = e.target.dataset.id;
        
        const confirmacion = await Swal.fire({
            
            title: "¿Eliminar usuario?",
            text: "Esta acción no se puede deshacer.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#6c757d",
            confirmButtonText: '<i class="fas fa-trash-alt"></i> Sí, eliminar',
            cancelButtonText: 'Cancelar',
            reverseButtons: true,
            customClass: {
                popup: 'rounded-3 shadow',
                confirmButton: 'btn btn-danger me-2',
                cancelButton: 'btn btn-secondary me-2',
            },
            buttonsStyling: false
        });

        if (confirmacion.isConfirmed) {
            try {
                const response = await fetch(`http://localhost:3000/api/usuarios/${id}`, {
                    method: "DELETE"
                });
                const resultado = await response.json();

                if (!response.ok) {
                    Swal.fire("Error", resultado.message, "error");
                    return;
                }

                // 🟢 Notificación tipo toast
                Swal.fire({
                    icon: "success",
                    title: "Usuario eliminado",
                    text: resultado.message,
                    showConfirmButton: false,
                    timer: 1500,
                    toast: true,
                    position: "top-end"
                });

                cargarUsuarios();
            } catch (error) {
                console.error("❌ Error al eliminar usuario:", error);
                Swal.fire("Error", "Hubo un problema al eliminar el usuario", "error");
            }
        }
    }
});


    async function cargarRoles(rolSeleccionado = "") {
        try {
            const response = await fetch("http://localhost:3000/api/roles");
            const roles = await response.json();

            const selectRol = document.getElementById("rol");
            selectRol.innerHTML = `<option value="" disabled>Selecciona un rol</option>`;

            roles.forEach(r => {
                const option = document.createElement("option");
                option.value = r.id_rol;
                option.textContent = r.nombre_rol;
                if (r.nombre_rol === rolSeleccionado) {
                    option.selected = true;
                }
                selectRol.appendChild(option);
            });
        } catch (error) {
            console.error("❌ Error al cargar roles:", error);
        }
    }

    async function cargarLaboratorios(seleccionado = "") {
        try {
            const response = await fetch("http://localhost:3000/api/laboratorios");
            const laboratorios = await response.json();
            const select = document.getElementById("laboratorio");
            select.innerHTML = `<option value="">Selecciona un laboratorio</option>`;

            laboratorios.forEach(lab => {
                const option = document.createElement("option");
                option.value = lab.id_laboratorio;
                option.textContent = lab.nombre_laboratorio;
                if (lab.nombre_laboratorio === seleccionado) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
        } catch (error) {
            console.error("❌ Error al cargar laboratorios:", error);
        }
    }

    async function cargarNiveles() {
        const selectNivel = document.getElementById("nivel"); // o #nivelUsuario
        selectNivel.innerHTML = `<option value="">Selecciona un nivel</option>`;

        try {
            const res = await fetch("http://localhost:3000/api/niveles");
            const niveles = await res.json();

            niveles.forEach(nivel => {
                const option = document.createElement("option");
                option.value = nivel.id_nivel;
                option.textContent = nivel.nombre_nivel;
                selectNivel.appendChild(option);
            });
        } catch (err) {
            console.error("❌ Error al cargar niveles:", err);
        }
    }

    function validarFormulario() {
        let valido = true;
        const campos = [
            { id: "nombre", tipo: "input" },
            { id: "correo", tipo: "input" },
            { id: "laboratorio", tipo: "select" },
            { id: "nivel", tipo: "select" },
            { id: "rol", tipo: "select" }
        ];
        campos.forEach(campo => {
            const el = document.getElementById(campo.id);
            if (!el.value || el.value === "") {
                el.classList.add("is-invalid");
                valido = false;
            } else {
                el.classList.remove("is-invalid");
            }
        });
        return valido;
    }

    async function cargarNotificaciones() {
        const user = JSON.parse(localStorage.getItem("user"));
        const res = await fetch(`/api/notificaciones/${user.id_usuario}`);
        const notificaciones = await res.json();
    
        const reportesTab = document.getElementById("reportesTab");
        const usuariosTab = document.getElementById("usuariosTab");
        const notifBadge = document.querySelector(".notification");
        const badgeReportes = document.getElementById("countReportes");
        const badgeUsuarios = document.getElementById("countUsuarios");
    
        // Validación por si no existen los elementos (seguridad)
        if (!reportesTab || !usuariosTab || !notifBadge || !badgeReportes || !badgeUsuarios) return;
    
        reportesTab.innerHTML = "";
        usuariosTab.innerHTML = "";
    
        // Contadores
        let noLeidasTotal = 0;
        let noLeidasReportes = 0;
        let noLeidasUsuarios = 0;
    
        if (notificaciones.length === 0) {
            reportesTab.innerHTML = `<div class="text-center text-muted small py-2">No hay notificaciones</div>`;
            usuariosTab.innerHTML = `<div class="text-center text-muted small py-2">No hay notificaciones</div>`;
        } else {
            notificaciones.forEach(n => {
                const tipo = n.mensaje.toLowerCase().includes("reporte") ? "reporte" : "usuario";
                const esLeida = n.leida ? "leida" : "";
    
                const html = `
                    <div class="d-flex justify-content-between align-items-start position-relative notification-item ${esLeida}" data-id="${n.id_notificacion}">
                        <a href="#" onclick="marcarLeida(${n.id_notificacion})" class="d-flex w-100 text-decoration-none text-dark">
                            <div class="notif-icon notif-primary"><i class="fa fa-bell"></i></div>
                            <div class="notif-content">
                                <span class="block">${n.mensaje}</span>
                                <span class="time">${new Date(n.fecha).toLocaleString()}</span>
                            </div>
                        </a>
                        <button onclick="eliminarNotificacion(${n.id_notificacion})" class="btn-close btn-close-white ms-2 position-absolute top-0 end-0" style="font-size: 0.6rem;" aria-label="Close"></button>
                    </div>
                `;
    
                if (tipo === "reporte") {
                    reportesTab.innerHTML += html;
                    if (!n.leida) noLeidasReportes++;
                } else {
                    usuariosTab.innerHTML += html;
                    if (!n.leida) noLeidasUsuarios++;
                }
    
                if (!n.leida) noLeidasTotal++;
            });
        }
    
        notifBadge.textContent = noLeidasTotal || "";
        badgeReportes.textContent = noLeidasReportes || "0";
        badgeUsuarios.textContent = noLeidasUsuarios || "0";
    }
    
    
    // ✅ Declarar funciones globales FUERA de cargarNotificaciones
    window.marcarLeida = async function (id) {
        await fetch(`/api/notificaciones/${id}/leida`, { method: "PUT" });
        cargarNotificaciones();
    };

    window.eliminarNotificacion = async function (id) {
        await fetch(`/api/notificaciones/${id}`, { method: "DELETE" });
        cargarNotificaciones();
    };


    cargarNotificaciones();
    setInterval(cargarNotificaciones, 10000); // actualiza cada 10 segundos
    cargarUsuarios().then(cargarOpcionesFiltros);
    cargarLaboratorios();
    cargarRoles();
    cargarNiveles();
});
