import { transposeChord } from "./chordUtils.js";
import { transposeLyricsText } from "./lyricsEditorUtils.js";

// Handler untuk export lirik ke TXT
export function handleExportText(song, artist, key, originalKey, tempo, lyricsClean, transpose = 0, setShowExportMenu) {
  if (!song) return;

  const transposedKey = key && typeof key === "string" ? transposeChord(key, transpose) : key || "";
  const transposedLyrics = typeof lyricsClean === "string" && transpose !== 0
    ? transposeLyricsText(lyricsClean, transpose)
    : lyricsClean || "";

  const content = `${song.title}\nArtist: ${artist}\nKey: ${transposedKey}\n${originalKey ? `Original Key: ${originalKey}\n` : ''}Tempo: ${tempo} BPM\n\n${transposedLyrics}`;
  const blob = new Blob([content], { type: "text/plain" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${song.title}.txt`;
  a.click();
  window.URL.revokeObjectURL(url);
  if (typeof setShowExportMenu === "function") setShowExportMenu(false);
}

// Handler untuk export lirik ke PDF (print)
export function handleExportPDF(song, artist, key, originalKey, tempo, lyricsClean, transpose = 0, setShowExportMenu) {
  if (!song) return;

  const transposedKey = key && typeof key === "string" ? transposeChord(key, transpose) : key || "";
  const transposedLyrics = typeof lyricsClean === "string" && transpose !== 0
    ? transposeLyricsText(lyricsClean, transpose)
    : lyricsClean || "";

  const content = `
<html>
<head>
  <title>${song.title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #333; }
    .meta { color: #666; margin: 20px 0; }
    .lyrics { white-space: pre-wrap; font-family: monospace; }
  </style>
</head>
<body>
  <h1>${song.title}</h1>
  <div class="meta">
    <p><strong>Artist:</strong> ${artist}</p>
    <p><strong>Key:</strong> ${transposedKey}</p>
    <p><strong>Tempo:</strong> ${tempo} BPM</p>
  </div>
  <div class="lyrics">${transposedLyrics}</div>
</body>
</html>
    `;
  const printWindow = window.open("", "", "height=400,width=600");
  printWindow.document.write(content);
  printWindow.document.close();
  printWindow.print();
  if (typeof setShowExportMenu === "function") setShowExportMenu(false);
}

// Handler untuk share lagu
export function handleShare(song, artist, setShareMessage) {
  const shareUrl = window.location.href;
  if (navigator.share) {
    navigator.share({
      title: song.title,
      text: `Check out this song: ${song.title} by ${artist}`,
      url: shareUrl,
    });
  } else {
    navigator.clipboard.writeText(shareUrl);
    setShareMessage("Link copied to clipboard!");
    setTimeout(() => setShareMessage(""), 2000);
  }
}
