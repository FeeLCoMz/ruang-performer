import React from "react";
import PropTypes from "prop-types";
import { useSetLists } from "../hooks/useSetLists";

/**
 * SetlistPicker
 * Props:
 *   songId: string (the song to add/remove from setlists)
 *   onChange (optional): callback when setlists are updated
 */
export default function SetlistPicker({ songId, onChange }) {
  const { setLists, handleAddSongToSetList, handleRemoveSongFromSetList } = useSetLists();

  if (!setLists) return <div>Loading setlists...</div>;

  const handleToggle = async (setListId, isChecked) => {
    if (isChecked) {
      await handleRemoveSongFromSetList(setListId, songId);
    } else {
      await handleAddSongToSetList(setListId, songId);
    }
    if (onChange) onChange();
  };

  return (
    <div className="setlist-picker">
      <h4>Add to Setlist</h4>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {setLists.map((setlist) => {
          const isInSetlist = setlist.songs && setlist.songs.includes(songId);
          return (
            <li key={setlist.id}>
              <label>
                <input
                  type="checkbox"
                  checked={!!isInSetlist}
                  onChange={e => handleToggle(setlist.id, !!isInSetlist)}
                />
                {setlist.name}
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

SetlistPicker.propTypes = {
  songId: PropTypes.string.isRequired,
  onChange: PropTypes.func,
};
