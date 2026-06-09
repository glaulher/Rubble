-- Migration 027: preenche local_scm dos hubs que estao NULL (conforme banco local)
UPDATE equipamentos
SET local_scm = CASE local
    WHEN 'HUB BANGU - RJBGU02' THEN 'BGU02DTC'
    WHEN 'HUB BARRADAS - NITB9DTC' THEN 'NITB9DTC'
    WHEN 'HUB PAVUNA - RJPAV11' THEN 'PAV11DTC'
    WHEN 'HUB ROCHA MIRANDA - RJPAV71' THEN 'PAV71DTC'
    WHEN 'HUB SANTA CRUZ - RJSCZ16' THEN 'SCZ16DTC'
END
WHERE (local_scm IS NULL OR local_scm = '')
  AND local != 'Fornecimento';
