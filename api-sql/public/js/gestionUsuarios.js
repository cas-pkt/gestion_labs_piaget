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

    const listaUsuarios = document.getElementById("listaUsuarios");
    const btnAgregarUsuario = document.getElementById("btnAgregarUsuario");
    const modalUsuario = new bootstrap.Modal(document.getElementById("modalUsuario"));
    const formUsuario = document.getElementById("formUsuario");

    let usuarios = [];
    let editandoUsuario = null;

    async function cargarUsuarios() {
        try {
            const response = await fetch("http://localhost:3000/api/usuarios");
            if (!response.ok) throw new Error("Error al obtener los usuarios");

            const usuarios = await response.json();
            mostrarUsuarios(usuarios);
        } catch (error) {
            console.error("❌ Error al obtener usuarios:", error);
        }
    }


    function mostrarUsuarios(lista) {
        listaUsuarios.innerHTML = "";
        lista.forEach(usuario => {
            const item = document.createElement("div");
            item.classList.add("list-group-item", "d-flex", "justify-content-between", "align-items-center");
            item.innerHTML = `
                <div>
                    <strong>${usuario.nombre}</strong> - ${usuario.correo} <br>
                    <small>Laboratorio: ${usuario.laboratorio || "Sin asignar"} | Nivel: ${usuario.nivel || "Sin asignar"} | Rol: ${usuario.rol || "Sin rol"}</small>
                </div>
                <div>
                    <button class="btn btn-warning btn-sm btnEditar" data-id="${usuario.id_usuario}">Editar</button>
                    <button class="btn btn-danger btn-sm btnEliminar" data-id="${usuario.id_usuario}">Eliminar</button>
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

    listaUsuarios.addEventListener("click", async (e) => {
        if (e.target.classList.contains("btnEditar")) {
            const id = e.target.dataset.id;
            try {
                const response = await fetch(`http://localhost:3000/api/usuarios/${id}`);
                const usuario = await response.json();

                document.getElementById("nombre").value = usuario.nombre || "";
                document.getElementById("correo").value = usuario.correo || "";
                document.getElementById("laboratorio").value = usuario.laboratorio || "";
                document.getElementById("nivel").value = usuario.nivel || "";
                document.getElementById("rol").value = usuario.rol || "";

                editandoUsuario = id;
                modalUsuario.show();
            } catch (error) {
                console.error("❌ Error al cargar usuario:", error);
            }
        }
    });

    formUsuario.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!validarFormulario()) {
            return; // 🛑 Si hay campos inválidos, no se envía nada
        }

        const datosUsuario = {
            nombre: document.getElementById("nombre").value.trim(),
            correo: document.getElementById("correo").value.trim(),
            laboratorio: parseInt(document.getElementById("laboratorio").value) || null,
            nivel: parseInt(document.getElementById("nivel").value) || null,
            rol: parseInt(document.getElementById("rol").value) || null,
        };
        

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
        

        console.log("📤 Enviando datos:", datosUsuario);

        const url = editandoUsuario
            ? `http://localhost:3000/api/usuarios/${editandoUsuario}`
            : "http://localhost:3000/api/usuarios";

        const opciones = {
            method: editandoUsuario ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datosUsuario),
        };

        await fetch(url, opciones);
        modalUsuario.hide();
        cargarUsuarios();
    });



    // Evento para abrir el modal de edición
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
                document.getElementById("laboratorio").value = usuario.laboratorio || "";
                document.getElementById("nivel").value = usuario.nivel || "";

                await cargarRoles(usuario.rol);  // 🔥 Cargar roles al abrir el modal

                editandoUsuario = id;
                modalUsuario.show();
            } catch (error) {
                console.error("❌ Error al cargar usuario:", error);
            }
        }
    });

    // Función para cargar roles en el select
    async function cargarRoles(rolSeleccionado = "") {
        try {
            const response = await fetch("http://localhost:3000/api/roles");
            const roles = await response.json();

            console.log("📥 Roles recibidos:", roles);  // 🔍 Verificar datos en la consola

            if (response.ok) {
                const selectRol = document.getElementById("rol");
                selectRol.innerHTML = `<option value="" disabled>Selecciona un rol</option>`;

                roles.forEach(r => {
                    const option = document.createElement("option");
                    option.value = r.id_rol;
                    option.textContent = r.nombre_rol;
                    if (r.id_rol == rolSeleccionado) {
                        option.selected = true;
                    }
                    selectRol.appendChild(option);
                });
            } else {
                console.error("❌ Error al obtener roles:", roles.message);
            }
        } catch (error) {
            console.error("❌ Error en la solicitud de roles:", error);
        }
    }


    async function cargarLaboratorios() {
        try {
            const response = await fetch("http://localhost:3000/api/laboratorios");
            const laboratorios = await response.json();
            const selectLaboratorio = document.getElementById("laboratorio");
            selectLaboratorio.innerHTML = "<option value='' disabled>Selecciona un laboratorio</option>";
            laboratorios.forEach(lab => {
                const option = document.createElement("option");
                option.value = lab.nombre_laboratorio;
                option.textContent = lab.nombre_laboratorio;
                selectLaboratorio.appendChild(option);
            });
        } catch (error) {
            console.error("❌ Error al obtener laboratorios:", error);
        }
    }

    cargarUsuarios();
    cargarLaboratorios();
});
