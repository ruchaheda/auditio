import React, { useState, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { 
  AppBar, 
  Box, 
  Toolbar, 
  Typography } from '@mui/material';
import { openDB, IDBPDatabase } from 'idb';
import SnippetsView from './SnippetsView.tsx';
import SnippetsActions from './SnippetsActions.tsx';
import Waveform from './Waveform.tsx';
import FileUpload from './FileUpload.tsx'
import TrimFile from './TrimFile.tsx';

type WaveSurferInstance = ReturnType<typeof WaveSurfer.create>;
let dbInstance: IDBPDatabase | null = null;

function App() {
  const [audioFileId, setAudioFileId] = useState(0);
  const [audioFile, setAudioFile] = useState<string | null>(null);
  const [renderTrigger, setRenderTrigger] = useState(0);
  const regions = useRef<{[id: number]: any}>({});
  const wavesurferRef = useRef<WaveSurferInstance | null>(null);
  const regionRef = useRef<any>(null); // Reference for the waveform region
  const [audioUrl, setAudioUrl] = useState<string>('');

  const initDB = async () => {
    if (dbInstance) {
      return dbInstance;
    }

    dbInstance = await openDB('audio-db', 2, {
      upgrade(db) {
        // Create an object store for audio files
        if (!db.objectStoreNames.contains('audioFiles')) {
          db.createObjectStore('audioFiles', { keyPath: 'id', autoIncrement: true });
        }

        // Create an object store for snippets (related to audioFiles by audioFileId)
        if (!db.objectStoreNames.contains('snippets')) {
          const snippetStore = db.createObjectStore('snippets', { keyPath: 'id', autoIncrement: true });
          
          // Add an index to reference the audio file's ID (foreign key-like relationship)
          snippetStore.createIndex('audioFileId', 'audioFileId', { unique: false });

          // Add an index to reference the regionId
          snippetStore.createIndex('regionId', 'regionId', { unique: false });

          // Create a compound index to allow searching by regionId and audioFileId together
          snippetStore.createIndex('region_audio', ['regionId', 'audioFileId'], { unique: true });
        }
      },
    });

    return dbInstance;
  }

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
          <Typography variant="h5" component="div"><i>Auditio</i></Typography>
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
          initDB={initDB}
          audioUrl={audioUrl}
          setAudioUrl={setAudioUrl}
          audioFileId={audioFileId}
          setAudioFileId={setAudioFileId}
        />
        
        <Waveform 
          regions={regions}
          wavesurferRef={wavesurferRef}
          regionRef={regionRef}
          initDB={initDB}
          setRenderTrigger={setRenderTrigger}
          audioFile={audioFile}
          audioFileId={audioFileId}
          secondsToHHMMSS={secondsToHHMMSS}
          audioUrl={audioUrl}
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

        <TrimFile 
          audioFile={audioFile}
          audioUrl={audioUrl}
          regionRef={regionRef}
        />

        <SnippetsView 
          audioFile={audioFile}
          regions={regions} 
          wavesurferRef={wavesurferRef}
          regionRef={regionRef}
          renderTrigger={renderTrigger}
          audioFileId={audioFileId}
          initDB={initDB}
          setRenderTrigger={setRenderTrigger}
          secondsToHHMMSS={secondsToHHMMSS}
        />
      </Box>
    </Box>
  );
}

export default App;