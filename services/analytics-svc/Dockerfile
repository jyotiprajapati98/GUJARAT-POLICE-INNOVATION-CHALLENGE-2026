FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    ffmpeg gcc libpq-dev libglib2.0-0 libsm6 libxext6 libxrender-dev libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download EasyOCR English model
RUN python3 -c "import easyocr; easyocr.Reader(['en'], gpu=False)" || true

COPY . .
RUN mkdir -p /app/frames /app/recordings /app/models_cache

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
