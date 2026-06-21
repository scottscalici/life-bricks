import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, query, where, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

// Firebase Configuration Setup
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// ============================================================================
// UTILS CONFIG
// ============================================================================

const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const CONFIG = {
  coziUrl: isLocal ? '/cozi-calendar.ics' : '/api/cozi', 
  pixelsPerMinute: 2,
  dayStartHour: 7,
  totalHours: 15,
};

const getLocalDateString = (d = new Date()) => {
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d - tzOffset).toISOString().split('T')[0];
};

const addMinutes = (timeStr, minsToAdd) => {
  if (!timeStr) return null;
  let [h, m] = timeStr.split(':').map(Number);
  m += minsToAdd;
  h += Math.floor(m / 60);
  m = m % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const format12Hour = (timeStr) => {
  if (!timeStr) return '';
  let [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
};

// ============================================================================
// BRICK COMPONENT
// ============================================================================

function Brick({ start, end, label, color, isAllDay, type, venueName, mapsLink, notes, onClick, layout }) {
  const timeToMins = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const startMins = timeToMins(start) - (CONFIG.dayStartHour * 60);
  const durMins = timeToMins(end) - timeToMins(start);
  const top = startMins * CONFIG.pixelsPerMinute;
  const height = durMins * CONFIG.pixelsPerMinute;

  const style = {
    position: isAllDay ? 'relative' : 'absolute',
    top: isAllDay ? 'auto' : `${top}px`,
    height: isAllDay ? 'auto' : `${Math.max(height, 20)}px`, 
    left: layout?.left || '0%',
    width: layout?.width || '100%',
    backgroundColor: type === 'transit' ? '#bdc3c7' : (color === 'custom' ? '#e74c3c' : '#3498db'),
    color: type === 'transit' ? '#2c3e50' : '#fff',
    padding: '4px 8px',
    borderRadius: '4px',
    border: type === 'transit' ? 'none' : '1px solid rgba(0,0,0,0.1)',
    overflow: 'hidden',
    cursor: onClick ? 'pointer' : 'default',
    boxSizing: 'border-box'
  };

  return (
    <div style={style} onClick={onClick}>
      {type !== 'transit' && !isAllDay && <div style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{format12Hour(start)} - {format12Hour(end)}</div>}
      <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{label}</div>
      {venueName && type !== 'transit' && <a href={mapsLink || '#'} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ fontSize: '0.75rem', color: '#fff', display: 'block' }}>📍 {venueName}</a>}
    </div>
  );
}

// ============================================================================
// APP COMPONENT
// ============================================================================

function App() {
  const [currentDate, setCurrentDate] = useState(getLocalDateString());
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const init = async () => {
      await signInAnonymously(auth);
      setUser(auth.currentUser);
    };
    init();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    // Logic for fetching Cozi data and Firestore enrichments would be restored here
    const fetchData = async () => {
      // Placeholder for actual data retrieval
      console.log("Fetching events for", currentDate);
    };
    fetchData();
  }, [user, currentDate]);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#f4f4f4', minHeight: '100vh' }}>
      <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <h1>Life Bricks Dashboard</h1>
        <input type="date" value={currentDate} onChange={(e) => setCurrentDate(e.target.value)} />
      </div>
      
      <div style={{ position: 'relative', backgroundColor: 'white', borderRadius: '8px', minHeight: '500px' }}>
        <p>Syncing data for {currentDate}...</p>
        {/* Rendered bricks will go here */}
      </div>
    </div>
  );
}

export default App;