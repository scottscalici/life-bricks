import React from 'react';
import { format12Hour } from '../utils';

export function CustomBrickModal({ 
  isOpen, onClose, onSave, onDelete, customDraft, setCustomDraft, venues 
}) {
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
                
                {/* CHAINING TOGGLE */}
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
            {/* CHAINING TOGGLE */}
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