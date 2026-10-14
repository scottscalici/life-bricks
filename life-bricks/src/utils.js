export const CONFIG = {
  // Served by worker.js, which keeps the Cozi link as a Cloudflare secret.
  coziUrl: '/api/cozi',
  pixelsPerMinute: 2,
  dayStartHour: 7,
  totalHours: 15,
  weatherApiKey: import.meta.env.VITE_WEATHER_API_KEY || ''
};

// The passphrase matches the DASHBOARD_KEY secret in Cloudflare; this browser
// asks for it once. A wrong or changed one gets a 401: ask again and retry once.
function getDashboardKey(message = 'Life Bricks passphrase (for Cozi):') {
  let key = localStorage.getItem('dashboard_key');
  if (!key) {
    key = prompt(message);
    if (key) localStorage.setItem('dashboard_key', key.trim());
  }
  return key;
}

export async function fetchCozi() {
  const send = () => fetch(CONFIG.coziUrl, { headers: { 'X-Dashboard-Key': getDashboardKey() || '' } });
  let res = await send();
  if (res.status === 401) {
    localStorage.removeItem('dashboard_key');
    if (getDashboardKey("That passphrase didn't work. Life Bricks passphrase:")) res = await send();
  }
  return res;
}
  
  export function getMinutesFromStart(timeStr) {
    if (!timeStr || !timeStr.includes(':')) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return ((h - CONFIG.dayStartHour) * 60) + m;
  }
  
  export function addMinutes(timeStr, minsToAdd) {
    if (!timeStr || !timeStr.includes(':')) return '00:00';
    const [h, m] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m + minsToAdd);
    return date.toTimeString().slice(0, 5);
  }
  
  export function subtractMinutes(timeStr, minsToSubtract) {
    if (!timeStr || !timeStr.includes(':')) return '00:00';
    const [h, m] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m - minsToSubtract);
    return date.toTimeString().slice(0, 5);
  }
  
  export function format12Hour(timeStr) {
    if (!timeStr || !timeStr.includes(':')) return '';
    let [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m.toString().padStart(2, '0')} ${ampm}`;
  }
  
  export function extractCoordinates(mapsLink) {
    if (!mapsLink) return null;
    const urlMatch = mapsLink.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (urlMatch) return { lat: urlMatch[1], lon: urlMatch[2] };
    const rawMatch = mapsLink.match(/^(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)$/);
    if (rawMatch) return { lat: rawMatch[1], lon: rawMatch[2] };
    return null;
  }
  
  export function getLocalDateString(dateObj = new Date()) {
    return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
  }