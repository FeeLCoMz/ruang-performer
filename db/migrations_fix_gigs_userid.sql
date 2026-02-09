-- Migrasi gigs: copy createdBy ke userId jika userId kosong
UPDATE gigs SET userId = createdBy WHERE userId IS NULL OR userId = '';
-- (Optional) Hapus kolom createdBy jika tidak diperlukan
-- ALTER TABLE gigs DROP COLUMN createdBy;