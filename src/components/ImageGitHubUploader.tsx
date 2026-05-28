
import React, { useState, useCallback } from 'react';
import { UploadCloud, Loader, AlertCircle } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { fileToBase64, uploadToGitHub } from '../lib/github'; // Menggunakan fungsi dari lib

interface ImageGitHubUploaderProps {
  folder: string;
  onUploadSuccess: (url: string) => void;
  currentUser: { uid: string; displayName?: string | null } | null;
}

const ImageGitHubUploader: React.FC<ImageGitHubUploaderProps> = ({ folder, onUploadSuccess, currentUser }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (!currentUser) {
        setError("Anda harus masuk untuk mengunggah gambar.");
        return;
    }

    setIsUploading(true);
    setError(null);

    try {
        // Buat nama file yang unik
        const timestamp = new Date().getTime();
        const randomString = Math.random().toString(36).substring(2, 8);
        const uniqueFileName = `${timestamp}-${randomString}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;

        // 1. Ubah file ke Base64
        const base64content = await fileToBase64(file);
        
        // 2. Upload langsung menggunakan fungsi dari lib
        const downloadUrl = await uploadToGitHub(base64content, uniqueFileName, folder);

        // 3. Panggil callback sukses dengan URL dari GitHub
        onUploadSuccess(downloadUrl);

    } catch (err: any) {
        console.error("Upload error:", err);
        setError(err.message || 'Terjadi kesalahan saat mengunggah.');
    } finally {
        setIsUploading(false);
    }
  }, [folder, onUploadSuccess, currentUser]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.png', '.gif', '.webp'] },
    multiple: false,
  });

  return (
    <div className="mt-4">
        <div
            {...getRootProps()}
            className={`relative flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors 
                ${isDragActive ? 'border-brand-gold bg-brand-gold/10' : 'border-gray-600 hover:border-gray-400'}
                ${isUploading ? 'cursor-wait' : ''}`}
        >
            <input {...getInputProps()} disabled={isUploading} />
            
            {isUploading ? (
                <div className="flex flex-col items-center text-gray-400">
                    <Loader className="animate-spin h-8 w-8 mb-2" />
                    <p className="text-sm font-semibold">Mengunggah...</p>
                </div>
            ) : (
                <div className="flex flex-col items-center text-center text-gray-400">
                    <UploadCloud className="h-8 w-8 mb-2" />
                    <p className="text-sm font-semibold">Seret & jatuhkan gambar, atau klik untuk memilih</p>
                    <p className="text-xs mt-1">PNG, JPG, GIF, WEBP</p>
                </div>
            )}
        </div>

        {error && (
            <div className="mt-3 flex items-center text-sm text-rose-400 bg-rose-500/10 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                <span>{error}</span>
            </div>
        )}
    </div>
  );
};

export default ImageGitHubUploader;
