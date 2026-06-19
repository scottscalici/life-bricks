import { useState, useEffect } from 'react'
import { collection, getDocs, doc, setDoc, query, where, addDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from './firebase'
import { CONFIG, addMinutes, subtractMinutes, getLocalDateString } from './utils'
import Brick from './components/Brick'
import { CustomBrickModal, EnrichmentModal } from './components/Modals'

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

// THE NEW LOOK-AHEAD CHAINING ENGINE
const allDayBlocks = [];
const allMainEvents = [];

// Step 1: Flatten everything AND fix missing titles
customEvents.forEach(evt => allMainEvents.push({ ...evt, label: evt.title, source: 'custom' }));

coziEvents.forEach(evt => {
  const subs = enrichments[evt.label];
  if (subs && subs.length > 0) {
    // THE FIX: Properly map the title so it doesn't render blank!
    subs.forEach((sub, index) => allMainEvents.push({ ...sub, label: sub.title || evt.label, source: 'cozi', parentEvt: evt, originalId: `${evt.id}-${index}` }));
  } else {
    if (evt.isAllDay) {
      allDayBlocks.push(<Brick key={evt.id} date={currentDate} start={evt.start} end={evt.end} label={evt.label} color={evt.color} isCozi={evt.isCozi} isAllDay={evt.isAllDay} onClick={() => openModal(evt)} />);
    } else {
      allMainEvents.push({ ...evt, source: 'cozi', originalId: evt.id });
    }
  }
});

// Step 2: Sort Chronologically
allMainEvents.sort((a, b) => timeToMins(a.start) - timeToMins(b.start));

// Step 3: Look Ahead & Build Smart Groups
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
       blocks.push({ id: `${evt.id || evt.originalId}-dep`, source: evt.source, blockType: 'transit', start: transitStart, end: evt.start, label: `🚗 Drive to ${venueData ? venueData.name : 'next'} (${travelMins}m)`, color: 'grey', parentEvt: evt.parentEvt || evt, subEvt: evt.source === 'cozi' ? evt : null });
    } else {
       blocks.push({ id: `${evt.id || evt.originalId}-dep`, source: evt.source, blockType: 'transit', start: transitStart, end: evt.start, label: `🚗 Leave by ${transitStart}`, color: 'grey', parentEvt: evt.parentEvt || evt, subEvt: evt.source === 'cozi' ? evt : null });
    }
  }

  // 2. Main Event Block
  blocks.push({ ...evt, blockType: evt.source === 'custom' ? 'custom' : 'main-sub', venueData });

  // 3. Gap Link OR Return Trip
  let blockEndStr = evt.end;

  if (isChainedToNext) {
    // Calculate when the next event's prep actually begins
    const nextTravelMins = Number(nextEvt.travelTime) || 0;
    const nextBufferMins = Number(nextEvt.arrivalBuffer) || 0;
    const nextLeeway = nextTravelMins > 0 ? 5 : 0;
    const nextTotalPrep = nextTravelMins + nextBufferMins + nextLeeway;
    const nextTransitStart = nextTotalPrep > 0 ? subtractMinutes(nextEvt.start, nextTotalPrep) : nextEvt.start;

    // THE FIX: Detect if there is a gap between this event and the next one
    const gapMins = timeToMins(nextTransitStart) - timeToMins(evt.end);

    if (gapMins > 0) {
      const isSameVenue = evt.location === nextEvt.location && evt.location !== '';
      const gapLabel = isSameVenue ? `⏳ Remain at venue` : `⏳ Free time / Hang out`;
      
      blocks.push({ id: `${evt.id || evt.originalId}-gap`, source: evt.source, blockType: 'transit', start: evt.end, end: nextTransitStart, label: gapLabel, color: 'grey', parentEvt: evt.parentEvt || evt, subEvt: evt.source === 'cozi' ? evt : null });
      blockEndStr = nextTransitStart;
    }
  } else if (returnTotalMins > 0) {
    const returnLabel = evt.hasReturnErrand ? `🛑 ${evt.errandTitle || 'Errand'} + 🏠 Return (~${returnEnd})` : `🏠 Return (~${returnEnd})`;
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
          timelineBlocks.push(<Brick key={item.id} date={currentDate} start={item.start} end={item.end} label={item.label} color={item.color} isCozi={false} isAllDay={false} notes={item.notes} venueName={item.venueName} mapsLink={item.mapsLink} venueData={item.venueData} onClick={() => openModal(item.parentEvt, item.subEvt)} layout={layoutProps} />);
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