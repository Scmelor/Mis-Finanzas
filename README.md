# 🌸 Mis Finanzas

**App web progresiva (PWA) para organizar las finanzas personales mes a mes**, con inicio de sesión y sincronización en tiempo real entre celular y computador.

🔗 **Demo:** [scmelor.github.io/Mis-Finanzas](https://scmelor.github.io/Mis-Finanzas/)
🔑 **Cuenta de prueba:** `demo@misfinanzas.app` · contraseña `Demo2026!` *(datos ficticios, puedes editarlos)*

<p align="center">
  <img src="docs/finanzas.png" alt="Vista principal" width="32%">
  <img src="docs/inversiones.png" alt="Calculadora de inversiones" width="32%">
  <img src="docs/movil.png" alt="Vista en celular" width="32%">
</p>

---

## ✨ Funcionalidades

- **Navegación por meses** tipo *slider* (flechas o deslizando) con periodo configurable (ej. del 25 al 25).
- **Ingresos** con varias fuentes y categorías.
- **Gastos del hogar** (fijos) que se marcan como pagados y se trasladan solos al mes siguiente.
- **Gastos personales** con límite mensual y registro de gasto real.
- **Ahorro** con recomendación automática del 20 % de los ingresos.
- **Deudas de tarjetas** y **calculadora de deudas** (costo total y conversión de tasas).
- **Calculadora de inversiones** que suma la ganancia a tus finanzas.
- **Cierre de mes**: pasa el saldo libre y los gastos fijos al mes siguiente.
- **Gráfica de torta** con la distribución real de los ingresos.
- **3 temas visuales** y ayudas contextuales la primera vez que usas cada botón.
- **Exportación** de respaldo en `.txt`.
- **Widgets para iPhone** (Scriptable) que muestran el saldo libre del mes.

## 🛠️ Tecnologías

| Área | Herramientas |
|---|---|
| Frontend | HTML5, CSS3, JavaScript (ES6+), sin frameworks |
| Backend como servicio | Firebase Authentication (correo/contraseña) y Realtime Database |
| PWA | Web App Manifest y Service Worker (instalable, funciona sin conexión) |
| Despliegue | GitHub Pages |

## 🔐 Seguridad

Cada usuario solo puede leer y escribir **sus propios datos**. Lo garantizan las reglas de Realtime Database ([`database.rules.json`](database.rules.json)):

```json
"users": { "$uid": {
  ".read":  "auth != null && auth.uid === $uid",
  ".write": "auth != null && auth.uid === $uid"
}}
```

> La configuración web de Firebase que aparece en `index.html` no es secreta: identifica el proyecto. La protección de los datos está en las reglas y en la autenticación.

## 🧠 Qué aprendí

- Diseñar el **modelo de datos por usuario** en una base NoSQL en tiempo real.
- Implementar **autenticación** y proteger datos con **reglas de seguridad** del lado del servidor.
- Convertir una app web en **PWA**: caché con Service Worker, versionado y actualización automática.
- Diseñar una interfaz **mobile-first** con gestos (deslizar) y varios temas.

## 🚀 Ejecutar tu propia copia

1. Haz un *fork* o descarga el repositorio.
2. Crea un proyecto en [Firebase](https://console.firebase.google.com) y activa **Authentication → Correo/Contraseña** y **Realtime Database**.
3. En Realtime Database → **Reglas**, pega el contenido de `database.rules.json` y publica.
4. En `index.html`, reemplaza el objeto `FIREBASE_CONFIG` por la configuración web de tu proyecto.
5. Activa **GitHub Pages** (Settings → Pages → `main` / root).
6. Al actualizar `index.html`, sube la versión de `CACHE` en `sw.js` para que la app instalada tome los cambios.

### Instalar en el celular

- **Android (Chrome):** menú ⋮ → *Instalar aplicación*.
- **iPhone (Safari):** Compartir → *Agregar a inicio*.

---

Desarrollado por **Silvia Melo** · [github.com/Scmelor](https://github.com/Scmelor)
