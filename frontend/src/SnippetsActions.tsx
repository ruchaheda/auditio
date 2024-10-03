import React, { useEffect, useState } from 'react';
import RegionsPlugin from 'wavesurfer.js/plugins/regions';
import { 
    Box,
    Button,
    TextField,
} from '@mui/material';

type SnippetActionsProps = {
    regions: any,
    currentWavesurferRef: any,
    currentRegionRef: any,
    renderTrigger: number,
    setRenderTrigger: React.Dispatch<React.SetStateAction<number>>,
}

const SnippetsActions: React.FC<SnippetActionsProps> = ({regions, currentWavesurferRef, currentRegionRef, renderTrigger, setRenderTrigger}) => {

    const [currentRegionStartTime, setCurrentRegionStartTime] = useState<number>(0);  // State for start time
    const [currentRegionEndTime, setCurrentRegionEndTime] = useState<number>(0);      // State for end time
    const [regionName, setRegionName] = useState<string>('');

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

    const updateRegion = (newStart: number, newEnd: number, name?: string) => {
        if (currentRegionRef) {
            setCurrentRegionStartTime(newStart);
            setCurrentRegionEndTime(newEnd);
            if (name) {
            setRegionName(name);
            }
        }
    };

    useEffect(() => {
        if (currentRegionRef) {
            updateRegion(currentRegionRef.start, currentRegionRef.end, currentRegionRef.content?.innerText);
        }
    }, [currentRegionRef, currentRegionRef?.start, currentRegionRef?.end]);

    const createRegionManually = () => {
        const newRegion = (currentWavesurferRef.current?.getActivePlugins()[2] as RegionsPlugin).addRegion({
         start: currentRegionStartTime,
         end: currentRegionEndTime,
         content: regionName ? regionName : "New Region",
         contentEditable: true,
         drag: true,
         resize: true,
       });
   
       currentRegionRef.current = newRegion
       regions.current = {
         ...regions.current,
         [newRegion.id]: newRegion
       }
       setRenderTrigger(prev => prev + 1);
   
     }

    return (
        <Box
          display="flex"
          flexDirection="row"
          gap="20px"
          justifyContent="center"
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
            value={regionName}
            onChange={(e) => setRegionName(e.target.value)}
          />

          <Button variant="outlined" onClick={createRegionManually} color="secondary">Create Snippet</Button>
        </Box>
    );
}

export default SnippetsActions;