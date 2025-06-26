const express = require('express');
const mqtt = require('mqtt');
const axios = require('axios');
const fs = require('fs');
const dotenv = require('dotenv');
const { guardarPrediccion, obtenerPredicciones, obtenerPrediccionesPorFecha } = require('./services/dbConection');


dotenv.config(); // Cargar variables desde .env

const app = express();
const port = 3000;

// Almacenes en memoria
let mediciones = {};
let predicciones = [];

// Leer tópicos desde JSON
const topics = JSON.parse(fs.readFileSync('topics.json', 'utf8'));

// Configuración del broker
const brokerUrl = process.env.MQTT_BROKER || 'mqtt://localhost';
const brokerPort = process.env.MQTT_PORT || 1883;
const client = mqtt.connect(`${brokerUrl}:${brokerPort}`);

// Conexión al broker y suscripción a los tópicos
client.on('connect', () => {
  console.log(`Conectado a broker MQTT: ${brokerUrl}:${brokerPort}`);
  topics.forEach(topic => {
    client.subscribe(topic, (err) => {
      if (!err) {
        console.log(`Suscrito al tópico: ${topic}`);
        // Inicializar con 12 datos sintéticos
        mediciones[topic] = Array.from({ length: 12 }, (_, i) => ({
          TimeInstant: new Date(Date.now() - (12 - i) * 60000).toISOString(), // hace i minutos
          period: 5,
          status: "connected",
          son_laeq: 60 + Math.random(), // valores entre 60 y 61
          son_lamax: 62 + Math.random(),
          son_lamin: 58 + Math.random(),
          son_la1: 61 + Math.random(),
          son_la10: 60 + Math.random(),
          son_la50: 59 + Math.random(),
          son_la90: 58 + Math.random(),
          son_la99: 57 + Math.random()
        }));
      }
    });
  });
});

// Procesar mensajes entrantes
client.on('message', async (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    console.log(`Mensaje recibido en [${topic}]:`, data);

    if (!mediciones[topic]) mediciones[topic] = [];

    mediciones[topic].push(data);
    if (mediciones[topic].length > 12) {
      mediciones[topic].shift();
    }

    if (mediciones[topic].length === 12) {
      const response = await axios.post('http://model_api:8000/predict', {
        sensor_data: mediciones[topic],
      });

      const prediccion = {
        fecha: new Date().toLocaleString('sv-SE', { timeZone: 'America/Guayaquil' }).replace(' ', 'T'),
        topic: topic,
        predict: response.data.prediction,  // debe ser un número
      };

      predicciones.push(prediccion);
      guardarPrediccion(prediccion);
      console.log('Predicción guardada:', prediccion);
    }
  } catch (err) {
    console.error('Error procesando mensaje MQTT:', err.message);
  }
});

// Endpoint para consultar predicciones
app.get('/predicciones', async (req, res) => {
  const { fecha } = req.query;

  try {
    if (fecha) {
      const datos = await obtenerPrediccionesPorFecha(fecha);
      return res.json(datos);
    }

    const datos = await obtenerPredicciones();
    res.json(datos);

  } catch (err) {
    console.error('Error al consultar predicciones:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});



app.listen(port, () => {
  console.log(`API escuchando en http://localhost:${port}`);
});