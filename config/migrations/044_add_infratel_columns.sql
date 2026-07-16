-- Migration 044: Add site_infratel and tag_infratel to equipamentos
-- Generated from CLIMA_20260907_preenchida.xlsx

ALTER TABLE equipamentos
  ADD COLUMN site_infratel VARCHAR(100) DEFAULT NULL AFTER `mercado`,
  ADD COLUMN tag_infratel VARCHAR(255) DEFAULT NULL AFTER `site_infratel`;

UPDATE equipamentos
  SET site_infratel = 'BMADTC',
      tag_infratel = 'CLIMA - 01 / SPRINGER CARRIER - SILENTIA'
  WHERE local = 'BMADTC'
    AND equipamento = 'ACJ 01'
    AND ROUND(capacidade, 2) = 2.00;

UPDATE equipamentos
  SET site_infratel = 'BMADTC',
      tag_infratel = 'CLIMA - 02 / SPRINGER - MUNDIAL'
  WHERE local = 'BMADTC'
    AND equipamento = 'ACJ 02'
    AND ROUND(capacidade, 2) = 2.00;

UPDATE equipamentos
  SET site_infratel = 'CPDGDTC',
      tag_infratel = 'CLIMA - CD-01 / TRANE | CLIMA - EV-01 / TRANE'
  WHERE local = 'CPDGDTC'
    AND equipamento = 'SELF SPLIT 01'
    AND ROUND(capacidade, 2) = 20.00;

UPDATE equipamentos
  SET site_infratel = 'CPDGDTC',
      tag_infratel = 'CLIMA - CD-02 / TRANE | CLIMA - EV-02 / TRANE'
  WHERE local = 'CPDGDTC'
    AND equipamento = 'SELF SPLIT 02'
    AND ROUND(capacidade, 2) = 20.00;

UPDATE equipamentos
  SET site_infratel = 'CPDGDTC',
      tag_infratel = 'CLIMA - CD-03 / TRANE | CLIMA - EV-03 / TRANE'
  WHERE local = 'CPDGDTC'
    AND equipamento = 'SELF SPLIT 03'
    AND ROUND(capacidade, 2) = 20.00;

UPDATE equipamentos
  SET site_infratel = 'CPS CL',
      tag_infratel = 'CLIMA - CHILLER 01 / CARRIER'
  WHERE local = 'CPSCL'
    AND equipamento = 'CHILLER 1'
    AND ROUND(capacidade, 2) = 65.00;

UPDATE equipamentos
  SET site_infratel = 'CPS CL',
      tag_infratel = 'CLIMA - CHILLER 02 / CARRIER'
  WHERE local = 'CPSCL'
    AND equipamento = 'CHILLER 2'
    AND ROUND(capacidade, 2) = 65.00;

UPDATE equipamentos
  SET site_infratel = 'BGU02DTC',
      tag_infratel = 'CLIMA - ARCON 01'
  WHERE local = 'HUB BANGU - RJBGU02'
    AND equipamento = 'WM 01'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'BGU02DTC',
      tag_infratel = 'CLIMA - ARCON 02'
  WHERE local = 'HUB BANGU - RJBGU02'
    AND equipamento = 'WM 02'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'BGU02DTC',
      tag_infratel = 'CLIMA - ARCON 03'
  WHERE local = 'HUB BANGU - RJBGU02'
    AND equipamento = 'WM 03'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'NITB9DTC',
      tag_infratel = 'CLIMA - WM-CA1'
  WHERE local = 'HUB BARRADAS - NITB9DTC'
    AND equipamento = 'WM 01'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'NITB9DTC',
      tag_infratel = 'CLIMA - WM-CA3'
  WHERE local = 'HUB BARRADAS - NITB9DTC'
    AND equipamento = 'WM 01'
    AND ROUND(capacidade, 2) = 3.00;

UPDATE equipamentos
  SET site_infratel = 'NITB9DTC',
      tag_infratel = 'CLIMA - WM-CA2'
  WHERE local = 'HUB BARRADAS - NITB9DTC'
    AND equipamento = 'WM 02'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'PAV11DTC',
      tag_infratel = 'CLIMA - ARCON 01'
  WHERE local = 'HUB PAVUNA - RJPAV11'
    AND equipamento = 'WM 01'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'PAV11DTC',
      tag_infratel = 'CLIMA - ARCON 02'
  WHERE local = 'HUB PAVUNA - RJPAV11'
    AND equipamento = 'WM 02'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'PAV11DTC',
      tag_infratel = 'CLIMA - ARCON 03'
  WHERE local = 'HUB PAVUNA - RJPAV11'
    AND equipamento = 'WM 03'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'PAV71DTC',
      tag_infratel = 'CLIMA - ARCON 01'
  WHERE local = 'HUB ROCHA MIRANDA - RJPAV71'
    AND equipamento = 'WM 01'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'PAV71DTC',
      tag_infratel = 'CLIMA - ARCON 02'
  WHERE local = 'HUB ROCHA MIRANDA - RJPAV71'
    AND equipamento = 'WM 02'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'PAV71DTC',
      tag_infratel = 'CLIMA - ARCON 03'
  WHERE local = 'HUB ROCHA MIRANDA - RJPAV71'
    AND equipamento = 'WM 03'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'RJO SCZ',
      tag_infratel = 'CLIMA - ARCON 01'
  WHERE local = 'HUB SANTA CRUZ - RJSCZ16'
    AND equipamento = 'WM 01'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'RJO SCZ',
      tag_infratel = 'CLIMA - ARCON02'
  WHERE local = 'HUB SANTA CRUZ - RJSCZ16'
    AND equipamento = 'WM 02'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'MCE CV',
      tag_infratel = 'CLIMA - CHILLER 01 / CARRIER'
  WHERE local = 'MCEBC'
    AND equipamento = 'CHILLER 1'
    AND ROUND(capacidade, 2) = 120.00;

UPDATE equipamentos
  SET site_infratel = 'MCE CV',
      tag_infratel = 'CLIMA - CHILLER 02 / CARRIER'
  WHERE local = 'MCEBC'
    AND equipamento = 'CHILLER 2'
    AND ROUND(capacidade, 2) = 120.00;

UPDATE equipamentos
  SET site_infratel = 'MCEDTC',
      tag_infratel = 'CLIMA - EV-01 / Springer Carrier | CLIMA - CD-01 / Springer Carrier'
  WHERE local = 'MCEDTC'
    AND equipamento = 'SELF SPLIT 01'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'MCEDTC',
      tag_infratel = 'CLIMA - EV-02 / Springer Carrier | CLIMA - CD-02 / Springer Carrier'
  WHERE local = 'MCEDTC'
    AND equipamento = 'SELF SPLIT 02'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'MCEDTC',
      tag_infratel = 'CLIMA - SPLIT 01 - CD / WESTRIC | CLIMA - SPLIT 01 - EV / WESTRIC'
  WHERE local = 'MCEDTC'
    AND equipamento = 'SPLIT 01'
    AND ROUND(capacidade, 2) = 3.00;

UPDATE equipamentos
  SET site_infratel = 'MCEDTC',
      tag_infratel = 'CLIMA - SPLIT 01 - CD / WESTRIC | CLIMA - SPLIT 01 - EV / WESTRIC'
  WHERE local = 'MCEDTC'
    AND equipamento = 'SPLIT 02'
    AND ROUND(capacidade, 2) = 3.00;

UPDATE equipamentos
  SET site_infratel = 'MCEDTC',
      tag_infratel = 'CLIMA - WM-01 / CARRIER'
  WHERE local = 'MCEDTC'
    AND equipamento = 'WM 01'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'MCEDTC',
      tag_infratel = 'CLIMA - WM-02 / CARRIER'
  WHERE local = 'MCEDTC'
    AND equipamento = 'WM 02'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'MCEDTC',
      tag_infratel = 'CLIMA - WM-03 / CARRIER'
  WHERE local = 'MCEDTC'
    AND equipamento = 'WM 03'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'MCEDTC',
      tag_infratel = 'CLIMA - WM - 04 / CARRIER'
  WHERE local = 'MCEDTC'
    AND equipamento = 'WM 04'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'MCEDTC',
      tag_infratel = 'CLIMA - WM - 05 / CARRIER'
  WHERE local = 'MCEDTC'
    AND equipamento = 'WM 05'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'MESQDTC',
      tag_infratel = 'CLIMA - CD-01 / TRANE | CLIMA - EV-01 / TRANE'
  WHERE local = 'MESQDTC'
    AND equipamento = 'SELF SPLIT 01'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'MESQDTC',
      tag_infratel = 'CLIMA - CD-02 / TRANE | CLIMA - EV-02 / TRANE'
  WHERE local = 'MESQDTC'
    AND equipamento = 'SELF SPLIT 02'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'MESQDTC',
      tag_infratel = 'CLIMA - CD-03 / TRANE | CLIMA - EV-03 / TRANE'
  WHERE local = 'MESQDTC'
    AND equipamento = 'SELF SPLIT 03'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'MESQDTC',
      tag_infratel = 'CLIMA - CD-04 / TRANE | CLIMA - EV-04 / TRANE'
  WHERE local = 'MESQDTC'
    AND equipamento = 'SELF SPLIT 04'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'MESQDTC',
      tag_infratel = 'Sem cadastro de relatório'
  WHERE local = 'MESQDTC'
    AND equipamento = 'SPLIT 01'
    AND ROUND(capacidade, 2) = 1.00;

UPDATE equipamentos
  SET site_infratel = 'MESQDTC',
      tag_infratel = 'Sem cadastro de relatório'
  WHERE local = 'MESQDTC'
    AND equipamento = 'SPLIT 02'
    AND ROUND(capacidade, 2) = 1.00;

UPDATE equipamentos
  SET site_infratel = 'MESQDTC',
      tag_infratel = 'CLIMA - SPLIT / STANK (SL UPS)'
  WHERE local = 'MESQDTC'
    AND equipamento = 'SPLIT BUILT IN 01'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'MESQDTC',
      tag_infratel = 'CLIMA - SPLIT-01 / CARRIER'
  WHERE local = 'MESQDTC'
    AND equipamento = 'SPLIT BUILT IN 02'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'MESQDTC',
      tag_infratel = 'CLIMA - SPLIT-02 / CARRIER'
  WHERE local = 'MESQDTC'
    AND equipamento = 'SPLIT BUILT IN 03'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'NITC2DTC',
      tag_infratel = 'CLIMA - MAQUINA 1'
  WHERE local = 'NITC2DTC'
    AND equipamento = 'SELF CONTAINED 01'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'NITC2DTC',
      tag_infratel = 'CLIMA - MAQUINA 2'
  WHERE local = 'NITC2DTC'
    AND equipamento = 'SELF CONTAINED 02'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'NITC2DTC',
      tag_infratel = 'CLIMA - MAQUINA 3'
  WHERE local = 'NITC2DTC'
    AND equipamento = 'SELF CONTAINED 03'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'NRIDTC',
      tag_infratel = 'CLIMA - SPLIT 1 SALA DE UPS'
  WHERE local = 'NRIDTC'
    AND equipamento = 'SELF SPLIT'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'NRIDTC',
      tag_infratel = 'CLIMA - SPLIT 2 SALA DE UPS'
  WHERE local = 'NRIDTC'
    AND equipamento = 'SELF SPLIT'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'NRIDTC',
      tag_infratel = 'CLIMA - CD-01 SALA DE EQUIPAMENTOS | CLIMA - EV-01 SALA DE EQUIPAMENTOS'
  WHERE local = 'NRIDTC'
    AND equipamento = 'SELF SPLIT 01'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'NRIDTC',
      tag_infratel = 'CLIMA - CD-02 SALA DE EQUIPAMENTOS | CLIMA - EV-02 SALA DE EQUIPAMENTOS'
  WHERE local = 'NRIDTC'
    AND equipamento = 'SELF SPLIT 02'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'NRIDTC',
      tag_infratel = 'CLIMA - CD-03 SALA DE EQUIPAMENTOS | CLIMA - EV-03 SALA DE EQUIPAMENTOS'
  WHERE local = 'NRIDTC'
    AND equipamento = 'SELF SPLIT 03'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'PTSDTC',
      tag_infratel = 'CLIMA - CD-01 / TRANE / SALA DE EQUIPAMENTOS | CLIMA - EV-01 / TRANE / SALA DE EQUIPAMENTOS'
  WHERE local = 'PTSDTC'
    AND equipamento = 'SELF SPLIT 01'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'PTSDTC',
      tag_infratel = 'CLIMA - SPLIT SALA TÉCNICA - ESCRITÓRIO'
  WHERE local = 'PTSDTC'
    AND equipamento = 'SELF SPLIT 01'
    AND ROUND(capacidade, 2) = 0.75;

UPDATE equipamentos
  SET site_infratel = 'PTSDTC',
      tag_infratel = 'CLIMA - SPLIT COPA - COZINHA'
  WHERE local = 'PTSDTC'
    AND equipamento = 'SELF SPLIT 01'
    AND ROUND(capacidade, 2) = 0.75;

UPDATE equipamentos
  SET site_infratel = 'PTSDTC',
      tag_infratel = 'CLIMA - CD-02 / TRANE / SALA DE EQUIPAMENTOS | CLIMA - EV-02 / TRANE / SALA DE EQUIPAMENTOS'
  WHERE local = 'PTSDTC'
    AND equipamento = 'SELF SPLIT 02'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'RJDQC91',
      tag_infratel = 'CLIMA - CHILLER 01 / HITACHI'
  WHERE local = 'RJDQC91'
    AND equipamento = 'CHILLER 1'
    AND ROUND(capacidade, 2) = 100.00;

UPDATE equipamentos
  SET site_infratel = 'RJDQC91',
      tag_infratel = 'CLIMA - CHILLER 02 / HITACHI'
  WHERE local = 'RJDQC91'
    AND equipamento = 'CHILLER 2'
    AND ROUND(capacidade, 2) = 100.00;

UPDATE equipamentos
  SET site_infratel = 'RJMIR91',
      tag_infratel = 'CLIMA - CHILLER_GRA 1C'
  WHERE local = 'RJMIR91'
    AND equipamento = 'CHILLER 1'
    AND ROUND(capacidade, 2) = 80.00;

UPDATE equipamentos
  SET site_infratel = 'RJMIR91',
      tag_infratel = 'CLIMA - CHILLER_GRA 1B'
  WHERE local = 'RJMIR91'
    AND equipamento = 'CHILLER 2'
    AND ROUND(capacidade, 2) = 80.00;

UPDATE equipamentos
  SET site_infratel = 'RJMIR91',
      tag_infratel = 'CLIMA - CHILLER_GRA 1A'
  WHERE local = 'RJMIR91'
    AND equipamento = 'CHILLER 3'
    AND ROUND(capacidade, 2) = 80.00;

UPDATE equipamentos
  SET site_infratel = 'RJOBOT',
      tag_infratel = 'CLIMA - EVAP. IN-ROW - 01 - SALA DE EQUIPAMENTO | CLIMA - COND. IN-ROW - 01 - SALA DE EQUIPAMENTO'
  WHERE local = 'RJOBOT'
    AND equipamento = 'IN-ROW 01'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'RJOBOT',
      tag_infratel = 'CLIMA - EVAP. IN-ROW - 02 - SALA DE EQUIPAMENTO | CLIMA - COND. IN-ROW - 02 - SALA DE EQUIPAMENTO'
  WHERE local = 'RJOBOT'
    AND equipamento = 'IN-ROW 02'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'RJOBOT',
      tag_infratel = 'CLIMA - CD-01 / TRANE / SALA DE EQUIPAMENTOS | CLIMA - EV-01 / TRANE / SALA DE EQUIPAMENTOS'
  WHERE local = 'RJOBOT'
    AND equipamento = 'SELF SPLIT 01'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'RJOBOT',
      tag_infratel = 'CLIMA - CD-02 / TRANE / SALA DE EQUIPAMENTOS | CLIMA - EV-02 / TRANE / SALA DE EQUIPAMENTOS'
  WHERE local = 'RJOBOT'
    AND equipamento = 'SELF SPLIT 02'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'RJOBOT',
      tag_infratel = 'CLIMA - CD-03 / TRANE / SALA DE EQUIPAMENTOS | CLIMA - EV-03 / TRANE / SALA DE EQUIPAMENTOS'
  WHERE local = 'RJOBOT'
    AND equipamento = 'SELF SPLIT 03'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'RJOBOT',
      tag_infratel = 'CLIMA - CD-04 / TRANE / SALA DE EQUIPAMENTOS | CLIMA - EV-04 / TRANE / SALA DE EQUIPAMENTOS'
  WHERE local = 'RJOBOT'
    AND equipamento = 'SELF SPLIT 04'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'RJOBOT',
      tag_infratel = 'CLIMA - CD-01 / TRANE / SALA DE EQUIPAMENTOS | CLIMA - EVAP. IN-ROW - 01 - SALA DE EQUIPAMENTO'
  WHERE local = 'RJOBOT'
    AND equipamento = 'SPLIT 01'
    AND ROUND(capacidade, 2) = 1.00;

UPDATE equipamentos
  SET site_infratel = 'RJOBOT',
      tag_infratel = 'CLIMA - EVAP. STULZ SALA UPS | CLIMA - COND. SPLIT DA SALA DE UPS'
  WHERE local = 'RJOBOT'
    AND equipamento = 'SPLIT 01'
    AND ROUND(capacidade, 2) = 3.00;

UPDATE equipamentos
  SET site_infratel = 'RJOBOT',
      tag_infratel = 'CLIMA - EVAP. STULZ SALA UPS | CLIMA - COND. SPLIT DA SALA DE UPS'
  WHERE local = 'RJOBOT'
    AND equipamento = 'SPLIT 02'
    AND ROUND(capacidade, 2) = 3.00;

UPDATE equipamentos
  SET site_infratel = 'RJOBPI',
      tag_infratel = 'CLIMA - EVAP. 01 | CLIMA - COND. 01'
  WHERE local = 'RJOBPI'
    AND equipamento = 'SELF 01'
    AND ROUND(capacidade, 2) = 10.00;

UPDATE equipamentos
  SET site_infratel = 'RJOBPI',
      tag_infratel = 'CLIMA - EVAP. 02 | CLIMA - COND. 02'
  WHERE local = 'RJOBPI'
    AND equipamento = 'SELF 02'
    AND ROUND(capacidade, 2) = 10.00;

UPDATE equipamentos
  SET site_infratel = 'RJOBPI',
      tag_infratel = 'CLIMA - EVAP. 03 | CLIMA - COND. 03'
  WHERE local = 'RJOBPI'
    AND equipamento = 'SELF 03'
    AND ROUND(capacidade, 2) = 10.00;

UPDATE equipamentos
  SET site_infratel = 'RJOBPI',
      tag_infratel = 'CLIMA - EVAP. 04 | CLIMA - COND. 04'
  WHERE local = 'RJOBPI'
    AND equipamento = 'SELF 04'
    AND ROUND(capacidade, 2) = 10.00;

UPDATE equipamentos
  SET site_infratel = 'RJOBPI',
      tag_infratel = 'CLIMA - EVAP. 05 | CLIMA - COND. 05'
  WHERE local = 'RJOBPI'
    AND equipamento = 'SELF 05'
    AND ROUND(capacidade, 2) = 10.00;

UPDATE equipamentos
  SET site_infratel = 'RJOBPI',
      tag_infratel = 'CLIMA - EVAP. SPLIT 01 | CLIMA - COND. SPLIT 01'
  WHERE local = 'RJOBPI'
    AND equipamento = 'SPLIT 01'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'RJOBPI',
      tag_infratel = 'CLIMA - EVAP. SPLIT 02 | CLIMA - COND. SPLIT 02'
  WHERE local = 'RJOBPI'
    AND equipamento = 'SPLIT 02'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'RJOCPG',
      tag_infratel = 'CLIMA - CD-01 SALA DE EQUIPAMENTOS | CLIMA - EV-01 SALA DE EQUIPAMENTOS'
  WHERE local = 'RJOCPG'
    AND equipamento = 'SELF SPLIT 01'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'RJOCPG',
      tag_infratel = 'CLIMA - CD-02 SALA DE EQUIPAMENTOS | CLIMA - EV-02 SALA DE EQUIPAMENTOS'
  WHERE local = 'RJOCPG'
    AND equipamento = 'SELF SPLIT 02'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'RJOCPG',
      tag_infratel = 'CLIMA - CD-03 SALA DE EQUIPAMENTOS | CLIMA - EV-03 SALA DE EQUIPAMENTOS'
  WHERE local = 'RJOCPG'
    AND equipamento = 'SELF SPLIT 03'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'RJOCRT',
      tag_infratel = 'CLIMA - CHILLER 01 / CARRIER'
  WHERE local = 'RJOCRT'
    AND equipamento = 'CHILLER 1'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'RJOCRT',
      tag_infratel = 'CLIMA - GRA-1_CARRIER'
  WHERE local = 'RJOCRT'
    AND equipamento = 'CHILLER 1'
    AND ROUND(capacidade, 2) = 120.00;

UPDATE equipamentos
  SET site_infratel = 'RJOCRT',
      tag_infratel = 'CLIMA - CHILLER 02 / CARRIER'
  WHERE local = 'RJOCRT'
    AND equipamento = 'CHILLER 2'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'RJOCRT',
      tag_infratel = 'CLIMA - GRA-2_CARRIER'
  WHERE local = 'RJOCRT'
    AND equipamento = 'CHILLER 2'
    AND ROUND(capacidade, 2) = 120.00;

UPDATE equipamentos
  SET site_infratel = 'RJOCRT',
      tag_infratel = 'CLIMA - CHILLER 03 / CARRIER'
  WHERE local = 'RJOCRT'
    AND equipamento = 'CHILLER 3'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'RJOCRT',
      tag_infratel = 'CLIMA - CHILLER 04 / CARRIER'
  WHERE local = 'RJOCRT'
    AND equipamento = 'CHILLER 4'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'RJO EN',
      tag_infratel = 'CLIMA - CA-01 / CHILLER / CARRIER'
  WHERE local = 'RJOEN'
    AND equipamento = 'CHILLER 1'
    AND ROUND(capacidade, 2) = 120.00;

UPDATE equipamentos
  SET site_infratel = 'RJO EN',
      tag_infratel = 'CLIMA - CA-02 / CHILLER / TRANE'
  WHERE local = 'RJOEN'
    AND equipamento = 'CHILLER 2'
    AND ROUND(capacidade, 2) = 110.00;

UPDATE equipamentos
  SET site_infratel = 'RJO EN',
      tag_infratel = 'CLIMA - CA-03 / CHILLER / CARRIER'
  WHERE local = 'RJOEN'
    AND equipamento = 'CHILLER 3'
    AND ROUND(capacidade, 2) = 120.00;

UPDATE equipamentos
  SET site_infratel = 'RJO EN',
      tag_infratel = 'CLIMA - CA-04 / CHILLER / TRANE'
  WHERE local = 'RJOEN'
    AND equipamento = 'CHILLER 4'
    AND ROUND(capacidade, 2) = 110.00;

UPDATE equipamentos
  SET site_infratel = 'RJOFRG',
      tag_infratel = 'CLIMA - SELF-01 / TRANE / SALA DE MONITORAMENTO'
  WHERE local = 'RJOFRG'
    AND equipamento = 'SELF 01'
    AND ROUND(capacidade, 2) = 10.00;

UPDATE equipamentos
  SET site_infratel = 'RJOFRG',
      tag_infratel = 'CLIMA - SELF-02 / TRANE / SALA DE MONITORAMENTO'
  WHERE local = 'RJOFRG'
    AND equipamento = 'SELF 02'
    AND ROUND(capacidade, 2) = 10.00;

UPDATE equipamentos
  SET site_infratel = 'RJOFRG',
      tag_infratel = 'CLIMA - SELF-01 / TRANE / SALA DE EQUIPAMENTOS'
  WHERE local = 'RJOFRG'
    AND equipamento = 'SELF 01'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'RJOFRG',
      tag_infratel = 'CLIMA - SELF-02 / TRANE / SALA DE EQUIPAMENTOS'
  WHERE local = 'RJOFRG'
    AND equipamento = 'SELF 02'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'RJOFRG',
      tag_infratel = 'CLIMA - SELF-03 / TRANE / SALA DE EQUIPAMENTOS'
  WHERE local = 'RJOFRG'
    AND equipamento = 'SELF 03'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'RJOFRG',
      tag_infratel = 'CLIMA - SELF-04 / TRANE / SALA DE EQUIPAMENTOS'
  WHERE local = 'RJOFRG'
    AND equipamento = 'SELF 04'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'RJOFRG',
      tag_infratel = 'CLIMA - SELF-05 / TRANE / SALA DE EQUIPAMENTOS'
  WHERE local = 'RJOFRG'
    AND equipamento = 'SELF 05'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'RJOFRG',
      tag_infratel = 'CLIMA - SELF-06 / TRANE / SALA DE EQUIPAMENTOS'
  WHERE local = 'RJOFRG'
    AND equipamento = 'SELF 06'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'RJOFRG',
      tag_infratel = 'CLIMA - CD-01 / TRANE / SALA DE UPS | CLIMA - EV-01 / TRANE / SALA DE UPS'
  WHERE local = 'RJOFRG'
    AND equipamento = 'SELF SPLIT 01'
    AND ROUND(capacidade, 2) = 12.50;

UPDATE equipamentos
  SET site_infratel = 'RJOFRG',
      tag_infratel = 'CLIMA - CD-02 / TRANE / SALA DE UPS | CLIMA - EV-02 / TRANE / SALA DE UPS'
  WHERE local = 'RJOFRG'
    AND equipamento = 'SELF SPLIT 02'
    AND ROUND(capacidade, 2) = 12.50;

UPDATE equipamentos
  SET site_infratel = 'RJOFRG',
      tag_infratel = 'CLIMA - EV-01 / STULZ / SALA DE EQUIPAMENTOS | CLIMA - CD-01 / STULZ / SALA DE EQUIPAMENTOS'
  WHERE local = 'RJOFRG'
    AND equipamento = 'STULZ 01'
    AND ROUND(capacidade, 2) = 11.30;

UPDATE equipamentos
  SET site_infratel = 'RJOFRG',
      tag_infratel = 'CLIMA - EV-02 / STULZ / SALA DE EQUIPAMENTOS | CLIMA - CD-02 / STULZ / SALA DE EQUIPAMENTOS'
  WHERE local = 'RJOFRG'
    AND equipamento = 'STULZ 02'
    AND ROUND(capacidade, 2) = 11.30;

UPDATE equipamentos
  SET site_infratel = 'RJOFRG',
      tag_infratel = 'CLIMA - EV-03 / STULZ / SALA DE EQUIPAMENTOS | CLIMA - CD-03 / STULZ / SALA DE EQUIPAMENTOS'
  WHERE local = 'RJOFRG'
    AND equipamento = 'STULZ 03'
    AND ROUND(capacidade, 2) = 11.30;

UPDATE equipamentos
  SET site_infratel = 'RJOFRG',
      tag_infratel = 'CLIMA - EV-04 / STULZ / SALA DE EQUIPAMENTOS | CLIMA - CD-04 / STULZ / SALA DE EQUIPAMENTOS'
  WHERE local = 'RJOFRG'
    AND equipamento = 'STULZ 04'
    AND ROUND(capacidade, 2) = 11.30;

UPDATE equipamentos
  SET site_infratel = 'RJOFRG',
      tag_infratel = 'CLIMA - EV-05 / STULZ / SALA DE EQUIPAMENTOS | CLIMA - CD-05 / STULZ / SALA DE EQUIPAMENTOS'
  WHERE local = 'RJOFRG'
    AND equipamento = 'STULZ 05'
    AND ROUND(capacidade, 2) = 11.30;

UPDATE equipamentos
  SET site_infratel = 'RJOFRG',
      tag_infratel = 'CLIMA - EV-06 / STULZ / SALA DE EQUIPAMENTOS | CLIMA - CD-06 / STULZ / SALA DE EQUIPAMENTOS'
  WHERE local = 'RJOFRG'
    AND equipamento = 'STULZ 06'
    AND ROUND(capacidade, 2) = 11.30;

UPDATE equipamentos
  SET site_infratel = 'RJOFRG',
      tag_infratel = 'CLIMA - WM-01 / TRANE / SUBESTAÇÃO'
  WHERE local = 'RJOFRG'
    AND equipamento = 'WM 01'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'RJOFRG',
      tag_infratel = 'CLIMA - WM-02 / TRANE / SUBESTAÇÃO'
  WHERE local = 'RJOFRG'
    AND equipamento = 'WM 02'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'RJO GS',
      tag_infratel = 'CLIMA - 01 / YORK'
  WHERE local = 'RJOGS'
    AND equipamento = 'CHILLER 1'
    AND ROUND(capacidade, 2) = 220.00;

UPDATE equipamentos
  SET site_infratel = 'RJO GS',
      tag_infratel = 'CLIMA - 02 / YORK'
  WHERE local = 'RJOGS'
    AND equipamento = 'CHILLER 2'
    AND ROUND(capacidade, 2) = 220.00;

UPDATE equipamentos
  SET site_infratel = 'RJO GS',
      tag_infratel = 'CLIMA - 03 / YORK'
  WHERE local = 'RJOGS'
    AND equipamento = 'CHILLER 3'
    AND ROUND(capacidade, 2) = 220.00;

UPDATE equipamentos
  SET site_infratel = 'RJOMNB',
      tag_infratel = 'CLIMA - CD 01 SUBESTAÇÃO | CLIMA - EV 01/SUBESTAÇÃO'
  WHERE local = 'RJOMNB'
    AND equipamento = 'SELF 01'
    AND ROUND(capacidade, 2) = 10.00;

UPDATE equipamentos
  SET site_infratel = 'RJOMNB',
      tag_infratel = 'CLIMA - EV 01 SPLIT SALA DO HUB | CLIMA - CD 01 SALA DOHUB'
  WHERE local = 'RJOMNB'
    AND equipamento = 'SELF 01'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'RJOMNB',
      tag_infratel = 'CLIMA - CD 02 SUBESTAÇÃO | CLIMA - EV 02/SUBESTAÇÃO'
  WHERE local = 'RJOMNB'
    AND equipamento = 'SELF 02'
    AND ROUND(capacidade, 2) = 10.00;

UPDATE equipamentos
  SET site_infratel = 'RJOMNB',
      tag_infratel = 'CLIMA - EV 02 SPLIT SALA DO HUB | CLIMA - CD 02 SALA DOHUB'
  WHERE local = 'RJOMNB'
    AND equipamento = 'SELF 02'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'RJOMNB',
      tag_infratel = 'CLIMA - EV-01 / COLDEX TOSI / SALA DE EQUIPAMENTOS | CLIMA - CD-01 / COLDEX TOSI / SALA DE EQUIPAMENTOS'
  WHERE local = 'RJOMNB'
    AND equipamento = 'SELF SPLIT 01'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'RJOMNB',
      tag_infratel = 'CLIMA - EV-02 / COLDEX TOSI / SALA DE EQUIPAMENTOS | CLIMA - CD-02 / COLDEX TOSI / SALA DE EQUIPAMENTOS'
  WHERE local = 'RJOMNB'
    AND equipamento = 'SELF SPLIT 02'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'RJOMNB',
      tag_infratel = 'CLIMA - EV-03 / COLDEX TOSI / SALA DE EQUIPAMENTOS | CLIMA - CD-03 / COLDEX TOSI / SALA DE EQUIPAMENTOS'
  WHERE local = 'RJOMNB'
    AND equipamento = 'SELF SPLIT 03'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'RJOMNB',
      tag_infratel = 'CLIMA - EV-04 / COLDEX TOSI / SALA DE EQUIPAMENTOS | CLIMA - CD-04 / COLDEX TOSI / SALA DE EQUIPAMENTOS'
  WHERE local = 'RJOMNB'
    AND equipamento = 'SELF SPLIT 04'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'RJOPIA',
      tag_infratel = 'CLIMA - EV-01 / SPRINGER CARRIER / F.O *Ñ OPERACIONAL | CLIMA - CD-01 / SPRINGER-CARRIER / F.O *Ñ OPERACIONAL'
  WHERE local = 'RJOPIA'
    AND equipamento = 'SELF SPLIT 01'
    AND ROUND(capacidade, 2) = 7.50;

UPDATE equipamentos
  SET site_infratel = 'RJOPIA',
      tag_infratel = 'CLIMA - EV-01 / TRANE | CLIMA - CD-01 / TRANE'
  WHERE local = 'RJOPIA'
    AND equipamento = 'SELF SPLIT 01'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'RJOPIA',
      tag_infratel = 'CLIMA - EV-02 / SPRINGER CARRIER / F.O *Ñ OPERACIONAL | CLIMA - CD-02 / SPRINGER-CARRIER / F.O *Ñ OPERACIONAL'
  WHERE local = 'RJOPIA'
    AND equipamento = 'SELF SPLIT 02'
    AND ROUND(capacidade, 2) = 7.50;

UPDATE equipamentos
  SET site_infratel = 'RJOPIA',
      tag_infratel = 'CLIMA - EV-02 / TRANE | CLIMA - CD-02 / TRANE'
  WHERE local = 'RJOPIA'
    AND equipamento = 'SELF SPLIT 02'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'RJOPIA',
      tag_infratel = 'CLIMA - EV-03 / SPRINGER CARRIER / F.O *Ñ OPERACIONAL | CLIMA - CD-03 / SPRINGER-CARRIER / F.O *Ñ OPERACIONAL'
  WHERE local = 'RJOPIA'
    AND equipamento = 'SELF SPLIT 03'
    AND ROUND(capacidade, 2) = 7.50;

UPDATE equipamentos
  SET site_infratel = 'RJOPIA',
      tag_infratel = 'CLIMA - EV-03 / TRANE | CLIMA - CD-03 / TRANE'
  WHERE local = 'RJOPIA'
    AND equipamento = 'SELF SPLIT 03'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'RJOPIA',
      tag_infratel = 'CLIMA - EV-01 / SPRINGER-CARRIER / SALA UPS | CLIMA - CD-01 / SPRINGER-CARRIER / SALA UPS'
  WHERE local = 'RJOPIA'
    AND equipamento = 'SPLIT 01'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'RJOPIA',
      tag_infratel = 'CLIMA - EV-02 / SPRINGER-CARRIER / SALA UPS | CLIMA - CD-02 / SPRINGER-CARRIER / SALA UPS'
  WHERE local = 'RJOPIA'
    AND equipamento = 'SPLIT 02'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'RJOREC',
      tag_infratel = 'CLIMA - SPLINT 3TR SALA TÉCNICA'
  WHERE local = 'RJOREC'
    AND equipamento = 'ACJ 01'
    AND ROUND(capacidade, 2) = 1.00;

UPDATE equipamentos
  SET site_infratel = 'RJOREC',
      tag_infratel = 'CLIMA - CD-01 / TRANE | CLIMA - EV-01 / TRANE'
  WHERE local = 'RJOREC'
    AND equipamento = 'SELF SPLIT 01'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'RJOREC',
      tag_infratel = 'CLIMA - CD-02 / TRANE | CLIMA - EV-02 / TRANE'
  WHERE local = 'RJOREC'
    AND equipamento = 'SELF SPLIT 02'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'RJOREC',
      tag_infratel = 'CLIMA - CD-03 / TRANE | CLIMA - EV-03 / TRANE'
  WHERE local = 'RJOREC'
    AND equipamento = 'SELF SPLIT 03'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'RJOREC',
      tag_infratel = 'CLIMA - AC-07 / CONTAINER 06'
  WHERE local = 'RJOREC'
    AND equipamento = 'WM 01'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'RJOREC',
      tag_infratel = 'CLIMA - AC-01 / CONTAINER 02'
  WHERE local = 'RJOREC'
    AND equipamento = 'WM 01'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'RJOREC',
      tag_infratel = 'CLIMA - AC-05 / CONTAINER 03'
  WHERE local = 'RJOREC'
    AND equipamento = 'WM 01'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'RJOREC',
      tag_infratel = 'CLIMA - AC-03 / CONTAINER 04'
  WHERE local = 'RJOREC'
    AND equipamento = 'WM 01'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'RJOREC',
      tag_infratel = 'CLIMA - AC-01 / CONTAINER 05'
  WHERE local = 'RJOREC'
    AND equipamento = 'WM 01'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'RJOREC',
      tag_infratel = 'CLIMA - AC-01 / SUBESTAÇÃO'
  WHERE local = 'RJOREC'
    AND equipamento = 'WM 01'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'RJOREC',
      tag_infratel = 'CLIMA - AC-08 / CONTAINER 06'
  WHERE local = 'RJOREC'
    AND equipamento = 'WM 02'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'RJOREC',
      tag_infratel = 'CLIMA - AC-02 / CONTAINER 02'
  WHERE local = 'RJOREC'
    AND equipamento = 'WM 02'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'RJOREC',
      tag_infratel = 'CLIMA - AC-06 / CONTAINER 03'
  WHERE local = 'RJOREC'
    AND equipamento = 'WM 02'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'RJOREC',
      tag_infratel = 'CLIMA - AC-04 / CONTAINER 04'
  WHERE local = 'RJOREC'
    AND equipamento = 'WM 02'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'RJOREC',
      tag_infratel = 'CLIMA - AC-02 / CONTAINER 05'
  WHERE local = 'RJOREC'
    AND equipamento = 'WM 02'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'RJOREC',
      tag_infratel = 'CLIMA - AC-02 / SUBESTAÇÃO'
  WHERE local = 'RJOREC'
    AND equipamento = 'WM 02'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'RJO RMS',
      tag_infratel = 'CLIMA - CD-01 / STULZ | CLIMA - EV-01 / STULZ'
  WHERE local = 'RJORMS'
    AND equipamento = 'SELF SPLIT 01'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'RJO RMS',
      tag_infratel = 'CLIMA - CD-02 / STULZ | CLIMA - EV-02 / STULZ'
  WHERE local = 'RJORMS'
    AND equipamento = 'SELF SPLIT 02'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'RJO RMS',
      tag_infratel = 'CLIMA - CD-03 / STULZ | CLIMA - EV-03 / STULZ'
  WHERE local = 'RJORMS'
    AND equipamento = 'SELF SPLIT 03'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'RJO RMS',
      tag_infratel = 'CLIMA - CD-02 / YORK / CONTAINER 02 | CLIMA - EV-02 / CARRIER / CONTAINER 02'
  WHERE local = 'RJORMS'
    AND equipamento = 'SPLIT 01'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'RJO RMS',
      tag_infratel = 'CLIMA - AC-01 / CARRIER / CONTAINER 01'
  WHERE local = 'RJORMS'
    AND equipamento = 'WM 01'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'RJO RMS',
      tag_infratel = 'CLIMA - AC-01 / CARRIER / CONTAINER 02'
  WHERE local = 'RJORMS'
    AND equipamento = 'WM 01'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'RJO RMS',
      tag_infratel = 'CLIMA - AC-01 / CARRIER / CONTAINER 03'
  WHERE local = 'RJORMS'
    AND equipamento = 'WM 01'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'RJO RMS',
      tag_infratel = 'CLIMA - AC-01 / CARRIER / CONTAINER 04'
  WHERE local = 'RJORMS'
    AND equipamento = 'WM 01'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'RJO RMS',
      tag_infratel = 'CLIMA - AC-02 / CARRIER / CONTAINER 01'
  WHERE local = 'RJORMS'
    AND equipamento = 'WM 02'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'RJO RMS',
      tag_infratel = 'CLIMA - AC-02 / CARRIER / CONTAINER 02'
  WHERE local = 'RJORMS'
    AND equipamento = 'WM 02'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'RJO RMS',
      tag_infratel = 'CLIMA - AC-02 / CARRIER / CONTAINER 03'
  WHERE local = 'RJORMS'
    AND equipamento = 'WM 02'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'RJO RMS',
      tag_infratel = 'CLIMA - AC-02 / CARRIER / CONTAINER 04'
  WHERE local = 'RJORMS'
    AND equipamento = 'WM 02'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'RJOSLC',
      tag_infratel = 'CLIMA - SPLINT- 1  SALA TÉCNICA'
  WHERE local = 'RJOSLC'
    AND equipamento = 'SELF SPLIT'
    AND ROUND(capacidade, 2) = 1.80;

UPDATE equipamentos
  SET site_infratel = 'RJOSLC',
      tag_infratel = 'CLIMA - EV-01 / TRANE | CLIMA - CD-01 / TRANE'
  WHERE local = 'RJOSLC'
    AND equipamento = 'SELF SPLIT 01'
    AND ROUND(capacidade, 2) = 25.00;

UPDATE equipamentos
  SET site_infratel = 'RJOSLC',
      tag_infratel = 'CLIMA - EV-02 / TRANE | CLIMA - CD-02 / TRANE'
  WHERE local = 'RJOSLC'
    AND equipamento = 'SELF SPLIT 02'
    AND ROUND(capacidade, 2) = 25.00;

UPDATE equipamentos
  SET site_infratel = 'RJOSLC',
      tag_infratel = 'CLIMA - EV-03 / TRANE | CLIMA - CD-03 / TRANE'
  WHERE local = 'RJOSLC'
    AND equipamento = 'SELF SPLIT 03'
    AND ROUND(capacidade, 2) = 25.00;

UPDATE equipamentos
  SET site_infratel = 'RJOTIJ',
      tag_infratel = 'CLIMA - CD-01 / TRANE | CLIMA - EV-01 / TRANE'
  WHERE local = 'RJOTIJ'
    AND equipamento = 'SELF SPLIT 01'
    AND ROUND(capacidade, 2) = 20.00;

UPDATE equipamentos
  SET site_infratel = 'RJOTIJ',
      tag_infratel = 'CLIMA - CD-02 / TRANE | CLIMA - EV-02 / TRANE'
  WHERE local = 'RJOTIJ'
    AND equipamento = 'SELF SPLIT 02'
    AND ROUND(capacidade, 2) = 20.00;

UPDATE equipamentos
  SET site_infratel = 'RJOTIJ',
      tag_infratel = 'CLIMA - CD-03 / TRANE | CLIMA - EV-03 / TRANE'
  WHERE local = 'RJOTIJ'
    AND equipamento = 'SELF SPLIT 03'
    AND ROUND(capacidade, 2) = 20.00;

UPDATE equipamentos
  SET site_infratel = 'RJOTIJ',
      tag_infratel = 'CLIMA - CD-04 / TRANE | CLIMA - EV-04 / TRANE'
  WHERE local = 'RJOTIJ'
    AND equipamento = 'SELF SPLIT 04'
    AND ROUND(capacidade, 2) = 20.00;

UPDATE equipamentos
  SET site_infratel = 'RJO TP',
      tag_infratel = 'CLIMA - CARRIER 1'
  WHERE local = 'RJOTP'
    AND equipamento = 'CHILLER 1'
    AND ROUND(capacidade, 2) = 23.00;

UPDATE equipamentos
  SET site_infratel = 'RJO TP',
      tag_infratel = 'CLIMA - CARRIER 4'
  WHERE local = 'RJOTP'
    AND equipamento = 'CHILLER 2'
    AND ROUND(capacidade, 2) = 23.00;

UPDATE equipamentos
  SET site_infratel = 'RJO TP',
      tag_infratel = 'CLIMA - CARRIER 2'
  WHERE local = 'RJOTP'
    AND equipamento = 'CHILLER 4'
    AND ROUND(capacidade, 2) = 18.00;

UPDATE equipamentos
  SET site_infratel = 'RJO TP',
      tag_infratel = 'CLIMA - CARRIER 5'
  WHERE local = 'RJOTP'
    AND equipamento = 'CHILLER 5'
    AND ROUND(capacidade, 2) = 18.00;

UPDATE equipamentos
  SET site_infratel = 'RSDDTC',
      tag_infratel = 'CLIMA - ACJ-01 / SPRINGER / CONTAINER 01'
  WHERE local = 'RSDDTC'
    AND equipamento = 'ACJ 01'
    AND ROUND(capacidade, 2) = 3.00;

UPDATE equipamentos
  SET site_infratel = 'RSDDTC',
      tag_infratel = 'CLIMA - ACJ-02 / SPRINGER / CONTAINER 01'
  WHERE local = 'RSDDTC'
    AND equipamento = 'ACJ 02'
    AND ROUND(capacidade, 2) = 3.00;

UPDATE equipamentos
  SET site_infratel = 'RSDDTC',
      tag_infratel = 'CLIMA - ACJ-03 / SPRINGER / CONTAINER 01'
  WHERE local = 'RSDDTC'
    AND equipamento = 'ACJ 03'
    AND ROUND(capacidade, 2) = 3.00;

UPDATE equipamentos
  SET site_infratel = 'RSDDTC',
      tag_infratel = 'CLIMA - ACJ-04 / SPRINGER / CONTAINER 01'
  WHERE local = 'RSDDTC'
    AND equipamento = 'ACJ 04'
    AND ROUND(capacidade, 2) = 3.00;

UPDATE equipamentos
  SET site_infratel = 'RSDDTC',
      tag_infratel = 'CLIMA - SELF-01 / TRANE / CONTAINER 02'
  WHERE local = 'RSDDTC'
    AND equipamento = 'SELF 01'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'RSDDTC',
      tag_infratel = 'CLIMA - SPLIT SALA TÉCNICA - ESCRITÓRIO'
  WHERE local = 'RSDDTC'
    AND equipamento = 'SPLIT 01'
    AND ROUND(capacidade, 2) = 1.00;

UPDATE equipamentos
  SET site_infratel = 'RSDDTC',
      tag_infratel = 'CLIMA - WM-01 / TRANE / CONTAINER 01'
  WHERE local = 'RSDDTC'
    AND equipamento = 'WM 01'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'RSDDTC',
      tag_infratel = 'CLIMA - WM-01 / CARRIER / CONTAINER 02'
  WHERE local = 'RSDDTC'
    AND equipamento = 'WM 01'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'RSDDTC',
      tag_infratel = 'CLIMA - WM-01 / TRANE / CONTAINER 03'
  WHERE local = 'RSDDTC'
    AND equipamento = 'WM 01'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'RSDDTC',
      tag_infratel = 'CLIMA - WM-02 / TRANE / CONTAINER 01'
  WHERE local = 'RSDDTC'
    AND equipamento = 'WM 02'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'RSDDTC',
      tag_infratel = 'CLIMA - WM-02 / CARRIER / CONTAINER 02'
  WHERE local = 'RSDDTC'
    AND equipamento = 'WM 02'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'RSDDTC',
      tag_infratel = 'CLIMA - WM-02 / TRANE / CONTAINER 03'
  WHERE local = 'RSDDTC'
    AND equipamento = 'WM 02'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'RSDDTC',
      tag_infratel = 'CLIMA - WM-03 / TRANE / CONTAINER 01'
  WHERE local = 'RSDDTC'
    AND equipamento = 'WM 03'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'SEADTC',
      tag_infratel = 'CLIMA - AC 1 - STULZ'
  WHERE local = 'SEADTC'
    AND equipamento = 'WM 01'
    AND ROUND(capacidade, 2) = 10.00;

UPDATE equipamentos
  SET site_infratel = 'SEADTC',
      tag_infratel = 'CLIMA - AC 2 - STULZ'
  WHERE local = 'SEADTC'
    AND equipamento = 'WM 02'
    AND ROUND(capacidade, 2) = 10.00;

UPDATE equipamentos
  SET site_infratel = 'SEADTC',
      tag_infratel = 'CLIMA - AC 3 - STULZ'
  WHERE local = 'SEADTC'
    AND equipamento = 'WM 03'
    AND ROUND(capacidade, 2) = 10.00;

UPDATE equipamentos
  SET site_infratel = 'SEADTC',
      tag_infratel = 'CLIMA - AC 4 - STULZ'
  WHERE local = 'SEADTC'
    AND equipamento = 'WM 04'
    AND ROUND(capacidade, 2) = 10.00;

UPDATE equipamentos
  SET site_infratel = 'SEADTC',
      tag_infratel = 'CLIMA - AC 5 - STULZ'
  WHERE local = 'SEADTC'
    AND equipamento = 'WM 05'
    AND ROUND(capacidade, 2) = 10.00;

UPDATE equipamentos
  SET site_infratel = 'SEADTC',
      tag_infratel = 'CLIMA - AC 6 - STULZ'
  WHERE local = 'SEADTC'
    AND equipamento = 'WM 06'
    AND ROUND(capacidade, 2) = 10.00;

UPDATE equipamentos
  SET site_infratel = 'SEADTC',
      tag_infratel = 'CLIMA - AC 7 - STULZ'
  WHERE local = 'SEADTC'
    AND equipamento = 'WM 07'
    AND ROUND(capacidade, 2) = 10.00;

UPDATE equipamentos
  SET site_infratel = 'SEADTC',
      tag_infratel = 'CLIMA - AC 8 - STULZ'
  WHERE local = 'SEADTC'
    AND equipamento = 'WM 08'
    AND ROUND(capacidade, 2) = 10.00;

UPDATE equipamentos
  SET site_infratel = 'SGODTC',
      tag_infratel = 'CLIMA - EVAPORADORA 01 - SALA DE UPS/FCC | CLIMA - CONDENSADORA 01 - SALA DE UPS/FCC'
  WHERE local = 'SGODTC'
    AND equipamento = 'SELF SPLIT 01'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'SGODTC',
      tag_infratel = 'CLIMA - CONDENSADORA 01 - SALA DE EQUIPAMENTOS | CLIMA - EVAPORADORA 01 - SALA DE EQUIPAMENTOS'
  WHERE local = 'SGODTC'
    AND equipamento = 'SELF SPLIT 01'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'SGODTC',
      tag_infratel = 'CLIMA - EVAPORADORA 02 - SALA DE UPS/FCC | CLIMA - CONDENSADORA 02 - SALA DE UPS/FCC'
  WHERE local = 'SGODTC'
    AND equipamento = 'SELF SPLIT 02'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'SGODTC',
      tag_infratel = 'CLIMA - CONDENSADORA 02 - SALA DE EQUIPAMENTOS | CLIMA - EVAPORADORA 02 - SALA DE EQUIPAMENTOS'
  WHERE local = 'SGODTC'
    AND equipamento = 'SELF SPLIT 02'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'SGODTC',
      tag_infratel = 'CLIMA - CONDENSADORA 03 - SALA DE EQUIPAMENTOS | CLIMA - EVAPORADORA 03 - SALA DE EQUIPAMENTOS'
  WHERE local = 'SGODTC'
    AND equipamento = 'SELF SPLIT 03'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'SGODTC',
      tag_infratel = 'CLIMA - EVAPORADORA 01 - SALA DOS TÉCNICOS | CLIMA - CONDENSADORA 01 - SALA DOS TÉCNICOS'
  WHERE local = 'SGODTC'
    AND equipamento = 'SPLIT 01'
    AND ROUND(capacidade, 2) = 2.00;

UPDATE equipamentos
  SET site_infratel = 'TNGBR',
      tag_infratel = 'CLIMA - CH 01'
  WHERE local = 'TNGBR'
    AND equipamento = 'CHILLER 1'
    AND ROUND(capacidade, 2) = 100.00;

UPDATE equipamentos
  SET site_infratel = 'TNGBR',
      tag_infratel = 'CLIMA - CH 02'
  WHERE local = 'TNGBR'
    AND equipamento = 'CHILLER 2'
    AND ROUND(capacidade, 2) = 100.00;

UPDATE equipamentos
  SET site_infratel = 'TNGBR',
      tag_infratel = 'CLIMA - CH 03'
  WHERE local = 'TNGBR'
    AND equipamento = 'CHILLER 3'
    AND ROUND(capacidade, 2) = 100.00;

UPDATE equipamentos
  SET site_infratel = 'TNGBR',
      tag_infratel = 'CLIMA - CH 04'
  WHERE local = 'TNGBR'
    AND equipamento = 'CHILLER 4'
    AND ROUND(capacidade, 2) = 100.00;

UPDATE equipamentos
  SET site_infratel = 'TRLDTC',
      tag_infratel = 'CLIMA - SELF 01 / TRANE'
  WHERE local = 'TRLDTC'
    AND equipamento = 'SELF 01'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'TRLDTC',
      tag_infratel = 'CLIMA - SPLIT SALA TÉCNICA - ESCRITÓRIO'
  WHERE local = 'TRLDTC'
    AND equipamento = 'SPLIT 01'
    AND ROUND(capacidade, 2) = 0.75;

UPDATE equipamentos
  SET site_infratel = 'TRLDTC',
      tag_infratel = 'CLIMA - SPLI COPA - COZINHA'
  WHERE local = 'TRLDTC'
    AND equipamento = 'SPLIT 01'
    AND ROUND(capacidade, 2) = 0.75;

UPDATE equipamentos
  SET site_infratel = 'TRLDTC',
      tag_infratel = 'CLIMA - WM-01 / CARRIER / CONTAINER 01'
  WHERE local = 'TRLDTC'
    AND equipamento = 'WM 01'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'TRLDTC',
      tag_infratel = 'CLIMA - WM-02 / CARRIER / CONTAINER 01'
  WHERE local = 'TRLDTC'
    AND equipamento = 'WM 02'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'TRLDTC',
      tag_infratel = 'CLIMA - WM-01 / TRANE / CONTAINER 02'
  WHERE local = 'TRLDTC'
    AND equipamento = 'WM 03'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'TRLDTC',
      tag_infratel = 'CLIMA - WM-02 / TRANE / CONTAINER 02'
  WHERE local = 'TRLDTC'
    AND equipamento = 'WM 04'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'VTA ARB',
      tag_infratel = 'CLIMA - SPLIT_01'
  WHERE local = 'VTA ARB'
    AND equipamento = 'SPLIT 01'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'VTA ARB',
      tag_infratel = 'CLIMA - SPLIT_02'
  WHERE local = 'VTA ARB'
    AND equipamento = 'SPLIT 02'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'VTA ARB',
      tag_infratel = 'CLIMA - SPLIT 03'
  WHERE local = 'VTA ARB'
    AND equipamento = 'SPLIT 03'
    AND ROUND(capacidade, 2) = 3.00;

UPDATE equipamentos
  SET site_infratel = 'OCTDTC',
      tag_infratel = 'CLIMA - Arcon 01'
  WHERE local = 'VTA OCT'
    AND equipamento = 'WM 01'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'OCTDTC',
      tag_infratel = 'CLIMA - Arcon 02'
  WHERE local = 'VTA OCT'
    AND equipamento = 'WM 02'
    AND ROUND(capacidade, 2) = 5.00;

UPDATE equipamentos
  SET site_infratel = 'VTADTC',
      tag_infratel = 'CLIMA - AC 4'
  WHERE local = 'VTADTC'
    AND equipamento = 'SELF SPLIT 01'
    AND ROUND(capacidade, 2) = 10.00;

UPDATE equipamentos
  SET site_infratel = 'VTADTC',
      tag_infratel = 'CLIMA - AC 5'
  WHERE local = 'VTADTC'
    AND equipamento = 'SELF SPLIT 02'
    AND ROUND(capacidade, 2) = 10.00;

UPDATE equipamentos
  SET site_infratel = 'VTADTC',
      tag_infratel = 'CLIMA - AC 6'
  WHERE local = 'VTADTC'
    AND equipamento = 'SELF SPLIT 03'
    AND ROUND(capacidade, 2) = 10.00;

UPDATE equipamentos
  SET site_infratel = 'VTADTC',
      tag_infratel = 'CLIMA - AC 1'
  WHERE local = 'VTADTC'
    AND equipamento = 'WM 01'
    AND ROUND(capacidade, 2) = 10.00;

UPDATE equipamentos
  SET site_infratel = 'VTADTC',
      tag_infratel = 'CLIMA - AC 2'
  WHERE local = 'VTADTC'
    AND equipamento = 'WM 02'
    AND ROUND(capacidade, 2) = 10.00;

UPDATE equipamentos
  SET site_infratel = 'VTADTC',
      tag_infratel = 'CLIMA - AC 3'
  WHERE local = 'VTADTC'
    AND equipamento = 'WM 03'
    AND ROUND(capacidade, 2) = 10.00;

UPDATE equipamentos
  SET site_infratel = 'VTA JM',
      tag_infratel = 'CLIMA - GRA - 801'
  WHERE local = 'VTAJM'
    AND equipamento = 'CHILLER 3'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'VTA JM',
      tag_infratel = 'CLIMA - GRA - 802'
  WHERE local = 'VTAJM'
    AND equipamento = 'CHILLER 4'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'VTA JM',
      tag_infratel = 'CLIMA - GRA - 803'
  WHERE local = 'VTAJM'
    AND equipamento = 'CHILLER 5'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'VTA JM',
      tag_infratel = 'CLIMA - GRA - 804'
  WHERE local = 'VTAJM'
    AND equipamento = 'CHILLER 6'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'VVADTC',
      tag_infratel = 'CLIMA - AC 1'
  WHERE local = 'VVADTC'
    AND equipamento = 'SELF 01'
    AND ROUND(capacidade, 2) = 20.00;

UPDATE equipamentos
  SET site_infratel = 'VVADTC',
      tag_infratel = 'CLIMA - AC 2'
  WHERE local = 'VVADTC'
    AND equipamento = 'SELF 02'
    AND ROUND(capacidade, 2) = 20.00;

UPDATE equipamentos
  SET site_infratel = 'VVADTC',
      tag_infratel = 'CLIMA - AC 3'
  WHERE local = 'VVADTC'
    AND equipamento = 'SELF 03'
    AND ROUND(capacidade, 2) = 15.00;

UPDATE equipamentos
  SET site_infratel = 'VVADTC',
      tag_infratel = 'CLIMA - AC 4'
  WHERE local = 'VVADTC'
    AND equipamento = 'SELF 04'
    AND ROUND(capacidade, 2) = 15.00;

