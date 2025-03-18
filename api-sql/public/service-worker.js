self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open("app-cache").then((cache) => {
            return cache.addAll([
                "/login.html",
                "/crearReporte.html",
                "/verReportes.html",
                "/styles.css",
                "/js/login.js",
                "/js/logout.js",
                "/js/crearReporte.js",
                "/js/verReporte.js",
                "styles/images/logo-piaget.png"
            ]);
        })
    );
});

self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
