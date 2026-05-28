import React, { useState } from 'react';
import { upload } from '@imagekit/react';
import { Image, Loader, CheckCircle, RefreshCw } from 'lucide-react';

interface CloudUploaderProps {
  onUploadSuccess?: (url: string) => void; 
  onSuccess?: (result: { url: string }) => void;
  folderName?: string;
  folder?: string;
  currentUser?: any;
}

const CloudUploader: React.FC<CloudUploaderProps> = ({ 
  onUploadSuccess, 
  onSuccess, 
  folderName = 'uploads',
  folder,
  currentUser 
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string>('');

  const activeFolder = folder || folderName;

  const triggerSuccess = (url: string) => {
    setUploadedUrl(url);
    if (onUploadSuccess) onUploadSuccess(url);
    if (onSuccess) onSuccess({ url });
  };

  const authenticator = async () => {
    try {
      const response = await fetch('/api/imagekit-auth');
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Authentication request failed with status ${response.status}: ${errorText}`);
      }
      const data = await response.json();
      return { signature: data.signature, token: data.token, expire: data.expire };
    } catch (error) {
      console.error("Authentication error:", error);
      return { signature: '', token: '', expire: 0 };
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const authData = await authenticator();
      if (!authData.signature) {
        throw new Error("Gagal melakukan otentikasi dengan ImageKit.");
      }

      const meta = import.meta as any;
      const publicKey = meta.env?.VITE_IMAGEKIT_PUBLIC_KEY || "public_MEe5oaZyE+U9OClfeDX6JU/n1kw=";
      const result = await upload({
        file: file,
        fileName: file.name,
        publicKey: publicKey,
        signature: authData.signature,
        token: authData.token,
        expire: authData.expire,
        folder: activeFolder,
      });

      triggerSuccess(result.url);
    } catch (err: any) {
      console.error("Upload error:", err);
      alert('Gagal mengunggah foto: ' + (err.message || 'Terjadi kesalahan'));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="relative border-2 border-dashed border-gray-600 rounded-xl p-6 text-center hover:border-brand-gold transition-colors group overflow-hidden bg-black/25">
      {uploadedUrl ? (
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-brand-gold/50 bg-black/40 shadow-inner group/thumb">
            <img src={uploadedUrl} alt="Uploaded Preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
              <CheckCircle size={20} className="text-green-400" />
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-mono font-bold text-green-400 flex items-center gap-1 bg-green-950/40 border border-green-500/20 px-2.5 py-1 rounded-full">
              <CheckCircle size={12} className="fill-current text-green-500" /> Upload Berhasil!
            </span>
            <p className="text-[10px] text-gray-500 max-w-[200px] truncate">{uploadedUrl}</p>
          </div>
          <button
            type="button"
            onClick={() => setUploadedUrl('')}
            className="flex items-center gap-1 px-3 py-1.5 text-[9px] font-mono font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg transition-colors cursor-pointer relative z-10"
          >
            <RefreshCw size={10} /> Unggah Gambar Lain
          </button>
        </div>
      ) : (
        <>
          {/* Tampilan UI (Icon dan Teks) */}
          <div className="flex flex-col items-center gap-2 text-gray-400 group-hover:text-brand-gold transition-colors pointer-events-none">
            {isUploading ? (
              <Loader className="animate-spin text-brand-gold" size={32} />
            ) : (
              <Image size={32} />
            )}
            <p className="font-semibold text-gray-300 text-xs sm:text-sm">
              {isUploading ? 'Sedang mengunggah...' : 'Klik atau seret gambar ke sini'}
            </p>
            <p className="text-[10px] text-gray-500">Maksimal 50MB</p>
          </div>

          <input
            type="file"
            accept="image/*"
            disabled={isUploading}
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
        </>
      )}
    </div>
  );
};

export default CloudUploader;
