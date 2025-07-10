# ---------- base image ----------
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    TZ=America/Guayaquil

# ---------- system packages ----------
# tzdata → zona horaria; gcc/libc headers → requisitos de numpy / pandas
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        tzdata build-essential && \
    rm -rf /var/lib/apt/lists/*

# ---------- working dir ----------
WORKDIR /app

# ---------- requirements ----------
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# ---------- code & artefacts ----------
COPY main.py              ./                       
COPY Model_LSTM           ./Model_LSTM             
COPY data/datos_ruido_2025_final.csv ./data/       

# ---------- default command ----------
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
