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
});
