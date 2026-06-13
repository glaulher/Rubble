ALTER TABLE pv_item
  ADD COLUMN filtro_data TEXT DEFAULT NULL COMMENT 'JSON com dados do calculo de filtro (tamanho, qtd_pecas, area_placa, area_plana_total, qtd_cobrar)';
