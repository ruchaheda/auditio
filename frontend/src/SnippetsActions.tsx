import React, { useEffect, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/plugins/regions';
import { 
    Box,
    Button,
    TextField,
} from '@mui/material';

type SnippetActionsProps = {
    regions: any,
    wavesurferRef: any,
    regionRef: any,
    renderTrigger: number,
    setRenderTrigger: React.Dispatch<React.SetStateAction<number>>,
}

const SnippetsActions: React.FC<SnippetActionsProps> = ({regions, wavesurferRef, regionRef, renderTrigger, setRenderTrigger}) => {

    const [regionId, setRegionId] = useState<string>('');
    const [currentRegionStartTime, setCurrentRegionStartTime] = useState<number>(0);  // State for start time
    const [currentRegionEndTime, setCurrentRegionEndTime] = useState<number>(0);      // State for end time
    const [regionName, setRegionName] = useState<string>('');

    // Manually update the start time
    const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(e.target.value);
        setCurrentRegionStartTime(value);
        setRegionId('');
    };

    // Manually update the end time
    const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(e.target.value);
        setCurrentRegionEndTime(value);
        setRegionId('');
    };

    const updateRegion = (newStart: number, newEnd: number, name?: string) => {
      if (regionRef.current) {
        setRegionId(regionRef.current.id);
      }
      else {
        setRegionId('');
      }

      setCurrentRegionStartTime(newStart);
      setCurrentRegionEndTime(newEnd);

      if (name) {
        setRegionName(name);
      }
    };

    useEffect(() => {
        if (regionRef.current) {
            updateRegion(regionRef.current.start, regionRef.current.end, regionRef.current.content?.innerText);
        }
        else {
            updateRegion(0, 0, '');
        }
    }, [renderTrigger, regionRef.current, regionRef.current?.id, regionRef.current?.start, regionRef.current?.end]);

    const createRegionManually = () => {
      // if no pre-existing region

      const newRegionName = regionName ? regionName : "New Region";
      console.log("newRegionName: ", newRegionName);

      if (regionId == '') {
        console.log("regionName: ", regionName);
        const newRegion = (wavesurferRef.current?.getActivePlugins()[2] as RegionsPlugin).addRegion({
          start: currentRegionStartTime,
          end: currentRegionEndTime,
          content: newRegionName,
          contentEditable: true,
          drag: true,
          resize: true,
        });

        regionRef.current = newRegion
          regions.current = {
            ...regions.current,
          [newRegion.id]: newRegion
        }
      }
      else {
        const regionToUpdate = regions.current[regionId];

        regionToUpdate.setOptions({
          start: currentRegionStartTime,
          end: currentRegionEndTime,
          content: regionName,
        })

        regionRef.current = regionToUpdate;
      }
  
      setRenderTrigger(prev => prev + 1);
     };

    return (
        <Box
          display="flex"
          flexDirection="row"
          gap="20px"
          justifyContent="center"
        >
          <TextField 
            id="regionId"
            label="Region ID"
            variant="filled"
            value={regionId}
            slotProps={{
              input: {
                readOnly: true,
              },
            }}
          />

          <TextField 
            id="startTime" 
            label="Start Time" 
            type="number"
            variant="outlined" 
            value={currentRegionStartTime} 
            onChange={handleStartTimeChange} 
          />
        
          <TextField 
            id="endTime" 
            label="End Time" 
            type="number" 
            variant="outlined" 
            value={currentRegionEndTime} 
            onChange={handleEndTimeChange}
          />

          <TextField 
            id="regionName"
            label="Region Name"
            variant="outlined"
            value={regionName}
            onChange={(e) => setRegionName(e.target.value)}
          />

          <Button variant="outlined" onClick={createRegionManually} color="secondary">Create/Update Snippet</Button>
        </Box>
    );
}

export default SnippetsActions;