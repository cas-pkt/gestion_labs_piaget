document.addEventListener("DOMContentLoaded", async function () {
    const tableBody = document.querySelector("#basic-datatables tbody");

    // Obtener usuario logueado
    const storage = localStorage.getItem("user") ? localStorage : sessionStorage;
    const usuario = JSON.parse(storage.getItem("user"));

    if (!usuario) {
        setTimeout(() => { window.location.href = "login.html"; },);
        return;
    }

    const id_usuario = usuario.id_usuario;

    try {
        const response = await fetch(`http://localhost:3000/reportes/${id_usuario}`);
        const reportes = await response.json();

        tableBody.innerHTML = ""; // Limpiar tabla

        if (reportes.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted">No tienes reportes registrados</td>
                </tr>
            `;
            return;
        }

        reportes.forEach(reporte => {
            let row = document.createElement("tr");

            row.innerHTML = `
                <td>${reporte.id_reporte}</td>
                <td>Equipo ${reporte.numero_equipo}</td>
                <td>${reporte.nombre_laboratorio}</td>
                <td>${new Date(reporte.fecha_hora).toLocaleString()}</td>
                <td>
                    <button class="btn btn-info btn-sm ver-detalle" 
                        data-bs-toggle="modal" 
                        data-bs-target="#miModal"
                        data-descripcion="${reporte.descripcion}">
                        📄 Ver
                    </button>
                </td>
                <td>
                    <span class="badge bg-${reporte.estatus === 'Pendiente' ? 'danger' : 'success'}">
                        ${reporte.estatus}
                    </span>
                </td>
            `;

            tableBody.appendChild(row);
        });

        $(document).ready(function () {
            $("#basic-datatables").DataTable({
                "pageLength": 5,     
                "lengthChange": false, 
                "language": {
                    "paginate": { "previous": "←", "next": "→" },
                    "info": "Página _PAGE_ de _PAGES_",
                    "search": "Buscar:"
                }
            });
        });

        // Mostrar descripción en el modal
        document.querySelectorAll(".ver-detalle").forEach(button => {
            button.addEventListener("click", function () {
                document.querySelector("#descripcionProblema").textContent = this.getAttribute("data-descripcion");
            });
        });

    } catch (error) {
        console.error("Error al cargar reportes:", error);
        Swal.fire("Error", "No se pudieron cargar los reportes", "error");
    }
});
