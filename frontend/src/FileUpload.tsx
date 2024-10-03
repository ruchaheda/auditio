import React from 'react';
import { 
    Box,
    Button
} from '@mui/material';
import { CloudUpload } from '@mui/icons-material';

type FileUploadProps = {
    audioFile: string | null;
    setAudioFile: React.Dispatch<React.SetStateAction<string | null>>
}

const FileUpload: React.FC<FileUploadProps> = ({audioFile, setAudioFile}) => {

    // Handle file upload
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        fetch('http://localhost:5001/upload', {
        method: 'POST',
        body: formData,
        })
        .then((res) => res.json())
        .then((data) => {
            setAudioFile(data.filename);
        });
    };

    return (
        <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            gap="20px"
            p={2}
        >
            <Button
                variant="contained"
                component="label"
                startIcon={<CloudUpload />}
                >Upload File
                <input type="file" hidden onChange={handleFileUpload} />
            </Button>
            
            { audioFile && (
            <p><b>Current file:</b> {audioFile}</p>
            )}
        </Box>
    );
}
export default FileUpload;