import React, { useState, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/src/plugin/regions';

// Define types for state variables
interface Region {
  start: number;
  end: number;
}

type WaveSurferInstance = ReturnType<typeof WaveSurfer.create>;

function App() {
  const [audioFile, setAudioFile] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number>(0);  // State for start time
  const [endTime, setEndTime] = useState<number>(0);      // State for end time
  const [outputName, setOutputName] = useState<string>('');
  const wavesurferRef = useRef<WaveSurferInstance | null>(null);
  const regionRef = useRef<any>(null); // Reference for the waveform region

  // Load the uploaded audio file into wavesurfer
  const loadAudio = (filename: string) => {
    const wavesurfer = WaveSurfer.create({
      container: '#waveform',
      waveColor: '#A8DBA8',
      progressColor: '#3B8686',
      height: 100,
      plugins: [
        RegionsPlugin.create({
          dragSelection: true,  // Enable drag-and-drop functionality
        }),
      ],
    });

    wavesurferRef.current = wavesurfer;

    // Load audio file from the server
    wavesurfer.load(`http://localhost:5001/uploads/${filename}`);

    // On ready, create a draggable region
    wavesurfer.on('ready', () => {
      regionRef.current = wavesurfer.addRegion({
        start: 0,
        end: wavesurfer.getDuration(), // Initialize with the full duration
        color: 'rgba(0, 255, 0, 0.1)', // Visual indicator for the selected region
      });
    });

    // Update start and end time when region is updated by dragging
    wavesurfer.on('region-update-end', (region: Region) => {
      setStartTime(region.start);
      setEndTime(region.end);
    });

    // Listen for clicks on the waveform to update the start and end times
    wavesurfer.on('seek', (progress: number) => {
      const clickedTime = progress * wavesurfer.getDuration();
      const middlePoint = (startTime + endTime) / 2;

      if (clickedTime < middlePoint) {
        // Update start time if the click is before the middle point
        setStartTime(clickedTime);
        updateRegion(clickedTime, endTime);
      } else {
        // Update end time if the click is after the middle point
        setEndTime(clickedTime);
        updateRegion(startTime, clickedTime);
      }
    });
  };

  // Update region when start and end times are manually or programmatically changed
  const updateRegion = (newStart: number, newEnd: number) => {
    if (regionRef.current) {
      regionRef.current.update({
        start: newStart,
        end: newEnd,
      });
    }
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

  // Handle trimming the audio
  const handleTrim = () => {
    if (!audioFile) return;

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
  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setStartTime(value);
    updateRegion(value, endTime); // Update the region when start time is changed
  };

  // Manually update the end time
  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setEndTime(value);
    updateRegion(startTime, value); // Update the region when end time is changed
  };

  return (
    <div>
      <h1>Audio Trimmer</h1>
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

      {/* Input field for output name */}
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
    </div>
  );
}

export default App;