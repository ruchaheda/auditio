import React from 'react';
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
    Edit,
    Delete,
} from '@mui/icons-material';

type SnippetsProps = {
    regions: any,
    regionRef: any,
    renderTrigger: number,
    setRenderTrigger: React.Dispatch<React.SetStateAction<number>>,
}

const Snippets: React.FC<SnippetsProps> = ({regions, regionRef, renderTrigger, setRenderTrigger}) => {

  const loadSnippet = (regionId: string) => {
    regionRef.current = regions.current[regionId]; // why is this not sufficient to update the fields in SnippetActions?
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
                  <TableCell>{region.start}</TableCell>
                  <TableCell>{region.end}</TableCell>
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
      </Box>
  );
}

export default Snippets;