import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CalendarView({ gigs = [], selectedMonth, selectedYear }) {
  const navigate = useNavigate();
  const exportRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedGigId, setSelectedGigId] = useState(null);

  useEffect(() => {
    if (typeof selectedMonth === 'number' && typeof selectedYear === 'number') {
      setCurrentMonth(new Date(selectedYear, selectedMonth, 1));
    }
  }, [selectedMonth, selectedYear]);

  const formatCurrency = (value) => {
    if (!value) return '-';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatLocalDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getGigsForDate = (date) => {
    const dateStr = formatLocalDate(date);
    return gigs.filter(gig => {
      const gigDate = new Date(gig.date);
      const gigDateStr = formatLocalDate(gigDate);
      return gigDateStr === dateStr;
    });
  };


  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const monthName = currentMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const days = [];

  // Empty cells for days before the first day of month
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  // Days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i));
  }

  return (
    <div className="calendar-container">
      <div className="calendar-export-card schedule-poster-card" ref={exportRef} style={{ width: '100%', maxWidth: 1040 }}>
        <div className="schedule-poster-header">
          <div>
            <div className="schedule-poster-kicker">Jadwal Konser</div>
            <div className="schedule-poster-title">{monthName}</div>
          </div>
          <div className="share-badge">#RuangPerformer</div>
        </div>

        <div className="calendar-grid">
          <div className="calendar-day-header">Minggu</div>
          <div className="calendar-day-header">Senin</div>
          <div className="calendar-day-header">Selasa</div>
        <div className="calendar-day-header">Rabu</div>
        <div className="calendar-day-header">Kamis</div>
        <div className="calendar-day-header">Jumat</div>
        <div className="calendar-day-header">Sabtu</div>

        {/* Calendar days */}
        {days.map((date, index) => {
          const gigsOnDay = date ? getGigsForDate(date) : [];
          const isToday = date && date.toDateString() === new Date().toDateString();

          return (
            <div
              key={index}
              className={`calendar-day ${date ? '' : 'calendar-day-empty'} ${isToday ? 'calendar-day-today' : ''}`}
            >
              {date && (
                <>
                  <div className="calendar-day-number">{date.getDate()}</div>
                  <div className="calendar-day-gigs">
                    {gigsOnDay.length > 0 ? (
                      <>
                        {gigsOnDay.slice(0, 2).map((gig) => (
                          <div
                            key={gig.id}
                            className="calendar-gig-item"
                            onClick={() => {
                              setSelectedGigId(selectedGigId === gig.id ? null : gig.id);
                            }}
                            title={gig.bandName}
                          >
                            🎤 {gig.bandName?.substring(0, 10)}
                          </div>
                        ))}
                        {gigsOnDay.length > 2 && (
                          <div className="calendar-gig-more">
                            +{gigsOnDay.length - 2} lainnya
                          </div>
                        )}
                      </>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
      </div>

      <div className="calendar-header" style={{ justifyContent: 'center', marginBottom: '16px' }}>
        <button className="btn" onClick={previousMonth} style={{ padding: '6px 12px' }} disabled={downloading}>
          ← Bulan Sebelumnya
        </button>
        <h2 style={{ margin: '0 20px' }}>{monthName}</h2>
        <button className="btn" onClick={nextMonth} style={{ padding: '6px 12px' }} disabled={downloading}>
          Bulan Berikutnya →
        </button>
      </div>


      {/* Gig Detail Panel */}
      {selectedGigId && (
        <div style={{ marginTop: '24px', padding: '16px', backgroundColor: 'var(--card-bg)', borderRadius: '8px', border: '1.5px solid var(--border-color)' }}>
          {(() => {
            const gig = gigs.find(g => g.id === selectedGigId);
            if (!gig) return null;
            
            return (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ margin: 0, marginBottom: '4px' }}>🎤 {gig.bandName}</h3>
                    <div style={{ fontSize: '0.9em', color: 'var(--text-muted)' }}>
                      📅 {new Date(gig.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                    {gig.date && (
                      <div style={{ fontSize: '0.9em', color: 'var(--text-muted)' }}>
                        ⏰ {new Date(gig.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                  <button
                    className="btn"
                    onClick={() => setSelectedGigId(null)}
                    style={{ padding: '6px 12px', fontSize: '0.85em' }}
                  >
                    ✕ Tutup
                  </button>
                </div>

                {(gig.venue || gig.city) && (
                  <div style={{ fontSize: '0.9em', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    📍 {gig.venue}{gig.venue && gig.city ? ', ' : ''}{gig.city}
                  </div>
                )}

                {gig.fee && (
                  <div style={{ fontSize: '0.9em', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    💰 {formatCurrency(gig.fee)}
                  </div>
                )}

                {gig.setlistName && (
                  <div style={{ fontSize: '0.9em', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    🎵 Setlist: {gig.setlistName}
                  </div>
                )}

                {gig.notes && (
                  <div style={{ fontSize: '0.9em', color: 'var(--text-muted)', marginTop: '8px', fontStyle: 'italic', padding: '8px', backgroundColor: 'var(--primary-bg)', borderRadius: '6px', marginBottom: '12px' }}>
                    "{gig.notes}"
                  </div>
                )}

                <button
                  className="btn btn-primary"
                  onClick={() => navigate(`/gigs/${gig.id}`)}
                  style={{ marginTop: '8px' }}
                >
                  Lihat Detail →
                </button>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
