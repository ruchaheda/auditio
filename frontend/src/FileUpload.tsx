import React, { useState, useEffect, useRef } from 'react';
import { 
    Box,
    Button,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
} from '@mui/material';
import { ArrowCircleUp, CloudUpload, Delete } from '@mui/icons-material';
import { IDBPDatabase } from 'idb';
import { FFmpeg } from '@ffmpeg/ffmpeg';

type FileUploadProps = {
    audioFile: string | null,
    setAudioFile: React.Dispatch<React.SetStateAction<string | null>>,
    initDB: () => Promise<IDBPDatabase>,
    setAudioUrl: React.Dispatch<React.SetStateAction<string>>,
    audioFileId: number,
    setAudioFileId: React.Dispatch<React.SetStateAction<number>>,
    renderTrigger: number,
    setRenderTrigger: React.Dispatch<React.SetStateAction<number>>,
}

const FileUpload: React.FC<FileUploadProps> = ({audioFile, setAudioFile, initDB, setAudioUrl, audioFileId, setAudioFileId, renderTrigger, setRenderTrigger}) => {

    const [message, setMessage] = useState('');
    const allFilesRef = useRef<any>(null);
    const [allFiles, setAllFiles] = useState<any>([]);

    // Handle file upload
    // const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    //     const file = e.target.files?.[0];
    //     if (!file) return;

    //     const formData = new FormData();
    //     formData.append('file', file);

    //     fetch('http://localhost:5001/upload', {
    //     method: 'POST',
    //     body: formData,
    //     })
    //     .then((res) => res.json())
    //     .then((data) => {
    //         setAudioFile(data.filename);
    //     });
    // };

    const fetchAllFiles = async () => {
        const db = await initDB();
        const transaction = db.transaction('audioFiles', 'readonly');
        const store = transaction.objectStore('audioFiles');

        const allFiles = await store.getAll();
        allFilesRef.current = allFiles;
        setAllFiles(allFiles);
    }

    const toggleAudioFileIsActive = async (audioFileId: number, isActive: boolean) => {
        const db = await initDB();
        const transaction = db.transaction('audioFiles', 'readwrite');
        const store = transaction.objectStore('audioFiles');

        const audioFile = await store.get(audioFileId);

        if (audioFile) {
            audioFile.isActive = isActive;
            store.put(audioFile);
            transaction.commit();

            if (isActive) {
                setAudioFileId(audioFile.id);
                setAudioFile(audioFile.fileName);
                setAudioUrl(audioFile.data);
            }
        }
    }

    const parseAndUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        let inputFileName = file.name;
        let outputFileName = file.name;

        // check if file is an mp3 file
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        const isMp3 = fileExtension === 'mp3';

        if (!isMp3) {
            setMessage('Converting file to .mp3...');

            // Load FFmpeg if needed
            const ffmpeg = new FFmpeg();
            await ffmpeg.load();

            // Convert the file to MP3 using FFmpeg.js
            outputFileName = file.name.replace(/\.[^/.]+$/, ".mp3");

            await ffmpeg.writeFile(inputFileName, new Uint8Array(await file.arrayBuffer()));

            await ffmpeg.exec(['-i', file.name,
                '-codec:a', 'libmp3lame', outputFileName]);

            const mp3Data = await ffmpeg.readFile(outputFileName);
            setMessage('File converted successfully! Uploading...')

            // Create a Blob from the MP3 data and create a new File object
            const mp3Blob = new Blob([mp3Data], { type: 'audio/mp3' });
            const convertedFile = new File([mp3Blob], outputFileName, { type: 'audio/mp3' });

            // Set up the FileReader to read the MP3 Blob as a Data URL
            const reader = new FileReader();
            reader.onload = async (e) => {
                const audioData = e.target?.result;

                uploadFileToIndexedDB(convertedFile, audioData);
            }
            // Start reading the mp3Blob as Data URL
            reader.readAsDataURL(mp3Blob);  // Convert the MP3 Blob to a Data URL (base64 encoded string)
        }
        else {
            // For MP3 files, store the file without conversion
            const reader = new FileReader();
            reader.onload = async (event) => {
                const audioData = event.target?.result;  // Data URL of the original MP3 file
                // Store the original MP3 file in IndexedDB
                await uploadFileToIndexedDB(file, audioData);  // Directly store the MP3 file's data
            };
            reader.readAsDataURL(file);  // Convert the original MP3 file to a Data URL
        }
    }

    const uploadFileToIndexedDB = async (file: File, audioData: string | ArrayBuffer | null | undefined) => {
        const db = await initDB();

        const transaction = db.transaction('audioFiles', 'readwrite');
        const store = transaction.objectStore('audioFiles');

        const allFiles = await store.getAll();
        allFilesRef.current = allFiles;
        const existingFile = allFiles.find(f => f.fileName === file.name);

        if (existingFile) {
            if (existingFile.id != audioFileId) {
                toggleAudioFileIsActive(audioFileId, false);
                toggleAudioFileIsActive(existingFile.id, true);
            }

            setMessage('Audio file already exists in the database!');
        }
        else {
            toggleAudioFileIsActive(audioFileId, false);

            const newFileId = await store.add({
                fileName: file.name,
                data: audioData,  // Store the Data URL from the converted MP3 file
                uploadTime: (new Date).getTime(),
                isActive: true,
            });

            setMessage('Audio file uploaded and stored successfully!');
            setAudioFile(file.name);
            setAudioUrl(audioData ? audioData.toString() : '');
            setAudioFileId(newFileId as number);
            fetchAllFiles();
        }
    }

    // Retrieve the audio from IndexedDB and display it
    const retrieveAudio = async () => {
        const db = await initDB();
        const transaction = db.transaction('audioFiles', 'readonly');
        const store = transaction.objectStore('audioFiles');
        const allFiles = await store.getAll();
        allFilesRef.current = allFiles;

        if (allFiles.length > 0) {
            allFiles.forEach((file) => {
                if (file.isActive) {
                    setAudioUrl(file.data); // Set the audio URL for playback
                    setAudioFile(file.fileName); // set audio file name
                    setAudioFileId(file.id);
                    setMessage('Last audio file retrieved.');
                }
            })
            // const lastFile = allFiles[allFiles.length - 1]; // Get the last uploaded file
        } else {
            setMessage('No audio files stored.');
        }
    };

    const deleteAllFiles = async () => {
        const db = await initDB();
        const transaction = db.transaction('audioFiles', 'readwrite');
        const store = transaction.objectStore('audioFiles');
        const allFiles = await store.getAll();

        allFiles.forEach((file) => {
            deleteSnippetsForAudioFile(file.id);

            if (store) {
                store.delete(file.id);
            }
        });

        setMessage('Audio files deleted.');
        fetchAllFiles();
        setAudioFile('');
        setAudioUrl('');
        setAudioFileId(0);
    }

    const deleteSnippetsForAudioFile = async (audioFileId: number) => {
        const db = await initDB();
        const transaction = db.transaction('snippets', 'readwrite');
        const snippetStore = transaction.objectStore('snippets');
        
        const index = snippetStore.index('audioFileId');
        const snippets = await index.getAll(audioFileId);

        snippets.forEach((snippet) => {
            snippetStore.delete(snippet.id);
        })
    }

    const deleteOldEntries = async () => { 
        const db = await initDB();
        const transaction = db.transaction('audioFiles', 'readwrite');
        const store = transaction.objectStore('audioFiles');

        const allFiles = await store.getAll();
        allFilesRef.current = allFiles;
        const now = (new Date).getTime();
        const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000; // 7 days in millseconds
        const oneMinInMs = 60 * 1000; // FOR TESTING -- 1 minute in millseconds

        // Loop over all the files and delete those older than 7 days
        allFiles.forEach((file) => {
            const fileAge = now - file.uploadTime;
            if (fileAge > sevenDaysInMs) {
                deleteSnippetsForAudioFile(file.id);

                if (audioFileId == file.id) {
                    setAudioFileId(0);
                    setAudioUrl('');
                    setAudioFile('');
                }

                store.delete(file.id); // Delete the entry by its id
            }
        });
        fetchAllFiles();
    }

    const loadFile = (fileId: number) => {
        toggleAudioFileIsActive(audioFileId, false);
        toggleAudioFileIsActive(fileId, true);
        setMessage("File loaded successfully!");
    }

    const deleteFile = async (fileId: number) => {
        console.log("deleteFile called! fileId: ", fileId);

        const db = await initDB();
        const transaction = db.transaction('audioFiles', 'readwrite');
        const store = transaction.objectStore('audioFiles');

        const file = await store.get(fileId);
        const deletedFileName = file.fileName;
        console.log("deleteFile - file: ", file);
        if (audioFileId == file.id) {
            setAudioFileId(0);
            setAudioUrl('');
            setAudioFile('');
        }

        deleteSnippetsForAudioFile(file.id);
        store.delete(file.id);
        setMessage('Audio file deleted: ' + deletedFileName);

        setRenderTrigger(prev => prev + 1);
    }

    useEffect(() => {
        fetchAllFiles();
        deleteOldEntries();
        if (audioFileId == 0) {
            retrieveAudio();
        }
    }, [renderTrigger]);

    return (
        <Box
            display="flex"
            flexDirection="row"
            alignItems="center"
            justifyContent="center"
            gap="20px"
            p={2}
        >
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
                    <input type="file" hidden onChange={parseAndUploadFile} />
                </Button>
                <Button
                    variant="contained"
                    component="label"
                    onClick={deleteAllFiles}
                >
                    Delete All Files
                </Button>
                
                { audioFile && (
                <p><b>Current file:</b> {audioFile}</p>
                )}

                { message && (
                    <p>{message}</p>
                )}
            </Box>
            <Box>
                <TableContainer>
                    <Table sx={{ width: "40vw"}} aria-label="simple table">
                        <TableHead>
                            <TableRow>
                                <TableCell><b>File Name</b></TableCell>
                                {/* TODO: <TableCell>Duration</TableCell> */}
                                <TableCell><b>Uploaded</b></TableCell>
                                <TableCell><b>Actions</b></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {Object.values(allFiles).map((file: any, index) => {
                                return (
                                    <TableRow key={index}>
                                        <TableCell>{file.fileName}</TableCell>
                                        <TableCell>{(new Date(file.uploadTime)).toLocaleString()}</TableCell>
                                        <TableCell>
                                            <Tooltip title="Load"><IconButton size="large" onClick={() => loadFile(file.id)}><ArrowCircleUp fontSize="large" color="secondary" /></IconButton></Tooltip>
                                            <Tooltip title="Delete"><IconButton size="large" onClick={() => deleteFile(file.id)}><Delete fontSize="large" sx={{ color: "#f44336" }} /></IconButton></Tooltip>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                            {(!allFiles || allFiles.length == 0) && (
                                <TableRow>
                                    <TableCell colSpan={3}>
                                        <i>No uploaded files! Start by uploading one to the left.</i>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        </Box>
    );
}
export default FileUpload;