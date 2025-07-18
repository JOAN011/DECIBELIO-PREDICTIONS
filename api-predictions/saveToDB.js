// saveToDB.js
const { Pool } = require('pg');

const pool = new Pool({
    host: 'postgres',
    port: 5432,
    database: 'mqttdb',
    user: 'mqttuser',
    password: 'mqttpass'
});

const saveToDB = async (data) => {
    const query = `
        INSERT INTO observations (
            topic, time_instant, period, status,
            son_laeq, son_lamax, son_lamin, son_la1,
            son_la10, son_la50, son_la90, son_la99
        )
        VALUES (
            $1, $2, $3, $4,
            $5, $6, $7, $8,
            $9, $10, $11, $12
        )
    `;

    const values = [
        data.topic, data.time_instant, data.period, data.status,
        data.son_laeq, data.son_lamax, data.son_lamin, data.son_la1,
        data.son_la10, data.son_la50, data.son_la90, data.son_la99
    ];

    try {
        await pool.query(query, values);
    } catch (error) {
        console.error('Error al guardar en PostgreSQL:', error.message);
    }
};

module.exports = saveToDB;