import React, { useState } from 'react';
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
    Delete,
    Share,
    Upload,
} from '@mui/icons-material';
import ExportDialog from './ExportDialog.tsx';
import ImportDialog from './ImportDialog.tsx';

type SnippetsProps = {
    audioFile: string | null,
    regions: any,
    wavesurferRef: any,
    regionRef: any,
    renderTrigger: number,
    setRenderTrigger: React.Dispatch<React.SetStateAction<number>>,
    secondsToHHMMSS: (seconds:number) => string,
    HHMMSSToSeconds: (timestamp: string) => number,
}

const SnippetsView: React.FC<SnippetsProps> = ({audioFile, regions, wavesurferRef, regionRef, renderTrigger, setRenderTrigger, secondsToHHMMSS, HHMMSSToSeconds}) => {

  const [openExport, setOpenExport] = useState(false);
  const [openImport, setOpenImport] = useState(false);

  const loadSnippet = (regionId: string) => {

    // regionRef.current.set rgba(0, 0, 0, 0.1), rgba(255, 0, 0, 0.3)
    regionRef.current.setOptions({
        color: 'rgba(0, 0, 0, 0.1)'
    })

    regionRef.current = regions.current[regionId]; // why is this not sufficient to update the fields in SnippetActions?
    regionRef.current.setOptions({
        color: 'rgba(255, 0, 0, 0.3)'
    })

    setRenderTrigger(prev => prev + 1);

    // TODO: Add color change to previous region back to grey. update new color to something nice. 
  }

  const removeRegion = (regionId: string) => {
      regions.current[regionId].remove();
      delete regions.current[regionId]
      regionRef.current = null;

      setRenderTrigger(prev => prev + 1);
  }

  return (
      <Box>
          <TableContainer component={Paper}>
          <Table sx={{ width: "80vw"}} aria-label="simple table">
            <TableHead>
              <TableRow>
                <TableCell colSpan={5} align="right">
                  <Tooltip title="Share"><IconButton onClick={() => setOpenImport(true)}><Upload fontSize="large" /></IconButton></Tooltip>
                  <Tooltip title="Share"><IconButton onClick={() => setOpenExport(true)}><Share fontSize="large" /></IconButton></Tooltip>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell><b>ID</b></TableCell>
                <TableCell><b>Start Time</b></TableCell>
                <TableCell><b>End Time</b></TableCell>
                <TableCell><b>Snippet Name</b></TableCell>
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
                  <TableCell>{typeof region.content == "string" ? region.content : region.content.innerText}</TableCell>
                  <TableCell>
                    <Tooltip title="Load"><IconButton size="large" onClick={() => loadSnippet(region.id)}><ArrowCircleUp fontSize="large" color="secondary" /></IconButton></Tooltip>
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