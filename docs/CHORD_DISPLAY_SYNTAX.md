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


## 1. SECTION / STRUKTUR LAGU
## ---------------------------
# Ditulis sebagai [Nama] atau Nama: (di akhir baris boleh ada chord atau teks).
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
#   Chorus:
#   [Bridge - Koplo]              <- label dengan anotasi
#   Intro: Am..Em..F..C..         <- label + chord inline di baris yang sama
#   [Verse 1] Aku kembali         <- label + teks lirik inline

# Referensi ulang section: tulis ulang labelnya, body akan di-copy otomatis.
#   [Chorus]   (setelah [Verse] yang sudah punya body -> di-expand + isRepeatedReference)


## 2. MODULATION / KEY CHANGE
## ----------------------------
# Chord setelah baris ini ditranspose. Label chord ikut ditranspose saat display.

#   Modulation: G
#   Key change: A


## 3. METADATA / PATCH KEYBOARD
## -----------------------------
# Format umum:  Key: Value | Key2: Value2  (segment dipisah "|")
# Diparse oleh isMetadataLine / parseInstrumentPatchLine / parsePresetCueLine.

# 3a. Metadata keys yang dikenali (METADATA_KEYS):
#     patch, layer, intensitas, intensity, dynamics, dinamik, cue, notes, catatan,
#     sound, tone, fx, effect, effects, voicing, texture,
#     split, zone, program, preset, scene, part, fill, groove, feel,
#     pc, ch, channel, bank, bankmsb, banklsb, msb, lsb
#     (plus: style)

# 3b. Untuk menjadi instrument_patch (cue dengan MIDI), baris HARUS punya
#     salah satu "patch defining keys":
#     patch, preset, sound, tone, instrument, instrumen, program, pc
#     Baris "Layer: Warm Pad" saja TIDAK jadi patch (tanpa MIDI program).

# 3c. MIDI options yang bisa dipakai di cue:
#     PC: 0-127        (program change)
#     CH: 1-16         (channel; 0-15 juga diterima, jadi 0 -> ch 1)
#     BankMSB: 0-127
#     BankLSB: 0-127
#     (alias: bank = BankMSB, msb, lsb)

# Contoh:
#   Patch: Stage Piano | Layer: Warm Pad (Volume 30%)
#   Preset: Ballad Keys
#   Instrument: Guitar
#   Sound: Strings
#   Patch: EP Soft | Layer: Warm Pad | Volume: 30%
#   [Chorus: Lead Synth + Strings | PC: 81 | CH: 2 | BankMSB: 1 | BankLSB: 32]
#   [Keys: Acoustic Grand Piano | PC: 0 | CH: 1]
#   [Keys: EP Soft]
#   [Guitar: Crunch Lead | PC: 30 | CH: 3]
#   [Intro] [Keys: Acoustic Grand Piano | PC: 0 | CH: 1]     <- bisa digabung di 1 baris

# 3d. Preset cue section keywords (agar [Label: Patch] dianggap preset cue
#     walau tanpa MIDI hint):
#     intro, verse, chorus, bridge, outro, interlude, coda, reff, refrain,
#     pre-chorus, post-chorus, solo, musik, instrumental, hook, drop, ending,
#     ending tag, keys, keyboard, guitar, gitar

# 3e. Metadata lain (baris "Key: Value" tanpa patch key -> type 'metadata'):
#   Cue: Drum masuk di bar 9
#   Intensitas: 1
#   Feel: Half-time
#   FX: Reverb Hall
#   Notes: ...
#   Catatan: ...
#   Original Key: C     <- TIDAK ikut ditranspose, ditampilkan apa adanya


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
# CUE_MARK_KEYWORDS — ditandai sebagai cue saat inline dalam baris chord/lirik
# dalam kurung biasa atau kurung siku:  (Stop), [Stop], (Aksen), [Hit], [Tutti]
#   tutti, hit, aksen, stop, break, bbreak, fill-in, fill in,
#   fade in, fade out, fade in/out, ritardando, rit.


## 6. INSTRUMEN
## -------------
# 6a. Dari autocomplete (INSTRUMENT_COMPLETIONS, format "Nama: "):
#     Piano, Keys, Guitar, Bass, Drums, Strings, Brass, Vokal, Sax, Suling, Violin

# 6b. Kata kunci instrumen yang dikenali parser (instrumentKeywords) —
#     dipakai untuk highlight inline "Gitar: teks", "(Sax)", dll:
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
#   Gitar: teks apapun
#   (teks apapun Gitar)
#   Cue: (Sax)
#   Dm (Sax) Em | G |
#   (Sax)(Stop) Am | Dm G |

# 6d. Suffix deskriptor yang digabung ke label instrumen
#     (INSTRUMENT_DESCRIPTOR_SUFFIXES):
#     dist, distortion, saw, sawtooth, square, triangle, pulse, sine, wave, pad,
#     warm, bright, dark, clean, mono, stereo, ambient, pluck, sub, noise, perc,
#     percussion, stac, staccato

# 6e. Cue marks yang TIDAK ditampilkan sebagai instrumen
#     (NON_DISPLAY_INSTRUMENT_CUES):
#     aksen, stop, break, bbreak, fill-in, fill in, fade in, fade out, fade in/out


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

# Instrumen (type: variable, di-apply sebagai "Nama: "):
#   Piano, Keys, Guitar, Bass, Drums, Strings, Brass, Vokal, Sax, Suling, Violin

# Trigger autocomplete: mengetik "[" atau kata berawalan huruf kapital.
# Autocomplete TIDAK menawarkan nama chord.
