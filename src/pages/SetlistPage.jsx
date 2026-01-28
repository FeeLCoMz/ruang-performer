
import React from 'react';
import { useNavigate } from 'react-router-dom';
import PlusIcon from '../components/PlusIcon.jsx';
import SetlistForm from '../components/SetlistForm.jsx';
import EditIcon from '../components/EditIcon.jsx';
import DeleteIcon from '../components/DeleteIcon.jsx';

export default function SetlistPage({
  setlists,
  loadingSetlists,
  errorSetlists,
  showCreateSetlist,
  setShowCreateSetlist,
  createSetlistName,
  setCreateSetlistName,
  createSetlistError,
  setCreateSetlistError,
  setSetlists
}) {
  const navigate = useNavigate();
  const [editSetlist, setEditSetlist] = React.useState(null);
  const [editLoading, setEditLoading] = React.useState(false);
  const [editError, setEditError] = React.useState('');
  const [deleteSetlist, setDeleteSetlist] = React.useState(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState('');
  // Helper untuk refresh setlists dari API
  const refreshSetlists = async () => {
    try {
      const res = await fetch('/api/setlists');
      const data = await res.json();
      setSetlists(Array.isArray(data) ? data : []);
    } catch {}
  };
  return (
    <>
      <div className="section-title">Setlist</div>
      <button
        className="tab-btn setlist-add-btn"
        onClick={() => setShowCreateSetlist(true)}
        title="Buat Setlist Baru"
      >
        <PlusIcon size={22} />
      </button>
      {/* Modal Buat Setlist Baru */}
      {showCreateSetlist && (
        <div className="modal-overlay" onClick={() => setShowCreateSetlist(false)}>
          <SetlistForm
            mode="create"
            title="Buat Setlist Baru"
            initialData={{}}
            loading={editLoading}
            error={createSetlistError}
            onCancel={() => setShowCreateSetlist(false)}
            onSubmit={async ({ name, desc }) => {
              setCreateSetlistError('');
              setEditLoading(true);
              try {
                const res = await fetch('/api/setlists', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name, desc })
                });
                if (!res.ok) throw new Error('Gagal membuat setlist');
                setShowCreateSetlist(false);
                setCreateSetlistName('');
                setCreateSetlistError('');
                await refreshSetlists();
              } catch (err) {
                setCreateSetlistError(err.message || 'Gagal membuat setlist');
              } finally {
                setEditLoading(false);
              }
            }}
          />
        </div>
      )}
      {/* Modal Edit Setlist */}
      {editSetlist && (
        <div className="modal-overlay" onClick={() => setEditSetlist(null)}>
          <SetlistForm
            mode="edit"
            title="Edit Setlist"
            initialData={editSetlist}
            loading={editLoading}
            error={editError}
            onCancel={() => setEditSetlist(null)}
            onSubmit={async ({ name, desc }) => {
              setEditError('');
              setEditLoading(true);
              try {
                const res = await fetch(`/api/setlists/${editSetlist.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name, desc })
                });
                if (!res.ok) throw new Error('Gagal mengupdate setlist');
                setEditSetlist(null);
                await refreshSetlists();
              } catch (err) {
                setEditError(err.message || 'Gagal mengupdate setlist');
              } finally {
                setEditLoading(false);
              }
            }}
          />
        </div>
      )}
      {loadingSetlists && <div className="info-text">Memuat setlist...</div>}
      {errorSetlists && <div className="error-text">{errorSetlists}</div>}
      <ul className="setlist-list">
        {!loadingSetlists && !errorSetlists && setlists.length === 0 && (
          <li className="info-text">Tidak ada setlist.</li>
        )}
        {setlists.map(setlist => (
          <li key={setlist.id} className="setlist-list-item setlist-list-flex">
            <span
              className="setlist-title setlist-title-flex pointer"
              onClick={() => navigate(`/setlists/${setlist.id}/songs`)}
            >
              {setlist.name}
                {setlist.desc && (
                  <div className="setlist-desc">
                    {setlist.desc}
                  </div>
                )}
            </span>
            <span
              className="setlist-count setlist-count-flex"
              onClick={() => navigate(`/setlists/${setlist.id}/songs`)}
            >
              {(setlist.songs?.length || 0)} lagu
            </span>
            <div className="setlist-actions-flex">
              <button
                className="tab-btn setlist-edit-btn setlist-action-btn"
                title="Edit Setlist"
                onClick={e => { e.stopPropagation(); setEditSetlist(setlist); }}
              >
                <EditIcon size={16} />
                <span>Edit</span>
              </button>
              <button
                className="tab-btn setlist-delete-btn setlist-action-btn setlist-delete-color"
                title="Hapus Setlist"
                onClick={e => { e.stopPropagation(); setDeleteSetlist(setlist); }}
              >
                <DeleteIcon size={16} />
                <span>Hapus</span>
              </button>
            </div>
                {/* Modal Konfirmasi Hapus Setlist */}
                {deleteSetlist && (
                  <div className="modal-overlay" onClick={() => setDeleteSetlist(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                      <h3 className="setlist-modal-title setlist-delete-color">Hapus Setlist?</h3>
                      <div className="setlist-modal-desc">
                        Yakin ingin menghapus setlist <b>{deleteSetlist.name}</b>? Tindakan ini tidak dapat dibatalkan.
                      </div>
                      {deleteError && <div className="error-text setlist-modal-error">{deleteError}</div>}
                      <div className="setlist-modal-actions">
                        <button className="tab-btn" onClick={() => setDeleteSetlist(null)}>Batal</button>
                        <button
                          className="tab-btn setlist-modal-delete-btn"
                          disabled={deleteLoading}
                          onClick={async () => {
                            setDeleteError('');
                            setDeleteLoading(true);
                            try {
                              const res = await fetch(`/api/setlists/${deleteSetlist.id}`, { method: 'DELETE' });
                              if (!res.ok) throw new Error('Gagal menghapus setlist');
                              setDeleteSetlist(null);
                              await refreshSetlists();
                            } catch (err) {
                              setDeleteError(err.message || 'Gagal menghapus setlist');
                            } finally {
                              setDeleteLoading(false);
                            }
                          }}
                        >{deleteLoading ? 'Menghapus...' : 'Hapus'}</button>
                      </div>
                    </div>
                  </div>
                )}
          </li>
        ))}
      </ul>
    </>
  );
}
