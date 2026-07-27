# 🌸 Mis Finanzas

App web para controlar tus finanzas personales (en pesos colombianos), con diseño pastel y responsive. Navegación por meses tipo slider, gráfica de distribución de ingresos y sincronización en la nube con inicio de sesión.

## Funciones

- **Navegación por meses:** flechas ◀ ▶ y deslizar (swipe) para moverte entre meses. El título arriba muestra el mes.
- **Ingresos** con varias fuentes y su categoría.
- **Hogar (gastos fijos):** se marcan como pagados y reaparecen cada mes nuevo automáticamente.
- **Personales:** límite mensual + registro de gastos reales.
- **Ahorro** con recomendación del 20% de tus ingresos.
- **Deuda** de tarjetas.
- **Torta:** distribución de tus ingresos usando el **gasto real** de cada categoría.
- **Exportar .txt** de respaldo.
- **Sincronización entre dispositivos** con login (correo y contraseña).

## Cómo activar la sincronización (Firebase) — paso a paso

Sin esto, la app funciona en "modo local" (solo en el dispositivo donde la abres). Para verla igual en el celular y el computador:

### 1. Crear el proyecto
1. Entra a https://console.firebase.google.com e inicia con tu cuenta de Google.
2. **Agregar proyecto** → ponle un nombre (ej: `mis-finanzas`) → puedes desactivar Google Analytics → **Crear proyecto**.

### 2. Activar el inicio de sesión
1. En el menú izquierdo: **Compilación → Authentication → Comenzar**.
2. Pestaña **Sign-in method** → habilita **Correo electrónico/Contraseña** → **Guardar**.

### 3. Crear la base de datos en tiempo real
1. Menú izquierdo: **Compilación → Realtime Database → Crear base de datos**.
2. Elige la ubicación → empieza en **modo bloqueado (locked)** → **Habilitar**.
3. Ve a la pestaña **Reglas (Rules)** y pega exactamente esto, luego **Publicar**:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid"
      }
    }
  }
}
```

Esto hace que **cada persona solo pueda ver y editar sus propios datos**. Es lo que mantiene tu información segura aunque el repositorio sea público.

### 4. Obtener tus claves (config)
1. Icono de engranaje ⚙️ (arriba izq.) → **Configuración del proyecto**.
2. Baja hasta **Tus apps** → toca el icono **</>** (Web) → registra la app con cualquier apodo.
3. Firebase te muestra un bloque `const firebaseConfig = { ... }`. Copia los valores.

### 5. Pegar las claves en el archivo
1. Abre `index.html` y busca al inicio del `<script>` el bloque:

```js
const FIREBASE_CONFIG = {
  apiKey: "PEGA_TU_API_KEY",
  authDomain: "PEGA_TU_PROYECTO.firebaseapp.com",
  databaseURL: "https://PEGA_TU_PROYECTO-default-rtdb.firebaseio.com",
  projectId: "PEGA_TU_PROYECTO",
  appId: "PEGA_TU_APP_ID"
};
```

2. Reemplaza cada valor `PEGA_...` por el tuyo. **Importante:** el `databaseURL` debe ser el de tu Realtime Database (aparece en esa sección, termina en `.firebaseio.com`). Si tu config de la web no lo trae, cópialo desde **Realtime Database**.

### 6. Subir el cambio a GitHub
1. En tu repo, entra a `index.html` → icono del lápiz ✏️ → pega el archivo actualizado → **Commit changes**.
2. Espera ~1 minuto y abre tu link. Ahora te pedirá **crear cuenta / iniciar sesión**.
3. Usa el mismo correo y contraseña en el celular y en el computador: verás la misma información y se actualiza sola. 🎉

## Nota de seguridad

Las claves de Firebase en el código son normales y no son secretas por sí solas: lo que protege tus datos son las **reglas** del paso 3 y tu **contraseña**. Usa una contraseña que no repitas en otros sitios.

## Instalar en el celular (app / PWA)

La app se puede instalar como una aplicación (ícono propio, pantalla completa y funciona sin internet). Para eso el repositorio debe tener estos archivos, todos en la raíz:

`index.html`, `manifest.json`, `sw.js`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`.

Sube los que falten con **Add file → Upload files → Commit changes**. Luego:

- **Android (Chrome):** abre tu link, aparecerá "Instalar app" (o menú ⋮ → Instalar aplicación / Agregar a pantalla de inicio).
- **iPhone (Safari):** abre tu link → botón compartir → **Agregar a inicio**.

Queda un ícono como el de cualquier app. Al abrirla se ve a pantalla completa y, si no tienes señal, muestra lo último guardado.

Cada vez que actualices `index.html`, sube también el número de versión en `sw.js` (`mis-finanzas-v1` → `v2`, etc.) para que la app tome los cambios.
