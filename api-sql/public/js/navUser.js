document.addEventListener("DOMContentLoaded", function () {
    const user = JSON.parse(localStorage.getItem("user"));

    if (user) {
        document.getElementById("userName").textContent = user.nombre;
        document.getElementById("userBoxName").textContent = user.nombre;
        document.getElementById("userEmail").textContent = user.correo;
    }
});

document.getElementById("logout").addEventListener("click", function () {
    localStorage.removeItem("user");
    window.location.href = "login.html";
});