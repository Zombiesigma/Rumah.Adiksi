import { auth, db } from './firebase'; // Import the server-safe base
import { showSuccessToast, showErrorToast } from './alerts';

// =========================================================================
// UNIFIED FILE UPLOAD FUNCTION (CLIENT-SIDE ONLY)
// =========================================================================

/**
 * Converts a file to a Base64 encoded string.
 * @param file The file to convert.
 * @returns A promise that resolves with the base64 string.
 */
const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // The result includes the mime type header, so we split it off
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = error => reject(error);
});

/**
 * Uploads a file to ImageKit via our own backend endpoint.
 * This provides a single, reliable upload mechanism for the entire app.
 * THIS FUNCTION IS FOR CLIENT-SIDE USE ONLY.
 * 
 * @param {File} file The file to upload.
 * @param {string} folder The destination folder in ImageKit (e.g., '/profiles', '/artworks').
 * @returns {Promise<string | null>} The URL of the uploaded file, or null if it fails.
 */
export const uploadFile = async (file: File, folder: string): Promise<string | null> => {
  if (!file) {
    showErrorToast('Gagal Unggah', 'File tidak ditemukan.');
    return null;
  }

  try {
    console.log(`[Upload] Starting upload for ${file.name} to folder ${folder}...`);
    
    // 1. Convert file to Base64
    const base64File = await toBase64(file);

    // 2. Send to our unified backend endpoint
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file: base64File,
        fileName: file.name,
        folder: folder, // Pass the folder to the backend
      }),
    });

    // 3. Handle the response
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Gagal mengunggah file ke server.');
    }

    console.log(`[Upload] Success! File URL: ${result.downloadUrl}`);
    showSuccessToast('Unggah Berhasil', 'File Anda telah disimpan.');

    return result.downloadUrl;

  } catch (error: any) {
    console.error('[Upload] A critical error occurred:', error);
    showErrorToast(
      'Unggah Gagal Total',
      error.message || 'Terjadi kesalahan yang tidak diketahui saat mengunggah.'
    );
    return null;
  }
};

// Re-export the core services along with the new client-side function
export { auth, db };
