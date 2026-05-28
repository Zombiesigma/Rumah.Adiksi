/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Share2 } from 'lucide-react';

interface ShareButtonProps {
  title: string;
  text: string;
  url: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  children?: React.ReactNode;
  className?: string;
}

const ShareButton: React.FC<ShareButtonProps> = ({ title, text, url, onSuccess, onError, children, className }) => {
  const handleShare = async () => {
    // Check if the Web Share API is supported by the browser
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: text,
          url: url,
        });
        if (onSuccess) onSuccess();
      } catch (error) {
        console.error('Error sharing:', error);
        if (onError && error instanceof Error) {
          onError(error);
        }
      }
    } else {
      // Fallback for browsers that do not support the Web Share API
      // We can copy the URL to the clipboard
      try {
        await navigator.clipboard.writeText(url);
        alert('Link berhasil disalin ke clipboard!'); // Simple feedback for non-supporting browsers
        if (onSuccess) onSuccess();
      } catch (err) {
        console.error('Failed to copy URL:', err);
        if (onError && err instanceof Error) {
          onError(err);
        }
      }
    }
  };

  return (
    <button onClick={handleShare} className={className || 'flex items-center gap-2 px-4 py-2 bg-white/10 text-white text-xs font-bold rounded-xl hover:bg-white/20 transition'}>
      {children || <><Share2 size={16} /> Bagikan</>}
    </button>
  );
};

export default ShareButton;
