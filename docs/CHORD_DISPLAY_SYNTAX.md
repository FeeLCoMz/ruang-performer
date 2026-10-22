# CHORD DISPLAY — MANUAL SYNTAX REFERENCE
# ==========================================
# Referensi lengkap semua sintaks yang dibaca ChordDisplay (ChordDisplay.chordUtils.js)
# dan semua item yang ditawarkan autocompletion (lyricsCompletion.js).
# FILE KONFIGURASI YANG DIBACA APLIKASI:
#   src/config/chordDisplayConfig.js
# Ubah semua daftar (section, metadata keys, chord regex, cue marks,
# instrumen, autocompletion) di file itu — chordUtils.js dan
# lyricsCompletion.js meng-import darinya.
# File ini hanya penjelasan manusiawi dari konfigurasi tersebut.
# ==========================================


## 0. ATURAN BRACKET (BERLAKU UNTUK SEMUA KEYWORD)
## -------------------------------------------------
# Semua keyword — seksi, metadata, instrumen, cue mark, modulation, timestamp —
# ditulis dalam BRACKET SIKU: [Keyword].
#   BENAR: [Intro]  [Cue: ...]  [Gitar]  [Stop]  [Keys: EP Soft]
#   SALAH: Intro:  Cue: ...  Gitar:  (Stop)  (Gitar)
# Teks tanpa bracket ("Gitar:", "(Stop)") dirender sebagai lirik biasa.
# Chord tetap ditulis apa adanya (C, Am7, | C | G |) dan tidak perlu bracket.


## 1. SECTION / STRUKTUR LAGU
## ---------------------------
# Ditulis sebagai [Nama].
# Diparse oleh parseSection() — cocok jika label mengandung kata kunci ini
# sebagai kata utuh (besar/kecil huruf bebas):

#   Intro
#   Verse       (Verse 1, Verse 2, dst)
#   Pre-Chorus  (juga: "Pre Chorus", "Pre-Chorus 2")
#   Chorus
#   Post-Chorus (juga: "Post Chorus")
#   Reff        (Refrein / Refrain)
#   Bridge
#   Interlude
#   Solo
#   Outro
#   Coda
#   Musik
#   Instrumental
#   Int         (alias "Intro")

# Contoh bentuk yang valid:
#   [Intro]
#   [Verse 1]
#   [Chorus]
#   [Bridge - Koplo]              <- label dengan anotasi
#   [Intro - Am..Em..F..C..]      <- label + chord inline di baris yang sama
#   [Verse 1 - Aku kembali]       <- label + teks lirik inline

# Referensi ulang section: tulis ulang labelnya, body akan di-copy otomatis.
#   [Chorus]   (setelah [Verse] yang sudah punya body -> di-expand + isRepeatedReference)


## 2. MODULATION / KEY CHANGE
## ----------------------------
# Chord setelah baris ini ditranspose. Label chord ikut ditranspose saat display.

#   [Modulation: G]
#   [Key change: A]


## 3. METADATA / PATCH KEYBOARD
## -----------------------------
# Format umum:  [Key: Value]  (beberapa tag boleh digabung: [A: x] [B: y])
# Diparse oleh isMetadataLine.

# Keyword patch / MIDI (patch, preset, sound, tone, program, instrument,
# layer, split, zone, scene, pc, ch, channel, bank, bankmsb, banklsb, msb,
# lsb) TIDAK lagi dikenali ChordDisplay — daftar itu dibaca modul MIDI.
# Baris seperti [Keys: EP Soft | CH: 2] dibiarkan utuh untuk modul MIDI.

# 3a. Metadata keys ChordDisplay (METADATA_KEYS):
#     cue, notes, catatan, fx, effect, effects,
#     intensitas, intensity, dynamics, dinamik,
#     groove, feel, style, texture, voicing,
#     original key, time signature

# 3b. Keyword MIDI (patch, preset, sound, tone, program, instrument, instrumen,
#     layer, split, zone, scene, pc, ch, channel, bank, bankmsb, banklsb, msb,
#     lsb) DIKELOLA MODUL MIDI — tidak ada di config ChordDisplay.

# 3c. Opsi MIDI (PC, CH, BankMSB, ...) bukan keyword ChordDisplay: baris yang
#     memuatnya dibiarkan utuh untuk modul MIDI.

# Contoh:
#   [Instrument: Guitar]
#   [Cue: Drum masuk di bar 9]
#   [Keys: EP Soft | PC: 30 | CH: 3]     <- dibaca modul MIDI, bukan ChordDisplay

# 3d. Tag patch/MIDI tidak lagi jadi preset cue; hanya modul MIDI yang
#     mem-parse-nya.

# 3e. Metadata lain (format bracket: [Key: Value]):
#   [Cue: Drum masuk di bar 9]
#   [Intensitas: 1]
#   [Feel: Half-time]
#   [FX: Reverb Hall]
#   [Notes: ...]
#   [Catatan: ...]
#   [Original Key: C]   <- TIDAK ikut ditranspose, ditampilkan apa adanya
# Beberapa tag boleh digabung di satu baris: [Verse 2] [Style: Pop] [Cue: Fill Bell]


## 4. CHORD
## ---------
# Regex chord valid (CHORD_REGEX):
#   /^[A-G][#b]?(?:maj|min|dim|aug|sus|add|m)*(?:\d+)?(?:[#b]\d+)*(?:\/[A-G][#b]?)?$/i
# Contoh valid:  C  C#  Bb  Cm  Cmaj7  Cm7b5  C7#11  Csus4  Cadd9
#                Am  F#m7  Bbmaj7  G/B  C#maj7#11  Amadd9

# No Chord (NO_CHORD_REGEX):  N.C.  NC  No Chord  No Chords

# Barline (pengukur):  |  ||  |:  :|  [:  :]
# Contoh:  | C | G | Am | F |   atau   |: 7534 | 5317 |

# Compact / repeat notation:
#   A..B..        (dot-separator)
#   A-B-          (dash-separator)
#   (Am F G)      (chord berkelompok dalam bracket, masing-masing ikut transpose)
#   2x, 3x        (pengulangan, diabaikan parser not angka)

# Chord inline di baris lirik juga dideteksi dan ditranspose:
#   [C]Hello

# Not angka (notasi angka 1-7, boleh titik/apostrof): 1 2 3 4 5 6 7, 7. 6', dst.
# Baris dianggap baris not angka bila mayoritas token cocok.


## 5. CUE MARKS (INLINE)
## ----------------------
# CUE_MARK_KEYWORDS — ditandai sebagai cue saat inline dalam baris chord/lirik,
# WAJIB dalam bracket siku:  [Stop], [Aksen], [Hit], [Tutti]
# Baris yang isinya hanya satu cue mark tampil sebagai chip cue.
#   tutti, hit, aksen, stop, break, bbreak, fill-in, fill in,
#   fade in, fade out, fade in/out, ritardando, rit.
# Kurung biasa (Stop) bukan cue mark.


## 6. INSTRUMEN
## -------------
# 6a. Satu bentuk saja: [Nama] atau [Nama: Detail].
#     [Gitar]   [Gitar: Dist]   [Keys: EP Soft | CH: 2]   [Epiano: ]
#     [Gitar, Organ]  -> daftar instrumen dalam satu bracket (tiap nama dicek)
#     Kurung biasa (Gitar) dan bentuk tanpa bracket "Gitar:" TIDAK dikenali.

# 6b. Dari autocomplete (INSTRUMENT_COMPLETIONS, format "[Nama: ]"):
#     Piano, Keys, Guitar, Bass, Drums, Strings, Brass, Vokal, Sax, Suling, Violin

# 6b. Kata kunci instrumen yang dikenali parser (instrumentKeywords) —
#     dipakai untuk highlight inline "[Gitar: Dist]", "[Sax]", dll:
#     gitar, guitar, bass, ukulele, mandolin, sape
#     piano, keyboard, organ, synth, keys, synthesizer, pianika, melodika, epiano
#     brass, horn section, horns, trombone, tuba, euphonium, cornet
#     saxophone, saksofon, sax, saxo, saxofon, trumpet, terompet, flute, suling,
#     clarinet, klarinet, bansi
#     violin, biola, cello, kontrabas, strings
#     vokal, vocal, vocalist, vokalist, choir, vokal grup
#     drum, drums, perkusi, percussion, cajon, tamborin, marakas, rebana
#     kenong, gamelan, kendang, gong, angklung, rebab
#     bell, bell pads, pads

# 6c. Format inline di dalam baris chord/lirik:
#   [Gitar: Dist]
#   [Gitar Dist]
#   Dm [Sax] Em | G |
#   [Sax] [Stop] Am | Dm G |
#   Cue: (lihat 3e) tetap metadata; keyword di dalamnya tidak diproses.

# 6d. Tidak ada daftar deskriptor instrumen.
#     INSTRUMENT_DESCRIPTOR_SUFFIXES sudah dihapus: label instrumen hanya
#     memakai INSTRUMENT_KEYWORDS, digabung dengan kata berikutnya apa adanya
#     bila perlu ("Gitar Dist", "Strings Stac.").

# 6e. Cue marks inline (CUE_MARK_KEYWORDS) — keyword biasa, tanpa mapping:
#     tutti, hit, ritardando, rit.
#     aksen, stop, break, bbreak, fill-in, fill in, fade in, fade out, fade in/out
#     Cue mark adalah aksi permainan, bukan instrumen: tidak ikut terdeteksi
#     sebagai instrumen maupun muncul di panel instrumen.


## 7. TIMESTAMP / MARKER
## -----------------------
# Format:  [mm:ss]  atau  [hh:mm:ss]
# Dipakai untuk autoscroll/section markers (Stage Mode).
# Contoh:  [00:05]  [01:23]  [1:02:03]
# Bisa digabung:  [Intro] [00:05]


## 8. DAFTAR AUTOCOMPLETION DI EDITOR
## ------------------------------------
# (dari src/utils/lyricsCompletion.js — sesuaikan di file itu jika ingin mengubah)

# Section (type: keyword):
#   [Intro] [Verse 1] [Verse 2] [Pre-Chorus] [Post-Chorus]
#   [Chorus] [Bridge] [Interlude] [Solo] [Outro] [Coda]

# Metadata (type: property):
#   Patch:     — Patch keyboard          contoh: Patch: Stage Piano | Layer: Warm Pad
#   Preset:    — Preset keyboard
#   Instrument: — Label instrumen
#   Modulation: — Ganti key di tengah lagu (chord ikut ditranspose)
#   Original Key: — Key asli lagu (tidak ditranspose)
#   Cue:       — Catatan perform
#   Intensitas: — Tingkat intensitas
#   Feel:      — Feel/groove
#   FX:        — Efek
#   Notes:     — Catatan aransemen

# Instrumen (type: variable, di-apply sebagai "[Nama: ]"):
#   Piano, Keys, Guitar, Bass, Drums, Strings, Brass, Vokal, Sax, Suling, Violin

# Cue mark (type: keyword, ditawarkan sebagai "[Stop]"):
#   [Tutti] [Hit] [Aksen] [Stop] [Break] [Fill In] [Fade In] ...

# Trigger autocomplete: mengetik "[".
# Semua entri yang ditawarkan berbentuk bracket: [Intro], [Patch: ], [Gitar: ], [Stop].
# Autocomplete TIDAK menawarkan nama chord.
