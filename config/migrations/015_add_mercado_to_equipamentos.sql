-- config/migrations/015_add_mercado_to_equipamentos.sql
-- Adiciona coluna 'mercado' a equipamentos e popula com base no 'local'

ALTER TABLE equipamentos ADD COLUMN mercado VARCHAR(50) DEFAULT NULL AFTER local_scm;

-- Residencial
UPDATE equipamentos SET mercado = 'Residencial' WHERE local IN (
    'RSDDTC','BMADTC','TRLDTC','PTSDTC','NRIDTC','SGODTC','RJORMS','RJOMNB',
    'RJOCPG','RJOSLC','RJOPIA','RJOBOT','RJOTIJ','RJOREC','RJOFRG','CPDGDTC',
    'MCEDTC','MESQDTC','VTADTC','VVADTC','SEADTC','RJOBPI','NITC2DTC',
    'PAV11DTC','BGU02DTC','PAV71DTC','SCZ16DTC','NITB9DTC','VTA OCT','VTA ARB'
);

-- Empresarial (com e sem hífen)
UPDATE equipamentos SET mercado = 'Empresarial' WHERE local IN (
    'VTA-JM','VTAJM','RJO-GS','RJOGS','RJOEN','RJO-CRT','RJOCRT',
    'RJO-TP','RJOTP','MCE-BC','MCEBC','CPS-CL','CPSCL','TNG-BR','TNGBR'
);

-- Pessoal
UPDATE equipamentos SET mercado = 'Pessoal' WHERE local IN (
    'RJMIR91','RJDQC91'
);
