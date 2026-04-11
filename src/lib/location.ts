const STORAGE_KEY = 'fintrack_location_enabled';

export function isLocationEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

export function setLocationEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, String(enabled));
}

export async function getCurrentLocation(): Promise<string> {
  if (!isLocationEnabled()) return '';

  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 300000, // Cache for 5 minutes
      });
    });

    const { latitude, longitude } = pos.coords;

    // Reverse geocode using free API
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=16&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();

      // Build a short location string
      const addr = data.address || {};
      const parts = [
        addr.shop || addr.building || addr.amenity || '',
        addr.road || addr.street || '',
        addr.city || addr.town || addr.municipality || addr.village || '',
        addr.state || addr.province || '',
      ].filter(Boolean);

      // Return something like "SM Lipa, Lipa City, Batangas"
      if (parts.length >= 2) {
        return parts.slice(0, 3).join(', ');
      }
      return data.display_name?.split(',').slice(0, 3).join(',').trim() || '';
    } catch {
      // If reverse geocode fails, return coordinates
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }
  } catch {
    return '';
  }
}

export function getCurrentTime(): string {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}
