import React, { useState, useRef, useEffect } from 'react';
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

  // useEffect(() => {
  //   console.log("Updated regions: ", regions);
  // }, [regions]);

  // useEffect(() => {
  //   console.log("current region: ", regionRef.current);
  // }, [regionRef.current])

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
        downloadLink.click();
      });
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
        />

        <SnippetsActions 
          regions={regions}
          wavesurferRef={wavesurferRef}
          regionRef={regionRef}
          renderTrigger={renderTrigger}
          setRenderTrigger={setRenderTrigger}
        />

        <Button variant="contained" onClick={handleTrim} color="primary">Trim & Download</Button>

        <SnippetsView 
          regions={regions} 
          regionRef={regionRef}
          renderTrigger={renderTrigger} 
          setRenderTrigger={setRenderTrigger}
        />
      </Box>
    </Box>
  );
}

export default App;