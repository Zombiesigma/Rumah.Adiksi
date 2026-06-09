/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Load variables from import.meta.env if available, with a hardcoded fallback to ensure full compatibility
const GITHUB_TOKEN = (import.meta as any).env?.VITE_GITHUB_TOKEN;
const GITHUB_REPO = (import.meta as any).env?.VITE_GITHUB_REPO || 'Zombiesigma/aset-rumah-adiksi';

/**
 * Converts a file to base64 encoding
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Uploads an image file to GitHub under the appropriate folder structure.
 * Target directories:
 * - Profile: 'profil/<nama user>/<file>'
 * - Postingan karya: 'karya/<file>'
 * - Produk, events: 'produk/<file>' or 'acara/<file>'
 *
 * Returns the raw download_url of the uploaded asset.
 */
export async function uploadToGitHub(
  file: File,
  folder: string,
  userIdentifier?: string
): Promise<string> {
  const extension = file.name.split('.').pop() || 'jpg';
  
  // Format naming correctly depending on folder
  let targetPath = '';
  const timestamp = Date.now();
  const cleanOrigName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
  const cleanUser = userIdentifier ? userIdentifier.trim() : 'guest';

  if (folder === 'profil') {
    targetPath = `profil/${cleanUser}/${timestamp}_${cleanOrigName}`;
  } else if (folder === 'karya') {
    targetPath = `karya/${timestamp}_${cleanOrigName}`;
  } else if (folder === 'produk') {
    targetPath = `produk/${timestamp}_${cleanOrigName}`;
  } else {
    targetPath = `${folder}/${timestamp}_${cleanOrigName}`;
  }

  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${targetPath}`;
  const base64Content = await fileToBase64(file);

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github+json'
      },
      body: JSON.stringify({
        message: `Upload ${file.name} to ${targetPath} via Adiksi Application`,
        content: base64Content
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[Client GitHub Upload Failed] Status: ${response.status}. Rincian: ${errText}. Mencoba backend fallback...`);
      throw new Error(errText);
    }

    const data = await response.json();
    if (data.content && data.content.download_url) {
      return data.content.download_url;
    }
    
    // Fallback construct raw url
    return `https://raw.githubusercontent.com/${GITHUB_REPO}/main/${targetPath}`;
  } catch (error: any) {
    console.warn(`[Client-side upload failed] ${error.message || error}. Mengalihkan ke backend upload API...`);
    try {
      const serverResponse = await fetch('/api/uploadToGithub', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          file: {
            name: file.name,
            content: base64Content
          },
          folder,
          userIdentifier
        })
      });

      if (!serverResponse.ok) {
        const errText = await serverResponse.text();
        throw new Error(errText);
      }

      const data = await serverResponse.json();
      if (data.downloadUrl) {
        console.log(`[Lib Upload Success] Backend fallback succeeded! URL: ${data.downloadUrl}`);
        return data.downloadUrl;
      }
      throw new Error("Respon server tidak valid.");
    } catch (backendErr: any) {
      throw new Error(`Gagal mengunggah berkas: ${backendErr.message || backendErr}`);
    }
  }
}
