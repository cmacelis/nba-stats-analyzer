export class CompressionUtil {
  static compress(data: unknown): string {
    try {
      const jsonString = JSON.stringify(data);
      // Use base64 encoding for basic compression
      return btoa(encodeURIComponent(jsonString));
    } catch (error) {
      console.error('Compression failed:', error);
      return JSON.stringify(data);
    }
  }

  static decompress(compressedString: string): unknown {
    try {
      // Decode base64 and URI components
      const jsonString = decodeURIComponent(atob(compressedString));
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Decompression failed:', error);
      return JSON.parse(compressedString);
    }
  }

  static getCompressionRatio(original: string, compressed: string): number {
    const originalSize = new Blob([original]).size;
    const compressedSize = new Blob([compressed]).size;
    return Math.round((1 - compressedSize / originalSize) * 100);
  }

  // Helper method to check if a string is compressed
  static isCompressed(str: string): boolean {
    try {
      return typeof str === 'string' && btoa(atob(str)) === str;
    } catch {
      return false;
    }
  }

  // Helper method to estimate the size of data in bytes
  static getSize(data: unknown): number {
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    return new Blob([str]).size;
  }
} 