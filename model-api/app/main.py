from fastapi import FastAPI
from pydantic import BaseModel
from tensorflow.keras.models import load_model
import numpy as np

# Cargar el modelo de predicción
model = load_model('./app/mejor_modelo_transformer_final.h5')

# Crear la aplicación FastAPI
app = FastAPI()

# Definir el modelo de entrada para las predicciones
class SensorData(BaseModel):
    son_lamax: float
    son_lamin: float
    son_la1: float
    son_la10: float
    son_la50: float
    son_la90: float
    son_la99: float

# Modelo de entrada para la solicitud que tendrá la clave 'sensor_data'
class InputData(BaseModel):
    sensor_data: list[SensorData]  # Espera un arreglo de objetos SensorData

# Modificar la predicción para aceptar un arreglo de 12 muestras dentro de 'sensor_data'
@app.post("/predict/")
def predict(input_data: InputData):
    # Extraemos los datos de 'sensor_data' de la solicitud
    sensor_data = input_data.sensor_data
    
    # Preparamos los datos para el modelo
    input_data_array = np.array([[
        sensor.son_lamax,
        sensor.son_lamin,
        sensor.son_la1,
        sensor.son_la10,
        sensor.son_la50,
        sensor.son_la90,
        sensor.son_la99
    ] for sensor in sensor_data]).reshape(1, 12, 7)  # 12 muestras, 7 características

    # Realizar la predicción
    prediction_value = model.predict(input_data_array)

    # Convertir el valor de predicción de numpy.float32 a float nativo
    prediction_value = float(prediction_value[0][0])

    return {"prediction": prediction_value}