import React, { useState, useRef, useEffect } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/src/plugin/regions';

const App = () => {
  const [audioFile, setAudioFile] = useState(null);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [outputName, setOutputName] = useState('');
  const [files, setFiles] = useState([]);
  const wavesurferRef = useRef(null);
  const regionRef = useRef(null); // Reference for the waveform region

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    fetch('http://localhost:5001/upload', {
      method: 'POST',
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        setAudioFile(data.filename);
        loadAudio(data.filename);
      });
  };

  const loadAudio = (filename) => {
    const wavesurfer = WaveSurfer.create({
      container: '#waveform',
      waveColor: '#A8DBA8',
      progressColor: '#3B8686',
      height: 100,
      plugins: [
        RegionsPlugin.create({
          dragSelection: true, // Enable drag-and-drop functionality
        }),
      ],
    });

    wavesurferRef.current = wavesurfer;

    wavesurfer.load(`http://localhost:5001/uploads/${filename}`);

    wavesurfer.on('ready', () => {
      regionRef.current = wavesurfer.addRegion({
        start: 0,
        end: wavesurfer.getDuration(), // Initialize with the full duration
        color: 'rgba(0, 255, 0, 0.1)', // Visual indicator for the selected region
      });
    });

    wavesurfer.on('region-update-end', (region) => {
      setStartTime(region.start);
      setEndTime(region.end);
    });
  };

  // Update region when start and end times are manually changed
  const updateRegion = () => {
    if (regionRef.current) {
      regionRef.current.update({
        start: startTime,
        end: endTime,
      });
    }
  };

  const handleTrim = () => {
    const trimData = {
      filename: audioFile,
      start: startTime,
      end: endTime,
      output_name: outputName,
    };

    fetch('http://localhost:5001/trim', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(trimData),
    })
      .then((res) => res.json())
      .then((data) => {
        const downloadLink = document.createElement('a');
        downloadLink.href = `http://localhost:5001/download/${data.output_filename}`;
        downloadLink.download = data.output_filename;
        downloadLink.click();
      });
  };

  // Manually update the start time
  const handleStartTimeChange = (e) => {
    const value = parseFloat(e.target.value);
    setStartTime(value);
    updateRegion(); // Update the region when start time is changed
  };

  // Manually update the end time
  const handleEndTimeChange = (e) => {
    const value = parseFloat(e.target.value);
    setEndTime(value);
    updateRegion(); // Update the region when end time is changed
  };

  useEffect(() => {
    fetch('http://localhost:5001/files')
      .then(response => response.json())
      .then(data => setFiles(data))
      .catch(err => console.error('Error fetching file list:', err));
  }, []);

  return (
    <div>
      <h1>Audio Trimmer!</h1>
      <input type="file" onChange={handleFileUpload} />

      <div id="waveform"></div>

      {/* Input fields for start and end time */}
      <div>
        <label>Start Time: </label>
        <input
          type="number"
          value={startTime}
          step="0.01"
          onChange={handleStartTimeChange}
        />
      </div>
      
      <div>
        <label>End Time: </label>
        <input
          type="number"
          value={endTime}
          step="0.01"
          onChange={handleEndTimeChange}
        />
      </div>

      <div>
        <label>Output File Name: </label>
        <input
          type="text"
          placeholder="Enter output name"
          value={outputName}
          onChange={(e) => setOutputName(e.target.value)}
        />
      </div>

      <button onClick={handleTrim}>Trim & Download</button>

      <div>
        <h2>Uploaded Files:</h2>
        <ul>
          {files.map(file => (
            <li key={file}>{file}</li>
          ))}
        </ul>
      </div>

    </div>
  );
};

export default App;