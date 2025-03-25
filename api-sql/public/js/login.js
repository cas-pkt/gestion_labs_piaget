document.getElementById("loginForm").addEventListener("submit", async function (event) {
    event.preventDefault();

    const correo = document.getElementById("correo").value;
    const password = document.getElementById("password").value;
    const rememberMe = document.getElementById("rememberMe").checked;
    const message = document.getElementById("message");

    try {
        const response = await fetch("http://localhost:3000/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ correo, password })
        });

        const data = await response.json();

        // Mensaje
        message.style.display = "block";
        message.textContent = data.message;

        if (response.ok) {
            message.classList.remove("alert-danger");
            message.classList.add("alert-success");

            const storage = rememberMe ? localStorage : sessionStorage;
            storage.setItem("user", JSON.stringify(data.user));

            if (data.user.id_rol === 1) {
                setTimeout(() => { window.location.href = "crearReporte.html"; }, 1000);
            } else if (data.user.id_rol === 2) {
                setTimeout(() => { window.location.href = "gestionReportes.html"; }, 1000);
            } else {
                message.textContent = "Su rol no está autorizado.";
                message.classList.add("alert-danger");
            }
        } else {
            message.classList.remove("alert-success");
            message.classList.add("alert-danger");
        }
    } catch (error) {
        message.style.display = "block";
        message.classList.add("alert-danger");
        message.textContent = "Error en la conexión con el servidor.";
    }

    // Abrir modal
    document.querySelector("a[href='#']").addEventListener("click", function (e) {
        e.preventDefault();
        const modal = new bootstrap.Modal(document.getElementById("modalRecuperar"));
        modal.show();
    });

    // Enviar formulario de recuperación
    document.getElementById("formRecuperar").addEventListener("submit", async function (e) {
        e.preventDefault();
        const correo = document.getElementById("correoRecuperacion").value.trim();

        try {
            const response = await fetch("http://localhost:3000/api/recuperar-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ correo })
            });

            const data = await response.json();

            if (response.ok) {
                Swal.fire("📧 Enviado", data.message || "Revisa tu correo para cambiar tu contraseña", "success");
                bootstrap.Modal.getInstance(document.getElementById("modalRecuperar")).hide();
            } else {
                Swal.fire("❌ Error", data.message || "No se encontró el correo", "error");
            }
        } catch (err) {
            Swal.fire("❌ Error", "No se pudo enviar el correo de recuperación", "error");
        }
    });

});
