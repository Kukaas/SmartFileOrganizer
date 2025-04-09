// Function to generate a hash from a string
const hashString = async (str) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Collect device information
const collectDeviceInfo = async () => {
  const info = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    hardwareConcurrency: navigator.hardwareConcurrency,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    colorDepth: window.screen.colorDepth,
    deviceMemory: navigator?.deviceMemory || 'unknown',
    timestamp: new Date().getTime()
  };

  // Get available browser plugins
  const plugins = Array.from(navigator.plugins).map(plugin => ({
    name: plugin.name,
    description: plugin.description
  }));

  // Combine all information
  const deviceString = JSON.stringify({ ...info, plugins });
  
  // Generate a hash of the device information
  const deviceHash = await hashString(deviceString);
  
  return {
    deviceId: deviceHash,
    deviceInfo: info
  };
};

// Get or create device fingerprint
export const getDeviceFingerprint = async () => {
  try {
    // Try to get existing fingerprint from storage
    const stored = await chrome.storage.local.get(['deviceFingerprint']);
    if (stored.deviceFingerprint) {
      return stored.deviceFingerprint;
    }

    // Generate new fingerprint if none exists
    const fingerprint = await collectDeviceInfo();
    await chrome.storage.local.set({ deviceFingerprint: fingerprint });
    return fingerprint;
  } catch (error) {
    console.error('Error generating device fingerprint:', error);
    throw error;
  }
}; 