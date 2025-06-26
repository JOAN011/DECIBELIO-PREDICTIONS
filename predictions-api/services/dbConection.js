const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
});

// Crear tabla si no existe
pool.query(`
  CREATE TABLE IF NOT EXISTS predicciones (
    id SERIAL PRIMARY KEY,
    fecha TIMESTAMP,
    topic TEXT,
    predict DOUBLE PRECISION
  )
`, (err) => {
  if (err) {
    console.error('Error creando tabla:', err);
  } else {
    console.log('Tabla predicciones lista');
  }
});

async function guardarPrediccion({ fecha, topic, predict }) {
  try {
    await pool.query(
      `INSERT INTO predicciones (fecha, topic, predict) VALUES ($1, $2, $3)`,
      [fecha, topic, predict]  // resultado ahora es un número
    );
  } catch (err) {
    console.error('Error guardando predicción:', err.message);
  }
}

async function obtenerPredicciones() {
  try {
    const res = await pool.query(`SELECT * FROM predicciones`);
    return res.rows;
  } catch (err) {
    console.error('Error obteniendo predicciones:', err.message);
    return [];
  }
}

async function obtenerPrediccionesPorFecha(fecha) {
  try {
    const res = await pool.query(
      `SELECT * FROM predicciones WHERE DATE(fecha) = $1`,
      [fecha]
    );
    return res.rows;
  } catch (err) {
    console.error('Error al obtener predicciones por fecha:', err.message);
    return [];
  }
}

module.exports = {
  guardarPrediccion,
  obtenerPredicciones,
  obtenerPrediccionesPorFecha
};