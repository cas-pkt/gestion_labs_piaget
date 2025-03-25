document.addEventListener("DOMContentLoaded", function () {
    const contenedor = document.getElementById("historialReportes");
    const filtros = {
        fecha: document.getElementById("filterFecha"),
        usuario: document.getElementById("filterUsuario"),
        laboratorio: document.getElementById("filterLaboratorio"),
        nivel: document.getElementById("filterNivel")
    };

    let todosReportes = [];

    async function obtenerHistorial() {
        try {
            const response = await fetch("http://localhost:3000/api/historialReportes");
            todosReportes = await response.json();
            renderizarHistorial(todosReportes);
            cargarFiltros(todosReportes);
        } catch (error) {
            console.error("❌ Error al cargar historial:", error);
        }
    }

    function renderizarHistorial(reportes) {
        contenedor.innerHTML = "";

        if (!reportes.length) {
            contenedor.innerHTML = `<div class="text-muted text-center">No hay reportes registrados.</div>`;
            return;
        }

        let tabla = `
            <div class="table-responsive">
                <table class="table table-striped table-hover table-bordered align-middle text-center">
                    <thead class="table-dark">
                        <tr>
                            <th>Fecha</th>
                            <th>Equipo</th>
                            <th>Laboratorio</th>
                            <th>Usuario</th>
                            <th>Nivel</th>
                            <th>Descripción</th>
                            <th>Observaciones</th>
                            <th>Estatus</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        reportes.forEach(reporte => {
            const fecha = new Date(reporte.fecha_hora);
            const fechaStr = fecha.toLocaleDateString() + " " + fecha.toLocaleTimeString();
            const badgeColor = reporte.estatus === "Pendiente"
                ? "secondary"
                : reporte.estatus === "En proceso"
                    ? "warning text-dark"
                    : "success";

            tabla += `
                <tr>
                    <td>${fechaStr}</td>
                    <td>${reporte.numero_equipo}</td>
                    <td>${reporte.nombre_laboratorio}</td>
                    <td>${reporte.nombre_usuario || 'Desconocido'}</td>
                    <td>${reporte.nivel_usuario || 'No asignado'}</td>
                    <td>${reporte.descripcion}</td>
                    <td>${reporte.observaciones || '<em>Sin observaciones</em>'}</td>
                    <td><span class="badge bg-${badgeColor}">${reporte.estatus}</span></td>
                </tr>
            `;
        });

        tabla += `
                    </tbody>
                </table>
            </div>
        `;

        contenedor.innerHTML = tabla;
    }


    function cargarFiltros(reportes) {
        const usuarios = new Set();
        const laboratorios = new Set();
        const niveles = new Set();

        reportes.forEach(rep => {
            if (rep.nombre_usuario && rep.nombre_usuario !== 'Desconocido') usuarios.add(rep.nombre_usuario);
            if (rep.nombre_laboratorio) laboratorios.add(rep.nombre_laboratorio);
            if (rep.nivel_usuario && rep.nivel_usuario !== 'No asignado') niveles.add(rep.nivel_usuario);
        });

        // Limpiar selectores antes de agregar
        filtros.usuario.innerHTML = `<option value="">Todos</option>`;
        filtros.laboratorio.innerHTML = `<option value="">Todos</option>`;
        filtros.nivel.innerHTML = `<option value="">Todos</option>`;

        filtros.usuario.innerHTML += Array.from(usuarios).map(u => `<option value="${u}">${u}</option>`).join("");
        filtros.laboratorio.innerHTML += Array.from(laboratorios).map(l => `<option value="${l}">${l}</option>`).join("");
        filtros.nivel.innerHTML += Array.from(niveles).map(n => `<option value="${n}">${n}</option>`).join("");
    }


    function aplicarFiltros() {
        const fecha = filtros.fecha.value;
        const usuario = filtros.usuario.value;
        const laboratorio = filtros.laboratorio.value;
        const nivel = filtros.nivel.value;

        const filtrados = todosReportes.filter(rep => {
            const fechaReporte = new Date(rep.fecha_hora).toISOString().slice(0, 10); // YYYY-MM-DD
            const coincideFecha = !fecha || fecha === fechaReporte;
            const coincideUsuario = !usuario || rep.nombre_usuario === usuario;
            const coincideLab = !laboratorio || rep.nombre_laboratorio === laboratorio;
            const coincideNivel = !nivel || rep.nivel_usuario === nivel;
            return coincideFecha && coincideUsuario && coincideLab && coincideNivel;
        });

        renderizarHistorial(filtrados);
    }


    Object.values(filtros).forEach(input => {
        input.addEventListener("change", aplicarFiltros);
    });

    obtenerHistorial();
});
