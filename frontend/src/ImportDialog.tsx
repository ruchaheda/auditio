import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogTitle,
    DialogContent,
    IconButton,
    TextField,
} from '@mui/material';
import {
    Close,
} from '@mui/icons-material';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/plugins/regions';

type ImportDialogProps = {
    audioFile: string | null,
    regions: any,
    wavesurferRef: any,
    regionRef: any,
    openImport: boolean,
    setOpenImport: React.Dispatch<React.SetStateAction<boolean>>,
    HHMMSSToSeconds: (timestamp: string) => number,
}

const ImportDialog: React.FC<ImportDialogProps> = ({audioFile, regions, wavesurferRef, regionRef, openImport, setOpenImport, HHMMSSToSeconds}) => {

    const [importText, setImportText] = useState('');

    const handleClose = () => { 
        setOpenImport(false);
    }

    const handleImport = () => {
        if (!audioFile) {
            console.log("no audio file, can't import snippets!");
            return;
        }

        const lines = importText.split('\n');

        for (const line of lines) {
            if (line != "") {
                const values = line.split(',');
                console.log("values: ", values);

                const newRegionStartTime = HHMMSSToSeconds(values[0].trim());
                const newRegionEndTime = HHMMSSToSeconds(values[1].trim());
                const newRegionName = values[2].trim();

                console.log("newRegionStartTime: " + newRegionStartTime + "; newRegionEndTime: " + newRegionEndTime);

                const newRegion = (wavesurferRef.current?.getActivePlugins()[1] as RegionsPlugin).addRegion({
                    start: newRegionStartTime,
                    end: newRegionEndTime,
                    content: newRegionName,
                    contentEditable: true,
                    drag: true,
                    resize: true,
                });

                regions.current[newRegion.id] = newRegion;

                regionRef.current = newRegion;
            }
        }

        handleClose();
    }

    return (
        <Box>
            <Dialog
                open={openImport}
                onClose={handleClose}
                sx={{ '& .MuiDialog-paper': { width: '75%', maxWidth: 'none' } }} // Custom width
            >
                <DialogTitle>
                    Import Snippets!
                    <IconButton
                        aria-label="close"
                        onClick={handleClose}
                        sx={{
                            position: 'absolute',
                            right: 8,
                            top: 8,
                            color: (theme) => theme.palette.grey[500],
                        }}
                    >
                        <Close />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Box
                        display="flex"
                        flexDirection="column"
                        gap="20px"
                    >
                        <TextField
                            label="Snippets CSV"
                            multiline
                            fullWidth
                            variant="standard"
                            value={importText}
                            onChange={(e) => setImportText(e.target.value)}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'flex-end' }}>
                    <Button 
                        variant="contained" 
                        onClick={handleImport} 
                        color="secondary"
                        style= {{
                            width: '200px',
                        }}
                    >
                        Import Snippets
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default ImportDialog;