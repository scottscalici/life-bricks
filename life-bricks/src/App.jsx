import { useState, useEffect } from 'react'
import { collection, getDocs, doc, setDoc, query, where } from 'firebase/firestore'
import { db } from './firebase'

const CONFIG = {
  pixelsPerMinute: 1.2,
  dayStartHour: 5, 
  totalHours: 18,
  weatherApiKey: import.meta.env.VITE_WEATHER_API_KEY, 
  coziUrl: 'https://rest.cozi.com/api/ext/1103/f9f7020d-05c9-4720-b813-2155b4485be7/icalendar/feed/feed.ics'
};

function getMinutesFromStart(timeStr) {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return ((h - CONFIG.dayStartHour) * 60) + m;
}

function addMinutes(timeStr, minsToAdd) {
  if (!timeStr || !timeStr.includes(':')) return '00:00';
  const [h, m] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(h, m + minsToAdd);
  return date.toTimeString().slice(0, 5);
}

function subtractMinutes(timeStr, minsToSubtract) {
  if (!timeStr || !timeStr.includes(':')) return '00:00';
  const [h, m] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(h, m - minsToSubtract);
  return date.toTimeString().slice(0, 5);
}

function format12Hour(timeStr) {
  if (!timeStr || !timeStr.includes(':')) return '';
  let [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function extractCoordinates(mapsLink) {
  if (!mapsLink) return null;
  const urlMatch = mapsLink.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (urlMatch) return { lat: urlMatch[1], lon: urlMatch[2] };
  const rawMatch = mapsLink.match(/^(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)$/);
  if (rawMatch) return { lat: rawMatch[1], lon: rawMatch[2] };
  return null;
}

function WeatherBadge({ date, start, venueData }) {
  const [weatherData, setWeatherData] = useState(null);

  useEffect(() => {
    if (!venueData || !CONFIG.weatherApiKey) return;
    const coords = extractCoordinates(venueData.mapsLink);
    if (!coords) return; 

    const fetchWeather = async () => {
      try {
        const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${coords.lat}&lon=${coords.lon}&units=imperial&appid=${CONFIG.weatherApiKey}`;
        const res = await fetch(url);
        const data = await res.json();
        if (!data.list) return;

        const targetDateTime = new Date(`${date}T${start}:00`).getTime();
        let closestForecast = data.list[0];
        let smallestDiff = Math.abs((closestForecast.dt * 1000) - targetDateTime);

        for (let i = 1; i < data.list.length; i++) {
          const diff = Math.abs((data.list[i].dt * 1000) - targetDateTime);
          if (diff < smallestDiff) {
            smallestDiff = diff;
            closestForecast = data.list[i];
          }
        }

        const iconCode = closestForecast.weather[0].icon;
        const emojiMap = {
          '01d': '☀️', '01n': '🌙', '02d': '⛅', '02n': '☁️',
          '03d': '☁️', '03n': '☁️', '04d': '☁️', '04n': '☁️',
          '09d': '🌧️', '09n': '🌧️', '10d': '🌦️', '10n': '🌧️',
          '11d': '⛈️', '11n': '⛈️', '13d': '❄️', '13n': '❄️',
          '50d': '🌫️', '50n': '🌫️'
        };

        setWeatherData({ emoji: emojiMap[iconCode] || '🌤️', temp: Math.round(closestForecast.main.temp) });
      } catch (err) { console.error(err); }
    };
    fetchWeather();
  }, [date, start, venueData]);

  if (!weatherData) return null;
  return (
    <span style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '12px', fontSize: '0.7rem', marginLeft: '8px', fontWeight: 'bold' }}>
      {weatherData.emoji} {weatherData.temp}°
    </span>
  );
}

function Brick({ date, start, end, label, color, isCozi, isAllDay, onClick, venueName, mapsLink, notes, type = 'event', venueData }) {
  const startMins = getMinutesFromStart(start);
  const endMins = getMinutesFromStart(end);
  const duration = Math.max(endMins - startMins, 15); 

  const bgColors = { green: '#2ecc71', blue: '#3498db', orange: '#e67e22', purple: '#9b59b6', grey: '#95a5a6' };
  
  const isTransit = type === 'transit';
  const blockColor = isTransit ? '#bdc3c7' : (bgColors[color] || bgColors.grey);
  const backgroundStyle = isTransit ? `repeating-linear-gradient(45deg, #bdc3c7, #bdc3c7 10px, #b0b6bb 10px, #b0b6bb 20px)` : blockColor;

  return (
    <div 
      style={{
        position: 'absolute',
        top: `${startMins * CONFIG.pixelsPerMinute}px`,
        height: `${duration * CONFIG.pixelsPerMinute}px`,
        width: 'calc(100% - 60px)',
        left: '50px',
        background: backgroundStyle,
        color: isTransit ? '#2c3e50' : 'white',
        borderRadius: '6px',
        padding: '8px',
        boxSizing: 'border-box',
        borderLeft: `4px solid ${isCozi ? 'rgba(255,255,255,0.6)' : (isTransit ? '#7f8c8d' : 'rgba(0,0,0,0.2)')}`,
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
        overflow: 'hidden',
        border: isCozi ? '1px dashed white' : 'none',
        opacity: isAllDay ? 0.85 : 1,
        transition: 'transform 0.1s',
        zIndex: isTransit ? 5 : 10
      }}
    >
      <div 
        onClick={onClick} 
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1, cursor: onClick ? 'pointer' : 'default' }}
        onMouseOver={(e) => onClick && (e.currentTarget.parentElement.style.transform = 'scale(1.01)')}
        onMouseOut={(e) => onClick && (e.currentTarget.parentElement.style.transform = 'scale(1)')}
      />

      <div style={{ position: 'relative', zIndex: 2, pointerEvents: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {isAllDay ? 'All Day / TBD' : `${format12Hour(start)} - ${format12Hour(end)}`}
          </span>
          {!isTransit && venueData && (
             <WeatherBadge date={date} start={start} venueData={venueData} />
          )}
        </div>
        <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
          {isCozi ? `📅 ${label}` : label}
        </div>
        {notes && !isTransit && <div style={{ fontSize: '0.75rem', marginTop: '2px', opacity: 0.8, fontStyle: 'italic' }}>📝 {notes}</div>}
      </div>
      
      {venueName && !isTransit && (
        <div style={{ position: 'relative', zIndex: 10, fontSize: '0.75rem', marginTop: '4px', opacity: 0.9, pointerEvents: 'auto' }}>
          <div 
            onClick={(e) => {
              e.stopPropagation(); 
              if (mapsLink && mapsLink.trim() !== '') {
                let urlToOpen = mapsLink.trim().replace(/^["']|["']$/g, '');
                if (!urlToOpen.startsWith('http') && !urlToOpen.match(/^(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)$/)) {
                  urlToOpen = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(urlToOpen)}`;
                } else if (urlToOpen.match(/^(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)$/)) {
                  urlToOpen = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(urlToOpen)}`;
                }
                window.open(urlToOpen, '_blank', 'noopener,noreferrer');
              } else {
                alert(`Whoops! No Google Maps info was saved in the database for "${venueName}".`);
              }
            }}
            style={{ color: 'white', textDecoration: 'underline', cursor: 'pointer', display: 'inline-block' }}
          >
            🗺️ {venueName}
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [coziEvents, setCoziEvents] = useState([]);
  const [enrichments, setEnrichments] = useState({});
  const [selectedCozi, setSelectedCozi] = useState(null);
  
  const [venues, setVenues] = useState([]);
  const [isAddingVenue, setIsAddingVenue] = useState(false);
  const [venueForm, setVenueForm] = useState({ id: '', name: '', mapsLink: '' });

  const [subEventsList, setSubEventsList] = useState([]);
  const defaultDraft = { title: '', start: '08:00', end: '09:30', location: '', notes: '', travelTime: 0, arrivalBuffer: 0 };
  const [draftEvent, setDraftEvent] = useState(defaultDraft);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
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
        const targetUrl = CONFIG.coziUrl + '?nocache=' + Date.now();
        const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(targetUrl);
        const res = await fetch(proxyUrl);
        const text = await res.text();

        // The Bouncer
        if (!text.includes("BEGIN:VCALENDAR")) return;

        const dateMatch = currentDate.replace(/-/g, ''); 
        const targetDateNum = parseInt(dateMatch);
        const vevents = text.split("BEGIN:VEVENT");
        const parsedEvents = [];

        vevents.forEach(block => {
          if (!block.includes("SUMMARY")) return;
          const titleMatch = block.match(/SUMMARY:([^\r\n]*)/);
          const label = titleMatch ? titleMatch[1].trim() : "Event";
          const dtStartLine = block.match(/DTSTART[^\r\n]*/);
          const dtEndLine = block.match(/DTEND[^\r\n]*/);
          if (!dtStartLine) return;
          const dateRegex = /(\d{8})/;
          const startMatchDate = dtStartLine[0].match(dateRegex);
          if (!startMatchDate) return;
          const startDateNum = parseInt(startMatchDate[1]);
          const endMatchDate = dtEndLine ? dtEndLine[0].match(dateRegex) : null;
          const endDateNum = endMatchDate ? parseInt(endMatchDate[1]) : startDateNum;

          const timeRegex = /\d{8}T(\d{2})(\d{2})/;
          let hasTime = false, start = "05:00", end = "06:00";
          const startTimeMatch = dtStartLine[0].match(timeRegex);
          if (startTimeMatch) {
            hasTime = true;
            start = `${startTimeMatch[1]}:${startTimeMatch[2]}`;
            if (dtEndLine) {
              const endTimeMatch = dtEndLine[0].match(timeRegex);
              if (endTimeMatch) end = `${endTimeMatch[1]}:${endTimeMatch[2]}`;
              else end = addMinutes(start, 60);
            } else end = addMinutes(start, 60);
          }

          let isMatch = false;
          if (hasTime) {
            if (targetDateNum >= startDateNum && targetDateNum <= endDateNum) isMatch = true;
          } else {
            if (startDateNum === endDateNum && targetDateNum === startDateNum) isMatch = true;
            else if (targetDateNum >= startDateNum && targetDateNum < endDateNum) isMatch = true;
          }

          if (isMatch) parsedEvents.push({ id: Math.random().toString(36).substr(2, 9), label, start, end, color: 'orange', isCozi: true, isAllDay: !hasTime });
        });
        setCoziEvents(parsedEvents);
      } catch (err) { console.error(err); }
    };
    fetchEverything();
  }, [currentDate]);

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
      setDraftEvent({ ...defaultDraft });
      setEditingId(null);
    }
  };

  const handleAddDraftToList = () => {
    if (!draftEvent.title) return alert("Please enter a title for the event.");
    
    const safeDraft = { 
      ...draftEvent, 
      travelTime: Number(draftEvent.travelTime) || 0,
      arrivalBuffer: Number(draftEvent.arrivalBuffer) || 0
    };

    if (editingId) {
      setSubEventsList(subEventsList.map(item => item.id === editingId ? { ...safeDraft, id: editingId } : item));
      setEditingId(null);
    } else {
      setSubEventsList([...subEventsList, { ...safeDraft, id: Date.now().toString(), color: 'blue' }]);
    }
    
    setDraftEvent({ ...defaultDraft, start: addMinutes(draftEvent.end, 30), end: addMinutes(draftEvent.end, 150), location: draftEvent.location });
  };

  const handleEditFromList = (ev) => {
    setDraftEvent({ ...defaultDraft, ...ev });
    setEditingId(ev.id);
    setIsAddingVenue(false);
  };

  const handleRemoveFromList = (id) => {
    setSubEventsList(subEventsList.filter(ev => ev.id !== id));
    if (editingId === id) {
      setDraftEvent({ ...defaultDraft });
      setEditingId(null);
    }
  };

  const handleSaveEnrichment = async () => {
    if (!selectedCozi) return;
    let listToSave = [...subEventsList];
    if (draftEvent.title && draftEvent.title.trim() !== '') {
      const safeDraft = { ...draftEvent, travelTime: Number(draftEvent.travelTime) || 0, arrivalBuffer: Number(draftEvent.arrivalBuffer) || 0 };
      if (editingId) {
        listToSave = listToSave.map(item => item.id === editingId ? { ...safeDraft, id: editingId } : item);
      } else {
        listToSave = [...listToSave, { ...safeDraft, id: Date.now().toString(), color: 'blue' }];
      }
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
    try {
      await setDoc(doc(db, "venues", cleanId), { name: venueForm.name, mapsLink: venueForm.mapsLink });
      const newVenueObj = { id: cleanId, name: venueForm.name, mapsLink: venueForm.mapsLink };
      setVenues([...venues, newVenueObj]);
      setDraftEvent({ ...draftEvent, location: cleanId });
      setIsAddingVenue(false);
      setVenueForm({ id: '', name: '', mapsLink: '' });
    } catch (error) { alert("Failed to save venue."); }
  };

  const hourLines = Array.from({ length: CONFIG.totalHours }).map((_, i) => {
    const hour = CONFIG.dayStartHour + i;
    const displayHour = hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
    return (
      <div key={hour} style={{ position: 'absolute', top: `${i * 60 * CONFIG.pixelsPerMinute}px`, width: '100%', borderTop: '1px dashed #ccc', color: '#888', fontSize: '0.8rem', paddingTop: '2px' }}>
        {displayHour}
      </div>
    );
  });

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#f4f4f4', minHeight: '100vh', position: 'relative' }}>
      
      <div style={{ marginBottom: '20px', backgroundColor: 'white', padding: '15px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Life Bricks Dashboard</h2>
        <input type="date" value={currentDate} onChange={(e) => setCurrentDate(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
      </div>

      <div style={{ position: 'relative', backgroundColor: 'white', borderRadius: '8px', minHeight: `${CONFIG.totalHours * 60 * CONFIG.pixelsPerMinute}px`, overflow: 'hidden' }}>
        {hourLines}
        
        {coziEvents.map(evt => {
          const subs = enrichments[evt.label];
          if (subs && subs.length > 0) {
            return subs.map((sub, index) => {
              const venueData = venues.find(v => v.id === sub.location);
              const totalPrepMins = (Number(sub.travelTime) || 0) + (Number(sub.arrivalBuffer) || 0);
              const transitStart = totalPrepMins > 0 ? subtractMinutes(sub.start, totalPrepMins) : null;
              
              return (
                <div key={`${evt.id}-sub-${index}`}>
                  {totalPrepMins > 0 && (
                    <Brick 
                      date={currentDate} start={transitStart} end={sub.start} 
                      label={`🚗 Depart & Prep (${totalPrepMins}m)`} color="grey" 
                      isCozi={false} isAllDay={false} type="transit"
                      onClick={() => openModal(evt, sub)} 
                    />
                  )}
                  <Brick 
                    date={currentDate} start={sub.start} end={sub.end} 
                    label={sub.title || evt.label} color={sub.color || 'blue'} 
                    isCozi={false} isAllDay={false} notes={sub.notes}
                    venueName={venueData ? venueData.name : sub.location}
                    mapsLink={venueData ? venueData.mapsLink : null}
                    venueData={venueData} 
                    onClick={() => openModal(evt, sub)} 
                  />
                </div>
              );
            });
          }
          return (
            <Brick 
              key={evt.id} date={currentDate} start={evt.start} end={evt.end} label={evt.label} 
              color={evt.color} isCozi={evt.isCozi} isAllDay={evt.isAllDay} 
              onClick={() => openModal(evt)} 
            />
          );
        })}
      </div>

      {selectedCozi && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', width: '450px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginTop: 0, color: '#3498db' }}>Schedule Specifics</h3>
            <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '20px' }}>For: <strong>{selectedCozi.label}</strong></p>
            
            {subEventsList.length > 0 && (
              <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem' }}>Attached Events:</h4>
                {subEventsList.map((ev, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '5px', marginBottom: '5px' }}>
                    <div style={{ fontSize: '0.85rem' }}>
                      <strong>{format12Hour(ev.start)} - {format12Hour(ev.end)}</strong>: {ev.title}
                    </div>
                    <div>
                      <button onClick={() => handleEditFromList(ev)} style={{ color: '#3498db', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', marginRight: '5px' }}>✎</button>
                      <button onClick={() => handleRemoveFromList(ev.id)} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '2px dashed #ccc', paddingTop: '15px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: editingId ? '#3498db' : '#888' }}>
                {editingId ? '✎ Editing Event' : '+ Add New Sub-Event'}
              </div>
              <input type="text" placeholder="Specific Event (e.g. Game 1 vs Tigers)" value={draftEvent.title} onChange={e => setDraftEvent({...draftEvent, title: e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <input type="time" value={draftEvent.start} onChange={e => setDraftEvent({...draftEvent, start: e.target.value})} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                <input type="time" value={draftEvent.end} onChange={e => setDraftEvent({...draftEvent, end: e.target.value})} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', backgroundColor: '#ecf0f1', padding: '8px', borderRadius: '4px' }}>
                 <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <label style={{ fontSize: '0.7rem', color: '#7f8c8d', marginBottom: '2px' }}>Travel Time (mins)</label>
                    <input type="number" min="0" value={draftEvent.travelTime} onChange={e => setDraftEvent({...draftEvent, travelTime: e.target.value})} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }} />
                 </div>
                 <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <label style={{ fontSize: '0.7rem', color: '#7f8c8d', marginBottom: '2px' }}>Arrival Buffer (mins)</label>
                    <input type="number" min="0" value={draftEvent.arrivalBuffer} onChange={e => setDraftEvent({...draftEvent, arrivalBuffer: e.target.value})} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }} />
                 </div>
              </div>

              <div style={{ display: 'flex', gap: '5px' }}>
                <select value={draftEvent.location} onChange={e => setDraftEvent({...draftEvent, location: e.target.value})} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: 'white' }}>
                  <option value="">-- Select a Venue --</option>
                  {venues.map(v => ( <option key={v.id} value={v.id}>{v.name}</option> ))}
                </select>
                <button onClick={() => setIsAddingVenue(!isAddingVenue)} style={{ padding: '0 10px', backgroundColor: isAddingVenue ? '#95a5a6' : '#e67e22', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  {isAddingVenue ? 'Cancel' : '+ New'}
                </button>
              </div>

              {isAddingVenue && (
                <div style={{ padding: '10px', backgroundColor: '#fdf3e7', borderRadius: '6px', border: '1px solid #f39c12', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#d35400' }}>Create New Venue</div>
                  <input type="text" placeholder="Short ID (e.g. jv_field)" value={venueForm.id} onChange={e => setVenueForm({...venueForm, id: e.target.value})} style={{ padding: '6px', fontSize: '0.85rem' }} />
                  <input type="text" placeholder="Display Name (e.g. JV Baseball Field)" value={venueForm.name} onChange={e => setVenueForm({...venueForm, name: e.target.value})} style={{ padding: '6px', fontSize: '0.85rem' }} />
                  <input type="text" placeholder="Google Maps Link or Coordinates" value={venueForm.mapsLink} onChange={e => setVenueForm({...venueForm, mapsLink: e.target.value})} style={{ padding: '6px', fontSize: '0.85rem' }} />
                  <button onClick={handleSaveNewVenue} style={{ padding: '6px', backgroundColor: '#d35400', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Save Venue</button>
                </div>
              )}

              <textarea placeholder="Notes (e.g. Wear white jerseys)" value={draftEvent.notes} onChange={e => setDraftEvent({...draftEvent, notes: e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minHeight: '50px', fontFamily: 'inherit' }} />
              
              <button onClick={handleAddDraftToList} style={{ padding: '8px', backgroundColor: editingId ? '#3498db' : '#2ecc71', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                {editingId ? 'Update Event ✓' : 'Add to List ↓'}
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '25px' }}>
              <button onClick={() => { if (subEventsList.length === 0) handleSaveEnrichment(); setSelectedCozi(null); }} style={{ padding: '8px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#ecf0f1' }}>
                Close
              </button>
              <button onClick={handleSaveEnrichment} style={{ padding: '8px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#3498db', color: 'white', fontWeight: 'bold' }}>
                Save Dashboard Updates
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;