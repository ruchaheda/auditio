import React, { useEffect, useState, useRef } from 'react';
import {
    Box,
    Button,
    Checkbox,
    IconButton,
} from '@mui/material';
import { Forward5, Forward10, Forward30, Replay5, Replay10, Replay30 } from '@mui/icons-material';
import WaveSurfer from 'wavesurfer.js';
import TimelinePlugin from 'wavesurfer.js/plugins/timeline';
import Hover from 'wavesurfer.js/plugins/hover';
import RegionsPlugin from 'wavesurfer.js/plugins/regions';

type WaveformProps = {
    regions: any,
    wavesurferRef: any,
    regionRef: any,
    setRenderTrigger: React.Dispatch<React.SetStateAction<number>>,
    audioFile: string | null,
    secondsToHHMMSS: (seconds:number) => string,
    audioUrl: string,
};

const Waveform: React.FC<WaveformProps> = ({regions, wavesurferRef, regionRef, setRenderTrigger, audioFile, secondsToHHMMSS, audioUrl}) => {
    const [loopAudio, setLoopAudio] = useState<boolean>(true);
    const loopAudioRef = useRef<boolean>(true);
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
    const loadAudio = (filename: string) => {
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

        // filename: audioUrl
        // console.log("audioUrl: ", audioUrl);
        const binary = convertDataURIToBinary(audioUrl);
        wavesurfer.loadBlob(new Blob([binary], {type : 'audio/mpeg'}));

        wavesurfer.on('ready' as any, () => {
            console.log("waveform is ready!");
            setDuration(wavesurferRef.current.getDuration())

            regionPlugin.enableDragSelection({
                color: 'rgba(255, 0, 0, 0.3)',
            });

            // Listening for when user seeks to a specific part on the waveform. 
            wavesurfer.on('seeking' as any, (progress) => {
                console.log('User is interacting with the waveform:', progress);
                setCurrentTime(progress);
            });

            wavesurferRef.current.on('play' as any, () => {
                setPlayPause(true);
            })

            wavesurferRef.current.on('pause' as any, () => {
                setPlayPause(false);
            })
        
            // Listen for region creation
            regionPlugin.on('region-created' as any, (region) => {
                console.log("region-created! region: ", region);
                
                const regionName = region.content ? region.content : "New Region";

                regionRef.current?.setOptions({
                    color: 'rgba(0, 0, 0, 0.1)'
                })

                region.setOptions({
                    content: regionName,
                    contentEditable: true,
                    color: 'rgba(255, 0, 0, 0.3)'
                })
                
                regionRef.current = region;

                regions.current = {
                    ...regions.current,
                    [region.id]: region
                }
                setRenderTrigger(prev => prev + 1);
            });

            regionPlugin.on('region-clicked' as any, (region, e) => {
                e.stopPropagation(); // prevent triggering a click on the waveform
                
                // regionRef.current.set rgba(0, 0, 0, 0.1), rgba(255, 0, 0, 0.3)
                regionRef.current.setOptions({
                    color: 'rgba(0, 0, 0, 0.1)'
                })

                regionRef.current = region;
                regionRef.current.setOptions({
                    color: 'rgba(255, 0, 0, 0.3)'
                })
                console.log('region-clicked! current region: ', regionRef.current);

                if (loopAudioRef) {
                    loopAudioRef.current = false;
                    regionRef.current.play();
                    loopAudioRef.current = true;
                }
                else {
                    regionRef.current.play();
                }
                
                setRenderTrigger(prev => prev + 1);
            });

            regionPlugin.on('region-out' as any, (region) => {

                if (loopAudioRef.current && regionRef.current == region) {
                    region.play();
                }
            })

            regionPlugin.on('region-updated' as any, (region) => {
                regionRef.current.setOptions({
                    color: 'rgba(0, 0, 0, 0.1)'
                })

                regionRef.current = region;
                regionRef.current.setOptions({
                    color: 'rgba(255, 0, 0, 0.3)'
                })
                setRenderTrigger(prev => prev + 1);
            })
        });
    };

    const toggleLooping = () => {
        loopAudioRef.current = !loopAudioRef.current;
        setLoopAudio(loopAudioRef.current);
    }
    
    const handlePlayPause: React.MouseEventHandler<HTMLButtonElement> = () => {

        if (regionRef.current && 
            loopAudioRef.current &&
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
        // console.log("useEffect in Waveform.tsx called! audioFile: ", audioFile);
        // console.log("useEffect audioFile: ", audioFile);
        // console.log("useEffect audioUrl: ", audioUrl);
        // console.log("wavesurferRef.current: ", wavesurferRef.current);
        if (audioUrl) {
            loadAudio(audioUrl);
        }
        
        if (!audioUrl && wavesurferRef.current) {
            // console.log("ELSE: wavesurferRef.current: ", wavesurferRef.current);
            wavesurferRef.current.empty();
        }
    }, [audioFile, audioUrl]);

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
                            <p style={{ marginRight: '16px' }}><b>Total Duration:</b> {secondsToHHMMSS(duration)}</p>
                        </Box>
                        </>
                    )}
                </Box>
            </Box>

            <Box
                display="flex"
                justifyContent="center"
                gap="20px"
                p={2}
            >
            <Box>
                <Checkbox 
                    checked={loopAudio}
                    onChange={toggleLooping}
                    inputProps={{ 'aria-label': 'controlled' }}
                />Loop Audio
            </Box>

            <IconButton size="large" onClick={() => seek(-30)}><Replay30 fontSize="large" /></IconButton>
            <IconButton size="large" onClick={() => seek(-10)}><Replay10 fontSize="large" /></IconButton>
            <IconButton size="large" onClick={() => seek(-5)}><Replay5 fontSize="large" /></IconButton>

            <Button variant="contained" onClick={handlePlayPause} color="primary">Play/Pause</Button>

            <IconButton size="large" onClick={() => seek(5)}><Forward5 fontSize="large" /></IconButton>
            <IconButton size="large" onClick={() => seek(10)}><Forward10 fontSize="large" /></IconButton>
            <IconButton size="large" onClick={() => seek(30)}><Forward30 fontSize="large" /></IconButton>
            </Box>
        </Box>
    );
}

export default Waveform;