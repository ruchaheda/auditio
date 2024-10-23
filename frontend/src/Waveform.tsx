import React, { useEffect, useState, useRef } from 'react';
import {
    Box,
    Button,
    Checkbox,
    FormControl,
    FormControlLabel,
    IconButton,
    Radio,
    RadioGroup,
} from '@mui/material';
import { Forward5, Forward10, Forward30, Replay5, Replay10, Replay30 } from '@mui/icons-material';
import WaveSurfer from 'wavesurfer.js';
import TimelinePlugin from 'wavesurfer.js/plugins/timeline';
import Hover from 'wavesurfer.js/plugins/hover';
import RegionsPlugin from 'wavesurfer.js/plugins/regions';
import { IDBPDatabase } from 'idb';

type WaveformProps = {
    regions: any,
    wavesurferRef: any,
    regionRef: any,
    initDB: () => Promise<IDBPDatabase>,
    setRenderTrigger: React.Dispatch<React.SetStateAction<number>>,
    audioFileId: number,
    secondsToHHMMSS: (seconds:number) => string,
    audioUrl: string,
};

const Waveform: React.FC<WaveformProps> = ({regions, wavesurferRef, regionRef, initDB, setRenderTrigger, audioFileId, secondsToHHMMSS, audioUrl}) => {
    const [loopAudio, setLoopAudio] = useState<boolean>(false);
    const loopAudioRef = useRef<boolean>(false);
    const [loopOption, setLoopOption] = useState('');
    const loopOptionRef = useRef('');
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [playPause, setPlayPause] = useState(false);
    const BASE64_MARKER = ';base64,';

    const convertDataURIToBinary = (dataURI: string) => {
        const base64Index = dataURI.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
        const base64 = dataURI.substring(base64Index);
        const raw = window.atob(base64);
        const rawLength = raw.length;
        const array = new Uint8Array(new ArrayBuffer(rawLength));
      
        for(let i = 0; i < rawLength; i++) {
          array[i] = raw.charCodeAt(i);
        }
        return array;
    }

    // Load the uploaded audio file into wavesurfer
    const loadAudio = () => {
        // If a WaveSurfer instance already exists, destroy it before creating a new one
        if (wavesurferRef.current) {
            wavesurferRef.current.destroy();
        }

        // Create a timeline plugin instance with custom options
        // const topTimeline = TimelinePlugin.create({
        //     container: '#waveform',
        //     height: 20,
        //     timeInterval: 1,
        //     primaryLabelInterval: 5,
        //     secondaryLabelOpacity: 0,
        //     style: {
        //         fontSize: '20px',
        //         color: '#2D5B88',
        //     },
        // })

        const hover = Hover.create({
            lineColor: '#ff0000',
            lineWidth: 2,
            labelBackground: '#555',
            labelColor: '#fff',
            labelSize: '11px',
        })

        const regionPlugin = RegionsPlugin.create();

        const wavesurfer = WaveSurfer.create({
            container: '#waveform',
            waveColor: 'rgb(200, 0, 200)',
            progressColor: 'rgb(100, 0, 100)',
            autoScroll: true,
            autoCenter: true,    // Disable auto-centering
            minPxPerSec: 20,      // Minimum pixels per second for the waveform
            fillParent: true,
            height: 100,
            barWidth: 2,
            barGap: 1,
            barRadius: 2,
            plugins: [hover, regionPlugin]
        });

        wavesurferRef.current = wavesurfer;

        // Load audio file from the server
        // wavesurfer.load(`http://localhost:5001/uploads/${filename}`);

        const binary = convertDataURIToBinary(audioUrl);
        wavesurfer.loadBlob(new Blob([binary], {type : 'audio/mpeg'}));

        wavesurfer.on('ready' as any, () => {
            console.log("waveform is ready!");
            setDuration(wavesurferRef.current.getDuration());
            loadRegionsForFile(audioFileId);

            regionPlugin.enableDragSelection({
                color: 'rgba(255, 0, 0, 0.3)',
            });

            // Listening for when user seeks to a specific part on the waveform. 
            wavesurfer.on('seeking' as any, (progress) => {
                console.log('User is interacting with the waveform:', progress);
                setCurrentTime(progress);
            });

            /** On audio position change, fires continuously during playback */
            wavesurfer.on('timeupdate', (currentTime) => {
                // console.log('Time', currentTime + 's');
                setCurrentTime(currentTime);
            });

            wavesurferRef.current.on('play' as any, () => {
                setPlayPause(true);
            });

            wavesurferRef.current.on('pause' as any, () => {
                setPlayPause(false);
            });

            wavesurferRef.current.on('finish' as any, () => {
                console.log('Track finished.');
                if (loopOptionRef.current == 'track') {
                    wavesurferRef.current.play(0);  // Restart playback from the beginning (0 seconds)
                }
            });
        
            // Listen for region creation
            regionPlugin.on('region-created' as any, (region) => {
                console.log("region-created! region: ", region);
                
                const regionName = region.content ? (region.content.innerText ? region.content.innerText : region.content) : "New Region";

                // mark current region as non-active before switching over to newly created region
                if (regionRef.current) {
                    toggleRegionIsActive(audioFileId, regionRef.current.id, false);
                }

                // switch over to newly created region
                regionRef.current = region;

                // add or update region in DB
                addOrUpdateRegionInDB(audioFileId, region.id, region.start, region.end, regionName, true);
                toggleRegionIsActive(audioFileId, region.id, true);

                // update current region's (in wavesurfer) name, contentEditable, and color
                region.setOptions({
                    content: regionName,
                    contentEditable: true,
                })

                regions.current = {
                    ...regions.current,
                    [region.id]: region
                }

                setRenderTrigger(prev => prev + 1);
            });

            regionPlugin.on('region-clicked' as any, (region, e) => {
                e.stopPropagation(); // prevent triggering a click on the waveform

                toggleRegionIsActive(audioFileId, regionRef.current.id, false);
                regionRef.current.setOptions({
                    color: 'rgba(0, 0, 0, 0.1)'
                })

                toggleRegionIsActive(audioFileId, region.id, true);
                regionRef.current = region;
                regionRef.current.setOptions({
                    color: 'rgba(255, 0, 0, 0.3)'
                })

                // if (loopAudioRef.current) {
                //     loopAudioRef.current = false;
                //     regionRef.current.play();
                //     loopAudioRef.current = true;
                // }
                // else {
                //     regionRef.current.play();
                // }

                regionRef.current.play();
                
                setRenderTrigger(prev => prev + 1);
            });

            regionPlugin.on('region-out' as any, (region) => {
                console.log('region-out - loopOptionRef.current: ', loopOptionRef.current);

                if (loopOptionRef.current == 'snippet' && regionRef.current == region) {
                    region.play();
                }
            })

            regionPlugin.on('region-updated' as any, (region) => {
                console.log('region-updated! region: ', region);

                // TODO: update indexedDB database for updated region
                toggleRegionIsActive(audioFileId, regionRef.current.id, false);
                // regionRef.current.setOptions({
                //     color: 'rgba(0, 0, 0, 0.1)'
                // })

                toggleRegionIsActive(audioFileId, region.id, true);
                addOrUpdateRegionInDB(audioFileId, region.id, region.start, region.end, region.content?.innerText, true);
                regionRef.current = region;
                // regionRef.current.setOptions({
                //     color: 'rgba(255, 0, 0, 0.3)'
                // })
                setRenderTrigger(prev => prev + 1);
            })
        });
    };

    const loadRegionsForFile = async (audioFileId: number) => {
        if (wavesurferRef.current) {
            const snippets = await fetchAllSnippetsForAudioFile(audioFileId);
            const regionsPlugin = wavesurferRef.current.getActivePlugins()[1] as RegionsPlugin;
            regionsPlugin.clearRegions();
            regions.current = {};
            regionRef.current = null;
            let activeSnippet: any = null;
            let regionColor = 'rgba(0, 0, 0, 0.1)';

            snippets?.forEach((snippet) => {
                const startTime = snippet.startTime;
                const endTime = snippet.endTime;
                if (snippet.isActive) {
                    regionColor = 'rgba(255, 0, 0, 0.3)';
                    activeSnippet = snippet;
                }

                const newRegion = regionsPlugin.addRegion({
                    id: snippet.regionId,
                    start: startTime,
                    end: endTime,
                    content: snippet.name,
                    contentEditable: true,
                    drag: true,
                    resize: true,
                    color: regionColor,
                });
            });

            if (activeSnippet) {
                toggleRegionIsActive(audioFileId, regionRef.current?.id, false);
                toggleRegionIsActive(audioFileId, activeSnippet.regionId, true);
                regionRef.current = regions.current[activeSnippet.regionId];
            }

            setRenderTrigger(prev => prev + 1);
        }
    }

  const fetchAllSnippetsForAudioFile = async (audioFileId: number) => {
    const db = await initDB();
    const transaction = db.transaction('snippets', 'readonly');
    const snippetStore = transaction.objectStore('snippets');

    const index = snippetStore.index('audioFileId');
    const snippets = await index.getAll(audioFileId);

    return snippets;
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

    const toggleRegionIsActive = async (audioFileId: number, regionId: string, isActive: boolean) => {
        if (!regionRef.current || !regionId) {
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
    }

    const toggleLooping = () => {

        const loopAudioCurrentState = loopAudioRef.current;

        loopAudioRef.current = !loopAudioCurrentState;
        setLoopAudio(!loopAudioCurrentState);

        setRenderTrigger(prev => prev + 1);
    }

    const handleLoopOptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // update loop option value
        const selectedLoopOption = e.target.value;
        setLoopOption(selectedLoopOption);
        loopOptionRef.current = selectedLoopOption;

        // if track or none, change current region's color to gray?
        if (regionRef.current) {
            if (selectedLoopOption != 'snippet') {
                toggleRegionIsActive(audioFileId, regionRef.current.id, false);
            }
            else { // if snippet, mark current region as active?
                toggleRegionIsActive(audioFileId, regionRef.current.id, true);
            }
        }
    }
    
    const handlePlayPause: React.MouseEventHandler<HTMLButtonElement> = () => {

        if (regionRef.current && 
            loopOptionRef.current == 'snippet' &&
            !playPause &&
            !(currentTime >= regionRef.current.start && currentTime <= regionRef.current.end)
        ) {
            regionRef.current.play();
        }
        else {
            wavesurferRef.current.playPause();
        }
    }
    
    const seek = (seconds: number) => {
        if (!wavesurferRef.current) {
            return;
        }

        wavesurferRef.current.skip(seconds);
    }

    useEffect(() => {
        if (audioFileId) {
            loadAudio();
            loadRegionsForFile(audioFileId);
        }
        
        if (!audioFileId && wavesurferRef.current) {
            wavesurferRef.current.empty();
        }
    }, [audioFileId, audioUrl]);

    return (
        <Box>
            <Box
                sx={{ 
                    width: '100vw',
                    overflow: 'hidden',   // Prevent the outer box from scrolling
                    position: 'relative', // Stable layout for the waveform
                }}
            >
                <Box 
                    id="waveform" 
                    sx={{
                        width: '100%',
                        height: '150px',
                        overflowX: 'auto',     // Enable horizontal scrolling within this container
                        whiteSpace: 'nowrap',  // Prevent wrapping to enable horizontal scrolling
                      }}
                />
                <Box
                    sx={{
                        display: 'flex',              // Use flexbox for row alignment
                        justifyContent: 'space-between', // Ensure space between the center and right items
                        alignItems: 'center',          // Vertically align items
                        width: '100%',                 // Make sure the box takes up the full width
                        paddingRight: '16px',          // Add some padding on the right for spacing
                    }}
                >
                    {wavesurferRef.current && (
                        <>
                        {/* Container for Start and End Time, centered */}
                        <Box
                            sx={{
                                display: 'flex',
                                gap: '20px',                  // Space between Start and End Time
                                justifyContent: 'center',     // Center items in this box
                                flex: 1,                      // Make it take available space in the middle
                                alignItems: 'center',
                            }}
                        >
                            <Box><p><b>Current Active Region:</b></p></Box>
                            <Box><p><b>Start Time:</b> {regionRef.current ? secondsToHHMMSS(regionRef.current.start) : ''}</p></Box>
                            <Box><p><b>End Time:</b> {regionRef.current ? secondsToHHMMSS(regionRef.current.end) : ''}</p></Box>
                        </Box>

                        {/* Container for Total Duration aligned to the right */}
                        <Box
                            sx={{
                            textAlign: 'right',           // Align Total Duration text to the right
                            flex: 'none',                 // Ensure it doesn't stretch or grow
                            }}
                        >
                            <p style={{ marginRight: '16px' }}><b>Current Time:</b> {secondsToHHMMSS(currentTime)}</p>
                            <p style={{ marginRight: '16px' }}><b>Total Duration:</b> {secondsToHHMMSS(duration)}</p>
                        </Box>
                        </>
                    )}
                </Box>
            </Box>

            <Box
                display="flex"
                flexDirection="row"
                justifyContent="center"
                alignItems="center"
                gap="20px"
                p={2}
            >
                <Box>
                    <FormControl component="fieldset">
                        <RadioGroup 
                            value={loopOption} 
                            onChange={handleLoopOptionChange}
                        >
                            <FormControlLabel 
                                value="snippet"
                                control={<Radio />}
                                label="Loop Snippet"
                            />
                            <FormControlLabel 
                                value="track"
                                control={<Radio />}
                                label="Loop Track"
                            />
                            <FormControlLabel 
                                value=""
                                control={<Radio />}
                                label="None"
                            />
                        </RadioGroup>
                        {/* <Checkbox 
                            checked={loopAudio}
                            onChange={toggleLooping}
                            inputProps={{ 'aria-label': 'controlled' }}
                        />Loop Snippet */}
                    </FormControl>
                </Box>

                <Box
                    display="flex"
                    flexDirection="row"
                    justifyContent="center"
                    alignItems="center"
                    gap="20px"
                    p={2}
                >
                    <IconButton size="large" onClick={() => seek(-30)}><Replay30 fontSize="large" /></IconButton>
                    <IconButton size="large" onClick={() => seek(-10)}><Replay10 fontSize="large" /></IconButton>
                    <IconButton size="large" onClick={() => seek(-5)}><Replay5 fontSize="large" /></IconButton>

                    <Button variant="contained" onClick={handlePlayPause} color="primary">Play/Pause</Button>

                    <IconButton size="large" onClick={() => seek(5)}><Forward5 fontSize="large" /></IconButton>
                    <IconButton size="large" onClick={() => seek(10)}><Forward10 fontSize="large" /></IconButton>
                    <IconButton size="large" onClick={() => seek(30)}><Forward30 fontSize="large" /></IconButton>
                </Box>
            </Box>
        </Box>
    );
}

export default Waveform;