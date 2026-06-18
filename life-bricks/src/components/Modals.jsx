import React from 'react';
import { format12Hour } from '../utils';

export function CustomBrickModal({ isOpen, onClose, onSave, customDraft, setCustomDraft }) {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1001 }}>
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', width: '350px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
        <h3 style={{ marginTop: 0, color: '#e74c3c' }}>Add Custom Life Brick</h3>
        <p style={{ fontSize: '0.85rem', color: '#666' }}>Plan independent tasks like making dinner or chores.</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input type="text" placeholder="Task Name (e.g., Make Dinner)" value={customDraft.title} onChange={e => setCustomDraft({...customDraft, title: e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
          <div style={{ display: 'flex', gap: '10px' }}>
            <input type="time" value={customDraft.start} onChange={e => setCustomDraft({...customDraft, start: e.target.value})} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            <input type="time" value={customDraft.end} onChange={e => setCustomDraft({...customDraft, end: e.target.value})} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
          </div>
          <textarea placeholder="Notes / Prep details" value={customDraft.notes} onChange={e => setCustomDraft({...customDraft, notes: e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minHeight: '60px' }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
          <button onClick={onClose} style={{ padding: '8px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#ecf0f1' }}>Cancel</button>
          <button onClick={onSave} style={{ padding: '8px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#e74c3c', color: 'white', fontWeight: 'bold' }}>Save Brick</button>
        </div>
      </div>
    </div>
  );
}

export function EnrichmentModal({ 
  selectedCozi, onClose, subEventsList, editingId, draftEvent, setDraftEvent, 
  handleAddDraftToList, handleEditFromList, handleRemoveFromList, 
  isAddingVenue, setIsAddingVenue, venues, venueForm, setVenueForm, 
  handleSaveNewVenue, handleSaveEnrichment 
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
          <button onClick={onClose} style={{ padding: '8px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#ecf0f1' }}>
            Close
          </button>
          <button onClick={handleSaveEnrichment} style={{ padding: '8px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#3498db', color: 'white', fontWeight: 'bold' }}>
            Save Dashboard Updates
          </button>
        </div>
      </div>
    </div>
  );
}