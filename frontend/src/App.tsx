import React, { useState, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { 
  AppBar, 
  Box, 
  Button, 
  Toolbar, 
  Typography } from '@mui/material';
import SnippetsView from './SnippetsView.tsx';
import SnippetsActions from './SnippetsActions.tsx';
import Waveform from './Waveform.tsx';
import FileUpload from './FileUpload.tsx'

type WaveSurferInstance = ReturnType<typeof WaveSurfer.create>;

function App() {
  const [audioFile, setAudioFile] = useState<string | null>(null);
  const [renderTrigger, setRenderTrigger] = useState(0);
  const regions = useRef<{[id: number]: any}>({});
  const wavesurferRef = useRef<WaveSurferInstance | null>(null);
  const regionRef = useRef<any>(null); // Reference for the waveform region

  // Handle trimming the audio
  const handleTrim = () => {
    if (!audioFile) return;

    const trimData = {
      filename: audioFile,
      start: regionRef.current.start,
      end: regionRef.current.end,
      output_name: regionRef.current.content?.innerText,
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
        downloadLink.target = '_blank'; // Opens the file in a new window/tab
        downloadLink.click();
      });
  };

  const secondsToHHMMSS = (seconds: number) => {
    // Calculate hours, minutes, and seconds
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    // Format hours, minutes, and seconds as two digits
    const formattedHrs = hrs.toString().padStart(2, '0');
    const formattedMins = mins.toString().padStart(2, '0');
    const formattedSecs = secs.toString().padStart(2, '0');

    const timestamp = `${formattedHrs}:${formattedMins}:${formattedSecs}`

    // Return formatted string
    return timestamp;
  }

  const HHMMSSToSeconds = (timestamp: string) => {
    const parts = timestamp.split(':').map(Number); // Split the string by ':' and convert each part to a number
    if (parts.some(isNaN)) {
      return 0;
    }

    let seconds = 0;

    // If the format is HH:MM:SS
    if (parts.length === 3) {
      const [hours, minutes, secs] = parts;
      seconds = hours * 3600 + minutes * 60 + secs;
    }
    // If the format is MM:SS
    else if (parts.length === 2) {
      const [minutes, secs] = parts;
      seconds = minutes * 60 + secs;
    } else {
      return 0;
    }

    return seconds;
  }

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

        <FileUpload 
          audioFile={audioFile}
          setAudioFile={setAudioFile}
        />
        
        <Waveform 
          regions={regions}
          wavesurferRef={wavesurferRef}
          regionRef={regionRef}
          setRenderTrigger={setRenderTrigger}
          audioFile={audioFile}
          secondsToHHMMSS={secondsToHHMMSS}
        />

        <SnippetsActions 
          regions={regions}
          wavesurferRef={wavesurferRef}
          regionRef={regionRef}
          renderTrigger={renderTrigger}
          setRenderTrigger={setRenderTrigger}
          secondsToHHMMSS={secondsToHHMMSS}
          HHMMSSToSeconds={HHMMSSToSeconds}
        />

        <Button variant="contained" onClick={handleTrim} color="primary">Trim & Download</Button>

        <SnippetsView 
          audioFile={audioFile}
          regions={regions} 
          wavesurferRef={wavesurferRef}
          regionRef={regionRef}
          renderTrigger={renderTrigger} 
          setRenderTrigger={setRenderTrigger}
          secondsToHHMMSS={secondsToHHMMSS}
          HHMMSSToSeconds={HHMMSSToSeconds}
        />
      </Box>
    </Box>
  );
}

export default App;