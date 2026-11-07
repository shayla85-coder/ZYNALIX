# ZYNALIX

## Ejecutar el sitio

Se necesita Node.js 20 o posterior. El catálogo, el panel administrativo y los formularios funcionan con el servidor Node.js, sin PostgreSQL ni otros paquetes. El asistente responde con opciones predefinidas en el navegador.

En PowerShell, desde la carpeta del proyecto, ejecuta:

```powershell
npm start
```

Abre `http://localhost:3000`. Para detener el servidor, usa `Ctrl+C`.

## Funcionamiento y privacidad

- El sitio no usa SQL. El servidor guarda servicios, mensajes y cotizaciones en `data/zynalix.json`, que se crea al usar el sitio y está excluido de Git.
- Para abrir el panel, usa **Acceso administrador** al pie de página. Debes configurar `ADMIN_USERNAME`, `ADMIN_PASSWORD` (mínimo 12 caracteres) y `ADMIN_SESSION_SECRET` (mínimo 32 caracteres) como variables de entorno antes de iniciar el servidor. No hay una contraseña predeterminada.
- El asistente usa respuestas predefinidas en el navegador y no guarda la conversación.
- El archivo local permite uso en un servidor con disco persistente y una sola instancia. Si se publica en una plataforma con disco efímero o varias instancias, se necesita almacenamiento persistente compartido para no perder ni desincronizar datos.
- Para publicar el servidor detrás de un proxy, configura `HOST=0.0.0.0` y `PORT` en el panel de la plataforma.

En PowerShell, configura credenciales seguras y arranca el servidor en la misma ventana:

```powershell
$env:ADMIN_USERNAME = "admin"
$env:ADMIN_PASSWORD = "escribe-una-clave-unica-de-al-menos-12-caracteres"
$env:ADMIN_SESSION_SECRET = "reemplaza-por-un-secreto-aleatorio-de-al-menos-32-caracteres"
npm start
```

Para comprobarlo localmente, ejecuta `npm test`.

## Publicación de vista estática en GitHub Pages

Cada actualización de `main` ejecuta las pruebas y publica una vista estática del sitio en GitHub Pages. En el repositorio, abre **Settings → Pages** y selecciona **GitHub Actions** como origen del despliegue. La URL será `https://shayla85-coder.github.io/ZYNALIX/`.

GitHub Pages no ejecuta Node.js: la vista publicada muestra el catálogo y el cotizador, y abre WhatsApp para enviar consultas. El asistente usa respuestas predefinidas. El panel y el almacenamiento de solicitudes requieren el servidor Node.js y no están disponibles en esta vista.
