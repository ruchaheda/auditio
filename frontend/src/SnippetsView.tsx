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
    TextField,
    Tooltip,
} from '@mui/material';
import {
    Add,
    ArrowCircleUp,
    ContentCut,
    Delete,
    Done,
    Edit,
    Share,
    Upload,
} from '@mui/icons-material';
import ExportDialog from './ExportDialog.tsx';
import ImportDialog from './ImportDialog.tsx';
import { IDBPDatabase } from 'idb';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { saveAs } from 'file-saver';
import RegionsPlugin from 'wavesurfer.js/plugins/regions';

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
  const [regionIdToEdit, setRegionIdToEdit] = useState('');
  const [editRowStartTime, setEditRowStartTime] = useState('');
  const [editRowEndTime, setEditRowEndTime] = useState('');
  const [editRowName, setEditRowName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newRegionStartTime, setNewRegionStartTime] = useState('');
  const [newRegionEndTime, setNewRegionEndTime] = useState('');
  const [newRegionName, setNewRegionName] = useState('');

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

  const openEdit = async (regionId: string) => {
    setRegionIdToEdit(regionId);

    const regionToEdit = await getRegion(regionId);

    if (regionToEdit) { // should not fail
      setEditRowStartTime(secondsToHHMMSS(regionToEdit.startTime));
      setEditRowEndTime(secondsToHHMMSS(regionToEdit.endTime));
      setEditRowName(regionToEdit.name);
    }
  }

  const handleEditRowChanges = async (regionId: string) => {
    console.log("handleEditRowChanges called!")

    toggleRegionIsActive(audioFileId, regionRef.current.id, false);

    // update region in regions.current
    regions.current[regionId].setOptions({
      start: HHMMSSToSeconds(editRowStartTime),
      end: HHMMSSToSeconds(editRowEndTime),
      content: editRowName,
    });

    // update region in db - is this needed? will it happen automatically when the region is updated?
    addOrUpdateRegionInDB(audioFileId, regionId, HHMMSSToSeconds(editRowStartTime), HHMMSSToSeconds(editRowEndTime), editRowName, true);

    // toggle region is active
    toggleRegionIsActive(audioFileId, regionId, true);

    setRegionIdToEdit('');
  }

  const addOrUpdateRegionInDB = async (audioFileId: number, regionId: string, startTime: number, endTime: number, name: string, isActive: boolean) => {
    const db = await initDB();
    const transaction = db.transaction('snippets', 'readwrite');
    const snippetStore = transaction.objectStore('snippets');

    // Use the compound index to get the unique snippet for regionId and audioFileId
    const index = snippetStore.index('region_audio');
    const existingSnippet = await index.get([regionId, audioFileId]);
    
    if (existingSnippet) {
        // Snippet exists, update the existing record
        existingSnippet.startTime = startTime;
        existingSnippet.endTime = endTime;
        existingSnippet.name = name;
        existingSnippet.isActive = isActive;

        // Put the updated snippet back in the store
        await snippetStore.put(existingSnippet);
    }
    else {
        // Create a snippet object with the related audioFileId
        const snippet = {
            audioFileId,  // Reference to the audio file
            regionId,     // region Id for wavesurfer
            startTime,    // Snippet start time
            endTime,      // Snippet end time
            name,          // Snippet name
            isActive,     // to set style color
        };

        // Add the snippet to the store
        await snippetStore.add(snippet);
    }

    transaction.commit();  // Ensure the transaction is committed
  }

  const addRow = () => {
    // create new region
    const startTime = HHMMSSToSeconds(newRegionStartTime);
    const endTime = HHMMSSToSeconds(newRegionEndTime);

    if (wavesurferRef.current) {
      const newRegion = (wavesurferRef.current.getActivePlugins()[1] as RegionsPlugin).addRegion({
        start: startTime,
        end: endTime,
        content: newRegionName,
        contentEditable: true,
        drag: true,
        resize: true,
      });
    }

    setNewRegionStartTime('');
    setNewRegionEndTime('');
    setNewRegionName('');
    setIsAdding(false);
    setRenderTrigger(prev => prev + 1);
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
                  <TableCell> 
                    {region.id}
                  </TableCell>
                  <TableCell>
                    { regionIdToEdit != '' && regionIdToEdit == region.id ?
                      <TextField 
                        value={editRowStartTime}
                        onChange={(e) => setEditRowStartTime(e.target.value)}
                      />
                      :
                      secondsToHHMMSS(region.start)
                    }
                  </TableCell>
                  <TableCell>
                    { regionIdToEdit != '' && regionIdToEdit == region.id ?
                      <TextField 
                        value={editRowEndTime}
                        onChange={(e) => setEditRowEndTime(e.target.value)}
                      />
                      :
                      secondsToHHMMSS(region.end)
                    }
                  </TableCell>
                  <TableCell>
                    { regionIdToEdit != '' && regionIdToEdit == region.id ?
                      <TextField 
                        value={editRowName}
                        onChange={(e) => setEditRowName(e.target.value)}
                      />
                      :
                      typeof region.content == "string" ? region.content : region.content?.innerText
                    }
                  </TableCell>
                  <TableCell>
                    {region.color == 'rgba(0, 0, 0, 0.1)' ? "No" : "Yes" }
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Load"><IconButton size="large" onClick={() => loadSnippet(region.id)}><ArrowCircleUp fontSize="large" color="secondary" /></IconButton></Tooltip>
                    
                    { regionIdToEdit != '' && regionIdToEdit == region.id?
                      (<Tooltip title="Save"><IconButton size="large" onClick={() => handleEditRowChanges(region.id)}><Done fontSize="large" color="secondary" /></IconButton></Tooltip>) :
                      (<Tooltip title="Edit"><IconButton size="large" onClick={() => openEdit(region.id)}><Edit fontSize="large" color="secondary" /></IconButton></Tooltip>)
                    }
                    
                    <Tooltip title="Trim"><IconButton size="large" onClick={() => handleFFmpegTrim(region.id)}><ContentCut fontSize="large" color="secondary" /></IconButton></Tooltip>
                    <Tooltip title="Delete"><IconButton size="large" onClick={() => removeRegion(region.id)}><Delete fontSize="large" sx={{ color: "#f44336" }} /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              )})}
              { isAdding ? 
                <TableRow>
                  <TableCell></TableCell>
                  <TableCell>
                    <TextField
                      value={newRegionStartTime}
                      onChange={(e) => setNewRegionStartTime(e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={newRegionEndTime}
                      onChange={(e) => setNewRegionEndTime(e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={newRegionName}
                      onChange={(e) => setNewRegionName(e.target.value)}
                    />
                  </TableCell>
                  <TableCell></TableCell>
                  <TableCell>
                  <Tooltip title="Save"><IconButton size="large" onClick={() => addRow()}><Done fontSize="large" color="secondary" /></IconButton></Tooltip>
                  </TableCell>
                </TableRow> 
                :
                <></>
              }
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Tooltip title="Add Row"><IconButton size="large" onClick={() => setIsAdding(true)}><Add fontSize="large" color="secondary" /></IconButton></Tooltip>
                </TableCell>
              </TableRow>
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