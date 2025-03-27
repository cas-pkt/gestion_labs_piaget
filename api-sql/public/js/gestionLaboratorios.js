document.addEventListener("DOMContentLoaded", async function () {
    const formLaboratorio = document.getElementById("formAgregarLaboratorio");
    const btnAgregarLaboratorio = document.getElementById("btnAgregarLaboratorio");
    const tabsPrimaria = document.getElementById("laboratorioTabsPrimaria");
    const contentPrimaria = document.getElementById("laboratorioContentPrimaria");
    const tabsSecundaria = document.getElementById("laboratorioTabsSecundaria");
    const contentSecundaria = document.getElementById("laboratorioContentSecundaria");

    if (!formLaboratorio || !btnAgregarLaboratorio || !tabsPrimaria || !contentPrimaria || !tabsSecundaria || !contentSecundaria) {
        console.error("❌ Elementos no encontrados en el DOM.");
        return;
    }


    async function cargarLaboratorios() {
        const response = await fetch("http://localhost:3000/api/laboratorios");
        const laboratorios = await response.json();

        const tabsPrimaria = document.getElementById("laboratorioTabsPrimaria");
        const contentPrimaria = document.getElementById("laboratorioContentPrimaria");
        const tabsSecundaria = document.getElementById("laboratorioTabsSecundaria");
        const contentSecundaria = document.getElementById("laboratorioContentSecundaria");

        tabsPrimaria.innerHTML = "";
        contentPrimaria.innerHTML = "";
        tabsSecundaria.innerHTML = "";
        contentSecundaria.innerHTML = "";

        const primaria = laboratorios.filter(l => l.id_nivel >= 1 && l.id_nivel <= 6);
        const secundaria = laboratorios.filter(l => l.id_nivel >= 7 && l.id_nivel <= 9);


        function renderTabs(labs, tabsContainer, contentContainer, prefix) {
            labs.forEach((lab, i) => {
                tabsContainer.innerHTML += `
                    <li class="nav-item">
                        <button class="nav-link ${i === 0 ? 'active' : ''}" data-id="${lab.id_laboratorio}" data-nombre="${lab.nombre_laboratorio}" data-bs-toggle="tab" data-bs-target="#${prefix}-${lab.id_laboratorio}">
                        ${lab.nombre_laboratorio}
                        </button>
                    </li>`;

                contentContainer.innerHTML += `
                    <div class="tab-pane fade ${i === 0 ? 'show active' : ''}" id="${prefix}-${lab.id_laboratorio}">
                        <div class="row p-3" id="equipos-lab-${lab.id_laboratorio}"></div>
                    </div>`;
                cargarEquipos(lab.id_laboratorio);
            });
        }

        renderTabs(primaria, tabsPrimaria, contentPrimaria, "primaria");
        renderTabs(secundaria, tabsSecundaria, contentSecundaria, "secundaria");
    }

    document.addEventListener("contextmenu", function (e) {
        if (e.target.matches(".nav-link[data-id]")) {
            e.preventDefault();

            const btn = e.target;
            const id = btn.dataset.id;
            const nombre = btn.dataset.nombre;

            // 🔥 Agrega la clase .shake y quítala después
            btn.classList.add("shake");
            setTimeout(() => btn.classList.remove("shake"), 500);

            Swal.fire({
                title: `¿Eliminar "${nombre}"?`,
                text: "Esta acción no se puede deshacer",
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#e3342f",
                cancelButtonColor: "#6c757d",
                confirmButtonText: "Sí, eliminar",
                cancelButtonText: "Cancelar"
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        const res = await fetch(`http://localhost:3000/api/laboratorios/${id}`, {
                            method: "DELETE"
                        });

                        const data = await res.json();

                        if (res.ok) {
                            Swal.fire("Eliminado", data.message || "Laboratorio eliminado", "success");
                            cargarLaboratorios();
                        } else {
                            Swal.fire("Error", data.message || "No se pudo eliminar", "error");
                        }
                    } catch (err) {
                        console.error(err);
                        Swal.fire("Error", "Error al conectar con el servidor", "error");
                    }
                }
            });
        }
    });

    async function cargarEquipos(idLaboratorio) {
        try {
            const response = await fetch(`http://localhost:3000/api/laboratorios/${idLaboratorio}/equipos`);
            const equipos = await response.json();
            const container = document.getElementById(`equipos-lab-${idLaboratorio}`);
            if (!container) return;

            container.innerHTML = "";
            equipos.forEach(equipo => {
                const estado = equipo.estado || 'Desconocido';
                let estadoBadgeClass = 'bg-secondary';

                if (estado === 'Pendiente') estadoBadgeClass = 'bg-warning text-dark';
                else if (estado === 'En proceso') estadoBadgeClass = 'bg-primary';
                else if (estado === 'Resuelto') estadoBadgeClass = 'bg-success';

                    container.innerHTML += `
                        <div class="col-md-4">
                            <div class="card mb-3 shadow-sm">
                                <div class="card-body text-center">
                                    <h5 class="card-title" data-id="${equipo.id_equipo}" data-numero="${equipo.numero_equipo}">
                                        ${equipo.numero_equipo}
                                    </h5>
                                    <p class="card-text">
                                        Estado: <span class="badge ${estadoBadgeClass}">${estado}</span>
                                    </p>
                                    <button class="btn btn-info btn-sm btnVerEquipo me-2" data-id="${equipo.id_equipo}">
                                        Ver Reportes
                                    </button>
                                    <button class="btn btn-warning btn-sm btnEditarEquipo" data-id="${equipo.id_equipo}" data-numero="${equipo.numero_equipo}">
                                        Editar Nombre
                                    </button>
                                </div>
                            </div>
                        </div>`;
            });
        } catch (error) {
            console.error(`❌ Error al obtener equipos del laboratorio ${idLaboratorio}:`, error);
        }
    }


    window.verEquipo = async function (idEquipo) {
        try {
            const response = await fetch(`http://localhost:3000/api/reportesPorEquipo/${idEquipo}`);
            const reportes = await response.json();

            const lista = document.getElementById("listaReportesEquipo");
            const titulo = document.getElementById("modalEquipoTitulo");

            titulo.textContent = `#${idEquipo}`;
            lista.innerHTML = "";

            if (!Array.isArray(reportes) || reportes.length === 0) {
                lista.innerHTML = `<li class="list-group-item text-muted">Este equipo no tiene reportes.</li>`;
            } else {
                reportes.forEach(reporte => {
                    lista.innerHTML += `
                        <li class="list-group-item mb-4 p-3 border rounded shadow-sm" data-id="${reporte.id_reporte}">
                            <div class="mb-2">
                                <strong class="text-primary">${reporte.descripcion}</strong>
                            </div>
                            <div class="mb-2 small text-muted">
                                <i class="far fa-clock me-1"></i>${new Date(reporte.fecha_hora).toLocaleString()}
                            </div>
                            <div class="mb-2">
                                <span class="badge bg-${reporte.estatus === 'Resuelto' ? 'success' : reporte.estatus === 'En proceso' ? 'warning text-dark' : 'secondary'}">
                                    ${reporte.estatus}
                                </span>
                            </div>
                    `;
                });
            }

            const modal = new bootstrap.Modal(document.getElementById("modalReportesEquipo"));
            modal.show();

        } catch (error) {
            console.error("❌ Error al obtener reportes del equipo:", error);
            Swal.fire("Error", "No se pudieron cargar los reportes del equipo", "error");
        }
    };

    document.getElementById("btnAgregarEquipo").addEventListener("click", async () => {
        const select = document.getElementById("laboratorioEquipo");
        select.innerHTML = "";

        const res = await fetch("http://localhost:3000/api/laboratorios");
        const laboratorios = await res.json();

        laboratorios.forEach(lab => {
            const option = document.createElement("option");
            option.value = lab.id_laboratorio;
            option.textContent = lab.nombre_laboratorio;
            select.appendChild(option);
        });

        const modal = new bootstrap.Modal(document.getElementById("modalAgregarEquipo"));
        modal.show();
    });

    document.getElementById("formAgregarEquipo").addEventListener("submit", async function (e) {
        e.preventDefault();
        const numeroEquipo = document.getElementById("numeroEquipo").value.trim();
        const id_laboratorio = document.getElementById("laboratorioEquipo").value;

        const response = await fetch("http://localhost:3000/api/equipos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ numero_equipo: numeroEquipo, id_laboratorio })
        });

        const data = await response.json();

        if (response.ok) {
            Swal.fire("✅ Éxito", "Equipo agregado correctamente", "success");
            document.getElementById("formAgregarEquipo").reset();
            bootstrap.Modal.getInstance(document.getElementById("modalAgregarEquipo")).hide();
            cargarLaboratorios(); // Recargar vista
        } else {
            Swal.fire("❌ Error", data.message || "No se pudo agregar", "error");
        }
    });

    document.getElementById("formEditarEquipo").addEventListener("submit", async function (e) {
        e.preventDefault();

        const id = document.getElementById("editarIdEquipo").value;
        const nuevoNombre = document.getElementById("editarNumeroEquipo").value.trim();

        if (!nuevoNombre) {
            return Swal.fire("⚠️", "El nombre del equipo no puede estar vacío", "warning");
        }

        try {
            const response = await fetch(`http://localhost:3000/api/equipos/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ numero_equipo: nuevoNombre })
            });

            const result = await response.json();

            if (response.ok) {
                Swal.fire("✅ Éxito", result.message, "success");
                bootstrap.Modal.getInstance(document.getElementById("modalEditarEquipo")).hide();
                cargarLaboratorios(); // refresca la vista
            } else {
                Swal.fire("❌ Error", result.message || "No se pudo actualizar", "error");
            }
        } catch (err) {
            Swal.fire("❌ Error", "Error al conectar con el servidor", "error");
        }
    });



    document.addEventListener("click", function (e) {
        if (e.target.classList.contains("btnVerEquipo")) {
            const idEquipo = e.target.dataset.id;
            verEquipo(idEquipo);
        }
    });

    document.addEventListener("click", async (e) => {
        if (e.target.classList.contains("guardar-reporte")) {
            const li = e.target.closest("li");
            const id = li?.dataset?.id;
            const estatus = li.querySelector(".estatus-reporte")?.value;
            const observaciones = li.querySelector(".observaciones-reporte")?.value;

            if (!id || !estatus) {
                Swal.fire("Error", "Faltan datos para guardar", "error");
                return;
            }

            try {
                const response = await fetch(`http://localhost:3000/api/reportes/${id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ estatus, observaciones })
                });

                const result = await response.json();

                if (response.ok) {
                    Swal.fire("✅ Cambios guardados", result.message, "success");
                } else {
                    Swal.fire("❌ Error", result.message, "error");
                }
            } catch (err) {
                console.error("Error al actualizar reporte:", err);
                Swal.fire("❌ Error", "No se pudo guardar el cambio", "error");
            }
        }
    });

    document.addEventListener("click", function (e) {
        if (e.target.classList.contains("btnEditarEquipo")) {
            const idEquipo = e.target.dataset.id;
            const numeroActual = e.target.dataset.numero;

            document.getElementById("editarIdEquipo").value = idEquipo;
            document.getElementById("editarNumeroEquipo").value = numeroActual;

            const modal = new bootstrap.Modal(document.getElementById("modalEditarEquipo"));
            modal.show();
        }
    });

    document.getElementById("btnAgregarLaboratorio").addEventListener("click", () => {
        const modal = new bootstrap.Modal(document.getElementById("modalAgregarLaboratorio"));
        modal.show();
    });

    document.getElementById("formAgregarLaboratorio").addEventListener("submit", async function (e) {
        e.preventDefault();

        const nombre = document.getElementById("nombreLaboratorio").value.trim();
        const nivel = document.getElementById("nivelLaboratorio").value;

        if (!nombre || !nivel) return Swal.fire("Faltan datos");

        const res = await fetch("http://localhost:3000/api/laboratorios", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre_laboratorio: nombre, id_nivel: parseInt(nivel) })
        });

        const data = await res.json();
        if (res.ok) {
            Swal.fire("Éxito", "Laboratorio agregado", "success");
            bootstrap.Modal.getInstance(document.getElementById("modalAgregarLaboratorio")).hide();
            cargarLaboratorios();
        } else {
            Swal.fire("Error", data.message || "No se pudo agregar", "error");
        }
    });

    async function cargarNotificaciones() {
        const user = JSON.parse(localStorage.getItem("user"));
        const res = await fetch(`/api/notificaciones/${user.id_usuario}`);
        const notificaciones = await res.json();

        const notifBox = document.querySelector(".notif-center");
        notifBox.innerHTML = "";

        if (notificaciones.length === 0) {
            notifBox.innerHTML = `
                <div class="text-center text-muted small py-2">No hay notificaciones nuevas</div>
            `;
        } else {
            notificaciones.forEach(n => {
                notifBox.innerHTML += `
                    <div class="d-flex justify-content-between align-items-start position-relative notification-item ${n.leida ? 'leida' : ''}" data-id="${n.id_notificacion}">
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
            });
        }

        // Mostrar solo la cantidad de notificaciones NO leídas
        const noLeidas = notificaciones.filter(n => !n.leida);
        document.querySelector(".notification").textContent = noLeidas.length;
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
    cargarLaboratorios();
});
