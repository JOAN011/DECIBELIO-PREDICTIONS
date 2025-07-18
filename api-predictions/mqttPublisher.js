const mqtt = require('mqtt');
const moment = require('moment');

const BROKER_URL = 'mqtt://test.mosquitto.org:1883';
const TOPIC = '/UN_Lojanlo/HOPb0a7323594a2_NLO/attr4';

const client = mqtt.connect(BROKER_URL);

client.on('connect', () => {
  console.log(`✅ Conectado al broker. Publicando en ${TOPIC} cada 5 minutos...`);

  setInterval(() => {
    const payload = {
      TimeInstant: moment.utc().format(),
      period: `300s`,
      status: 'ok',
      son_laeq: +(Math.random() * 100).toFixed(2),
      son_lamax: +(Math.random() * 100).toFixed(2),
      son_lamin: +(Math.random() * 100).toFixed(2),
      son_la1: +(Math.random() * 100).toFixed(2),
      son_la10: +(Math.random() * 100).toFixed(2),
      son_la50: +(Math.random() * 100).toFixed(2),
      son_la90: +(Math.random() * 100).toFixed(2),
      son_la99: +(Math.random() * 100).toFixed(2),
    };

    client.publish(TOPIC, JSON.stringify(payload), { qos: 0 }, (err) => {
      if (err) {
        console.error('❌ Error al publicar:', err.message);
      } else {
        console.log(`📤 Publicado a las ${moment().format('HH:mm:ss')}:`, payload);
      }
    });
  }, 30_000); // 5 minutos en milisegundos
});
