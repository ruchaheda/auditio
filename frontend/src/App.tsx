import React, { useState, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';
import TimelinePlugin from 'wavesurfer.js/plugins/timeline';
import Hover from 'wavesurfer.js/plugins/hover';
import RegionsPlugin from 'wavesurfer.js/plugins/regions';
import { AppBar, Box, Button, Checkbox, IconButton, TextField, Toolbar, Typography } from '@mui/material';
import { CloudUpload, Forward5, Forward10, Forward30, Replay5, Replay10, Replay30 } from '@mui/icons-material';

// Define types for state variables
interface Region {
  start: number;
  end: number;
}

type WaveSurferInstance = ReturnType<typeof WaveSurfer.create>;

function App() {
  const [audioFile, setAudioFile] = useState<string | null>(null);
  const [currentRegionStartTime, setCurrentRegionStartTime] = useState<number>(0);  // State for start time
  const [currentRegionEndTime, setCurrentRegionEndTime] = useState<number>(0);      // State for end time
  const [loopAudio, setLoopAudio] = useState<boolean>(true);
  const [snippetName, setSnippetName] = useState<string>('');
  const loopAudioRef = useRef<boolean>(true);
  const wavesurferRef = useRef<WaveSurferInstance | null>(null);
  const regionRef = useRef<any>(null); // Reference for the waveform region

  // Load the uploaded audio file into wavesurfer
  const loadAudio = (filename: string) => {
    // If a WaveSurfer instance already exists, destroy it before creating a new one
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
    }

    // Create a timeline plugin instance with custom options
    const topTimeline = TimelinePlugin.create({
      container: '#waveform',
      height: 20,
      timeInterval: 1,
      primaryLabelInterval: 5,
      secondaryLabelOpacity: 0,
      style: {
        fontSize: '20px',
        color: '#2D5B88',
      },
    })

    const hover = Hover.create({
      lineColor: '#ff0000',
      lineWidth: 2,
      labelBackground: '#555',
      labelColor: '#fff',
      labelSize: '11px',
    })

    const regions = RegionsPlugin.create();

    const wavesurfer = WaveSurfer.create({
      container: '#waveform',
      waveColor: 'rgb(200, 0, 200)',
      progressColor: 'rgb(100, 0, 100)',
      height: 100,
      // Set a bar width
      barWidth: 2,
      // Optionally, specify the spacing between bars
      barGap: 1,
      // And the bar radius
      barRadius: 2,
      plugins: [topTimeline, hover, regions]
    });

    wavesurferRef.current = wavesurfer;

    // Load audio file from the server
    wavesurfer.load(`http://localhost:5001/uploads/${filename}`);

    wavesurfer.on('ready' as any, () => {
      console.log("waveform is ready!");

      regions.enableDragSelection({
        color: 'rgba(255, 0, 0, 0.3)',
      });

      // Listening for when user seeks to a specific part on the waveform. 
      wavesurfer.on('seeking' as any, (progress) => {
        console.log('User is interacting with the waveform:', progress);
      });
  
      // Listen for region creation
      regions.on('region-created' as any, (region) => {
        regionRef.current = region;
        updateRegion(region.start, region.end);
      });

      regions.on('region-clicked' as any, (region, e) => {
        e.stopPropagation(); // prevent triggering a click on the waveform
        regionRef.current = region;
        updateRegion(region.start, region.end);
        region.play();
      });

      regions.on('region-out' as any, (region) => {
        console.log('region-out, loopAudio:', loopAudioRef);
        if (loopAudioRef.current) {
          region.play();
        }
      })
    });
  };

  // Update region when start and end times are manually or programmatically changed
  const updateRegion = (newStart: number, newEnd: number) => {
    if (regionRef.current) {
      setCurrentRegionStartTime(newStart);
      setCurrentRegionEndTime(newEnd);
    }
  };

  const toggleLooping = () => {
    // console.log('previous loopAudio value: ', loopAudioRef.current);
    loopAudioRef.current = !loopAudioRef.current;
    setLoopAudio(loopAudioRef.current);
    // console.log('current loopAudio value: ', loopAudioRef.current);
  }

  const handlePlayPause: React.MouseEventHandler<HTMLButtonElement> = () => {
    wavesurferRef.current?.playPause();
  }

  const seek = (seconds: number) => {
    if (!wavesurferRef.current) {
      return;
    }

    const currentTime = wavesurferRef.current.getCurrentTime();
    const newTime = currentTime + seconds;
    const duration = wavesurferRef.current.getDuration();
    if (newTime >= 0 && newTime <= duration) {
      wavesurferRef.current.seekTo(newTime / duration);
    }
  }

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
      start: currentRegionStartTime,
      end: currentRegionEndTime,
      output_name: snippetName,
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
    setCurrentRegionStartTime(value);
    updateRegion(value, currentRegionEndTime); // Update the region when start time is changed
  };

  // Manually update the end time
  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setCurrentRegionEndTime(value);
    updateRegion(currentRegionStartTime, value); // Update the region when end time is changed
  };

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h5" component="div">Audio Looper & Trimmer</Typography>
        </Toolbar>
      </AppBar>

      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        gap="20px"
        p={2}
      >
        <Button
          variant="contained"
          component="label"
          startIcon={<CloudUpload />}
        >Upload File
          <input type="file" hidden onChange={handleFileUpload} />
        </Button>
        { audioFile && (
          <p><b>Current file:</b> {audioFile}</p>
        )}
        
        <Box width="100vw" id="waveform" />

        <Box
          display="flex"
          justifyContent="center"
          gap="20px"
          p={2}
        >
          <Box>
            <Checkbox 
              checked={loopAudio}
              onChange={toggleLooping}
              inputProps={{ 'aria-label': 'controlled' }}
            />Loop Audio
          </Box>

          <IconButton size="large" onClick={() => seek(-30)}><Replay30 fontSize="large" /></IconButton>
          <IconButton size="large" onClick={() => seek(-10)}><Replay10 fontSize="large" /></IconButton>
          <IconButton size="large" onClick={() => seek(-5)}><Replay5 fontSize="large" /></IconButton>

          <Button variant="contained" onClick={handlePlayPause} color="primary">Play/Pause</Button>

          <IconButton size="large" onClick={() => seek(5)}><Forward5 fontSize="large" /></IconButton>
          <IconButton size="large" onClick={() => seek(10)}><Forward10 fontSize="large" /></IconButton>
          <IconButton size="large" onClick={() => seek(30)}><Forward30 fontSize="large" /></IconButton>
        </Box>

        <Box
          component="form"
          sx={{ '& .MuiTextField-root': { m: 1, width: '25ch' } }} 
        >
          <TextField 
            id="outlined-number" 
            label="Start Time" 
            type="number"
            variant="outlined" 
            value={currentRegionStartTime} 
            onChange={handleStartTimeChange} 
          />
        
          <TextField 
            id="outlined-number" 
            label="End Time" 
            type="number" 
            variant="outlined" 
            value={currentRegionEndTime} 
            onChange={handleEndTimeChange}
          />

          <TextField 
            id="outlined-basic"
            label="Snippet Name"
            variant="outlined"
            value={snippetName}
            onChange={(e) => setSnippetName(e.target.value)}
          />
        </Box>

        <Button variant="contained" onClick={handleTrim} color="primary">Trim & Download</Button>
      </Box>
    </Box>
  );
}

export default App;