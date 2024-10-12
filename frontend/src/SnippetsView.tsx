import React, { useState, useEffect } from 'react';
import { 
    Box,
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
} from '@mui/material';
import {
    ArrowCircleUp,
    ContentCut,
    Delete,
    Share,
    Upload,
} from '@mui/icons-material';
import ExportDialog from './ExportDialog.tsx';
import ImportDialog from './ImportDialog.tsx';
import { IDBPDatabase } from 'idb';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { saveAs } from 'file-saver';

type SnippetsProps = {
    audioFile: string | null,
    regions: any,
    wavesurferRef: any,
    regionRef: any,
    renderTrigger: number,
    audioFileId: number,
    initDB: () => Promise<IDBPDatabase>,
    setRenderTrigger: React.Dispatch<React.SetStateAction<number>>,
    secondsToHHMMSS: (seconds:number) => string,
    HHMMSSToSeconds: (timestamp: string) => number,
}

const SnippetsView: React.FC<SnippetsProps> = ({audioFile, regions, wavesurferRef, regionRef, audioFileId, initDB, setRenderTrigger, secondsToHHMMSS, HHMMSSToSeconds}) => {

  const [openExport, setOpenExport] = useState(false);
  const [openImport, setOpenImport] = useState(false);

  const toggleRegionIsActive = async (audioFileId: number, regionId: string, isActive: boolean) => {
    if (!regionId) {
        return;
    }

    const db = await initDB();
    const transaction = db.transaction('snippets', 'readwrite');
    const snippetStore = transaction.objectStore('snippets');

    const index = snippetStore.index('region_audio');
    const snippet = await index.get([regionId, audioFileId]);

    if (snippet) {
        snippet.isActive = isActive;
        snippetStore.put(snippet);
        transaction.commit();
    }

    if (isActive) {
      regionRef.current = regions.current[regionId];
      regions.current[regionId].setOptions({
        color: 'rgba(255, 0, 0, 0.3)'
      });
    }
    else {
      regions.current[regionId].setOptions({
        color: 'rgba(0, 0, 0, 0.1)'
      })
    }
    setRenderTrigger(prev => prev + 1);
}

  const loadSnippet = async (regionId: string) => {

    // update old snippet to mark it non-active (color)
    toggleRegionIsActive(audioFileId, regionRef.current?.id, false);

    // update new snippet to mark it active (color)
    toggleRegionIsActive(audioFileId, regionId, true);

    setRenderTrigger(prev => prev + 1);
  }

  const removeRegion = async (regionId: string) => {

      const db = await initDB();
      const transaction = db.transaction('snippets', 'readwrite');
      const snippetStore = transaction.objectStore('snippets');

      const index = snippetStore.index('region_audio');
      const snippet = await index.get([regionId, audioFileId]);

      snippetStore.delete(snippet.id);
      console.log(`Snippet with id ${snippet.id} deleted`);

      regions.current[regionId].remove();
      delete regions.current[regionId]
      regionRef.current = null;

      setRenderTrigger(prev => prev + 1);
  }

  const getAudioData = async () => {
    if (!audioFileId) return;

    const db = await initDB();
    const transaction = db.transaction('audioFiles', 'readonly');
    const audioFileStore = transaction.objectStore('audioFiles');

    const audioFile = await audioFileStore.get(audioFileId);

    return audioFile.data;
  }

  const getRegion = async (regionId: string) => {
    const db = await initDB();
    const transaction = db.transaction('snippets', 'readonly');
    const snippetStore = transaction.objectStore('snippets');

    const index = snippetStore.index('region_audio');
    const snippet = await index.get([regionId, audioFileId]);

    return snippet;
  }

  const handleFFmpegTrim = async (regionId: string) => {
    if (!audioFile) return;

    const base64Audio = await getAudioData();

    const ffmpeg = new FFmpeg();
    await ffmpeg.load();

    // Step 1: Extract the base64 data from the data URL (remove "data:audio/mpeg;base64,")
    const base64Data = base64Audio.split(',')[1];

    // Step 2: Decode the base64 string into binary data (Uint8Array)
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    // Step 3: Write the binary data to FFmpeg's virtual filesystem
    await ffmpeg.writeFile(audioFile, bytes);

    const regionToTrim = await getRegion(regionId);
    const outputFileName = regionToTrim.name + '.mp3';

    await ffmpeg.exec(['-i', audioFile, 
                        '-ss', regionToTrim.startTime.toString(), 
                        '-to', regionToTrim.endTime.toString(), 
                        '-c', 'copy', 
                        '-metadata', `title=${outputFileName}`,
                        outputFileName]);
    const data = await ffmpeg.readFile(outputFileName);

    // Create a Blob from the output file
    const trimmedBlob = new Blob([data], { type: 'audio/mpeg' });

    saveAs(trimmedBlob, outputFileName);
}

  return (
      <Box>
          <TableContainer component={Paper}>
          <Table sx={{ width: "80vw"}} aria-label="simple table">
            <TableHead>
              <TableRow>
                <TableCell colSpan={6} align="right">
                  <Tooltip title="Share"><IconButton onClick={() => setOpenImport(true)}><Upload fontSize="large" /></IconButton></Tooltip>
                  <Tooltip title="Share"><IconButton onClick={() => setOpenExport(true)}><Share fontSize="large" /></IconButton></Tooltip>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell><b>ID</b></TableCell>
                <TableCell><b>Start Time</b></TableCell>
                <TableCell><b>End Time</b></TableCell>
                <TableCell><b>Snippet Name</b></TableCell>
                <TableCell><b>Is Active?</b></TableCell>
                <TableCell><b>Actions</b></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.values(regions.current).map((region: any, index) => {
                return (
                <TableRow key={index}>
                  <TableCell>{region.id}</TableCell>
                  <TableCell>{secondsToHHMMSS(region.start)}</TableCell>
                  <TableCell>{secondsToHHMMSS(region.end)}</TableCell>
                  <TableCell>
                    {typeof region.content == "string" ? region.content : region.content?.innerText}
                  </TableCell>
                  <TableCell>
                    {region.color == 'rgba(0, 0, 0, 0.1)' ? "No" : "Yes" }
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Load"><IconButton size="large" onClick={() => loadSnippet(region.id)}><ArrowCircleUp fontSize="large" color="secondary" /></IconButton></Tooltip>
                    <Tooltip title="Trim"><IconButton size="large" onClick={() => handleFFmpegTrim(region.id)}><ContentCut fontSize="large" color="secondary" /></IconButton></Tooltip>
                    <Tooltip title="Delete"><IconButton size="large" onClick={() => removeRegion(region.id)}><Delete fontSize="large" sx={{ color: "#f44336" }} /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              )})}
            </TableBody>
          </Table>
        </TableContainer>
        
        <ExportDialog 
          regions={regions}
          openExport={openExport}
          setOpenExport={setOpenExport}
          secondsToHHMMSS={secondsToHHMMSS}
        />

        <ImportDialog 
          audioFile={audioFile}
          regions={regions}
          wavesurferRef={wavesurferRef}
          regionRef={regionRef}
          openImport={openImport}
          setOpenImport={setOpenImport}
          HHMMSSToSeconds={HHMMSSToSeconds}
        />
      </Box>
  );
}

export default SnippetsView;