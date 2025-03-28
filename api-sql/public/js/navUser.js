document.addEventListener("DOMContentLoaded", function () {
    const user = JSON.parse(localStorage.getItem("user"));
    if (performance.navigation.type === 2) {
        location.reload(true);
    }
    

    if (!user) {
        // 🔐 Redirige si no hay sesión iniciada
        window.location.href = "login.html";
        return; // ⚠️ Detiene ejecución si no hay usuario
    }

    // Mostrar info del usuario
    document.getElementById("userName").textContent = user.nombre;
    document.getElementById("userBoxName").textContent = user.nombre;
    document.getElementById("userEmail").textContent = user.correo;
});

// 🔓 Cerrar sesión
document.getElementById("logout").addEventListener("click", function () {
    localStorage.removeItem("user");

    // 🔒 Borra caché del historial y redirige
    window.location.replace("login.html");
});

