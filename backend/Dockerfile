# Imagen base
FROM python:3.10-slim

# Carpeta de trabajo
WORKDIR /app

# Copiamos requirements con la ruta completa (por si Railway está en la raíz)
COPY backend/requirements.txt .

# Instalamos dependencias
RUN pip install --no-cache-dir -r requirements.txt

# Copiamos todo el código del backend (usa la ruta absoluta desde raíz)
COPY backend/ .

# Exponemos el puerto
EXPOSE 8000

# Comando para ejecutar FastAPI
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
