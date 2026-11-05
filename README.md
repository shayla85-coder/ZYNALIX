# ZYNALIX

## Ejecutar el sitio

Se necesita Node.js 20 o posterior. El frontend está construido con React para renderizar la landing page y los formularios, y el servidor sigue manejando la API y la persistencia del negocio.

En PowerShell, desde la carpeta del proyecto, ejecuta:

```powershell
npm start
```

Abre `http://localhost:3000`. Para detener el servidor, usa `Ctrl+C`.

## Privacidad y publicación

- El chat usa respuestas predefinidas sobre servicios, precios y soporte; las preguntas se procesan en el navegador y no se guardan ni se envían a Google Gemini.
- El sitio también incluye formularios y un panel que requieren el servidor Node.js y una base de datos PostgreSQL. No publiques esta aplicación como archivos estáticos únicamente.
- Para publicar el servidor detrás de un proxy, configura `HOST=0.0.0.0` y `PORT` en el panel de la plataforma.

Para comprobar el servidor y las validaciones localmente, ejecuta `npm test`.
