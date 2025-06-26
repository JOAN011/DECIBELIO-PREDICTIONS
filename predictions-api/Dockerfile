# Usar una imagen base de Node.js
FROM node:16

# Crear y establecer el directorio de trabajo
WORKDIR /usr/src/app

# Copiar los archivos de la API
COPY . .

# Instalar dependencias
RUN npm install

# Exponer el puerto en el que el servidor escuchará
EXPOSE 3000

# Comando para iniciar la API de Node.js
CMD ["node", "app.js"]