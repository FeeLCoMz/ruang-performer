import React from "react";
import { initialSongs, initialSetLists } from "../data/songs";

export default function DatabaseStatsPage({ dbStatus }) {
  const totalSongs = initialSongs.length;
  const totalSetlists = initialSetLists.length;
  const totalArtists = new Set(initialSongs.map(song => song.artist)).size;

  let dbType = dbStatus?.enabled ? 'Turso (SQLite Cloud)' : 'Local Storage';
  let dbConn = dbStatus?.enabled
    ? dbStatus.loading
      ? 'Mengecek...'
      : dbStatus.ok
        ? 'Terhubung'
        : dbStatus.error || 'Tidak terhubung'
    : 'Tidak digunakan';

  return (
    <div style={{ padding: 24 }}>
      <h2>Statistik Database</h2>
      <ul>
        <li><b>Total Lagu:</b> {totalSongs}</li>
        <li><b>Total Setlist:</b> {totalSetlists}</li>
        <li><b>Total Artis Unik:</b> {totalArtists}</li>
      </ul>
      <h3>Info Database</h3>
      <ul>
        <li><b>Jenis Database:</b> {dbType}</li>
        <li><b>Status Koneksi:</b> {dbConn}</li>
      </ul>
    </div>
  );
}
