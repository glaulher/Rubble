-- Migration 017: Fix scm FK to ON DELETE SET NULL
-- Equipment deletion should preserve SCM history
ALTER TABLE `scm`
    DROP FOREIGN KEY `fk_scm_equipamento`;

ALTER TABLE `scm`
    ADD CONSTRAINT `fk_scm_equipamento` FOREIGN KEY (`equipamento_id`)
    REFERENCES `equipamentos` (`id`) ON DELETE SET NULL;
