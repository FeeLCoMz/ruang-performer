/**
 * Songs Database
 * Sample songs with ChordPro format
 */

export const initialSongs = [
  {
    id: 1,
    title: "Kasih Putih",
    artist: "Glenn Fredly",
    youtubeId: "K8jVKqz0fYw",
    createdAt: "2025-12-28T00:00:00.000Z",
    melody: "5 5 5 3 5 | 6 5 3 2 1 | 5 5 5 3 5 | 6 5 3 2 |",
    lyrics: `{title: Kasih Putih}
{artist: Glenn Fredly}
{key: C}

{start_of_verse}
[C]Aku mencintaimu [Em]apa adanya
[Am]Seperti dirimu [F]mencintaiku
[C]Hanya kau yang ada [Em]di dalam jiwa
[Dm]Tak ada yang bisa [G]menggantikanmu
{end_of_verse}

{start_of_chorus}
[C]Kasih [Em]putih
[Am]Kasih [F]suci
[C]Cinta [Em]ini
[Dm]Tak [G]kan [C]bertepi
{end_of_chorus}

{start_of_verse}
[C]Ku tak ingin kau [Em]pergi dariku
[Am]Tinggalkan diri[F]ku sendiri
[C]Terlalu indah [Em]saat bersamamu
[Dm]Ingin rasanya [G]terus begini
{end_of_verse}

{start_of_chorus}
[C]Kasih [Em]putih
[Am]Kasih [F]suci
[C]Cinta [Em]ini
[Dm]Tak [G]kan [C]bertepi
{end_of_chorus}`
  },
  {
    id: 2,
    title: "Sempurna",
    artist: "Andra and The Backbone",
    youtubeId: "tTJjZi9f6AQ",
    createdAt: "2025-12-28T00:00:00.000Z",
    melody: "2 2 3 5 | 6 5 3 2 | 1 1 2 3 | 2 1 - - |",
    lyrics: `{title: Sempurna}
{artist: Andra and The Backbone}
{key: D}

{start_of_verse}
[D]Kau begitu sempurna
[Bm]Dimataku kau begitu indah
[G]Kau membuat diriku akan [A]slalu memujimu
{end_of_verse}

{start_of_verse}
[D]Disetiap langkahku
[Bm]Kukan slalu memikirkan dirimu
[G]Tak bisa kubayangkan [A]hidup tanpa cintamu
{end_of_verse}

{start_of_chorus}
[D]Janganlah kau tinggalkan [Bm]diriku
Takkan mampu [G]menghadapi semua
Hanya bersamamu [A]ku akan bisa
{end_of_chorus}

{start_of_chorus}
[D]Kau adalah darahku
[Bm]Kau adalah jantungku
[G]Kau adalah hidup[A]ku
Lengkapi diriku [D]Oh sayangku
[Bm]Kau begitu
[G]Sempurna.. [A]Sempurna.. [D]
{end_of_chorus}`
  },
  {
    id: 3,
    title: "Tentang Seseorang",
    artist: "Tulus",
    youtubeId: "vBksZKF4lUg",
    createdAt: "2025-12-28T00:00:00.000Z",
    lyrics: `{title: Tentang Seseorang}
{artist: Tulus}
{key: G}

{start_of_verse}
[G]Aku pernah [D]menyukai seseorang
[Em]Tapi dia [C]tak tahu
[G]Bukan karena [D]aku tak berani
[Em]Tapi karena [C]situasi
{end_of_verse}

{start_of_chorus}
[G]Tentang seseorang yang [D]ku kenal
[Em]Entah bagaimana cara [C]mengungkapkan
[G]Ku hanya bisa [D]berharap
[Em]Suatu hari kau [C]tahu
{end_of_chorus}

{start_of_bridge}
[Am]Mungkin ini [D]bukan waktunya
[G]Untuk ku [C]katakan
[Am]Tapi hati [D]ku berkata
[Em]Jangan [C]terlambat
{end_of_bridge}

{start_of_chorus}
[G]Tentang seseorang yang [D]ku kenal
[Em]Entah bagaimana cara [C]mengungkapkan
[G]Ku hanya bisa [D]berharap
[Em]Suatu hari kau [C]tahu[G]
{end_of_chorus}`
  }
];

export const initialSetLists = [
  {
    id: 1,
    name: "Favorit Saya",
    songs: [1, 2, 3, 4, 5, 6],
    createdAt: "2025-12-28T00:00:00.000Z"
  },
  {
    id: 2,
    name: "Lagu Romantis",
    songs: [1, 2],
    createdAt: "2025-12-28T00:00:00.000Z"
  }
];

// Additional sample songs (original examples)
initialSongs.push(
  {
    id: 4,
    title: "Mentari Senja",
    artist: "Contoh Band",
    youtubeId: "",
    createdAt: "2026-01-02T00:00:00.000Z",
    melody: "5 5 6 5 | 3 3 2 1 |",
    lyrics: `{title: Mentari Senja}
{artist: Contoh Band}
{key: G}

{start_of_verse}
[G]Mentari [Em]senja turun perlahan
[C]Menyentuh hati yang [D]rindu
[G]Kau dan aku [Em]di bawah langit
[C]Berjanji tuk [D]tak berpaling
{end_of_verse}

{start_of_chorus}
[G]Bersamamu [Em]sampai pagi
[C]Sampai hati tak [D]lagi resah
[G]Pegang tanganku [Em]jangan lepas
[C]Mari kita [D]jalani
{end_of_chorus}`
  }
);

initialSongs.push(
  {
    id: 5,
    title: "Jalan Pulang",
    artist: "Solo Artist",
    youtubeId: "",
    createdAt: "2026-01-02T00:00:00.000Z",
    melody: "1 2 3 - | 3 2 1 - |",
    lyrics: `{title: Jalan Pulang}
{artist: Solo Artist}
{key: Am}

{start_of_verse}
[Am]Di ujung jalan ku [F]melangkah pelan
[C]Mencari arah yang [G]tetap
[Am]Setiap langkah [F]ingatkan kamu
[C]Suara hatiku [G]yang rindu
{end_of_verse}

{start_of_chorus}
[F]Akhirnya ku [C]temukan jalan
[G]Yang membawaku [Am]kembali
[F]Kau tempat ku [C]berlabuh
[G]Rumah di hatiku [Am]
{end_of_chorus}`
  }
);

initialSongs.push(
  {
    id: 6,
    title: "Pelangi Kecil",
    artist: "Anak Kota",
    youtubeId: "",
    createdAt: "2026-01-02T00:00:00.000Z",
    melody: "3 3 2 1 | 1 1 - - |",
    lyrics: `{title: Pelangi Kecil}
{artist: Anak Kota}
{key: C}

{start_of_verse}
[C]Pelangi [Am]kecil di [F]atap rumah
[C]Warna warni [G]ceritakan harap
[C]Anak-anak [Am]tertawa [F]riang
[C]Langit pun [G]bersama
{end_of_verse}

{start_of_chorus}
[C]Mari [Am]berbagi [F]cerita
[C]Di bawah [G]pelangi kecil
[C]Lutut [Am]basah [F]tanpa [C]takut
{end_of_chorus}`
  }
);
