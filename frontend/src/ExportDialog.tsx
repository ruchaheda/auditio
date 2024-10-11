import React, { useState, useEffect } from 'react';
import {
    Box,
    Dialog,
    DialogTitle,
    DialogContent,
    IconButton,
    TextField,
    Tooltip,
} from '@mui/material';
import {
    Close,
    ContentCopy,
} from '@mui/icons-material';

type ExportDialogProps = {
    regions: any,
    openExport: boolean,
    setOpenExport: React.Dispatch<React.SetStateAction<boolean>>,
    secondsToHHMMSS: (seconds:number) => string,
}

const ExportDialog: React.FC<ExportDialogProps> = ({regions, openExport, setOpenExport, secondsToHHMMSS}) => {

    const [exportText, setExportText] = useState('');
    const [copied, setCopied] = useState(false);

    // build export text variable
    useEffect(() => {
        if (openExport) {
            buildExport();
        }
    }, [openExport]);

    const buildExport = () => {
        const regionsToLoop: { [id: string]: any } = regions.current;
        let currentExportText = '';

        Object.entries(regionsToLoop).forEach(([id, region]) => {
            currentExportText += secondsToHHMMSS(region.start) + ", " + secondsToHHMMSS(region.end) + ", " + region.content?.innerText + "\n";
        });

        setExportText(currentExportText.replace(/\n$/, ''));
        console.log("currentExportTest: ", currentExportText);
    }

    const handleClose = () => { 
        setOpenExport(false);
    }
    
    const handleCopy = () => {
        navigator.clipboard.writeText(exportText).then(() => {
            setCopied(true); // Set copied state to true to show confirmation
        });
    }

    return (
        <Box>
            <Dialog 
                open={openExport} 
                onClose={handleClose}
                sx={{ '& .MuiDialog-paper': { width: '75%', maxWidth: 'none' } }} // Custom width
            >
                <DialogTitle>
                    Share Snippets!
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
                        flexDirection="row"
                    >
                    <TextField
                        label="All Snippets"
                        multiline
                        fullWidth
                        // rows={4}
                        value={exportText}
                        slotProps={{
                        input: {
                            readOnly: true,
                        },
                        }}
                        variant="filled"
                    />
                    <Tooltip title={copied ? 'Copied!' : 'Copy'}>
                        <IconButton onClick={handleCopy} sx={{ mt: 2 }}>
                        <ContentCopy />
                        </IconButton>
                    </Tooltip>
                </Box>
                </DialogContent>
                </Dialog>
        </Box>
    );
}

export default ExportDialog;