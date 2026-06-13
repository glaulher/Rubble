-- 010_add_scm_tables.sql
-- Migration: Adiciona tela SCM Status

-- 1. Nova coluna em equipamentos para mapeamento SCM
ALTER TABLE equipamentos ADD COLUMN local_scm VARCHAR(100) DEFAULT NULL;

-- 2. Tabela scm (dados importados da planilha)
CREATE TABLE scm (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    scm             VARCHAR(100) NOT NULL,
    data            DATE,
    atividade       TEXT,
    site            VARCHAR(100),
    cidade          VARCHAR(100),
    unidade         VARCHAR(50),
    valor           DECIMAL(10,2),
    subtotal_execucao DECIMAL(10,2),
    data_execucao   DATE,
    data_validacao  DATE,
    medicao         VARCHAR(100),
    origem          VARCHAR(100),
    segmento        VARCHAR(100),
    abertura        VARCHAR(100),
    status          VARCHAR(50),
    servico         TEXT,
    obs             TEXT,
    equipamento_id  INT DEFAULT NULL,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY idx_scm_code (scm),
    KEY idx_scm_equipamento (equipamento_id),
    KEY idx_scm_status (status),
    KEY idx_scm_site (site),
    CONSTRAINT fk_scm_equipamento FOREIGN KEY (equipamento_id) REFERENCES equipamentos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Mapeamentos conhecidos (local → local_scm)
UPDATE equipamentos SET local_scm = 'HUB RECREIO' WHERE local = 'RJOREC';
UPDATE equipamentos SET local_scm = 'HUB RAMOS' WHERE local = 'RJORMS';
UPDATE equipamentos SET local_scm = 'HEADEND RESENDE' WHERE local = 'RSDDTC';
UPDATE equipamentos SET local_scm = 'RJO-GS' WHERE local = 'RJOGS';
UPDATE equipamentos SET local_scm = 'RJO-TP' WHERE local = 'RJOTP';
UPDATE equipamentos SET local_scm = 'HUB BARRA MANSA' WHERE local = 'BMADTC';
UPDATE equipamentos SET local_scm = 'BGU02DTC' WHERE local = 'HUB BANGU';
UPDATE equipamentos SET local_scm = 'HUB PIAUI' WHERE local = 'RJOPIA';
UPDATE equipamentos SET local_scm = 'HEADEND SAO GONCALO' WHERE local = 'SGODTC';
UPDATE equipamentos SET local_scm = 'HUB TERESOPOLIS' WHERE local = 'TRLDTC';
UPDATE equipamentos SET local_scm = 'RJMIR91' WHERE local = 'RJMIR91';
UPDATE equipamentos SET local_scm = 'SCZ16DTC' WHERE local = 'SCZ16DTC';
UPDATE equipamentos SET local_scm = 'HUB PETROPOLIS' WHERE local = 'PTSDTC';
UPDATE equipamentos SET local_scm = 'NRIOCE' WHERE local = 'NITC2DTC';
UPDATE equipamentos SET local_scm = 'NITB9DTC' WHERE local = 'HUB BARRADAS';
UPDATE equipamentos SET local_scm = 'HEADEND FREGUESIA' WHERE local = 'RJOFRG';
UPDATE equipamentos SET local_scm = 'PAV11DTC' WHERE local = 'HUB PAVUNA';
UPDATE equipamentos SET local_scm = 'HUB MACAE' WHERE local = 'MCEDTC';
UPDATE equipamentos SET local_scm = 'HUB NITEROI' WHERE local = 'NRIDTC';
UPDATE equipamentos SET local_scm = 'RJO EN' WHERE local = 'RJOEN';
UPDATE equipamentos SET local_scm = 'HUB BOTAFOGO' WHERE local = 'RJOBOT';
UPDATE equipamentos SET local_scm = 'HUB MESQUITA' WHERE local = 'MESQDTC';
UPDATE equipamentos SET local_scm = 'HUB CAMPOS DOS GOYTACAZES' WHERE local = 'CPDGDTC';
UPDATE equipamentos SET local_scm = 'RJO-CRT' WHERE local = 'RJOCRT';
UPDATE equipamentos SET local_scm = 'HUB ZONA SUL' WHERE local = 'RJOMNB';
UPDATE equipamentos SET local_scm = 'PAV71DTC' WHERE local = 'HUB ROCHA MIRANDA';
UPDATE equipamentos SET local_scm = 'HUB CAMPO GRANDE' WHERE local = 'RJOCPG';
UPDATE equipamentos SET local_scm = 'HUB SULACAP' WHERE local = 'RJOSLC';
UPDATE equipamentos SET local_scm = 'RJOBPI' WHERE local = 'RJOBPI';
UPDATE equipamentos SET local_scm = 'HUB TIJUCA' WHERE local = 'RJOTIJ';
UPDATE equipamentos SET local_scm = 'MCE-BC' WHERE local = 'MCEBC';
UPDATE equipamentos SET local_scm = 'RJDQC91' WHERE local = 'RJDQC91';
UPDATE equipamentos SET local_scm = 'CPS-CL' WHERE local = 'CPSCL';
UPDATE equipamentos SET local_scm = 'TNG-BR' WHERE local = 'TNGBR';
UPDATE equipamentos SET local_scm = 'VTA-JM' WHERE local = 'VTAJM';
UPDATE equipamentos SET local_scm = 'HEADEND SERRA' WHERE local = 'SEADTC';
UPDATE equipamentos SET local_scm = 'HUB VITORIA' WHERE local = 'VTADTC';
UPDATE equipamentos SET local_scm = 'HUB VILA VELHA' WHERE local = 'VVADTC';
UPDATE equipamentos SET local_scm = 'VTA-OCT' WHERE local = 'VTA OCT';
UPDATE equipamentos SET local_scm = 'VTA-ARB' WHERE local = 'VTA ARB';
