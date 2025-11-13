
import React, { useState, useCallback, useEffect } from 'react';
import { convertImageToTableData } from './services/geminiService';
import { generateExcelFile } from './services/excelService';
import { fileToBase64 } from './utils/fileUtils';
import { FileUpload } from './components/FileUpload';
import { ImagePreview } from './components/ImagePreview';
import { ActionButton } from './components/ActionButton';
import { Loader } from './components/Loader';
import { UploadIcon, DownloadIcon, ConvertIcon, ErrorIcon } from './components/Icons';
import { CameraView } from './components/CameraView';
import { ApiKeySelectionScreen } from './components/ApiKeySelectionScreen';

type TableData = string[][];

const App: React.FC = () => {
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [tableData, setTableData] = useState<TableData | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const storedApiKey = localStorage.getItem('gemini_api_key');
        if (storedApiKey) {
            setApiKey(storedApiKey);
        }
    }, []);

    const handleApiKeySubmit = (key: string) => {
        localStorage.setItem('gemini_api_key', key);
        setApiKey(key);
        setError(null); // Clear previous errors
    };

    const handleFileChange = (file: File | null) => {
        if (file) {
            if (file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/jpg') {
                setImageFile(file);
                setImageUrl(URL.createObjectURL(file));
                setError(null);
                setTableData(null);
            } else {
                setError("Zəhmət olmasa, etibarlı bir JPEG və ya PNG faylı yükləyin.");
                resetState();
            }
        }
    };
    
    const resetState = () => {
        setImageFile(null);
        setImageUrl(null);
        setTableData(null);
    };

    const handleConvert = useCallback(async () => {
        if (!imageFile) {
            setError("Zəhmət olmasa, əvvəlcə bir şəkil seçin.");
            return;
        }
        if (!apiKey) {
            setError("API açarı təyin edilməyib.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setTableData(null);

        try {
            const base64Image = await fileToBase64(imageFile);
            const mimeType = imageFile.type;
            const data = await convertImageToTableData(base64Image, mimeType, apiKey);
            
            if (data && data.length > 0) {
                setTableData(data);
            } else {
                setError("AI şəkildən heç bir məlumat çıxara bilmədi. Zəhmət olmasa, daha aydın bir şəkil ilə cəhd edin.");
            }

        } catch (err) {
            console.error(err);
             if (err instanceof Error) {
                // Check for specific API key validation error text from the Gemini API
                if (err.message.toLowerCase().includes('api key not valid')) {
                    setError('API açarı etibarlı deyil. Zəhmət olmasa, düzgün açarı daxil edin.');
                    localStorage.removeItem('gemini_api_key');
                    setApiKey(null); // This will redirect the user to the API key screen
                } else {
                    setError(err.message);
                }
            } else {
                setError("Bilinməyən bir xəta baş verdi.");
            }
        } finally {
            setIsLoading(false);
        }
    }, [imageFile, apiKey]);

    const handleDownload = useCallback(async () => {
        if (!tableData) {
            setError("Yükləmək üçün məlumat mövcud deyil.");
            return;
        }
        
        setIsLoading(true);
        setError(null);
        try {
            await generateExcelFile(tableData, 'zzmotors_çıxarılmış_məlumat.xlsx');
        } catch (err) {
            console.error("Error generating Excel file:", err);
            const message = err instanceof Error ? err.message : "Bilinməyən bir xəta baş verdi.";
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, [tableData]);

    const handleCapture = (file: File) => {
        handleFileChange(file);
        setIsCameraOpen(false);
    };

    const handleCameraOpen = () => {
        setError(null);
        setIsCameraOpen(true);
    };

    if (!apiKey) {
        return <ApiKeySelectionScreen onKeySubmit={handleApiKeySubmit} error={error} />;
    }

    return (
        <div className="min-h-screen bg-transparent text-gray-100 flex flex-col items-center p-4 sm:p-6 lg:p-8">
            {isCameraOpen && <CameraView onCapture={handleCapture} onClose={() => setIsCameraOpen(false)} />}
            <div className="w-full max-w-4xl">
                <header className="text-center mb-8">
                    <div className="flex justify-center items-center mb-4">
                        <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600" style={{ textShadow: '0 0 10px rgba(0, 255, 255, 0.3)' }}>
                            ZZMOTORS
                        </h1>
                    </div>
                </header>

                <main className="bg-gray-900/50 backdrop-blur-md border border-cyan-500/20 rounded-xl shadow-2xl shadow-cyan-500/10 p-6 sm:p-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="flex flex-col space-y-4">
                            <h2 className="text-2xl font-semibold text-gray-200 flex items-center gap-2"><UploadIcon className="w-6 h-6 text-cyan-400"/>Skan Edilmiş Şəkli Yükləyin</h2>
                            <FileUpload onFileSelect={handleFileChange} onCameraOpen={handleCameraOpen} />
                            {imageUrl && <ImagePreview src={imageUrl} />}
                        </div>
                        
                        <div className="flex flex-col items-center justify-center space-y-6">
                            {isLoading ? (
                                <Loader />
                            ) : (
                                <>
                                    <ActionButton
                                        onClick={handleConvert}
                                        disabled={!imageFile || isLoading}
                                        className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-900/50 text-white shadow-cyan-500/20 hover:shadow-lg hover:shadow-cyan-400/40"
                                    >
                                        <ConvertIcon className="w-5 h-5 mr-2" />
                                        Excelə Çevir
                                    </ActionButton>
                                    <ActionButton
                                        onClick={handleDownload}
                                        disabled={!tableData || isLoading}
                                        className="bg-green-600 hover:bg-green-500 disabled:bg-green-900/50 text-white shadow-green-500/20 hover:shadow-lg hover:shadow-green-400/40"
                                    >
                                        <DownloadIcon className="w-5 h-5 mr-2" />
                                        Excel Yükləyin
                                    </ActionButton>
                                </>
                            )}
                        </div>
                    </div>

                    {error && (
                        <div className="mt-6 p-4 bg-red-900/50 border border-red-500/50 text-red-300 rounded-lg flex items-center gap-3 shadow-lg shadow-red-500/20">
                            <ErrorIcon className="w-6 h-6"/>
                            <span>{error}</span>
                        </div>
                    )}
                    
                    {tableData && (
                        <div className="mt-6">
                            <h3 className="text-xl font-semibold mb-4 text-cyan-300">Məlumat Matrisinin önizləməsi</h3>
                            <div className="overflow-auto max-h-80 bg-black/50 rounded-lg p-0.5 border border-cyan-800/50">
                                <table className="w-full text-sm text-left text-gray-300">
                                    <thead className="text-xs text-cyan-300 uppercase bg-gray-900/60 sticky top-0 z-10">
                                        <tr>
                                            {tableData[0]?.map((header, colIndex) => (
                                                <th key={colIndex} scope="col" className="px-4 py-3 whitespace-nowrap">
                                                    {header || `Sütun ${colIndex + 1}`}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-cyan-900/50">
                                        {tableData.slice(1).map((row, rowIndex) => (
                                            <tr key={rowIndex} className="hover:bg-cyan-900/20">
                                                {row.map((cell, cellIndex) => (
                                                    <td key={cellIndex} className="px-4 py-2 whitespace-nowrap">
                                                        {cell}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </main>
            </div>
            <footer className="fixed bottom-4 left-4 z-50">
                <p className="text-xs font-medium tracking-wider uppercase text-gray-500 transition-colors hover:text-cyan-400">
                    ELGIZ ALIYEV
                </p>
            </footer>
        </div>
    );
};

export default App;
