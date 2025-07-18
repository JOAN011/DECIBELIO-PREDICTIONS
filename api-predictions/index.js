// index.js
const mqtt = require('mqtt');
const moment = require('moment');

// Broker MQTT
const BROKER_URL = 'tcp://test.mosquitto.org:1883';

// ===== TOPICS MANAGEMENT =====
const TOPICS_FILE = 'topics.json';

function loadTopics() {
  return fs.existsSync(TOPICS_FILE)
    ? JSON.parse(fs.readFileSync(TOPICS_FILE))
    : [];
}

const client = mqtt.connect(BROKER_URL);

client.on('connect', () => {
  console.log('Conectado al broker MQTT');
  const topics = loadTopics();
  topics.forEach(topic => {
    client.subscribe(topic, err => {
      if (!err) {
        console.log(`Suscrito a tópico: ${topic}`);
      } else {
        console.error(`Error al suscribirse a ${topic}:`, err.message);
      }
    });
  });
});

const appendToCSV = require('./saveToCSV');
const saveToDB = require('./saveToDB');

const express = require('express');
const fs = require('fs');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

const app = express();
app.use(cors());
app.use(express.json());

// Swagger docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));


/**
 * @swagger
 * /topics:
 *   get:
 *     summary: Obtener todos los tópicos registrados
 *     responses:
 *       200:
 *         description: Lista de tópicos
 */
app.get('/topics', (req, res) => {
  const topics = fs.existsSync(TOPICS_FILE) ? JSON.parse(fs.readFileSync(TOPICS_FILE)) : [];
  res.json(topics);
});

/**
 * @swagger
 * /topics:
 *   post:
 *     summary: Agregar un nuevo tópico
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               topic:
 *                 type: string
 *                 example: /UN_Lojanlo/xxxx/attrs
 *     responses:
 *       201:
 *         description: Tópico agregado exitosamente
 *       400:
 *         description: Error en la solicitud
 */
app.post('/topics', (req, res) => {
  const { topic } = req.body;
  if (!topic) return res.status(400).json({ error: 'Falta el tópico' });

  const topics = loadTopics();
  if (topics.includes(topic)) return res.status(400).json({ error: 'Tópico ya existe' });

  topics.push(topic);
  fs.writeFileSync(TOPICS_FILE, JSON.stringify(topics, null, 2));

  // Suscribirse al nuevo tópico automáticamente
  client.subscribe(topic, err => {
    if (err) {
      console.error(`Error al suscribirse a ${topic}:`, err.message);
      return res.status(500).json({ error: 'No se pudo suscribir al tópico' });
    }
    console.log(`Suscrito dinámicamente a: ${topic}`);
    res.status(201).json({ message: 'Tópico agregado y suscrito' });
  });
});

/**
 * @swagger
 * /topics/{topic}:
 *   delete:
 *     summary: Eliminar un tópico
 *     parameters:
 *       - in: path
 *         name: topic
 *         required: true
 *         schema:
 *           type: string
 *         description: El tópico a eliminar (codificado en URL)
 *     responses:
 *       200:
 *         description: Tópico eliminado
 *       404:
 *         description: Tópico no encontrado
 */
app.delete('/topics/:topic', (req, res) => {
  const topic = decodeURIComponent(req.params.topic);
  const topics = fs.existsSync(TOPICS_FILE) ? JSON.parse(fs.readFileSync(TOPICS_FILE)) : [];
  const filtered = topics.filter(t => t !== topic);
  if (filtered.length === topics.length) return res.status(404).json({ error: 'Tópico no encontrado' });

  fs.writeFileSync(TOPICS_FILE, JSON.stringify(filtered, null, 2));
  res.json({ message: 'Tópico eliminado' });
});

// app MQTT + lógica de guardado...

client.on('message', async (topic, message) => {
    try {
        const data = JSON.parse(message.toString());
        const correctedTime = moment.utc(data.TimeInstant).subtract(5, 'hours').format('YYYY-MM-DD HH:mm:ss');

        const processed = {
            topic,
            time_instant: correctedTime,
            period: data.period,
            status: data.status,
            son_laeq: data.son_laeq,
            son_lamax: data.son_lamax,
            son_lamin: data.son_lamin,
            son_la1: data.son_la1,
            son_la10: data.son_la10,
            son_la50: data.son_la50,
            son_la90: data.son_la90,
            son_la99: data.son_la99,
        };

        await appendToCSV(processed);
        await saveToDB(processed);

        console.log('Dato guardado en CSV y PostgreSQL');
    } catch (error) {
        console.error('Error al procesar mensaje:', error.message);
    }
});

const path = require('path');

// Ruta absoluta del archivo CSV
const CSV_FILE_PATH = path.join(__dirname, 'datos_sensores.csv');

/**
 * @swagger
 * /csv:
 *   get:
 *     summary: Descargar el archivo CSV completo o filtrado por fecha
 *     parameters:
 *       - in: query
 *         name: date
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *           example: 2025-06-03
 *         description: Fecha para filtrar los datos del CSV (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Archivo CSV descargado exitosamente
 *       404:
 *         description: No se encontraron datos para la fecha dada
 */
app.get('/csv', (req, res) => {
  const { date } = req.query;

  if (!fs.existsSync(CSV_FILE_PATH)) {
    return res.status(404).send('El archivo CSV no existe aún.');
  }

  if (!date) {
    // Sin filtro: envía todo el archivo CSV
    return res.download(CSV_FILE_PATH, 'datos_sensores.csv');
  }

  // Leer el archivo y filtrar por fecha
  const lines = fs.readFileSync(CSV_FILE_PATH, 'utf-8').split('\n');
  const headers = lines[0];
  const filtered = lines.filter((line, i) => {
    if (i === 0 || !line) return false;
    return line.includes(date); // Simplemente chequea si la línea contiene la fecha
  });

  if (filtered.length === 0) {
    return res.status(404).json({ error: `No se encontraron datos para la fecha ${date}` });
  }

  // Construir contenido filtrado
  const content = [headers, ...filtered].join('\n');
  res.setHeader('Content-Disposition', `attachment; filename=datos_sensores_${date}.csv`);
  res.setHeader('Content-Type', 'text/csv');
  res.send(content);
});

app.listen(3000, () => {
  console.log('Microservicio MQTT corriendo en http://localhost:3000/api-docs');
});