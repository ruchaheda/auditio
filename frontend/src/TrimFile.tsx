import React, { useEffect, useState } from 'react';
import {
    Box,
    Button,
} from '@mui/material';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { saveAs } from 'file-saver';

type TrimFileProps = {
    audioFile: string | null,
    audioUrl: string,
    regionRef: any,
}

const TrimFile: React.FC<TrimFileProps> = ({audioFile, audioUrl, regionRef}) => {

    const handleFFmpegTrim = async () => {
        if (!audioFile) return;

        const base64Audio = audioUrl;
        const outputFileName = regionRef.current.content.innerText + '.mp3';

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

        await ffmpeg.exec(['-i', audioFile, 
                            '-ss', regionRef.current.start.toString(), 
                            '-to', regionRef.current.end.toString(), 
                            '-c', 'copy', 
                            '-metadata', `title=${outputFileName}`,
                            outputFileName]);
        const data = await ffmpeg.readFile(outputFileName);

        // Create a Blob from the output file
        const trimmedBlob = new Blob([data], { type: 'audio/mpeg' });

        saveAs(trimmedBlob, outputFileName);
    }

    return (
        <Box>
            <Button variant="contained" onClick={handleFFmpegTrim} color="primary">Trim & Download</Button>
        </Box>
    );
}

export default TrimFile;