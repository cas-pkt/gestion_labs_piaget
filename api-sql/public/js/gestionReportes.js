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
                    <button class="btn btn-primary btn-sm" onclick="verDetalle(${reporte.id_reporte})">Detalles</button>
                </td>
            `;
            tablaBody.appendChild(fila);
        });

    } catch (error) {
        console.error("Error al cargar reportes:", error);
    }
});

function verDetalle(idReporte) {
    alert("Mostrar detalles del reporte ID: " + idReporte);
}
