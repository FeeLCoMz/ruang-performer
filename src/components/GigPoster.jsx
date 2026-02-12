import React, { useRef, useState } from 'react';

const posterBg = {
  background: 'radial-gradient(circle at top, rgba(59,130,246,0.22), rgba(15,23,42,0.96) 45%), #0b1220',
  color: '#e2e8f0',
  borderRadius: 18,
  padding: 32,
  width: 1080,
  height: 1350,
  boxShadow: '0 24px 70px rgba(15,23,42,0.45)',
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: `'Montserrat', 'Bebas Neue', 'Segoe UI', 'Arial', 'Helvetica Neue', sans-serif`,
  letterSpacing: 0.5,
};

const dividerStyle = {
  width: 600,
  maxWidth: '80%',
  height: 4,
  background: 'linear-gradient(90deg, #60a5fa 0%, #818cf8 100%)',
  border: 0,
  borderRadius: 2,
  margin: '32px auto',
  display: 'block',
};


const GigPoster = React.forwardRef(({ gig }, ref) => {
  const [personilImg, setPersonilImg] = useState(null);
  const fileInputRef = useRef();
  if (!gig) return null;

  // Handle file upload
  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setPersonilImg(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ marginBottom: 16 }}>
        <input
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        <button
          className="btn-base tab-btn"
          style={{ marginBottom: 8 }}
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
        >
          {personilImg ? 'Ganti Foto Personil' : 'Upload Foto Personil'}
        </button>
        {personilImg && (
          <div style={{ marginTop: 8, marginBottom: 8, textAlign: 'center' }}>
            <img
              src={personilImg}
              alt="Foto Personil Band"
              style={{ maxWidth: 320, maxHeight: 180, borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.18)' }}
            />
          </div>
        )}
      </div>
      <div ref={ref} style={posterBg}>
        <div style={{ width: '100%', textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 44, letterSpacing: 2, fontWeight: 700, color: '#60a5fa', marginBottom: 12, textTransform: 'uppercase', fontFamily: `'Bebas Neue', 'Montserrat', sans-serif` }}>Live Performance</div>
          <div style={{ fontSize: 92, fontWeight: 900, margin: '24px 0 8px 0', lineHeight: 1.08, color: '#fff', fontFamily: `'Bebas Neue', 'Montserrat', sans-serif`, letterSpacing: 2 }}>
            {gig.bandName || 'Band'}
          </div>
          <div style={{ fontSize: 44, fontWeight: 600, color: '#a5b4fc', fontFamily: `'Montserrat', 'Arial', sans-serif` }}>
            {gig.venue || '-'}{gig.city ? ', ' + gig.city : ''}
          </div>
          <div style={dividerStyle} />
        </div>
        <div style={{ textAlign: 'center', margin: '32px 0', fontSize: 52, fontWeight: 700, color: '#fbbf24', fontFamily: `'Montserrat', 'Arial', sans-serif` }}>
          {new Date(gig.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          <br />
          <span style={{ fontSize: 38, color: '#fbbf24', fontWeight: 600, fontFamily: `'Montserrat', 'Arial', sans-serif` }}>
            {new Date(gig.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        {gig.notes && (
          <div style={{ fontStyle: 'italic', color: '#f1f5f9', margin: '32px 0', padding: 24, background: 'rgba(59,130,246,0.10)', borderRadius: 12, fontSize: 34, fontFamily: `'Montserrat', 'Arial', sans-serif` }}>
            “{gig.notes}”
          </div>
        )}
        {personilImg && (
          <div style={{ marginTop: 32, textAlign: 'center' }}>
            <img
              src={personilImg}
              alt="Foto Personil Band"
              style={{ maxWidth: 420, maxHeight: 220, borderRadius: 16, boxShadow: '0 2px 18px rgba(0,0,0,0.22)' }}
            />
          </div>
        )}
      </div>
    </div>
  );
});

export default GigPoster;
