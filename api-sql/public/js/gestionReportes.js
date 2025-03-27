document.addEventListener("DOMContentLoaded", async function () {
    try {
        const response = await fetch("http://localhost:3000/api/reportes");
        if (!response.ok) throw new Error("Error en la respuesta del servidor");

        const reportes = await response.json();
        const tablaBody = document.querySelector("#reportesTable tbody");

        if (reportes.length === 0) {
            tablaBody.innerHTML = "<tr><td colspan='7' class='text-center'>No hay reportes disponibles</td></tr>";
            return;
        }

        reportes.forEach(reporte => {
            const fila = document.createElement("tr");
            fila.innerHTML = `
                <td>${reporte.id_reporte}</td>
                <td>${reporte.numero_equipo || "N/A"}</td>
                <td>${reporte.nombre_laboratorio || "N/A"}</td>
                <td>${reporte.descripcion}</td>
                <td>${new Date(reporte.fecha_hora).toLocaleString()}</td>
                <td>${reporte.estatus}</td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="verDetalleReporte(${reporte.id_reporte})"> Detalles </button>

                </td>
            `;
            tablaBody.appendChild(fila);
        });

    } catch (error) {
        console.error("Error al cargar reportes:", error);
    }


    async function cargarReportes() {
        const res = await fetch(`http://localhost:3000/api/reportes/${idReporte}`);
        if (!res.ok) throw new Error("Reporte no encontrado");

        const reportes = await res.json();

        const tbody = document.getElementById("reportesBody");
        tbody.innerHTML = "";

        reportes.forEach(reporte => {
            const row = document.createElement("tr");

            row.innerHTML = `
            <td>${reporte.id_reporte}</td>
            <td>${reporte.numero_equipo}</td>
            <td>${reporte.nombre_laboratorio}</td>
            <td>${reporte.descripcion}</td>
            <td>${new Date(reporte.fecha_hora).toLocaleString()}</td>
            <td>
                <select class="form-select estatus-select" data-id="${reporte.id_reporte}">
                    <option value="Pendiente" ${reporte.estatus === "Pendiente" ? "selected" : ""}>Pendiente</option>
                    <option value="En proceso" ${reporte.estatus === "En proceso" ? "selected" : ""}>En proceso</option>
                    <option value="Resuelto" ${reporte.estatus === "Resuelto" ? "selected" : ""}>Resuelto</option>
                </select>
                <textarea class="form-control mt-1 observaciones-text" rows="2" placeholder="Observaciones..." data-id="${reporte.id_reporte}">${reporte.observaciones || ""}</textarea>
            </td>
            <td>
                <button class="btn btn-success btn-sm guardar-btn" data-id="${reporte.id_reporte}"><i class="fas fa-save"></i> Guardar cambios</button>
            </td>
        `;

            tbody.appendChild(row);
        });

        agregarEventosGuardar();
    }

    function agregarEventosGuardar() {
        const botonesGuardar = document.querySelectorAll(".guardar-btn");

        botonesGuardar.forEach(btn => {
            btn.addEventListener("click", async (e) => {
                const id = e.target.dataset.id;

                const estatus = document.querySelector(`.estatus-select[data-id="${id}"]`).value;
                const observaciones = document.querySelector(`.observaciones-text[data-id="${id}"]`).value;

                const res = await fetch(`/api/reportes/${id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ estatus, observaciones })
                });

                const data = await res.json();

                if (res.ok) {
                    Swal.fire("✅ Guardado", data.message, "success");
                    cargarReportes();
                } else {
                    Swal.fire("❌ Error", data.message, "error");
                }
            });
        });
    }

    window.verDetalleReporte = async function (idReporte) {
        try {
            const res = await fetch(`http://localhost:3000/api/reportes/${idReporte}`);
            if (!res.ok) throw new Error("No se pudo obtener el reporte");

            const reporte = await res.json();

            const titulo = document.getElementById("tituloDetalleReporte");
            const desc = document.getElementById("detalleDescripcion");
            const obs = document.getElementById("detalleObservaciones");
            const estatus = document.getElementById("detalleEstatus");
            const btnGuardar = document.getElementById("guardarDetalleCambios");

            if (!titulo || !desc || !obs || !estatus || !btnGuardar) {
                console.error("❌ Faltan elementos del modal en el HTML");
                return;
            }

            // Mostrar los datos
            titulo.textContent = `#${reporte.id_reporte}`;
            desc.textContent = reporte.descripcion || "-";
            obs.value = reporte.observaciones || "";
            estatus.value = reporte.estatus;

            // Si el reporte está resuelto, bloquear campos
            const estaResuelto = reporte.estatus === "Resuelto";
            obs.disabled = estaResuelto;
            estatus.disabled = estaResuelto;
            btnGuardar.style.display = estaResuelto ? "none" : "inline-block";

            // Guardar cambios
            btnGuardar.onclick = async () => {
                const nuevasObservaciones = obs.value;
                const nuevoEstatus = estatus.value;

                try {
                    const updateRes = await fetch(`http://localhost:3000/api/reportes/${idReporte}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            estatus: nuevoEstatus,
                            observaciones: nuevasObservaciones,
                        }),
                    });

                    const result = await updateRes.json();
                    if (!updateRes.ok) throw new Error(result.message);

                    Swal.fire("✅ Guardado", result.message, "success");
                    bootstrap.Modal.getInstance(document.getElementById("modalDetalleReporte")).hide();

                    // Puedes recargar la tabla aquí si lo necesitas
                    // cargarReportes();
                } catch (err) {
                    Swal.fire("❌ Error", err.message, "error");
                }
            };

            // Mostrar modal
            const modal = new bootstrap.Modal(document.getElementById("modalDetalleReporte"));
            modal.show();

        } catch (err) {
            console.error("❌ Error al mostrar detalle:", err);
            Swal.fire("❌ Error", "No se pudo cargar el detalle del reporte", "error");
        }
    };

    window.verDetalle = window.verDetalleReporte;

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
});