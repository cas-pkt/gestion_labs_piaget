document.addEventListener("DOMContentLoaded", async function () {
    await cargarLaboratorios();
});

async function cargarLaboratorios() {
    try {
        const response = await fetch("http://localhost:3000/laboratorios");
        const laboratorios = await response.json();

        let selectLaboratorios = document.getElementById("laboratorioSelect");
        selectLaboratorios.innerHTML = "<option disabled selected value=''>Selecciona un laboratorio</option>";

        laboratorios.forEach(lab => {
            let option = document.createElement("option");
            option.value = lab.id_laboratorio;
            option.textContent = lab.nombre_laboratorio;
            selectLaboratorios.appendChild(option);
        });

        // Detectar cambios
        selectLaboratorios.addEventListener("change", function () {
            let idLaboratorio = this.value;
            if (idLaboratorio) {
                cargarEquipos(idLaboratorio);
            } else {
                limpiarEquipos();
            }
        });

    } catch (error) {
        console.error("Error al obtener laboratorios:", error);
    }
}

async function cargarEquipos(idLaboratorio) {
    try {
        const response = await fetch(`http://localhost:3000/equipos/${idLaboratorio}`);
        const equipos = await response.json();


        let selectEquipos = document.getElementById("equipoSelect");
        selectEquipos.innerHTML = "<option disabled selected value=''>Selecciona un equipo</option>";

        equipos.forEach(equipo => {
            let option = document.createElement("option");
            option.value = equipo.id_equipo;

            option.textContent = equipo.numero_equipo || "Sin nombre";
            selectEquipos.appendChild(option);
        });

    } catch (error) {
        console.error("Error al obtener equipos:", error);
    }
}


// Función para limpiar equipos si no hay laboratorio seleccionado
function limpiarEquipos() {
    let selectEquipos = document.getElementById("equipoSelect");
    selectEquipos.innerHTML = "<option disabled selected value=''>Selecciona un equipo</option>";
}




document.getElementById("enviarReporte").addEventListener("click", async function () {
    // Obtener valores del formulario
    const id_equipo = document.getElementById("equipoSelect").value;
    const id_laboratorio = document.getElementById("laboratorioSelect").value;
    const descripcion = document.getElementById("descripcionProblema").value;
    
    // Obtener el usuario almacenado
    const storage = localStorage.getItem("user") ? localStorage : sessionStorage;
    const usuario = JSON.parse(storage.getItem("user"));

    if (!usuario) {
        Swal.fire({
            icon: "error",
            title: "Error",
            text: "No se ha identificado el usuario.",
            confirmButtonText: "Ir al login"
        }).then(() => {
            window.location.href = "login.html"; // Redirigir si no hay usuario
        });
        return;
    }

    const id_usuario = usuario.id_usuario;

    // Verificar que la descripción no esté vacía
    if (descripcion.trim() === "") {
        Swal.fire({
            icon: "warning",
            title: "Campo vacío",
            text: "Por favor, describe el problema.",
            confirmButtonText: "Entendido"
        });
        return;
    }

    try {
        const response = await fetch("http://localhost:3000/crearReporte", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id_usuario, id_equipo, id_laboratorio, descripcion })
        });

        const data = await response.json();

        if (response.ok) {
            Swal.fire({
                icon: "success",
                title: "¡Reporte enviado!",
                text: "El reporte se ha enviado correctamente.",
                confirmButtonText: "Aceptar"
            }).then(() => {
                window.location.reload(); // Recargar la página después de enviar el reporte
            });
        } else {
            Swal.fire({
                icon: "error",
                title: "Error al enviar",
                text: data.message,
                confirmButtonText: "Intentar de nuevo"
            });
        }
    } catch (error) {
        Swal.fire({
            icon: "error",
            title: "Error en la conexión",
            text: "No se pudo conectar con el servidor.",
            confirmButtonText: "Aceptar"
        });
    }
});

