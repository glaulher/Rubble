-- Migration 021: Insert PVs RJOMNB (260175-260180)
-- Deploy: docker exec -i rubble-db mariadb -u root -pSENHA manutencao < config/migrations/021_insert_pv_rjomnb.sql

-- Fix RAL for existing PVs (local dev has ral=0)
UPDATE pv SET ral = '14431506' WHERE numero_pv IN ('260175', '260176') AND (ral = '0' OR ral IS NULL OR ral = '');

-- Parent PVs
INSERT IGNORE INTO pv (numero_pv, data, ciclo, local, ral, equipamento_id)
VALUES
('260175', '2026-06-05', '2026-06', 'RJOMNB', '14431506',
    (SELECT id FROM equipamentos WHERE equipamento = 'SELF 02' AND local = 'RJOMNB' AND localidade = 'SUBESTAÇÃO' LIMIT 1)),
('260176', '2026-06-05', '2026-06', 'RJOMNB', '14431506',
    (SELECT id FROM equipamentos WHERE equipamento = 'SELF 01' AND local = 'RJOMNB' AND localidade = 'SUBESTAÇÃO' LIMIT 1)),
('260177', '2026-06-05', '2026-06', 'RJOMNB', '14431506',
    (SELECT id FROM equipamentos WHERE equipamento = 'SELF SPLIT 01' AND local = 'RJOMNB' LIMIT 1)),
('260178', '2026-06-05', '2026-06', 'RJOMNB', '14431506',
    (SELECT id FROM equipamentos WHERE equipamento = 'SELF SPLIT 02' AND local = 'RJOMNB' LIMIT 1)),
('260179', '2026-06-05', '2026-06', 'RJOMNB', '14431506',
    (SELECT id FROM equipamentos WHERE equipamento = 'SELF SPLIT 03' AND local = 'RJOMNB' LIMIT 1)),
('260180', '2026-06-05', '2026-06', 'RJOMNB', '14431506',
    (SELECT id FROM equipamentos WHERE equipamento = 'SELF SPLIT 04' AND local = 'RJOMNB' LIMIT 1));

-- PV Items: SELF 01/02 use 650X470X25mm
INSERT IGNORE INTO pv_item (pv_id, numero_item, lpu_origem, descricao_lpu, descricao, quantidade, valor, valor_total, fatura, status)
SELECT p.id, 66, 'lpu_material_clima', 'FILTRO DE AR DESCARTAVEL G4 0.5M2', '650X470X25mm', 2, 143.55, 287.10, 'lpu', 'Aguardando envio'
FROM pv p
WHERE p.numero_pv IN ('260175', '260176')
  AND NOT EXISTS (SELECT 1 FROM pv_item pi WHERE pi.pv_id = p.id AND pi.numero_item = 66);

-- PV Items: SELF SPLIT 01-04 use 565X430X50mm
INSERT IGNORE INTO pv_item (pv_id, numero_item, lpu_origem, descricao_lpu, descricao, quantidade, valor, valor_total, fatura, status)
SELECT p.id, 66, 'lpu_material_clima', 'FILTRO DE AR DESCARTAVEL G4 0.5M2', '565X430X50mm', 2, 143.55, 287.10, 'lpu', 'Aguardando envio'
FROM pv p
WHERE p.numero_pv IN ('260177', '260178', '260179', '260180')
  AND NOT EXISTS (SELECT 1 FROM pv_item pi WHERE pi.pv_id = p.id AND pi.numero_item = 66);
