from flask import Flask, request, send_from_directory, jsonify
from flask_cors import CORS
import os
import subprocess

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
TRIMMED_FOLDER = 'trimmed'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(TRIMMED_FOLDER, exist_ok=True)

@app.route('/')
def hello_world():
    return "Hello, World from Flask!"

@app.route('/upload', methods=['POST'])
def upload_file():
    file = request.files['file']
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)
    return jsonify({"filename": file.filename})

@app.route('/files', methods=['GET'])
def list_files():
    files = []
    for filename in os.listdir(UPLOAD_FOLDER):
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        if os.path.isfile(file_path):
            files.append(filename)
    return jsonify(files)

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

@app.route('/trim', methods=['POST'])
def trim_audio():
    data = request.get_json()
    filename = data['filename']
    start_time = data['start']
    end_time = data['end']
    output_name = data['output_name']
    
    input_path = os.path.join(UPLOAD_FOLDER, filename)
    output_path = os.path.join(TRIMMED_FOLDER, output_name + ".mp3")
    
    # FFmpeg command to trim the audio
    ffmpeg_command = [
        'ffmpeg', '-i', input_path, '-ss', str(start_time), '-to', str(end_time), 
        '-c', 'copy', output_path
    ]
    subprocess.run(ffmpeg_command)

    return jsonify({"output_filename": output_name + ".mp3"})

@app.route('/download/<filename>', methods=['GET'])
def download_file(filename):
    return send_from_directory(TRIMMED_FOLDER, filename)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)