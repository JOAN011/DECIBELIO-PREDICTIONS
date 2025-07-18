# =====================  main.py  ===========================
from fastapi import FastAPI, HTTPException
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Literal, Dict
from typing import Optional

import numpy as np
import pandas as pd
import tensorflow as tf
import joblib
from sklearn.preprocessing import MinMaxScaler

from zoneinfo import ZoneInfo          
LOCAL_TZ = ZoneInfo("America/Guayaquil")

from fastapi.middleware.cors import CORSMiddleware


# -----------------------------------------------------------
# CONFIG
# -----------------------------------------------------------
BASE_DIR   = Path(__file__).resolve().parent
DATA_PATH  = Path("/app/data/datos_ruido_2025_final.csv")
MODELS_DIR = BASE_DIR / "Model_LSTM"

MODEL_INFO: Dict[str, Dict] = {
    "hour": dict(
        folder="1_hora_model",
        file="lstm1h_optuna_model.h5",
        scaler="scaler1h.pkl",
        params="bestparams1h.pkl",
        resample_rule="1H",
        out_len=1,
        step_minutes=60,
    ),
    "6h": dict(
        folder="6_horas_model",
        file="lstm_6h_optuna_bt.h5",
        scaler="scaler_6h.pkl",
        params="bestparams_6h.pkl",
        resample_rule="6H",
        out_len=1,
        step_minutes=360,
    ),
    "24h": dict(
        folder="24_horas_model",
        file="lstm1h_24out_optuna.h5",
        scaler="scaler1h_24out.pkl",
        params="bestparams1h_24out.pkl",
        resample_rule="1H",
        out_len=24,
        step_minutes=60,
    ),
    "30m": dict(
        folder="30_min_model",
        file="lstm30_optuna_noBT.h5",
        scaler="scaler30_noBT.pkl",
        params="bestparams30_noBT.pkl",
        resample_rule="30T",
        out_len=1,
        step_minutes=30,
    ),
    "week": dict(
        folder="1_semana_model",
        file="lstm_daily7_model.h5",
        scaler="scaler_daily7.pkl",
        params="bestparams_daily7.pkl",
        resample_rule="1D",          # promedio diario
        out_len=7,                   # 7 valores (lun-dom)
        step_minutes=1_440,          # 24 h entre puntos
    ),
}

# -----------------------------------------------------------
# LOAD ALL ARTIFACTS ON STARTUP
# -----------------------------------------------------------
def load_artifacts(tag: str):
    cfg = MODEL_INFO[tag]
    mpath = MODELS_DIR / cfg["folder"] / cfg["file"]
    spath = MODELS_DIR / cfg["folder"] / cfg["scaler"]
    ppath = MODELS_DIR / cfg["folder"] / cfg["params"]

    model  = tf.keras.models.load_model(mpath, compile=False)
    scaler: MinMaxScaler = joblib.load(spath)
    try:
        params = joblib.load(ppath)
        n_past = params.get("n_past", 24)
    except:                                        # legacy dict o archivo faltante
        n_past = 24 if tag == "hour" else 12
    return model, scaler, n_past, cfg

ARTIFACTS = {tag: load_artifacts(tag) for tag in MODEL_INFO.keys()}

# -----------------------------------------------------------
# FASTAPI
# -----------------------------------------------------------
app = FastAPI(title="Noise-LSTM API", version="1.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # o ["http://localhost:5000"] si sabes el puerto exacto del frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------------
# HELPERS
# -----------------------------------------------------------
def load_latest_window(rule: str, n_past: int):
    """Lee el CSV, lo re-muestrea y devuelve los últimos n_past valores escalados (sin NaN)."""
    if not DATA_PATH.exists():
        raise HTTPException(500, "Dataset no encontrado.")

    df = pd.read_csv(DATA_PATH)
    if "timestamp" not in df.columns:
        df.rename(columns={df.columns[0]: "timestamp"}, inplace=True)

    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df.set_index("timestamp", inplace=True)
    series = (
        df["son_laeq"]
        .resample(rule)
        .mean()
        .interpolate("linear")
    )

    if len(series) < n_past:
        raise HTTPException(400, f"No hay suficientes datos ({len(series)}/{n_past}).")

    tail = series.tail(n_past)
    last_ts = tail.index[-1]

    # si viene naive → etiquétalo con la tz local (el sensor ya graba en UTC-5)
    if last_ts.tzinfo is None:
        last_ts = last_ts.replace(tzinfo=LOCAL_TZ)

    return tail.values.reshape(-1, 1), last_ts


def predict_generic(tag: Literal["hour", "30m", "6h", "24h", "week"]):
    model, scaler, n_past, cfg = ARTIFACTS[tag]

    # 1) prepara ventana más reciente
    window, last_ts = load_latest_window(cfg["resample_rule"], n_past)
    X = scaler.transform(window).reshape(1, n_past, 1)
    pred_scaled = model.predict(X, verbose=0).reshape(-1, 1)
    preds = scaler.inverse_transform(pred_scaled).flatten().round(2).tolist()

    # 2) predice
    pred_scaled = model.predict(X, verbose=0).reshape(-1, 1)
    preds = scaler.inverse_transform(pred_scaled).flatten().round(2).tolist()

    # 3) timestamps de salida
    start = last_ts + timedelta(minutes=cfg["step_minutes"])
    index = [
        (start + timedelta(minutes=i * cfg["step_minutes"])).isoformat()
        for i in range(cfg["out_len"])
    ]

    return {"model": tag, "timestamps": index, "predictions": preds}

def predict_recursive(tag: Literal["hour", "30m", "6h"], steps: int):
    model, scaler, n_past, cfg = ARTIFACTS[tag]
    window, last_ts = load_latest_window(cfg["resample_rule"], n_past)
    sequence = scaler.transform(window).reshape(1, n_past, 1)

    preds = []
    timestamps = []
    ts = last_ts

    for _ in range(steps):
        pred_scaled = model.predict(sequence, verbose=0).reshape(-1, 1)
        pred = scaler.inverse_transform(pred_scaled)[0][0]
        preds.append(float(round(pred, 2)))

        ts += timedelta(minutes=cfg["step_minutes"])
        timestamps.append(ts.isoformat())

        # Desliza la ventana hacia adelante con la nueva predicción
        sequence = np.append(sequence[:, 1:, :], [[[pred_scaled[0][0]]]], axis=1)

    return {
        "model": tag,
        "recursive_steps": steps,
        "timestamps": timestamps,
        "predictions": preds
    }

# -----------------------------------------------------------
# ENDPOINTS
# -----------------------------------------------------------
@app.get("/", tags=["root"])
def root():
    return {
        "msg": "API OK – modelos LSTM 1h, 6h y 24h disponibles",
        "endpoints": ["/predict/hour", "/predict/6h", "/predict/24h"],
    }


@app.get("/predict/{horizon}", tags=["predict"])
def predict(horizon: Literal["hour", "30m", "6h", "24h", "week"]):
    """
    1-step forecasts:\n
      • /predict/hour  – próxima hora \n
      • /predict/6h    – próximo bloque 6 h \n
      • /predict/30m   – próximo bloque 30 min \n
      • /predict/24h   – vector 24 h \n
      • /predict/week  – vector 7 d \n
    """
    return predict_generic(horizon)

@app.get("/predict_recursive/{horizon}", tags=["predict"])
def predict_recursively(horizon: Literal["hour", "30m", "6h"], steps: Optional[int] = 10):
    """
    Predicción recursiva – permite especificar cuántos pasos hacia adelante predecir.
    Ej: /predict_recursive/hour?steps=12
    """
    if steps < 1 or steps > 100:
        raise HTTPException(400, "steps debe estar entre 1 y 100")
    return predict_recursive(horizon, steps)
