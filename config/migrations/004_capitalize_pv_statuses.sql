-- Migration 004: Capitalize PV status values to match frontend PV_STATUSES
-- Execute manualmente no MySQL: source "config/migrations/004_capitalize_pv_statuses.sql"

UPDATE pv SET status = 'Aguardando doc.' WHERE status = 'aguardando doc.';
UPDATE pv SET status = 'Aguardando orientação' WHERE status = 'aguardando orientação';
UPDATE pv SET status = 'Aprovado serv.' WHERE status = 'aprovado serv.';
UPDATE pv SET status = 'Enviado para o gerente' WHERE status = 'enviado para o gerente';
UPDATE pv SET status = 'E-mail de lib. aquisição/serviço' WHERE status = 'e-mail de lib. aquisição/serviço';
UPDATE pv SET status = 'Aprovado aquisição/serviço' WHERE status = 'aprovado aquisição/serviço';
UPDATE pv SET status = 'E-mail de aprov. serv. realizado' WHERE status = 'e-mail de aprov. serv. realizado';
UPDATE pv SET status = 'SCM aprovado' WHERE status = 'scm aprovado';
UPDATE pv SET status = 'SCM negado' WHERE status = 'scm negado';
UPDATE pv SET status = 'SCM enviado' WHERE status = 'scm enviado';
UPDATE pv SET status = 'Cancelado' WHERE status = 'cancelado';

ALTER TABLE pv ALTER COLUMN status SET DEFAULT 'Aguardando doc.';
