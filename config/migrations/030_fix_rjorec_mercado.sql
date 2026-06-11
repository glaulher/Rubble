-- Fix: RJOREC equipamentos inseridos após migration 015 ficaram com mercado NULL
-- SCM 534150 (origem=RESIDENCIAL) não exibia badge de mercado por isso

UPDATE equipamentos
SET mercado = 'Residencial'
WHERE local = 'RJOREC' AND mercado IS NULL;
