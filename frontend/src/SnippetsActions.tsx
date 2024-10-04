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
    secondsToHHMMSS: (seconds:number) => string,
    HHMMSSToSeconds: (timestamp: string) => number,
}

const SnippetsActions: React.FC<SnippetActionsProps> = ({regions, wavesurferRef, regionRef, renderTrigger, setRenderTrigger, secondsToHHMMSS, HHMMSSToSeconds}) => {

    const [regionId, setRegionId] = useState<string>('');
    const [activeRegionStartTime, setActiveRegionStartTime] = useState<number>(0);  // State for start time
    const [activeRegionEndTime, setActiveRegionEndTime] = useState<number>(0);      // State for end time
    const [enteredRegionStartTime, setEnteredRegionStartTime] = useState<string>('');
    const [enteredRegionEndTime, setEnteredRegionEndTime] = useState<string>('');
    const [regionName, setRegionName] = useState<string>('');
    const [error, setError] = useState(false);

    // Regular expression to match HH:MM:SS or MM:SS
    const timeRegex = /^(\d{2}):([0-5]\d):([0-5]\d)$|^([0-5]?\d):([0-5]\d)$/;

    // Manually update the start time
    const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEnteredRegionStartTime(e.target.value);
        setRegionId('');
    };

    // Manually update the end time
    const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEnteredRegionEndTime(e.target.value);
        setRegionId('');
    };

    const updateRegion = (newStart: number, newEnd: number, name?: string) => {
      if (regionRef.current) {
        setRegionId(regionRef.current.id);
      }
      else {
        setRegionId('');
      }

      setActiveRegionStartTime(newStart);
      setActiveRegionEndTime(newEnd);

      setEnteredRegionStartTime(secondsToHHMMSS(newStart));
      setEnteredRegionEndTime(secondsToHHMMSS(newEnd));

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

      // printDebugStatements("createRegionManually", "right before creating new region with no regionId");

      if (regionId == '' && wavesurferRef.current) {
        const newRegion = (wavesurferRef.current.getActivePlugins()[1] as RegionsPlugin).addRegion({
          start: HHMMSSToSeconds(enteredRegionStartTime),
          end: HHMMSSToSeconds(enteredRegionEndTime),
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
          start: HHMMSSToSeconds(enteredRegionStartTime),
          end: HHMMSSToSeconds(enteredRegionEndTime),
          content: regionName,
        })

        regionRef.current = regionToUpdate;
      }
  
      setRenderTrigger(prev => prev + 1);
     };

    const printDebugStatements = (functionName: string, note: string) => {
      console.log("functionName: " + functionName + "\n");
      console.log("note: " + note + "\n");
      console.log("regions: ", regions.current);
      console.log("wavesurferRef.current: ", wavesurferRef.current);
      console.log("wavesurferRef.current.getActivePlugins: ", wavesurferRef.current.getActivePlugins());
      console.log("currentRegionStarttime: ", activeRegionStartTime);
      console.log("currentRegionEndTime: ", activeRegionEndTime);
      console.log("regionId: ", regionId);

      console.log("enteredRegionStartTime: ", enteredRegionStartTime);
      console.log("enteredRegionEndTime: ", enteredRegionEndTime);
    }

    return (
        <Box
          display="flex"
          flexDirection="row"
          gap="20px"
          justifyContent="center"
        >
          {/* <TextField 
            id="regionId"
            label="Region ID"
            variant="filled"
            hidden
            value={regionId}
            slotProps={{
              input: {
                readOnly: true,
              },
            }}
          /> */}

          <TextField 
            id="regionName"
            label="Region Name"
            variant="outlined"
            value={regionName}
            onChange={(e) => setRegionName(e.target.value)}
          />

          <TextField 
            id="startTime" 
            label="Start Time" 
            type="string"
            variant="outlined" 
            value={enteredRegionStartTime} 
            onChange={handleStartTimeChange} 
          />
        
          <TextField 
            id="endTime" 
            label="End Time" 
            type="string" 
            variant="outlined" 
            value={enteredRegionEndTime} 
            onChange={handleEndTimeChange}
          />

          <Button variant="outlined" onClick={createRegionManually} color="secondary">Create/Update Snippet</Button>
        </Box>
    );
}

export default SnippetsActions;