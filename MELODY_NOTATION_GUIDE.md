# 🎵 Panduan Format Not Angka Melodi

## Format Input Melodi

Aplikasi ini mendukung input melodi dalam format not angka. Berikut panduan lengkapnya:

### Format Dasar

```
1 2 3 4 | 5 5 6 5 | 4 3 2 1 |
```

- **Angka 1-7**: Mewakili tingkat nada (do, re, mi, fa, sol, la, si)
- **Spasi**: Memisahkan setiap not
- **|**: Garis bar (pemisah birama)

### Oktaf

- **Titik (.)**: Not rendah/oktaf bawah
  ```
  1. 2. 3. 4. | 5 6 7 1 |
  ```
  Contoh: `1.` = do rendah

- **Apostrof (')**: Not tinggi/oktaf atas
  ```
  5 6 7 1' | 2' 3' 4' 5' |
  ```
  Contoh: `1'` = do tinggi

### Durasi Not

- **Tanpa tanda**: Not standar (1 ketukan)
  ```
  1 2 3 4 |
  ```

- **Tanda minus (-)**: Not panjang
  ```
  1-- 2-- | 3--- 4 |
  ```
  - `1-` = 2 ketukan
  - `1--` = 3 ketukan
  - `1---` = 4 ketukan

### Aksidental

- **Kres (#)**: Nada naik setengah
  ```
  1# 2# 3 4# |
  ```

- **Mol (b)**: Nada turun setengah
  ```
  2b 3 4 5b |
  ```

### Tanda Istirahat

- **Minus (-) atau underscore (_)**: Istirahat
  ```
  1 2 - 4 | _ 6 7 1 |
  ```

### Kualitas Not

- **m**: Minor (opsional, untuk notasi khusus)
  ```
  1 2m 3 4 |
  ```

## Contoh Lengkap

### Contoh 1: Melodi Sederhana
```
1 2 3 4 | 5 5 6 5 | 4 3 2 1 |
```

### Contoh 2: Dengan Oktaf Berbeda
```
1. 2. 3 4 | 5 6 7 1' | 2' 1' 7 6 | 5 - - - |
```

### Contoh 3: Dengan Durasi Panjang
```
1-- 2 3 | 4-- 5 6 | 7--- - | 1--- - |
```

### Contoh 4: Dengan Aksidental
```
1 2 3# 4 | 5 6b 7 1' | 2'# 1' 7b 6 |
```

### Contoh 5: Lengkap (Kasih Putih)
```
5 5 5 3 5 | 6 5 3 2 1 | 5 5 5 3 5 | 6 5 3 2 |
```

## Cara Menggunakan

1. **Buka Form Edit Lagu**: Klik tombol edit pada lagu yang ingin ditambahkan melodi
2. **Isi Field "Melodi Not Angka"**: Masukkan melodi dengan format di atas
3. **Simpan**: Klik "Update Lagu"
4. **Tampilkan Partitur**: 
   - Klik tombol "🎼 Tampilkan Partitur"
   - Pilih tampilan: Not Angka, Not Balok, atau Keduanya
5. **Transpose**: Fitur transpose otomatis bekerja pada partitur melodi

## Tips

- ✅ Gunakan spasi untuk memisahkan not
- ✅ Gunakan | untuk menandai akhir bar/birama
- ✅ Untuk not panjang, tambahkan - sesuai durasi
- ✅ Titik (.) untuk not rendah, apostrof (') untuk not tinggi
- ✅ Melodi akan otomatis ter-transpose sesuai chord

## Tampilan

### Not Angka
Menampilkan angka 1-7 dengan nama solfege (do, re, mi, dst) dalam format visual yang mudah dibaca.

### Not Balok
Menampilkan melodi dalam bentuk not balok dengan treble clef (𝄞) pada staff lines, lengkap dengan indikator oktaf dan durasi.

### Keduanya
Menampilkan not angka dan not balok secara bersamaan untuk pembelajaran yang lebih lengkap.

## Batasan & Catatan

- Format ini fokus pada melodi vokal/instrumen melodi utama
- Transpose bekerja dalam skala diatonis (1-7)
- Not balok ditampilkan dengan treble clef
- Durasi visual pada not balok: ● (quarter), ◐ (half), ○ (whole)

## Contoh Lagu yang Sudah Ada Melodinya

1. **Kasih Putih** - Glenn Fredly
   ```
   5 5 5 3 5 | 6 5 3 2 1 | 5 5 5 3 5 | 6 5 3 2 |
   ```

2. **Sempurna** - Andra and The Backbone
   ```
   2 2 3 5 | 6 5 3 2 | 1 1 2 3 | 2 1 - - |
   ```
