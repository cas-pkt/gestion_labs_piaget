document.addEventListener("DOMContentLoaded", async function () {
    const tabContainer = document.getElementById("laboratorioTabs");
    const contentContainer = document.getElementById("laboratorioContent");
    const formLaboratorio = document.getElementById("formLaboratorio");
    const btnAgregarLaboratorio = document.getElementById("btnAgregarLaboratorio");

    if (!tabContainer || !contentContainer || !formLaboratorio || !btnAgregarLaboratorio) {
        console.error("❌ Elementos no encontrados en el DOM.");
        return;
    }

    async function cargarLaboratorios() {
        try {
            const response = await fetch("http://localhost:3000/api/laboratorios");
            const laboratorios = await response.json();
            if (!Array.isArray(laboratorios)) return;

            tabContainer.innerHTML = "";
            contentContainer.innerHTML = "";

            laboratorios.forEach((lab, index) => {
                if (!lab.id_laboratorio || !lab.nombre_laboratorio) return;

                tabContainer.innerHTML += `
                    <li class="nav-item">
                        <button class="nav-link ${index === 0 ? 'active' : ''}" data-bs-toggle="tab" data-bs-target="#lab-${lab.id_laboratorio}">
                            ${lab.nombre_laboratorio}
                        </button>
                    </li>`;

                contentContainer.innerHTML += `
                    <div class="tab-pane fade ${index === 0 ? 'show active' : ''}" id="lab-${lab.id_laboratorio}">
                        <div class="row p-3" id="equipos-lab-${lab.id_laboratorio}"></div>
                    </div>`;
            });

            laboratorios.forEach(lab => cargarEquipos(lab.id_laboratorio));
        } catch (error) {
            console.error("❌ Error al cargar laboratorios:", error);
        }
    }

    async function cargarEquipos(idLaboratorio) {
        try {
            const response = await fetch(`http://localhost:3000/api/laboratorios/${idLaboratorio}/equipos`);
            const equipos = await response.json();
            const container = document.getElementById(`equipos-lab-${idLaboratorio}`);
            if (!container) return;

            container.innerHTML = "";
            equipos.forEach(equipo => {
                container.innerHTML += `
                    <div class="col-md-4">
                        <div class="card">
                            <div class="card-body text-center">
                                <h5>PC-${equipo.id_equipo}</h5>
                                <p>Estado: ${equipo.estado || 'Desconocido'}</p>
                                <button class="btn btn-info btn-sm btnVerEquipo" data-id="${equipo.id_equipo}">
                                    Ver Reportes
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
                    <li class="list-group-item" data-id="${reporte.id_reporte}">
                        <strong>${reporte.descripcion}</strong><br>
                        <small>${new Date(reporte.fecha_hora).toLocaleString()} - Estatus: ${reporte.estatus}</small>
                        <textarea class="form-control mt-2 observaciones-reporte" placeholder="observacioneses...">${reporte.observacioneses || ""}</textarea>
                        <select class="form-select mt-2 estatus-reporte">
                            <option value="Pendiente" ${reporte.estatus === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
                            <option value="En proceso" ${reporte.estatus === 'En proceso' ? 'selected' : ''}>En proceso</option>
                            <option value="Resuelto" ${reporte.estatus === 'Resuelto' ? 'selected' : ''}>Resuelto</option>
                        </select>
                        <button class="btn btn-success btn-sm mt-2 guardar-reporte">💾 Guardar</button>
                    </li>
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

    async function guardarobservaciones(idReporte, observaciones) {
        try {
            const response = await fetch(`http://localhost:3000/api/reportes/${idReporte}/observaciones`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ observacioneses: observacioneses })
            });

            const result = await response.json();

            if (response.ok) {
                Swal.fire("✅ Observación guardada", result.message, "success");
            } else {
                Swal.fire("❌ Error", result.message || "No se pudo guardar la observación", "error");
            }

        } catch (error) {
            console.error("❌ Error al guardar observación:", error);
            Swal.fire("Error", "Error al conectar con el servidor", "error");
        }
    }

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
        

    cargarLaboratorios();
});
