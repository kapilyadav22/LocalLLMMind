/**
 * Image processing utilities for Multimodal LLMs
 */

/**
 * Convert a File or Blob into base64 (clean for Ollama) and a preview data URL (for React img src).
 * @param {File} file
 * @returns {Promise<{ id: string, name: string, size: number, type: string, base64: string, preview: string }>}
 */
export function processImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('File is not an image'));
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      // dataUrl format: data:image/jpeg;base64,...
      const base64 = typeof dataUrl === 'string' ? (dataUrl.split(',')[1] || '') : '';
      resolve({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        name: file.name || 'image.png',
        size: file.size,
        type: file.type,
        base64,
        preview: typeof dataUrl === 'string' ? dataUrl : '',
      });
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Format bytes into human-readable size
 */
export function formatImageSize(bytes) {
  if (!bytes) return '';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}
