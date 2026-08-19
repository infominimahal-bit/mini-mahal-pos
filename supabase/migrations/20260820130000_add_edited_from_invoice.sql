-- Traceability for bill edits: link an edited (corrected) sale back to the
-- original invoice it replaced. The edit flow is two-phase (reverse old sale,
-- create corrected sale with a NEW invoice). This column records the original
-- invoice number on the corrected sale so the UI can show "Edited from #X"
-- and the product stock history can label the movements as an edit.
ALTER TABLE sales ADD COLUMN IF NOT EXISTS edited_from_invoice text;
