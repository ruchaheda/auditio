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
};

const Waveform: React.FC<WaveformProps> = ({regions, wavesurferRef, regionRef, setRenderTrigger, audioFile}) => {
    const [loopAudio, setLoopAudio] = useState<boolean>(true);
    const loopAudioRef = useRef<boolean>(true);

    // Load the uploaded audio file into wavesurfer
    const loadAudio = (filename: string) => {
            // If a WaveSurfer instance already exists, destroy it before creating a new one
            if (wavesurferRef.current) {
                wavesurferRef.current.destroy();
            }

            // Create a timeline plugin instance with custom options
            const topTimeline = TimelinePlugin.create({
                container: '#waveform',
                height: 20,
                timeInterval: 1,
                primaryLabelInterval: 5,
                secondaryLabelOpacity: 0,
                style: {
                    fontSize: '20px',
                    color: '#2D5B88',
                },
            })

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
                height: 100,
                barWidth: 2,
                barGap: 1,
                barRadius: 2,
                plugins: [topTimeline, hover, regionPlugin]
            });

            console.log("active plugins, ", wavesurfer.getActivePlugins());

            wavesurferRef.current = wavesurfer;

            // Load audio file from the server
            wavesurfer.load(`http://localhost:5001/uploads/${filename}`);

            wavesurfer.on('ready' as any, () => {
            console.log("waveform is ready!");

            regionPlugin.enableDragSelection({
                color: 'rgba(255, 0, 0, 0.3)',
            });

            // Listening for when user seeks to a specific part on the waveform. 
            wavesurfer.on('seeking' as any, (progress) => {
                console.log('User is interacting with the waveform:', progress);
            });
        
            // Listen for region creation
            regionPlugin.on('region-created' as any, (region) => {
                console.log("region-created! region: ", region);
                
                const regionName = region.content ? region.content : "New Region";

                region.setOptions({
                    content: regionName,
                    contentEditable: true,
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
                regionRef.current = region;
                console.log('region-clicked! current region: ', regionRef.current);
                regionRef.current.play();
                setRenderTrigger(prev => prev + 1);

                // TODO: BUG - figure out why clicking on a different region is not playing that new region. 
            });

            regionPlugin.on('region-out' as any, (region) => {
                if (loopAudioRef.current) {
                region.play();
                }
            })

            regionPlugin.on('region-updated' as any, (region) => {
                regionRef.current = region;
                setRenderTrigger(prev => prev + 1);
            })
        });
    };

    const toggleLooping = () => {
        loopAudioRef.current = !loopAudioRef.current;
        setLoopAudio(loopAudioRef.current);
    }
    
    const handlePlayPause: React.MouseEventHandler<HTMLButtonElement> = () => {
        wavesurferRef.current.playPause();
    }
    
    const seek = (seconds: number) => {
        if (!wavesurferRef.current) {
            return;
        }

        wavesurferRef.current.skip(seconds);
    }

    useEffect(() => {
        if (audioFile) {
            loadAudio(audioFile);
        }
    }, [audioFile]);

    return (
        <Box>
            <Box width="100vw" id="waveform" />

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