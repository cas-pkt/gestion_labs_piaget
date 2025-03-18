document.addEventListener("DOMContentLoaded", async function () {
    const tabContainer = document.getElementById("laboratorioTabs");
    const contentContainer = document.getElementById("laboratorioContent");
    const formLaboratorio = document.getElementById("formLaboratorio");
    const btnAgregarLaboratorio = document.getElementById("btnAgregarLaboratorio");

    if (!tabContainer || !contentContainer || !formLaboratorio || !btnAgregarLaboratorio) {
        console.error("❌ Elementos no encontrados en el DOM.");
        return;
    }

    document.addEventListener("DOMContentLoaded", function () {
        const btnAgregarLaboratorio = document.getElementById("btnAgregarLaboratorio");
    
        if (btnAgregarLaboratorio) {
            btnAgregarLaboratorio.addEventListener("click", () => {
                console.log("🛠 Agregar laboratorio...");
            });
        } else {
            console.error("❌ Error: El botón 'btnAgregarLaboratorio' no se encontró en el DOM.");
        }
    });

    
    // 👉 Función para cargar laboratorios y agregarlos a las pestañas
    async function cargarLaboratorios() {
        try {
            const response = await fetch("http://localhost:3000/api/laboratorios");
            const laboratorios = await response.json();

            console.log("📥 Datos recibidos del backend:", laboratorios);

            if (!Array.isArray(laboratorios)) {
                console.error("❌ Respuesta inesperada de la API de laboratorios:", laboratorios);
                return;
            }

            tabContainer.innerHTML = "";
            contentContainer.innerHTML = "";

            // 🔹 Generar pestañas y contenedores de equipos primero
            laboratorios.forEach((lab, index) => {
                if (!lab.id_laboratorio || !lab.nombre_laboratorio) {
                    console.error("⚠️ Error: Datos incorrectos en laboratorio", lab);
                    return;
                }

                // Agregar pestaña de laboratorio
                tabContainer.innerHTML += `
                    <li class="nav-item">
                        <button class="nav-link ${index === 0 ? 'active' : ''}" data-bs-toggle="tab" data-bs-target="#lab-${lab.id_laboratorio}">
                            ${lab.nombre_laboratorio}
                        </button>
                    </li>`;

                // Agregar contenido del laboratorio con un contenedor de equipos
                contentContainer.innerHTML += `
                    <div class="tab-pane fade ${index === 0 ? 'show active' : ''}" id="lab-${lab.id_laboratorio}">
                        <div class="row p-3" id="equipos-lab-${lab.id_laboratorio}">
                            <!-- Computadoras del laboratorio se cargarán aquí -->
                        </div>
                    </div>`;
            });

            // 🔹 Cargar equipos después de que los contenedores ya existen
            laboratorios.forEach((lab) => {
                console.log(`⚙️ Cargando equipos para laboratorio: ${lab.id_laboratorio}`);
                cargarEquipos(lab.id_laboratorio);
            });

        } catch (error) {
            console.error("❌ Error al cargar laboratorios:", error);
        }
    }

    // 👉 Función para cargar equipos dentro de cada laboratorio
    async function cargarEquipos(idLaboratorio) {
        if (!idLaboratorio) {
            console.error("❌ Error: idLaboratorio no definido antes de cargar equipos.");
            return;
        }

        try {
            const response = await fetch(`http://localhost:3000/api/laboratorios/${idLaboratorio}/equipos`);
            const equipos = await response.json();

            console.log(`📥 Equipos recibidos para el laboratorio ${idLaboratorio}:`, equipos);

            if (!Array.isArray(equipos)) {
                console.error(`❌ Error: Respuesta inesperada de la API para el laboratorio ${idLaboratorio}:`, equipos);
                return;
            }

            const container = document.getElementById(`equipos-lab-${idLaboratorio}`);
            if (!container) {
                console.error(`⚠️ Contenedor no encontrado para el laboratorio ${idLaboratorio}`);
                return;
            }

            container.innerHTML = "";

            equipos.forEach(equipo => { 
                container.innerHTML += `
                    <div class="col-md-4">
                        <div class="card">
                            <div class="card-body text-center">
                                <h5>PC-${equipo.id_equipo}</h5>
                                <p>Estado: ${equipo.estado || 'Desconocido'}</p>
                                <button class="btn btn-info btn-sm" onclick="verEquipo(${equipo.id_equipo})">
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

    // 👉 Evento para abrir el modal de agregar laboratorio
    btnAgregarLaboratorio.addEventListener("click", function () {
        console.log("✅ Botón 'Agregar Laboratorio' presionado");
        $("#modalLaboratorio").modal("show"); // Abre el modal
    });

    // 👉 Evento para agregar un nuevo laboratorio
    formLaboratorio.addEventListener("submit", async function (event) {
        event.preventDefault(); // Evita la recarga de la página

        const nombre = document.getElementById("nombreLaboratorio").value.trim();
        const nivel = parseInt(document.getElementById("nivelLaboratorio").value);

        if (!nombre || isNaN(nivel)) {
            alert("⚠️ Todos los campos son obligatorios y el nivel debe ser válido.");
            return;
        }

        console.log("📩 Enviando datos:", { nombre_laboratorio: nombre, id_nivel: nivel });

        try {
            const response = await fetch("http://localhost:3000/api/laboratorios", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nombre_laboratorio: nombre,
                    id_nivel: nivel
                }),
            });

            const result = await response.json();
            console.log("✅ Respuesta del servidor:", result);

            if (response.ok) {
                alert("Laboratorio agregado exitosamente.");
                $("#modalLaboratorio").modal("hide"); // Cierra el modal
                cargarLaboratorios(); // 🔄 Recargar laboratorios sin recargar la página
            } else {
                alert("❌ Error al agregar laboratorio: " + result.message);
            }
        } catch (error) {
            console.error("❌ Error en la solicitud:", error);
            alert("Error al conectar con el servidor.");
        }
    });

    // 🔄 Cargar laboratorios al inicio
    cargarLaboratorios();
});
