FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .

# Install FFmpeg
RUN apt-get update && apt-get install -y ffmpeg

EXPOSE 5000
CMD ["python", "app.py"]