````markdown
# 🍎 Nutri App AI

Aplicación móvil de seguimiento nutricional impulsada por IA que analiza imágenes de comidas y genera recomendaciones personalizadas según tu objetivo.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Platform](https://img.shields.io/badge/platform-Expo%20%7C%20React%20Native-green)
![Backend](https://img.shields.io/badge/backend-FastAPI%20%7C%20Python-orange)

---

## 📚 Índice

- [Descripción](#-descripción)
- [Características](#-características)
- [Arquitectura](#-arquitectura-del-sistema)
- [Tecnologías](#-tecnologías)
- [Instalación](#-instalación)
  - [Backend](#backend)
  - [Frontend](#frontend)
  - [Docker](#-docker)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [API Endpoints](#-api-endpoints)
- [Base de Datos](#-base-de-datos)
- [Seguridad](#-seguridad)
- [Testing](#-testing)
- [Despliegue](#-despliegue)
- [Contribución](#-contribución)
- [Licencia](#-licencia)
- [Autores](#-autores)
- [Soporte](#-soporte)

---

## 📋 Descripción

**Nutri App AI** es una aplicación *cross-platform* (Android, iOS y Web) que utiliza visión artificial (OpenAI) para:

- Identificar alimentos a partir de fotografías.
- Estimar porciones y valores nutricionales.
- Calcular requerimientos diarios personalizados.
- Llevar un historial de comidas y progreso diario.

Está orientada a usuarios que desean controlar su alimentación de forma sencilla, visual y basada en datos.

---

## ✨ Características

- 📸 **Análisis de Imágenes**  
  Sube o toma una foto de tu comida y obtén detección de alimentos, peso estimado y valores nutricionales.

- 📊 **Seguimiento Diario**  
  Monitor de calorías, proteínas, carbohidratos y grasas consumidas en el día.

- 🎯 **Objetivos Personalizados**  
  Cálculo automático de requerimientos nutricionales según edad, peso, talla, género, nivel de actividad y objetivo.

- 📈 **Historial Completo**  
  Listado y detalle de comidas anteriores con desglose por alimento y macro-nutrientes.

- 📤 **Exportación de Datos**  
  Exporta tu historial a CSV o Excel filtrando por rango de fechas.

- 🌍 **Soporte de Zonas Horarias**  
  Manejo correcto de fechas y horas usando timezones IANA (por defecto `America/Lima`).

---

## 🏗️ Arquitectura del Sistema

```text
┌─────────────────────┐
│   React Native      │
│   Frontend (Expo)   │
└──────────┬──────────┘
           │
           │ REST API (JSON)
           │
┌──────────▼──────────┐
│    FastAPI API      │
│     (Python 3.10)   │
└──────┬──────┬───────┘
       │      │
       │      └──────────┐
       │                 │
┌──────▼──────┐   ┌─────▼─────┐
│  Supabase   │   │  OpenAI   │
│ Auth + DB   │   │  Vision   │
└─────────────┘   └───────────┘
````

---

## 🚀 Tecnologías

### Frontend

* **React Native** `0.79.5`
* **React** `19.0.0`
* **Expo** `~53.0.20`
* **expo-router** `~5.1.4` (navegación basada en archivos)
* **expo-image-picker** `^16.1.4`
* **expo-file-system**, **expo-sharing**
* **@supabase/supabase-js** `^2.53.0`
* **@react-native-async-storage/async-storage** `2.1.2`
* **TypeScript** `~5.8.3`

### Backend

* **Python** `3.10`
* **FastAPI** `0.116.1`
* **Uvicorn** `0.35.0`
* **supabase-py** `2.18.1`
* **openai** `1.101.0`
* **Pillow** `11.3.0` (procesamiento de imágenes)
* **openpyxl** (exportación a Excel)
* Dependencias extra en `backend/requirements.txt`

---

## 📦 Instalación

### Prerrequisitos

* **Node.js 18+** y **npm** o **yarn**
* **Python 3.10+**
* Cuenta de **Supabase** con:

  * URL del proyecto
  * `anon key` y `service role` (según uso)
* **API Key de OpenAI**
* **Expo CLI** (opcional, pero recomendado)

---

### Backend

```bash
# Clonar el repositorio
git clone https://github.com/maressay/nutri-app-ai.git
cd nutri-app-ai/backend

# Crear entorno virtual
python -m venv venv
# Linux / macOS
source venv/bin/activate
# Windows (PowerShell)
# .\venv\Scripts\Activate.ps1

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales:
# SUPABASE_URL=tu_url_de_supabase
# SUPABASE_KEY=tu_service_role_key
# OPENAI_API_KEY=tu_api_key_de_openai

# Ejecutar servidor de desarrollo
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

El backend quedará disponible en:
`http://localhost:8000`
Documentación interactiva de la API:

* Swagger UI: `http://localhost:8000/docs`
* Redoc: `http://localhost:8000/redoc`

---

### Frontend

```bash
cd ../frontend

# Instalar dependencias
npm install
# o
# yarn install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con:
# EXPO_PUBLIC_API_URL=http://192.168.X.X:8000/api   # IP de tu PC en la red local (no usar localhost en móviles)
# EXPO_PUBLIC_SUPABASE_URL=tu_url_de_supabase
# EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key

# Iniciar servidor de desarrollo
npm start
# o
# npx expo start
```

Comandos útiles:

```bash
npm run android   # Android
npm run ios       # iOS
npm run web       # Web
```

> 💡 **Nota**: Para probar en un dispositivo físico, usa la IP local de tu máquina en `EXPO_PUBLIC_API_URL` o un túnel (por ejemplo, `expo start --tunnel`).

---

## 🐳 Docker

Para correr solo el backend con Docker:

```bash
cd backend

# Construir imagen
docker build -t nutri-app-backend .

# Ejecutar contenedor
docker run -p 8000:8000 \
  -e SUPABASE_URL=tu_url \
  -e SUPABASE_KEY=tu_service_role_key \
  -e OPENAI_API_KEY=tu_api_key_openai \
  nutri-app-backend
```

> Puedes extender este setup para orquestación completa (backend + base de datos + reverse proxy) con `docker-compose`.

---

## 📱 Estructura del Proyecto

```text
nutri-app-ai/
├── frontend/
│   ├── app/
│   │   ├── (home)/
│   │   │   ├── index.tsx           # Pantalla principal (resumen diario + análisis)
│   │   │   └── history/
│   │   │       ├── _layout.tsx     # Layout del historial
│   │   │       ├── index.tsx       # Lista de comidas
│   │   │       └── meal/[id].tsx   # Detalle de comida
│   │   ├── profile/
│   │   │   └── index.tsx           # Perfil de usuario (objetivos, datos antropométricos)
│   │   └── index.tsx               # Punto de entrada de rutas
│   ├── context/
│   │   └── AuthContext.tsx         # Contexto de autenticación con Supabase
│   ├── package.json
│   └── ...
│
├── backend/
│   ├── app/
│   │   ├── main.py                 # Aplicación FastAPI
│   │   ├── core/
│   │   │   └── supabase.py         # Cliente de Supabase
│   │   ├── routes/
│   │   │   ├── users.py            # Endpoints de usuarios
│   │   │   ├── analyse.py          # Análisis de comidas vía OpenAI
│   │   │   └── meals.py            # Gestión e historial de comidas
│   │   ├── models/                 # Pydantic models y esquemas
│   │   └── utils/                  # Utilidades (nutrición, exportación, etc.)
│   ├── requirements.txt
│   └── Dockerfile
│
└── README.md
```

---

## 🔑 API Endpoints

> Todos los endpoints protegidos requieren token JWT de Supabase en el header:

```http
Authorization: Bearer <token>
```

### 👤 Usuarios

* `GET /api/users/me`
  Obtener perfil del usuario autenticado.

* `PUT /api/users/me`
  Actualizar perfil (edad, peso, talla, objetivo, etc.).

* `POST /api/users/create_user`
  Crear/registrar usuario en la base de datos interna a partir del UID de Supabase (según implementación).

---

### 🍽️ Análisis de Comidas

* `POST /api/analyse_meal`
  Analizar imagen de comida.
  **Body**: archivo de imagen + metadatos (multipart/form-data).
  **Respuesta**: alimentos detectados, peso estimado, macros y recomendación generada por IA.

* `POST /api/save_analysis`
  Guardar en base de datos el resultado de un análisis aprobado por el usuario.

---

### 📜 Comidas e Historial

* `GET /api/history_meals`
  Listar historial de comidas del usuario (con filtros y paginación según implementación).

* `GET /api/history_meals/{id}`
  Detalle de una comida específica (incluye `meal_items`).

* `DELETE /api/delete_meal/{id}`
  Eliminar una comida del historial.

* `GET /api/meals/day?date=YYYY-MM-DD&tz=America/Lima`
  Resumen nutricional del día (totales vs objetivos).

* `GET /api/meals/export_history?format=xlsx&from_date=YYYY-MM-DD&to_date=YYYY-MM-DD&tz=America/Lima`
  Exportar historial de comidas en formato `csv` o `xlsx`.

---

## 📊 Base de Datos

La base de datos está en **Supabase** (PostgreSQL) con **Row Level Security (RLS)** habilitado.

### Tabla `users`

* `id` (UUID, PK) – Referenciado al usuario de Supabase.
* `name` (TEXT)
* `age` (INT)
* `weight_kg` (NUMERIC)
* `height_cm` (NUMERIC)
* `gender` (TEXT)
* `activity_level_id` (INT)
* `objective_id` (INT)
* `required_calories` (NUMERIC)
* `required_protein_g` (NUMERIC)
* `required_carbs_g` (NUMERIC)
* `required_fat_g` (NUMERIC)

### Tabla `meals`

* `id` (INT, PK)
* `user_id` (UUID, FK → users.id)
* `date_creation` (TIMESTAMP WITH TIME ZONE)
* `img_url` (TEXT) – Ubicación de la imagen (Supabase Storage u otro).
* `recommendation` (TEXT) – Mensaje de recomendación generada por IA.
* `total_calories` (NUMERIC)
* `total_protein_g` (NUMERIC)
* `total_carbs_g` (NUMERIC)
* `total_fat_g` (NUMERIC)

### Tabla `meal_items`

* `id` (INT, PK)
* `meal_id` (INT, FK → meals.id)
* `name` (TEXT) – Nombre del alimento detectado.
* `weight_grams` (NUMERIC)
* `calories_kcal` (NUMERIC)
* `protein_g` (NUMERIC)
* `carbs_g` (NUMERIC)
* `fat_g` (NUMERIC)

---

## 🔐 Seguridad

* Autenticación con **Supabase Auth** (JWT).
* **Row Level Security (RLS)** para aislar los datos por usuario.
* Validación de JWT en cada request del backend.
* Variables de entorno para todas las credenciales sensibles.
* Configuración de **CORS** para entornos de desarrollo y producción.
* Manejo de errores y respuestas claras en endpoints críticos.

---

## 🧪 Testing

### Backend

```bash
cd backend
pytest
```

### Frontend

```bash
cd frontend
npm test
# o
# yarn test
```

> Agrega pruebas unitarias y de integración adicionales a medida que el proyecto crece.

---

## 🌐 Despliegue

### Backend (Railway / Render / Otro PaaS)

1. Conectar el repositorio de GitHub.
2. Configurar variables de entorno requeridas:

   * `SUPABASE_URL`
   * `SUPABASE_KEY`
   * `OPENAI_API_KEY`
3. Usar el `Dockerfile` incluido o un comando de start basado en Uvicorn.
4. Exponer el puerto `8000` o el que requiera la plataforma.

### Frontend (EAS Build con Expo)

```bash
# Instalar EAS CLI
npm install -g eas-cli

# Login
eas login

# Configurar proyecto
eas build:configure

# Build para Android
eas build --platform android

# Build para iOS
eas build --platform ios
```

> Recuerda configurar `EXPO_PUBLIC_API_URL` apuntando al backend desplegado (no a `localhost`).

---

## 🤝 Contribución

1. Haz un **fork** del proyecto.

2. Crea una rama para tu feature:

   ```bash
   git checkout -b feature/AmazingFeature
   ```

3. Haz commit de tus cambios:

   ```bash
   git commit -m "Add AmazingFeature"
   ```

4. Haz push a tu rama:

   ```bash
   git push origin feature/AmazingFeature
   ```

5. Abre un **Pull Request** describiendo el cambio.

---

## 📝 Licencia

Este proyecto está licenciado bajo la **Licencia MIT**.
Puedes ver el archivo `LICENSE` para más detalles.

---

## 👥 Autores

* **Maressay** – [GitHub](https://github.com/maressay)

---

## 📞 Soporte

Para reportar bugs, proponer mejoras o hacer preguntas:

* Abre un **Issue** en el repositorio de GitHub.
* Incluye pasos para reproducir el problema, logs relevantes y entorno (SO, versión de Node, etc.).

---

> ⚠️ **Nota:** Nutri App AI utiliza servicios de terceros (OpenAI, Supabase) que pueden tener costos asociados.
> Revisa sus planes de precios antes de desplegar el proyecto en producción.

```
```
