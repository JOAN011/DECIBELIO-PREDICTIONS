# Usar una imagen base de Python
FROM python:3.11-slim

# Crear y establecer el directorio de trabajo
WORKDIR /usr/src/app

# Copiar los archivos de la API, incluidos los archivos del modelo
COPY . .

# Instalar dependencias
RUN pip install --no-cache-dir -r requirements.txt

# Exponer el puerto para la API del modelo
EXPOSE 8000

# Asegúrate de que el archivo del modelo sea accesible
COPY /app/mejor_modelo_transformer_final.h5 /usr/src/app/mejor_modelo_transformer_final.h5

# Comando para iniciar FastAPI
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
