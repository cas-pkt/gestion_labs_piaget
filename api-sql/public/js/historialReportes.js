document.addEventListener("DOMContentLoaded", async function () {
    const user = JSON.parse(localStorage.getItem("user"));

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    // Llenar campos del usuario
    document.getElementById("userName").textContent = user.nombre;
    document.getElementById("userBoxName").textContent = user.nombre;
    document.getElementById("userEmail").textContent = user.correo;

    const filterFecha = document.getElementById("filterFecha");
    const filterUsuario = document.getElementById("filterUsuario");
    const filterLaboratorio = document.getElementById("filterLaboratorio");
    const filterNivel = document.getElementById("filterNivel");
    const historialContainer = document.getElementById("historialReportes");

    async function cargarHistorialReportes() {
        try {
            const response = await fetch(`http://localhost:3000/api/historialReportes`);
            const reportes = await response.json();

            if (!response.ok) {
                console.error("❌ Error al obtener reportes históricos:", reportes.message);
                return;
            }

            // Vaciar contenedor antes de cargar
            historialContainer.innerHTML = "";

            reportes.forEach((reporte) => {
                const item = document.createElement("div");
                item.classList.add("list-group-item");

                item.innerHTML = `
                    <div class="historial-header">
                        <strong>Reporte #${reporte.id_reporte}</strong> - ${reporte.descripcion}
                    </div>
                    <div class="historial-meta">
                        <span>📌 Equipo: ${reporte.numero_equipo}</span> | 
                        <span>🏛 Laboratorio: ${reporte.nombre_laboratorio}</span> | 
                        <span>📅 Fecha: ${new Date(reporte.fecha_hora).toLocaleString()}</span> |
                        <span class="status ${reporte.estatus.toLowerCase()}">${reporte.estatus}</span>
                    </div>
                `;

                historialContainer.appendChild(item);
            });
        } catch (error) {
            console.error("❌ Error en la solicitud de historial de reportes:", error);
        }
    }

    cargarHistorialReportes();

    // Filtrar reportes
    function aplicarFiltros() {
        const fecha = filterFecha.value;
        const usuario = filterUsuario.value;
        const laboratorio = filterLaboratorio.value;
        const nivel = filterNivel.value;

        const items = historialContainer.querySelectorAll(".list-group-item");

        items.forEach((item) => {
            const fechaItem = item.querySelector(".historial-meta span:nth-child(3)").textContent.includes(fecha);
            const usuarioItem = usuario === "" || item.innerHTML.includes(`Usuario: ${usuario}`);
            const laboratorioItem = laboratorio === "" || item.innerHTML.includes(`Laboratorio: ${laboratorio}`);
            const nivelItem = nivel === "" || item.innerHTML.includes(`Nivel: ${nivel}`);

            if (fechaItem && usuarioItem && laboratorioItem && nivelItem) {
                item.style.display = "";
            } else {
                item.style.display = "none";
            }
        });
    }

    // Eventos para aplicar filtros
    filterFecha.addEventListener("change", aplicarFiltros);
    filterUsuario.addEventListener("change", aplicarFiltros);
    filterLaboratorio.addEventListener("change", aplicarFiltros);
    filterNivel.addEventListener("change", aplicarFiltros);
});
