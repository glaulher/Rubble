-- Migration 028: preenche mercado dos hubs que ficaram NULL devido ao
-- mismatch entre local='HUB BANGU - RJBGU02' e o UPDATE do 019 que usava 'BGU02DTC'
UPDATE equipamentos SET mercado = 'Residencial'
WHERE (mercado IS NULL OR mercado = '')
  AND local LIKE 'HUB %';
