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
    renderTrigger: number,
}

const Snippets: React.FC<SnippetsProps> = ({regions, renderTrigger}) => {

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
                {/* {console.log(regions)} */}
                {Object.values(regions.current).map((region: any, index) => {
                  console.log("regionsTrigger on render: ", renderTrigger);
                  return (
                  <TableRow key={index}>
                    <TableCell>{region.id}</TableCell>
                    <TableCell>{region.start}</TableCell>
                    <TableCell>{region.end}</TableCell>
                    <TableCell>{typeof region.content == "string" ? region.content : region.content.innerText}</TableCell>
                    <TableCell>
                      <Tooltip title="Load"><IconButton size="large"><ArrowCircleUp fontSize="large" color="secondary" /></IconButton></Tooltip>
                      <Tooltip title="Edit"><IconButton size="large"><Edit fontSize="large" color="primary" /></IconButton></Tooltip>
                      <Tooltip title="Delete"><IconButton size="large"><Delete fontSize="large" sx={{ color: "#f44336" }} /></IconButton></Tooltip>
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