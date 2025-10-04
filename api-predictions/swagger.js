const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Microservicio MQTT',
      version: '1.0.0',
      description: 'API para administrar tópicos y guardar datos MQTT',
    },
    servers: [
      {
        url: 'http://181.113.129.27:3000', // Ajusta al puerto que uses
      },
    ],
  },
  apis: ['./index.js'], // Aquí estarán tus anotaciones Swagger
};

module.exports = swaggerJSDoc(options);
