import React, { useState, useEffect } from 'react';
import { CONFIG, getMinutesFromStart, format12Hour, extractCoordinates } from '../utils';

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

export default function Brick({ date, start, end, label, color, isCozi, isAllDay, onClick, venueName, mapsLink, notes, type = 'event', venueData, layout }) {
  const startMins = getMinutesFromStart(start);
  const endMins = getMinutesFromStart(end);
  const duration = Math.max(endMins - startMins, 15); 

  const bgColors = { green: '#2ecc71', blue: '#3498db', orange: '#e67e22', purple: '#9b59b6', grey: '#95a5a6', custom: '#e74c3c' };
  
  const isTransit = type === 'transit';
  const blockColor = isTransit ? '#bdc3c7' : (bgColors[color] || bgColors.grey);
  const backgroundStyle = isTransit ? `repeating-linear-gradient(45deg, #bdc3c7, #bdc3c7 10px, #b0b6bb 10px, #b0b6bb 20px)` : blockColor;

  // If it's an all-day event, it stacks normally at the top. If it has a time, it locks to the grid.
  const containerStyle = isAllDay ? {
    position: 'relative',
    width: '100%',
    background: backgroundStyle,
    color: 'white',
    borderRadius: '6px',
    padding: '8px',
    boxSizing: 'border-box',
    borderLeft: `4px solid ${isCozi ? 'rgba(255,255,255,0.6)' : (isTransit ? '#7f8c8d' : 'rgba(0,0,0,0.2)')}`,
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
    border: isCozi ? '1px dashed white' : 'none',
    opacity: 0.9,
    marginBottom: '8px',
    transition: 'transform 0.1s',
    cursor: onClick ? 'pointer' : 'default'
  } : {
    position: 'absolute',
    top: `${startMins * CONFIG.pixelsPerMinute}px`,
    height: `${duration * CONFIG.pixelsPerMinute}px`,
    // Apply layout if clustered, otherwise default to full width minus the 60px margin/padding
    width: layout ? layout.width : 'calc(100% - 60px)',
    // Push everything over 50px to clear the time labels, then apply the clustering percentage
    left: layout ? `calc(50px + ${layout.left})` : '50px',
    // Prevents columns from pushing past the right edge of the screen
    maxWidth: 'calc(100% - 60px)',
    background: backgroundStyle,
    color: isTransit ? '#2c3e50' : 'white',
    borderRadius: '6px',
    padding: '8px',
    boxSizing: 'border-box',
    borderLeft: `4px solid ${isCozi ? 'rgba(255,255,255,0.6)' : (isTransit ? '#7f8c8d' : 'rgba(0,0,0,0.2)')}`,
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    border: isCozi ? '1px dashed white' : 'none',
    transition: 'transform 0.1s',
    zIndex: isTransit ? 5 : 10
  };

  return (
    <div 
      style={containerStyle}
      onClick={onClick}
      onMouseOver={(e) => onClick && (e.currentTarget.style.transform = 'scale(1.01)')}
      onMouseOut={(e) => onClick && (e.currentTarget.style.transform = 'scale(1)')}
    >
      <div style={{ position: 'relative', zIndex: 2, pointerEvents: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {isAllDay ? 'All Day' : `${format12Hour(start)} - ${format12Hour(end)}`}
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