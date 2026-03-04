# 📦 Inventario — Sistema de Préstamos en Tiempo Real

App React + Firebase Firestore. 20 usuarios ven los mismos datos en vivo.

---

## 🚀 Pasos para tenerlo online en ~10 minutos

### 1. Crear proyecto Firebase (gratis)

1. Ve a https://console.firebase.google.com
2. Clic en **"Agregar proyecto"** → ponle nombre → continuar
3. Desactiva Google Analytics si no lo necesitas → **Crear proyecto**
4. En el menú izquierdo → **Firestore Database** → **Crear base de datos**
   - Elige **"Comenzar en modo de prueba"** (puedes securizarlo después)
   - Selecciona la región más cercana (ej: `us-east1`)
5. Vuelve al inicio del proyecto → clic en **"</>"** (Web app)
   - Registra la app con cualquier nombre
   - Copia el objeto `firebaseConfig` que aparece

### 2. Pegar tus credenciales

Abre el archivo `src/firebase.js` y reemplaza los valores:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",          // ← tu valor real
  authDomain: "mi-proyecto.firebaseapp.com",
  projectId: "mi-proyecto",
  storageBucket: "mi-proyecto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### 3. Subir a Vercel (gratis, sin servidor)

**Opción A — Sin instalar nada (arrastra y suelta):**
1. Ejecuta localmente:
   ```bash
   npm install
   npm run build
   ```
2. Ve a https://vercel.com → crea cuenta gratis
3. Clic en **"Add New Project"** → **"Browse"** → sube la carpeta `build/`
4. ¡Listo! Te da una URL pública tipo `https://inventario-xxx.vercel.app`

**Opción B — Con GitHub (recomendado para actualizaciones):**
1. Sube este proyecto a un repo de GitHub
2. En Vercel → "Import Git Repository" → conecta tu repo
3. Vercel detecta React automáticamente → Deploy
4. Cada vez que hagas `git push`, se actualiza solo

---

## 🔒 Seguridad (opcional pero recomendado)

En Firebase Console → Firestore → **Reglas**, cambia a:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // Modo abierto, OK para red interna
    }
  }
}
```
Para producción con autenticación, contacta a tu desarrollador.

---

## 📋 Uso diario

- **+ Ítem**: Agrega herramientas, equipos, materiales a tu inventario
- **+ Préstamo**: Registra quién lleva qué y cuándo
- **Registrar devolución**: Un clic cuando devuelven el ítem
- Los datos se sincronizan en tiempo real para todos los usuarios
- Préstamos con más de 7 días se marcan en rojo automáticamente
