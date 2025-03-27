const CACHE_NAME = "reportes-cache-v1";
const urlsToCache = [
    "/",
    "/login.html",
    "/crearReporte.html",
    "/verReportes.html",
    "/verUsuarios.html",
    "/gestionReportes.html",
    "/styles/css/style.css",
    "/styles/images/logo-piaget.png",
    "/js/login.js",
    "/js/logout.js",
    "/js/crearReporte.js",
    "/js/verReporte.js",
    "/manifest.json",
    "/offline.html"
];

// Instalar y cachear archivos
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log("✅ Cacheando archivos...");
                return cache.addAll(urlsToCache);
            })
            .catch((err) => console.error("❌ Error cacheando archivos:", err))
    );
});

// Activar y limpiar caché antigua
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) =>
            Promise.all(
                cacheNames.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log("🧹 Borrando caché antigua:", key);
                        return caches.delete(key);
                    }
                })
            )
        )
    );
});

// Interceptar peticiones
self.addEventListener("fetch", event => {
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) return cachedResponse;

            return fetch(event.request).catch(() => {
                // Si es navegación (HTML) y falla, carga la offline
                if (event.request.mode === 'navigate') {
                    return caches.match('/offline.html');
                }
            });
        })
    );
});

