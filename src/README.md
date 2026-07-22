# Embed Scraper Pro 🎬💳

Un extractor ultra-premium, moderno y seguro de reproductores de video de alta velocidad con integración real de **Mercado Pago**. Este proyecto está desarrollado utilizando **React 19 + TypeScript + Vite** para la interfaz de usuario, y un servidor robusto en **Express** con un motor de desofuscación avanzado capaz de analizar e-frames y descifrar Base64, Hexadecimal, y scripts empaquetados mediante regex en tiempo real.

## 🌟 Características Principales

*   **Fondo Negro Absoluto (AMOLED Black Theme):** Diseño minimalista, elegante, moderno y enfocado a evitar la fatiga visual.
*   **Detección Multicapa de Enlaces:**
    *   **Escaneo de iFrames:** Detección de etiquetas incrustadas en el DOM.
    *   **Desofuscación Base64:** Decodifica texto en Base64 en tiempo de ejecución para encontrar reproductores ocultos.
    *   **Decodificador Hexadecimal y Unicode:** Convierte secuencias tipo `\x68\x74\x74\x70\x73` automáticamente.
*   **Límites de Uso Inteligentes:** Límite inicial de 50 extracciones por usuario (almacenadas de forma segura en `localStorage`).
*   **Pasarela de Pago Real con MercadoPago:**
    *   Soporte para múltiples opciones: Paquete de +50 consultas ($1 USD), suscripción anual ilimitada ($8 USD) y acceso de por vida ($40 USD).
    *   Integración directa de extremo a extremo utilizando la API de preferencias de MercadoPago.
    *   Redirección automática de retorno (`back_urls`) que acredita el servicio al usuario de forma segura tras verificar el estado de pago.

---

## 🛠️ Requisitos Previos

Para ejecutar este proyecto de forma local necesitas:
1.  **Node.js** (versión 18 o superior).
2.  **npm** o **bun** instalado.
3.  Una cuenta de desarrollador de **Mercado Pago** para obtener tus credenciales.

---

## 🚀 Instalación y Ejecución Local

Sigue estos pasos para levantar el proyecto en tu máquina de desarrollo:

### 1. Clonar el repositorio
```bash
git clone https://github.com/TU_USUARIO/TU_REPOSITORIO.git
cd TU_REPOSITORIO
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
Crea un archivo `.env` en la raíz del proyecto basándote en el archivo `.env.example`:
```bash
cp .env.example .env
```

Edita el archivo `.env` y coloca tus credenciales reales de Mercado Pago:
```env
# URL base de tu aplicación (necesaria para el retorno de Mercado Pago)
APP_URL="http://localhost:3000"

# Credenciales de Mercado Pago (Sandbox o Producción)
MERCADOPAGO_ACCESS_TOKEN="TU_ACCESS_TOKEN_AQUÍ"
MERCADOPAGO_PUBLIC_KEY="TU_PUBLIC_KEY_AQUÍ"
```

> **⚠️ Importante:** El archivo `.env` está en el `.gitignore` por defecto. Esto evita que tus credenciales de Mercado Pago se suban de forma pública a GitHub. ¡Nunca borres `.env` del `.gitignore`!

### 4. Ejecutar en modo desarrollo
```bash
npm run dev
```
La aplicación se iniciará en `http://localhost:3000` con soporte full-stack de Express y React.

---

## 📦 Construcción para Producción

Para compilar el proyecto y prepararlo para desplegarlo en un servidor como VPS, Heroku, Render o Cloud Run, ejecuta:

```bash
npm run build
```
Esto generará:
*   El frontend compilado en la carpeta `dist/`.
*   El servidor unificado en un archivo de producción autoejecutable en `dist/server.cjs`.

Para iniciar el servidor en producción:
```bash
npm start
```

---

## 💻 Pasos para subir este proyecto a GitHub

Si quieres subir este proyecto a un repositorio propio en GitHub, sigue estos sencillos pasos desde tu terminal en la raíz del proyecto:

1.  **Inicializa un repositorio Git local:**
    ```bash
    git init
    ```

2.  **Añade todos los archivos al área de preparación:**
    ```bash
    git add .
    ```
    *(Gracias a `.gitignore`, las carpetas `node_modules`, `dist` y tu archivo personal `.env` con las claves secretas se mantendrán a salvo fuera de Git).*

3.  **Realiza tu primer commit:**
    ```bash
    git commit -m "feat: Integración de MercadoPago real, límites de scraper y tema dark-black"
    ```

4.  **Crea un repositorio vacío en GitHub:**
    *   Ve a [github.com/new](https://github.com/new)
    *   Dale un nombre como `embed-scraper-pro`
    *   Mantén el repositorio como público o privado (según tu preferencia) y **NO** selecciones inicializar con README, `.gitignore` o licencia para evitar conflictos.

5.  **Enlaza tu repositorio local con el remoto e introduce la rama principal:**
    ```bash
    git branch -M main
    git remote add origin https://github.com/TU_USUARIO/NOMBRE_DE_TU_REPOSITORIO.git
    ```
    *(Reemplaza la URL con la dirección de tu nuevo repositorio en GitHub).*

6.  **Sube los archivos:**
    ```bash
    git push -u origin main
    ```

¡Y listo! Tu proyecto se subirá de forma limpia y profesional, preparado para que lo compartas o lo despliegues donde desees.

---

## 🔒 Seguridad de Credenciales

Este proyecto implementa buenas prácticas de seguridad:
*   Las peticiones a la API de Mercado Pago se realizan exclusivamente del lado del servidor (`/api/create-preference` en `server.ts`).
*   Los Access Token nunca se exponen al navegador del cliente.
*   El archivo `.gitignore` protege el archivo `.env` de fugas accidentales.

---

## 📝 Licencia

Este software se proporciona como código de código abierto de uso libre. Puedes modificarlo, distribuirlo y usarlo en tus propios proyectos comerciales o educativos.
