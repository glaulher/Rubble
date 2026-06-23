-- Migration 036: Add missing FK constraint on registros.equipamento_id
-- Prevents deleting equipamentos that have linked tickets.

ALTER TABLE `registros`
  ADD CONSTRAINT `fk_registros_equipamento` FOREIGN KEY (`equipamento_id`) REFERENCES `equipamentos` (`id`);
