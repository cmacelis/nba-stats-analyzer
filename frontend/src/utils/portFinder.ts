export async function findAvailablePort(startPort: number, endPort: number = startPort + 100): Promise<number> {
  for (let port = startPort; port <= endPort; port++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 100);
      
      const response = await fetch(`http://localhost:${port}`, {
        signal: controller.signal
      }).catch(() => null);
      
      clearTimeout(timeoutId);
      
      if (!response) {
        return port;
      }
    } catch {
      return port;
    }
  }
  throw new Error('No available ports found');
} 