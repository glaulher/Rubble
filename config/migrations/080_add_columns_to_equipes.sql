-- Migration 080: Adiciona colunas tecnico, placa, veiculo e contrato na tabela equipes e complementa dados
-- Data: 2026-11-15

-- 1. Novas colunas na tabela equipes (idempotente)
ALTER TABLE `equipes`
  ADD COLUMN IF NOT EXISTS `tecnico`  VARCHAR(100) NULL AFTER `nome`,
  ADD COLUMN IF NOT EXISTS `placa`    VARCHAR(30)  NULL AFTER `tecnico`,
  ADD COLUMN IF NOT EXISTS `veiculo`  VARCHAR(50)  NULL AFTER `placa`,
  ADD COLUMN IF NOT EXISTS `contrato` VARCHAR(50)  NULL AFTER `veiculo`;

-- 2. Atualiza equipes existentes com os dados de equipes.csv
UPDATE `equipes`
  SET `tecnico` = 'ALEXANDRE DONATO DA SILVA', `placa` = 'TBO-9J41', `contrato` = 'ARCON', `veiculo` = 'KANGOO'
  WHERE `nome` LIKE 'Alexandre%';

UPDATE `equipes`
  SET `tecnico` = 'CLAUDIO ROBERTO FERREIRA ROCHA', `placa` = 'TBO-9J53', `contrato` = 'ARCON', `veiculo` = 'KANGOO'
  WHERE `nome` LIKE 'Claudio Roberto%';

UPDATE `equipes`
  SET `tecnico` = 'ELIZEU DE ALMEIDA RODRIGUES', `placa` = 'TBO-9J51', `contrato` = 'ARCON', `veiculo` = 'KANGOO'
  WHERE `nome` LIKE 'Elizeu%';

UPDATE `equipes`
  SET `tecnico` = 'FRANCISCO DE ASSIS PONTE DA SILVA', `placa` = 'TBO-9J36', `contrato` = 'ARCON', `veiculo` = 'KANGOO'
  WHERE `nome` LIKE 'Francisco%';

UPDATE `equipes`
  SET `tecnico` = 'JOSE AGNALDO NUNES JUNIOR', `placa` = 'TBO-9J68', `contrato` = 'ARCON', `veiculo` = 'KANGOO'
  WHERE `nome` LIKE 'José Agnaldo%' OR `nome` LIKE 'Jose Agnaldo%';

UPDATE `equipes`
  SET `tecnico` = 'LEANDER SOARES VIEIRA', `placa` = 'TBO-9J46', `contrato` = 'ARCON', `veiculo` = 'KANGOO'
  WHERE `nome` LIKE 'Leander%';

UPDATE `equipes`
  SET `tecnico` = 'MAURO BATISTA DA SILVA', `placa` = 'TBO-9J62', `contrato` = 'ARCON', `veiculo` = 'KANGOO'
  WHERE `nome` LIKE 'Mauro Batista%';

UPDATE `equipes`
  SET `tecnico` = 'MAURO JORGE FIRMINO DA SILVA', `placa` = 'TBO-9J42', `contrato` = 'ARCON', `veiculo` = 'KANGOO'
  WHERE `nome` LIKE 'Mauro Jorge%';

UPDATE `equipes`
  SET `tecnico` = 'PABLO FERNANDO BRITO DE SOUZA', `placa` = 'TBO-9J45', `contrato` = 'ARCON', `veiculo` = 'KANGOO'
  WHERE `nome` LIKE 'Pablo%';

UPDATE `equipes`
  SET `tecnico` = 'RAPHAEL SANTIAGO GONÇALVES VASCONCELOS', `placa` = 'TBO-9J43', `contrato` = 'ARCON', `veiculo` = 'KANGOO'
  WHERE `nome` LIKE 'Raphael%';

UPDATE `equipes`
  SET `tecnico` = 'LUCAS TADEU DOS SANTOS SOARES', `placa` = 'KOY-5F34', `contrato` = 'SUBCONTRATADA', `veiculo` = 'DUSTER'
  WHERE `nome` LIKE 'Lucas Tadeu%';

-- 3. Insere as equipes em contratação do equipes.csv caso ainda não existam
INSERT INTO `equipes` (`nome`, `tecnico`, `placa`, `contrato`, `veiculo`, `ativo`)
VALUES
  ('Em Contratação - TBO-9J39', 'EM CONTRATAÇÃO', 'TBO-9J39', 'ARCON', 'KANGOO', 1),
  ('Em Contratação - TBO-9J47', 'EM CONTRATAÇÃO', 'TBO-9J47 (SINISTRADO)', 'ARCON', 'KANGOO', 1)
ON DUPLICATE KEY UPDATE
  `tecnico` = VALUES(`tecnico`),
  `placa` = VALUES(`placa`),
  `contrato` = VALUES(`contrato`),
  `veiculo` = VALUES(`veiculo`);
