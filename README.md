# ZYNALIX

## Ejecutar el sitio

Se necesita Node.js 20 o posterior. El catálogo, el panel administrativo y los formularios funcionan con el servidor Node.js, sin PostgreSQL ni otros paquetes. El chat con Gemini requiere la variable `GEMINI_API_KEY`.

En PowerShell, desde la carpeta del proyecto, ejecuta:

```powershell
npm start
```

Abre `http://localhost:3000`. Para detener el servidor, usa `Ctrl+C`.

## Funcionamiento y privacidad

- El sitio no usa SQL. El servidor guarda servicios, mensajes y cotizaciones en `data/zynalix.json`, que se crea al usar el sitio y está excluido de Git.
- Para abrir el panel, usa **Acceso administrador** al pie de página. Debes configurar `ADMIN_USERNAME`, `ADMIN_PASSWORD` (mínimo 12 caracteres) y `ADMIN_SESSION_SECRET` (mínimo 32 caracteres) como variables de entorno antes de iniciar el servidor. No hay una contraseña predeterminada.
- El chat envía las preguntas a Gemini desde el servidor cuando `GEMINI_API_KEY` está configurada; sin esa clave, el resto del sitio sigue funcionando.
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
