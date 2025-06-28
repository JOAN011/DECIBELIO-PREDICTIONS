# Imagen optimizada y ligera de Node.js
FROM node:16-alpine

WORKDIR /app

COPY . .

RUN npm install --production

EXPOSE 3000

CMD ["node", "app.js"]