import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, query, where, addDoc, updateDoc, deleteDoc, getFirestore } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';

// 👉 YOUR ACTUAL DATABASE CONNECTION:
// IMPORTANT: UNCOMMENT the line below when you paste this into StackBlitz/Vercel!
// import { db } from './firebase'; 

// 👇👇👇 DELETE THIS TEMPORARY BLOCK WHEN PASTING INTO STACKBLITZ 👇👇👇
// (This is only here so the preview window doesn't crash from missing files)
let db;
try {
  const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : { apiKey: "demo", projectId: "demo" };
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (error) {
  console.warn("Firebase initialization failed.", error);
}
// 👆👆👆 DELETE THIS TEMPORARY BLOCK WHEN PASTING INTO STACKBLITZ 👆👆👆

// ============================================================================
// 1. UTILS CONFIG (Consolidated)
// ============================================================================

const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const CONFIG = {
  coziUrl: isLocal ? '/cozi-calendar.ics' : '/api/cozi', 
  pixelsPerMinute: 2,
  dayStartHour: 7,
  totalHours: 15,
  weatherApiKey: ''
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

const subtractMinutes = (timeStr, minsToSub) => {
  return addMinutes(timeStr, -minsToSub);
};

const format12Hour = (timeStr) => {
  if (!timeStr) return '';
  let [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
};


// ============================================================================
// 2. BRICK COMPONENT
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

  const bg = type === 'transit' ? '#bdc3c7' : (color === 'custom' ? '#e74c3c' : '#3498db');

  const style = {
    position: isAllDay ? 'relative' : 'absolute',
    top: isAllDay ? 'auto' : `${top}px`,
    height: isAllDay ? 'auto' : `${Math.max(height, 20)}px`, 
    left: layout?.left || '0%',
    width: layout?.width || '100%',
    backgroundColor: bg,
    color: type === 'transit' ? '#2c3e50' : '#fff',
    padding: '4px 8px',
    borderRadius: '4px',
    border: type === 'transit' ? 'none' : '1px solid rgba(0,0,0,0.1)',
    overflow: 'hidden',
    cursor: onClick ? 'pointer' : 'default',
    boxSizing: 'border-box',
    backgroundImage: type === 'transit' ? 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.4) 10px, rgba(255,255,255,0.4) 20px)' : 'none'
  };

  return (
    <div style={style} onClick={onClick}>
      {type !== 'transit' && !isAllDay && (
        <div style={{ fontSize: '0.75rem', marginBottom: '2px', fontWeight: 'bold' }}>
          {format12Hour(start)} - {format12Hour(end)}
        </div>
      )}
      
      <div style={{ fontSize: type === 'transit' ? '0.8rem' : '0.85rem', fontWeight: type === 'transit' ? 'normal' : 'bold' }}>
        {label}
      </div>
      
      {venueName && type !== 'transit' && (
        <a
          href={mapsLink || '#'}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{ fontSize: '0.75rem', color: '#fff', textDecoration: 'underline', display: 'block', marginTop: '4px' }}
        >
          📍 {venueName}
        </a>
      )}

      {notes && type !== 'transit' && (
        <div style={{ fontSize: '0.75rem', marginTop: '4px', opacity: 0.8, fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>
          📝 {notes}
        </div>
      )}
    </div>
  );
}


// ============================================================================
// 3. MODALS
// ============================================================================

export function CustomBrickModal({ isOpen, onClose, onSave, onDelete, customDraft, setCustomDraft, venues }) {
  if (!isOpen) return null;
  const isEditing = !!customDraft.id;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1001 }}>
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', width: '380px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ marginTop: 0, color: '#e74c3c' }}>{isEditing ? '✎ Edit Custom Brick' : '+ Add Custom Brick'}</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input type="text" placeholder="Task Name (e.g., Make Dinner)" value={customDraft.title || ''} onChange={e => setCustomDraft({...customDraft, title: e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <label style={{ fontSize: '0.7rem', color: '#7f8c8d' }}>Start Time</label>
              <input type="time" value={customDraft.start || ''} onChange={e => setCustomDraft({...customDraft, start: e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <label style={{ fontSize: '0.7rem', color: '#7f8c8d' }}>End Time</label>
              <input type="time" value={customDraft.end || ''} onChange={e => setCustomDraft({...customDraft, end: e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            </div>
          </div>

          <div style={{ borderTop: '1px solid #eee', paddingTop: '10px', marginTop: '5px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#34495e', display: 'block', marginBottom: '5px' }}>Location & Travel (Optional)</label>
            <select 
              value={customDraft.location || ''} 
              onChange={e => {
                const selectedVenue = venues?.find(v => v.id === e.target.value);
                setCustomDraft({ ...customDraft, location: e.target.value, travelTime: selectedVenue?.defaultTravelMins !== undefined ? selectedVenue.defaultTravelMins : (customDraft.travelTime || 0) });
              }} 
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: 'white', marginBottom: '8px' }}
            >
              <option value="">-- No Venue (At Home) --</option>
              {venues?.map(v => ( <option key={v.id} value={v.id}>{v.name}</option> ))}
            </select>

            {customDraft.location && (
              <div style={{ backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '4px', border: '1px solid #eee' }}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <label style={{ fontSize: '0.7rem', color: '#7f8c8d' }}>Drive Time (mins)</label>
                      <input type="number" min="0" value={customDraft.travelTime || ''} onChange={e => setCustomDraft({...customDraft, travelTime: e.target.value})} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <label style={{ fontSize: '0.7rem', color: '#7f8c8d' }}>Arrival Buffer (mins)</label>
                      <input type="number" min="0" value={customDraft.arrivalBuffer || ''} onChange={e => setCustomDraft({...customDraft, arrivalBuffer: e.target.value})} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }} />
                    </div>
                </div>
                
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.8rem', cursor: 'pointer', color: '#d35400', fontWeight: 'bold', marginTop: '5px' }}>
                  <input type="checkbox" checked={!!customDraft.isChained} onChange={e => setCustomDraft({...customDraft, isChained: e.target.checked})} style={{ marginRight: '8px' }} />
                  🔗 Bouncing straight here from previous event?
                </label>
              </div>
            )}
          </div>

          {customDraft.location && (
            <div style={{ backgroundColor: customDraft.hasReturnErrand ? '#e8f4f8' : '#f4f6f7', padding: '10px', borderRadius: '4px', border: customDraft.hasReturnErrand ? '1px solid #3498db' : '1px solid #ddd' }}>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', cursor: 'pointer', fontWeight: customDraft.hasReturnErrand ? 'bold' : 'normal', color: '#2c3e50' }}>
                <input type="checkbox" checked={!!customDraft.hasReturnErrand} onChange={e => setCustomDraft({...customDraft, hasReturnErrand: e.target.checked})} style={{ marginRight: '8px', transform: 'scale(1.2)' }} />
                🛑 Stop for an errand on the way home?
              </label>
              {customDraft.hasReturnErrand && (
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <input type="text" placeholder="Where? (e.g. Kroger)" value={customDraft.errandTitle || ''} onChange={e => setCustomDraft({...customDraft, errandTitle: e.target.value})} style={{ flex: 2, padding: '6px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.8rem' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                     <input type="number" placeholder="Mins" value={customDraft.errandDuration || ''} onChange={e => setCustomDraft({...customDraft, errandDuration: e.target.value})} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.8rem' }} />
                  </div>
                </div>
              )}
            </div>
          )}
          <textarea placeholder="Notes / Prep details" value={customDraft.notes || ''} onChange={e => setCustomDraft({...customDraft, notes: e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minHeight: '50px', marginTop: '5px' }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
          {isEditing ? <button onClick={() => onDelete(customDraft.id)} style={{ padding: '8px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#fff', color: '#e74c3c', textDecoration: 'underline', fontSize: '0.85rem' }}>Delete</button> : <div style={{ width: '50px' }}></div>}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onClose} style={{ padding: '8px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#ecf0f1' }}>Cancel</button>
            <button onClick={onSave} style={{ padding: '8px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#e74c3c', color: 'white', fontWeight: 'bold' }}>{isEditing ? 'Save Edits' : 'Save Brick'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EnrichmentModal({ 
  selectedCozi, onClose, subEventsList, editingId, draftEvent, setDraftEvent, handleAddDraftToList, handleEditFromList, handleRemoveFromList, isAddingVenue, setIsAddingVenue, venues, venueForm, setVenueForm, handleSaveNewVenue, handleSaveEnrichment 
}) {
  if (!selectedCozi) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', width: '450px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ marginTop: 0, color: '#3498db' }}>Schedule Specifics</h3>
        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '20px' }}>For: <strong>{selectedCozi.label}</strong></p>
        
        {subEventsList.length > 0 && (
          <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem' }}>Attached Events:</h4>
            {subEventsList.map((ev, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '5px', marginBottom: '5px' }}>
                <div style={{ fontSize: '0.85rem' }}><strong>{format12Hour(ev.start)} - {format12Hour(ev.end)}</strong>: {ev.title}</div>
                <div>
                  <button onClick={() => handleEditFromList(ev)} style={{ color: '#3498db', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', marginRight: '5px' }}>✎</button>
                  <button onClick={() => handleRemoveFromList(ev.id)} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '2px dashed #ccc', paddingTop: '15px' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: editingId ? '#3498db' : '#888' }}>{editingId ? '✎ Editing Event' : '+ Add New Sub-Event'}</div>
          <input type="text" placeholder="Specific Event (e.g. Game 1 vs Tigers)" value={draftEvent.title || ''} onChange={e => setDraftEvent({...draftEvent, title: e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <input type="time" value={draftEvent.start || ''} onChange={e => setDraftEvent({...draftEvent, start: e.target.value})} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            <input type="time" value={draftEvent.end || ''} onChange={e => setDraftEvent({...draftEvent, end: e.target.value})} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
          </div>

          <div style={{ display: 'flex', gap: '5px' }}>
            <select 
              value={draftEvent.location || ''} 
              onChange={e => {
                const selectedVenue = venues.find(v => v.id === e.target.value);
                setDraftEvent({ ...draftEvent, location: e.target.value, travelTime: selectedVenue?.defaultTravelMins !== undefined ? selectedVenue.defaultTravelMins : draftEvent.travelTime });
              }} 
              style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: 'white' }}
            >
              <option value="">-- Select a Venue --</option>
              {venues.map(v => ( <option key={v.id} value={v.id}>{v.name}</option> ))}
            </select>
            <button onClick={() => setIsAddingVenue(!isAddingVenue)} style={{ padding: '0 10px', backgroundColor: isAddingVenue ? '#95a5a6' : '#e67e22', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              {isAddingVenue ? 'Cancel' : '+ New'}
            </button>
          </div>

          <div style={{ backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '4px', border: '1px solid #eee' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <label style={{ fontSize: '0.7rem', color: '#7f8c8d', marginBottom: '2px' }}>Drive Time (mins)</label>
                  <input type="number" min="0" value={draftEvent.travelTime || ''} onChange={e => setDraftEvent({...draftEvent, travelTime: e.target.value})} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <label style={{ fontSize: '0.7rem', color: '#7f8c8d', marginBottom: '2px' }}>Arrival Buffer (mins)</label>
                  <input type="number" min="0" value={draftEvent.arrivalBuffer || ''} onChange={e => setDraftEvent({...draftEvent, arrivalBuffer: e.target.value})} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }} />
                </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.8rem', cursor: 'pointer', color: '#d35400', fontWeight: 'bold', marginTop: '8px' }}>
              <input type="checkbox" checked={!!draftEvent.isChained} onChange={e => setDraftEvent({...draftEvent, isChained: e.target.checked})} style={{ marginRight: '8px' }} />
              🔗 Bouncing straight here from previous event?
            </label>
          </div>

          {draftEvent.location && (
            <div style={{ backgroundColor: draftEvent.hasReturnErrand ? '#e8f4f8' : '#f4f6f7', padding: '10px', borderRadius: '4px', border: draftEvent.hasReturnErrand ? '1px solid #3498db' : '1px solid #ddd', marginTop: '4px' }}>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', cursor: 'pointer', fontWeight: draftEvent.hasReturnErrand ? 'bold' : 'normal', color: '#2c3e50' }}>
                <input type="checkbox" checked={!!draftEvent.hasReturnErrand} onChange={e => setDraftEvent({...draftEvent, hasReturnErrand: e.target.checked})} style={{ marginRight: '8px', transform: 'scale(1.2)' }} />
                🛑 Stop for an errand on the way home?
              </label>
              {draftEvent.hasReturnErrand && (
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <input type="text" placeholder="Where? (e.g. Kroger)" value={draftEvent.errandTitle || ''} onChange={e => setDraftEvent({...draftEvent, errandTitle: e.target.value})} style={{ flex: 2, padding: '6px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.8rem' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                     <input type="number" placeholder="Mins" value={draftEvent.errandDuration || ''} onChange={e => setDraftEvent({...draftEvent, errandDuration: e.target.value})} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.8rem' }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {isAddingVenue && (
            <div style={{ padding: '10px', backgroundColor: '#fdf3e7', borderRadius: '6px', border: '1px solid #f39c12', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#d35400' }}>Create New Venue</div>
              <input type="text" placeholder="Short ID (e.g. jv_field)" value={venueForm.id} onChange={e => setVenueForm({...venueForm, id: e.target.value})} style={{ padding: '6px', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid #ccc' }} />
              <input type="text" placeholder="Display Name (e.g. JV Baseball Field)" value={venueForm.name} onChange={e => setVenueForm({...venueForm, name: e.target.value})} style={{ padding: '6px', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid #ccc' }} />
              <input type="text" placeholder="Google Maps Link or Coordinates" value={venueForm.mapsLink} onChange={e => setVenueForm({...venueForm, mapsLink: e.target.value})} style={{ padding: '6px', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid #ccc' }} />
              <input type="number" placeholder="Default Drive Time (mins)" value={venueForm.defaultTravelMins || ''} onChange={e => setVenueForm({...venueForm, defaultTravelMins: e.target.value})} style={{ padding: '6px', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid #ccc' }} />
              <button onClick={handleSaveNewVenue} style={{ padding: '6px', backgroundColor: '#d35400', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '4px' }}>Save Venue</button>
            </div>
          )}

          <textarea placeholder="Notes (e.g. Wear white jerseys)" value={draftEvent.notes || ''} onChange={e => setDraftEvent({...draftEvent, notes: e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minHeight: '50px', fontFamily: 'inherit', marginTop: '8px' }} />
          <button onClick={handleAddDraftToList} style={{ padding: '8px', backgroundColor: editingId ? '#3498db' : '#2ecc71', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' }}>{editingId ? 'Update Event ✓' : 'Add to List ↓'}</button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '25px' }}>
          <button onClick={onClose} style={{ padding: '8px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#ecf0f1' }}>Close</button>
          <button onClick={handleSaveEnrichment} style={{ padding: '8px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#3498db', color: 'white', fontWeight: 'bold' }}>Save Dashboard Updates</button>
        </div>
      </div>
    </div>
  );
}


// ============================================================================
// 4. MAIN APP COMPONENT
// ============================================================================

function App() {
  const [currentDate, setCurrentDate] = useState(getLocalDateString());
  const [coziEvents, setCoziEvents] = useState([]);
  const [customEvents, setCustomEvents] = useState([]);
  const [enrichments, setEnrichments] = useState({});
  const [selectedCozi, setSelectedCozi] = useState(null);
  
  const [venues, setVenues] = useState([]);
  const [isAddingVenue, setIsAddingVenue] = useState(false);
  const [venueForm, setVenueForm] = useState({ id: '', name: '', mapsLink: '', defaultTravelMins: '' });

  const [subEventsList, setSubEventsList] = useState([]);
  const defaultDraft = { title: '', start: '08:00', end: '09:30', location: '', notes: '', travelTime: 0, arrivalBuffer: 0, isChained: false };
  const [draftEvent, setDraftEvent] = useState(defaultDraft);
  const [editingId, setEditingId] = useState(null);

  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customDraft, setCustomDraft] = useState({ title: '', start: '16:00', end: '17:00', notes: '', isChained: false });

  const changeDate = (days) => {
    const [y, m, d] = currentDate.split('-').map(Number);
    const newDate = new Date(y, m - 1, d + days);
    setCurrentDate(getLocalDateString(newDate));
  };

  useEffect(() => {
    if (!db) return; 
    
    const fetchEverything = async () => {
      try {
        const venueSnap = await getDocs(collection(db, "venues"));
        setVenues(venueSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) { console.error(err); }

      try {
        const q = query(collection(db, "enrichments"), where("date", "==", currentDate));
        const querySnapshot = await getDocs(q);
        const enrichMap = {};
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          enrichMap[data.coziRef] = data.subEvents || (data.specificEvent ? [data.specificEvent] : []);
        });
        setEnrichments(enrichMap);
      } catch (err) { console.error(err); }

      try {
        const customQ = query(collection(db, "custom_bricks"), where("date", "==", currentDate));
        const customSnap = await getDocs(customQ);
        setCustomEvents(customSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) { console.error(err); }

      try {
        const res = await fetch(CONFIG.coziUrl);
        const rawText = await res.text();
        if (!rawText || !rawText.includes("BEGIN:VCALENDAR")) return;
        const cleanText = rawText.replace(/\r?\n[ \t]/g, '');
        const dateMatch = currentDate.replace(/-/g, ''); 
        const targetDateNum = parseInt(dateMatch);
        const targetDateObj = new Date(currentDate + "T12:00:00"); 
        const daysOfWeek = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
        const targetDayStr = daysOfWeek[targetDateObj.getDay()];

        const vevents = cleanText.split("BEGIN:VEVENT");
        const parsedEvents = [];

        vevents.forEach(block => {
          const titleMatch = block.match(/SUMMARY(?:;[^:]*)?:([^\r\n]*)/);
          if (!titleMatch) return;
          const label = titleMatch[1].trim();
          const dtStartMatch = block.match(/DTSTART(?:;[^:]*)?:([^\r\n]*)/);
          const dtEndMatch = block.match(/DTEND(?:;[^:]*)?:([^\r\n]*)/);
          if (!dtStartMatch) return;

          const startString = dtStartMatch[1];
          const endString = dtEndMatch ? dtEndMatch[1] : startString;
          const startDateNum = parseInt(startString.substring(0, 8));
          const endDateNum = parseInt(endString.substring(0, 8));
          const timeRegex = /T(\d{2})(\d{2})/;
          let hasTime = false, start = null, end = null;
          const startTimeMatch = startString.match(timeRegex);
          
          if (startTimeMatch) {
            hasTime = true;
            start = `${startTimeMatch[1]}:${startTimeMatch[2]}`;
            const endTimeMatch = endString.match(timeRegex);
            if (endTimeMatch) { end = `${endTimeMatch[1]}:${endTimeMatch[2]}`; } else { end = addMinutes(start, 60); }
          }

          let isMatch = false;
          if (hasTime) {
            if (targetDateNum >= startDateNum && targetDateNum <= endDateNum) isMatch = true;
          } else {
            if (startDateNum === endDateNum && targetDateNum === startDateNum) isMatch = true;
            else if (targetDateNum >= startDateNum && targetDateNum < endDateNum) isMatch = true;
          }

          const rruleMatch = block.match(/RRULE(?:;[^:]*)?:([^\r\n]*)/);
          if (rruleMatch && !isMatch && targetDateNum >= startDateNum) {
            const rrule = rruleMatch[1];
            const freqMatch = rrule.match(/FREQ=([^;]+)/);
            const untilMatch = rrule.match(/UNTIL=(\d{8})/);
            const bydayMatch = rrule.match(/BYDAY=([^;]+)/);
            const freq = freqMatch ? freqMatch[1] : null;
            const until = untilMatch ? parseInt(untilMatch[1]) : 99999999;
            const bydays = bydayMatch ? bydayMatch[1].split(',') : [];

            if (targetDateNum <= until) {
              if (freq === 'DAILY') { isMatch = true; } 
              else if (freq === 'WEEKLY') {
                if (bydays.length === 0) {
                    const startObj = new Date(startDateNum.toString().replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3T12:00:00'));
                    if (startObj.getDay() === targetDateObj.getDay()) isMatch = true;
                } else if (bydays.some(day => day.includes(targetDayStr))) { isMatch = true; }
              } else if (freq === 'MONTHLY') {
                  const startDayMatch = startDateNum.toString().substring(6, 8);
                  const targetDayMatch = targetDateNum.toString().substring(6, 8);
                  if (startDayMatch === targetDayMatch) isMatch = true;
                  if (bydays.length > 0 && bydays.some(day => day.includes(targetDayStr))) isMatch = true;
              } else if (freq === 'YEARLY') {
                  const startMonthDay = startDateNum.toString().substring(4, 8);
                  const targetMonthDay = targetDateNum.toString().substring(4, 8);
                  if (startMonthDay === targetMonthDay) isMatch = true;
              }
            }
          }

          const exdateLines = block.match(/EXDATE[^\r\n]*/g);
          if (exdateLines) {
            exdateLines.forEach(line => { if (line.includes(targetDateNum.toString())) isMatch = false; });
          }

          if (isMatch) { parsedEvents.push({ id: Math.random().toString(36).substr(2, 9), label, start, end, color: 'orange', isCozi: true, isAllDay: !hasTime }); }
        });
        setCoziEvents(parsedEvents);
      } catch (err) { console.error("🚨 FATAL FETCH ERROR:", err); }
    };
    fetchEverything();
  }, [currentDate]);

  const handleSaveCustomBrick = async () => { 
    if (!customDraft.title) return alert("Enter a title");
    try {
      const safeDraft = { 
        ...customDraft, location: customDraft.location || '', notes: customDraft.notes || '', errandTitle: customDraft.errandTitle || '', travelTime: Number(customDraft.travelTime) || 0, arrivalBuffer: Number(customDraft.arrivalBuffer) || 0, errandDuration: Number(customDraft.errandDuration) || 0, hasReturnErrand: !!customDraft.hasReturnErrand, isChained: !!customDraft.isChained
      };
      if (customDraft.id) {
        const docRef = doc(db, "custom_bricks", customDraft.id);
        await updateDoc(docRef, safeDraft);
        setCustomEvents(customEvents.map(ev => ev.id === customDraft.id ? { ...safeDraft } : ev));
      } else {
        const newEvent = { ...safeDraft, date: currentDate, color: 'custom' };
        const docRef = await addDoc(collection(db, "custom_bricks"), newEvent);
        setCustomEvents([...customEvents, { id: docRef.id, ...newEvent }]);
      }
      setIsCustomModalOpen(false);
      setCustomDraft({ title: '', start: '16:00', end: '17:00', notes: '', isChained: false });
    } catch (e) { alert("Failed to save custom brick."); }
  };

  const handleDeleteCustomBrick = async (id) => {
    if (!window.confirm("Delete this custom brick?")) return;
    try {
      await deleteDoc(doc(db, "custom_bricks", id));
      setCustomEvents(customEvents.filter(ev => ev.id !== id));
      setIsCustomModalOpen(false);
      setCustomDraft({ title: '', start: '16:00', end: '17:00', notes: '', isChained: false });
    } catch (e) { alert("Failed to delete brick."); }
  };

  const openModal = (parentEvt, specificSubEvent = null) => {
    const existingSubs = enrichments[parentEvt.label] || [];
    setSubEventsList(existingSubs);
    setIsAddingVenue(false);
    setSelectedCozi(parentEvt);
    if (specificSubEvent) {
      setDraftEvent({ ...defaultDraft, ...specificSubEvent });
      setEditingId(specificSubEvent.id);
    } else if (existingSubs.length === 1) {
      setDraftEvent({ ...defaultDraft, ...existingSubs[0] });
      setEditingId(existingSubs[0].id);
    } else {
      setDraftEvent({ ...defaultDraft, title: parentEvt.label, start: parentEvt.start || defaultDraft.start, end: parentEvt.end || defaultDraft.end });
      setEditingId(null);
    }
  };

  const handleAddDraftToList = () => { 
    if (!draftEvent.title) return alert("Please enter a title for the event.");
    const safeDraft = { ...draftEvent, location: draftEvent.location || '', notes: draftEvent.notes || '', errandTitle: draftEvent.errandTitle || '', travelTime: Number(draftEvent.travelTime) || 0, arrivalBuffer: Number(draftEvent.arrivalBuffer) || 0, errandDuration: Number(draftEvent.errandDuration) || 0, hasReturnErrand: !!draftEvent.hasReturnErrand, isChained: !!draftEvent.isChained };
    if (editingId) {
      setSubEventsList(subEventsList.map(item => item.id === editingId ? { ...safeDraft, id: editingId } : item));
      setEditingId(null);
    } else {
      setSubEventsList([...subEventsList, { ...safeDraft, id: Date.now().toString(), color: 'blue' }]);
    }
    setDraftEvent({ ...defaultDraft, start: addMinutes(draftEvent.end, 30), end: addMinutes(draftEvent.end, 150), location: draftEvent.location });
  };

  const handleEditFromList = (ev) => { setDraftEvent({ ...defaultDraft, ...ev }); setEditingId(ev.id); setIsAddingVenue(false); };
  const handleRemoveFromList = (id) => { setSubEventsList(subEventsList.filter(ev => ev.id !== id)); if (editingId === id) { setDraftEvent({ ...defaultDraft }); setEditingId(null); } };

  const handleSaveEnrichment = async () => { 
    if (!selectedCozi) return;
    let listToSave = [...subEventsList];
    if (draftEvent.title && draftEvent.title.trim() !== '') {
      const safeDraft = { ...draftEvent, location: draftEvent.location || '', notes: draftEvent.notes || '', errandTitle: draftEvent.errandTitle || '', travelTime: Number(draftEvent.travelTime) || 0, arrivalBuffer: Number(draftEvent.arrivalBuffer) || 0, errandDuration: Number(draftEvent.errandDuration) || 0, hasReturnErrand: !!draftEvent.hasReturnErrand, isChained: !!draftEvent.isChained };
      if (editingId) { listToSave = listToSave.map(item => item.id === editingId ? { ...safeDraft, id: editingId } : item); } 
      else { listToSave = [...listToSave, { ...safeDraft, id: Date.now().toString(), color: 'blue' }]; }
    }
    const safeLabel = selectedCozi.label.replace(/[^a-zA-Z0-9]/g, '_');
    const docId = `${currentDate}_${safeLabel}_override`;
    try {
      await setDoc(doc(db, "enrichments", docId), { date: currentDate, coziRef: selectedCozi.label, subEvents: listToSave });
      setEnrichments(prev => ({ ...prev, [selectedCozi.label]: listToSave }));
      setSelectedCozi(null); 
    } catch (error) { alert("Failed to save."); }
  };

  const handleSaveNewVenue = async () => {
    if (!venueForm.id || !venueForm.name) return alert("Please provide a short ID and a Display Name.");
    const cleanId = venueForm.id.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const defaultMins = Number(venueForm.defaultTravelMins) || 0; 
    try {
      await setDoc(doc(db, "venues", cleanId), { name: venueForm.name, mapsLink: venueForm.mapsLink, defaultTravelMins: defaultMins });
      setVenues(prevVenues => {
        const venueExists = prevVenues.some(v => v.id === cleanId);
        if (venueExists) { return prevVenues.map(v => v.id === cleanId ? { id: cleanId, name: venueForm.name, mapsLink: venueForm.mapsLink, defaultTravelMins: defaultMins } : v); } 
        else { return [...prevVenues, { id: cleanId, name: venueForm.name, mapsLink: venueForm.mapsLink, defaultTravelMins: defaultMins }]; }
      });
      setDraftEvent({ ...draftEvent, location: cleanId, travelTime: defaultMins });
      setIsAddingVenue(false);
      setVenueForm({ id: '', name: '', mapsLink: '', defaultTravelMins: '' });
    } catch (error) { alert("Failed to save venue: " + error.message); }
  };

  const hourLines = Array.from({ length: CONFIG.totalHours }).map((_, i) => {
    const hour = CONFIG.dayStartHour + i;
    const displayHour = hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
    return (
      <div key={hour} style={{ position: 'absolute', top: `${i * 60 * CONFIG.pixelsPerMinute}px`, width: '100%', borderTop: '1px dashed #ccc', color: '#888', fontSize: '0.8rem', paddingTop: '2px' }}>{displayHour}</div>
    );
  });

  const timeToMins = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const allDayBlocks = [];
  const allMainEvents = [];

  customEvents.forEach(evt => allMainEvents.push({ ...evt, label: evt.title, source: 'custom' }));

  coziEvents.forEach(evt => {
    const subs = enrichments[evt.label];
    if (subs && subs.length > 0) {
      subs.forEach((sub, index) => allMainEvents.push({ ...sub, label: sub.title || evt.label, source: 'cozi', parentEvt: evt, originalId: `${evt.id}-${index}` }));
    } else {
      if (evt.isAllDay) {
        allDayBlocks.push(<Brick key={evt.id} date={currentDate} start={evt.start} end={evt.end} label={evt.label} color={evt.color} isCozi={evt.isCozi} isAllDay={evt.isAllDay} onClick={() => openModal(evt)} />);
      } else {
        allMainEvents.push({ ...evt, source: 'cozi', originalId: evt.id });
      }
    }
  });

  allMainEvents.sort((a, b) => timeToMins(a.start) - timeToMins(b.start));

  const groupedItems = [];
  
  allMainEvents.forEach((evt, i) => {
    if (evt.source === 'cozi' && !evt.parentEvt) {
       groupedItems.push({ groupStart: evt.start, groupEnd: evt.end, blocks: [{ ...evt, blockType: 'cozi', originalId: evt.originalId }] });
       return;
    }

    const venueData = venues.find(v => v.id === evt.location);
    const travelMins = Number(evt.travelTime) || 0;
    const bufferMins = Number(evt.arrivalBuffer) || 0;
    const leeway = travelMins > 0 ? 5 : 0;
    const totalPrepMins = travelMins + bufferMins + leeway;
    const transitStart = totalPrepMins > 0 ? subtractMinutes(evt.start, totalPrepMins) : null;

    const isChainedFromPrev = evt.isChained;
    const nextEvt = allMainEvents[i + 1];
    const isChainedToNext = nextEvt ? nextEvt.isChained : false;

    let returnTotalMins = travelMins > 0 ? travelMins + 5 : 0;
    if (evt.hasReturnErrand) returnTotalMins += (Number(evt.errandDuration) || 0);
    const returnEnd = returnTotalMins > 0 ? addMinutes(evt.end, returnTotalMins) : null;

    const blocks = [];

    // 1. Departure Block
    if (totalPrepMins > 0) {
      if (isChainedFromPrev) {
         blocks.push({ id: `${evt.id || evt.originalId}-dep`, source: evt.source, blockType: 'transit', start: transitStart, end: evt.start, label: `Drive to ${venueData ? venueData.name : 'next'} (travel time: ${travelMins} mins)`, color: 'grey', parentEvt: evt.parentEvt || evt, subEvt: evt.source === 'cozi' ? evt : null });
      } else {
         blocks.push({ id: `${evt.id || evt.originalId}-dep`, source: evt.source, blockType: 'transit', start: transitStart, end: evt.start, label: `Leave by ${format12Hour(transitStart)} (travel time: ${travelMins} mins)`, color: 'grey', parentEvt: evt.parentEvt || evt, subEvt: evt.source === 'cozi' ? evt : null });
      }
    }

    blocks.push({ ...evt, blockType: evt.source === 'custom' ? 'custom' : 'main-sub', venueData });

    // 3. Gap Link OR Return Trip
    let blockEndStr = evt.end;

    if (isChainedToNext) {
      const nextTravelMins = Number(nextEvt.travelTime) || 0;
      const nextBufferMins = Number(nextEvt.arrivalBuffer) || 0;
      const nextLeeway = nextTravelMins > 0 ? 5 : 0;
      const nextTotalPrep = nextTravelMins + nextBufferMins + nextLeeway;
      const nextTransitStart = nextTotalPrep > 0 ? subtractMinutes(nextEvt.start, nextTotalPrep) : nextEvt.start;

      const gapMins = timeToMins(nextTransitStart) - timeToMins(evt.end);

      if (gapMins > 0) {
        const isSameVenue = evt.location === nextEvt.location && evt.location !== '';
        const gapLabel = isSameVenue ? `Remain at venue` : `Free time / Hang out`;
        
        blocks.push({ id: `${evt.id || evt.originalId}-gap`, source: evt.source, blockType: 'transit', start: evt.end, end: nextTransitStart, label: gapLabel, color: 'grey', parentEvt: evt.parentEvt || evt, subEvt: evt.source === 'cozi' ? evt : null });
        blockEndStr = nextTransitStart;
      }
    } else if (returnTotalMins > 0) {
      const returnLabel = evt.hasReturnErrand ? `🛑 ${evt.errandTitle || 'Errand'} + ETA: ${format12Hour(returnEnd)}` : `ETA: ${format12Hour(returnEnd)}`;
      blocks.push({ id: `${evt.id || evt.originalId}-ret`, source: evt.source, blockType: 'transit', start: evt.end, end: returnEnd, label: returnLabel, color: 'grey', parentEvt: evt.parentEvt || evt, subEvt: evt.source === 'cozi' ? evt : null });
      blockEndStr = returnEnd;
    }

    groupedItems.push({
      groupStart: transitStart || evt.start,
      groupEnd: blockEndStr,
      blocks: blocks
    });
  });

  const clusters = [];
  let currentCluster = [];
  let clusterEnd = 0;

  groupedItems.forEach(group => {
    const startMins = timeToMins(group.groupStart);
    const endMins = timeToMins(group.groupEnd);
    if (currentCluster.length > 0 && startMins >= clusterEnd) {
      clusters.push(currentCluster);
      currentCluster = [];
      clusterEnd = 0;
    }
    currentCluster.push(group);
    clusterEnd = Math.max(clusterEnd, endMins);
  });
  if (currentCluster.length > 0) clusters.push(currentCluster);

  const timelineBlocks = [];
  clusters.forEach(cluster => {
    const columns = [];
    cluster.forEach(group => {
      const startMins = timeToMins(group.groupStart);
      let placed = false;
      for (let i = 0; i < columns.length; i++) {
        const lastGroupInCol = columns[i][columns[i].length - 1];
        if (timeToMins(lastGroupInCol.groupEnd) <= startMins) {
          columns[i].push(group);
          group.column = i;
          placed = true;
          break;
        }
      }
      if (!placed) { group.column = columns.length; columns.push([group]); }
    });

    const numCols = columns.length;
    const width = 100 / numCols;

    cluster.forEach(group => {
      const left = group.column * width;
      const layoutProps = { width: `calc(${width}% - 4px)`, left: `${left}%` };

      group.blocks.forEach(item => {
        if (item.blockType === 'custom') {
          timelineBlocks.push(<Brick key={item.originalId} date={currentDate} start={item.start} end={item.end} label={item.title} color="custom" isCozi={false} isAllDay={false} notes={item.notes} venueName={item.venueData ? item.venueData.name : null} mapsLink={item.venueData ? item.venueData.mapsLink : null} onClick={() => { setCustomDraft(item); setIsCustomModalOpen(true); }} layout={layoutProps} />);
        } else if (item.blockType === 'cozi') {
          timelineBlocks.push(<Brick key={item.originalId} date={currentDate} start={item.start} end={item.end} label={item.label} color={item.color} isCozi={item.isCozi} isAllDay={item.isAllDay} onClick={() => openModal(item)} layout={layoutProps} />);
        } else if (item.blockType === 'transit') {
          const clickHandler = item.source === 'custom' ? () => { setCustomDraft(item.parentEvt); setIsCustomModalOpen(true); } : () => openModal(item.parentEvt, item.subEvt);
          timelineBlocks.push(<Brick key={item.id} date={currentDate} start={item.start} end={item.end} label={item.label} color={item.color} isCozi={false} isAllDay={false} type="transit" onClick={clickHandler} layout={layoutProps} />);
        } else if (item.blockType === 'main-sub') {
          timelineBlocks.push(<Brick key={item.originalId || Math.random()} date={currentDate} start={item.start} end={item.end} label={item.label} color={item.color} isCozi={false} isAllDay={false} notes={item.notes} venueName={item.venueData ? item.venueData.name : item.location} mapsLink={item.venueData ? item.venueData.mapsLink : null} onClick={() => openModal(item.parentEvt, item.subEvt)} layout={layoutProps} />);
        }
      });
    });
  });

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#f4f4f4', minHeight: '100vh', position: 'relative' }}>
      
      <div style={{ marginBottom: '20px', backgroundColor: 'white', padding: '15px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Life Bricks Dashboard</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={() => changeDate(-1)} style={{ padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#ecf0f1' }}>◀ Prev</button>
          <input type="date" value={currentDate} onChange={(e) => setCurrentDate(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
          <button onClick={() => changeDate(1)} style={{ padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#ecf0f1' }}>Next ▶</button>
        </div>
      </div>

      {allDayBlocks.length > 0 && (
        <div style={{ padding: '15px', backgroundColor: '#e2e8f0', borderRadius: '8px', marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#2c3e50', fontSize: '0.85rem', textTransform: 'uppercase' }}>All Day Events & Deadlines</h4>
          <div style={{ display: 'flex', flexDirection: 'column' }}>{allDayBlocks}</div>
        </div>
      )}

      <div style={{ position: 'relative', backgroundColor: 'white', borderRadius: '8px', minHeight: `${CONFIG.totalHours * 60 * CONFIG.pixelsPerMinute}px`, overflow: 'hidden' }}>
        {hourLines}
        {timelineBlocks}
      </div>

      <button 
        onClick={() => setIsCustomModalOpen(true)}
        style={{ position: 'fixed', bottom: '30px', right: '30px', backgroundColor: '#e74c3c', color: 'white', width: '60px', height: '60px', borderRadius: '50%', fontSize: '30px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.3)', zIndex: 1000 }}>
        +
      </button>

      <CustomBrickModal isOpen={isCustomModalOpen} onClose={() => { setIsCustomModalOpen(false); setCustomDraft({ title: '', start: '16:00', end: '17:00', notes: '', isChained: false }); }} onSave={handleSaveCustomBrick} onDelete={handleDeleteCustomBrick} customDraft={customDraft} setCustomDraft={setCustomDraft} venues={venues} />
      <EnrichmentModal selectedCozi={selectedCozi} onClose={() => { if (subEventsList.length === 0) handleSaveEnrichment(); setSelectedCozi(null); }} subEventsList={subEventsList} editingId={editingId} draftEvent={draftEvent} setDraftEvent={setDraftEvent} handleAddDraftToList={handleAddDraftToList} handleEditFromList={handleEditFromList} handleRemoveFromList={handleRemoveFromList} isAddingVenue={isAddingVenue} setIsAddingVenue={setIsAddingVenue} venues={venues} venueForm={venueForm} setVenueForm={setVenueForm} handleSaveNewVenue={handleSaveNewVenue} handleSaveEnrichment={handleSaveEnrichment} />
    </div>
  );
}

export default App;