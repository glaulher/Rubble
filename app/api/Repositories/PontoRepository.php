<?php

declare(strict_types=1);

namespace App\Api\Repositories;

class PontoRepository extends BaseRepository
{
    public function findColaboradorByMatricula(string $matricula): ?array
    {
        $stmt = $this->safePrepare('SELECT * FROM ponto_colaboradores WHERE matricula = ? LIMIT 1');
        $stmt->bind_param('s', $matricula);
        $stmt->execute();
        $res = $stmt->get_result();
        $row = $res->fetch_assoc();
        $stmt->close();
        return $row ?: null;
    }

    public function findColaboradorByNome(string $nome): ?array
    {
        $stmt = $this->safePrepare('SELECT * FROM ponto_colaboradores WHERE LOWER(nome) = LOWER(?) LIMIT 1');
        $stmt->bind_param('s', $nome);
        $stmt->execute();
        $res = $stmt->get_result();
        $row = $res->fetch_assoc();
        $stmt->close();
        return $row ?: null;
    }

    public function upsertColaborador(array $data): int
    {
        $matricula = trim((string) ($data['matricula'] ?? ''));
        $nome = trim((string) ($data['nome'] ?? ''));
        $cc = isset($data['cc']) ? trim((string) $data['cc']) : null;
        $funcao = isset($data['funcao']) ? trim((string) $data['funcao']) : null;
        $turno = isset($data['turno']) ? trim((string) $data['turno']) : null;

        $sql = 'INSERT INTO ponto_colaboradores (matricula, nome, cc, funcao, turno)
                VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    nome = VALUES(nome),
                    cc = COALESCE(VALUES(cc), cc),
                    funcao = COALESCE(VALUES(funcao), funcao),
                    turno = COALESCE(VALUES(turno), turno)';

        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('sssss', $matricula, $nome, $cc, $funcao, $turno);
        $stmt->execute();
        $id = (int) $this->conn->insert_id;
        $stmt->close();

        if ($id === 0) {
            $existing = $this->findColaboradorByMatricula($matricula);
            return $existing ? (int) $existing['id'] : 0;
        }

        return $id;
    }

    public function upsertRegistro(array $data): int
    {
        $colabId = (int) ($data['colaborador_id'] ?? 0);
        $dataRef = (string) ($data['data'] ?? '');
        $diaSemana = $data['dia_semana'] ?? null;
        $e1 = $data['e1'] ?? null;
        $s1 = $data['s1'] ?? null;
        $e2 = $data['e2'] ?? null;
        $s2 = $data['s2'] ?? null;
        $e3 = $data['e3'] ?? null;
        $s3 = $data['s3'] ?? null;
        $e4 = $data['e4'] ?? null;
        $s4 = $data['s4'] ?? null;
        $he = $data['he'] ?? null;
        $heMin = (int) ($data['he_min'] ?? 0);
        $absent = $data['absent'] ?? null;
        $absentMin = (int) ($data['absent_min'] ?? 0);
        $jornada = $data['jornada'] ?? null;
        $adnot = $data['adnot'] ?? null;
        $obs = $data['observacao'] ?? null;
        $status = $data['status'] ?? 'OK';
        $uploadId = isset($data['upload_id']) ? (int) $data['upload_id'] : null;

        $sql = 'INSERT INTO ponto_registros
                (colaborador_id, data, dia_semana, e1, s1, e2, s2, e3, s3, e4, s4, he, he_min, absent, absent_min, jornada, adnot, observacao, status, upload_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    dia_semana = VALUES(dia_semana),
                    e1 = VALUES(e1), s1 = VALUES(s1),
                    e2 = VALUES(e2), s2 = VALUES(s2),
                    e3 = VALUES(e3), s3 = VALUES(s3),
                    e4 = VALUES(e4), s4 = VALUES(s4),
                    he = VALUES(he), he_min = VALUES(he_min),
                    absent = VALUES(absent), absent_min = VALUES(absent_min),
                    jornada = VALUES(jornada), adnot = VALUES(adnot),
                    observacao = VALUES(observacao), status = VALUES(status),
                    upload_id = COALESCE(VALUES(upload_id), upload_id)';

        $stmt = $this->safePrepare($sql);
        $stmt->bind_param(
            'isssssssssssisissssi',
            $colabId,
            $dataRef,
            $diaSemana,
            $e1,
            $s1,
            $e2,
            $s2,
            $e3,
            $s3,
            $e4,
            $s4,
            $he,
            $heMin,
            $absent,
            $absentMin,
            $jornada,
            $adnot,
            $obs,
            $status,
            $uploadId
        );
        $stmt->execute();
        $id = (int) $this->conn->insert_id;
        $stmt->close();
        return $id;
    }

    public function upsertBancoHoras(array $data): void
    {
        $colabId = (int) ($data['colaborador_id'] ?? 0);
        $cicloIni = !empty($data['ciclo_inicio']) ? (string) $data['ciclo_inicio'] : '1970-01-01';
        $cicloFim = !empty($data['ciclo_fim']) ? (string) $data['ciclo_fim'] : null;
        $saldoAnt = $data['saldo_anterior'] ?? null;
        $debito = $data['debito'] ?? null;
        $credito = $data['credito'] ?? null;
        $saldoAtual = $data['saldo_atual'] ?? null;
        $saldoAtualMin = (int) ($data['saldo_atual_min'] ?? 0);
        $diasHe = (int) ($data['dias_com_he'] ?? 0);
        $diasAbs = (int) ($data['dias_com_ausencia'] ?? 0);
        $gestor = $data['nome_gestor'] ?? null;
        $adm = $data['adm_responsavel'] ?? null;
        $obs = $data['observacao'] ?? null;

        $sql = 'INSERT INTO ponto_banco_horas
                (colaborador_id, ciclo_inicio, ciclo_fim, saldo_anterior, debito, credito, saldo_atual, saldo_atual_min, dias_com_he, dias_com_ausencia, nome_gestor, adm_responsavel, observacao)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    ciclo_fim = VALUES(ciclo_fim),
                    saldo_anterior = VALUES(saldo_anterior),
                    debito = VALUES(debito),
                    credito = VALUES(credito),
                    saldo_atual = VALUES(saldo_atual),
                    saldo_atual_min = VALUES(saldo_atual_min),
                    dias_com_he = VALUES(dias_com_he),
                    dias_com_ausencia = VALUES(dias_com_ausencia),
                    nome_gestor = COALESCE(VALUES(nome_gestor), nome_gestor),
                    adm_responsavel = COALESCE(VALUES(adm_responsavel), adm_responsavel),
                    observacao = COALESCE(VALUES(observacao), observacao)';

        $stmt = $this->safePrepare($sql);
        $stmt->bind_param(
            'issssssiissss',
            $colabId,
            $cicloIni,
            $cicloFim,
            $saldoAnt,
            $debito,
            $credito,
            $saldoAtual,
            $saldoAtualMin,
            $diasHe,
            $diasAbs,
            $gestor,
            $adm,
            $obs
        );
        $stmt->execute();
        $stmt->close();
    }

    public function upsertAnotacaoHe(int $colaboradorId, string $data, ?string $gestor, ?string $adm, string $sobreaviso, ?string $justificativa, ?string $user): void
    {
        $sql = 'INSERT INTO ponto_anotacoes_he
                (colaborador_id, data, nome_gestor, adm_responsavel, sobreaviso, justificativa, updated_by)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    nome_gestor = VALUES(nome_gestor),
                    adm_responsavel = VALUES(adm_responsavel),
                    sobreaviso = VALUES(sobreaviso),
                    justificativa = VALUES(justificativa),
                    updated_by = VALUES(updated_by)';

        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('issssss', $colaboradorId, $data, $gestor, $adm, $sobreaviso, $justificativa, $user);
        $stmt->execute();
        $stmt->close();
    }

    public function upsertAnotacaoBh(int $colaboradorId, ?string $gestor, ?string $adm, ?string $observacao): void
    {
        $sql = 'INSERT INTO ponto_banco_horas (colaborador_id, ciclo_inicio, nome_gestor, adm_responsavel, observacao)
                VALUES (?, "1970-01-01", ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    nome_gestor = VALUES(nome_gestor),
                    adm_responsavel = VALUES(adm_responsavel),
                    observacao = VALUES(observacao)';

        $stmt = $this->safePrepare($sql);
        $stmt->bind_param('isss', $colaboradorId, $gestor, $adm, $observacao);
        $stmt->execute();
        $stmt->close();
    }

    public function listBancoHoras(?string $cc = null, ?string $busca = null, ?string $turno = null, ?string $orderSaldo = null): array
    {
        $sql = 'SELECT
                    c.id AS colaborador_id,
                    c.matricula,
                    c.nome,
                    c.cc,
                    c.funcao,
                    c.turno,
                    COALESCE(bh.saldo_atual, "00:00") AS saldo_atual,
                    COALESCE(bh.saldo_atual_min, 0) AS saldo_atual_min,
                    COALESCE(bh.dias_com_he, 0) AS dias_com_he,
                    COALESCE(bh.dias_com_ausencia, 0) AS dias_com_ausencia,
                    bh.nome_gestor,
                    bh.adm_responsavel,
                    bh.observacao,
                    COALESCE(SUM(r.he_min), 0) AS he_total_min,
                    COALESCE(SUM(r.absent_min), 0) AS absent_total_min
                FROM ponto_colaboradores c
                LEFT JOIN ponto_banco_horas bh ON bh.colaborador_id = c.id
                LEFT JOIN ponto_registros r ON r.colaborador_id = c.id
                WHERE 1=1';

        $types = '';
        $params = [];

        if ($cc !== null && $cc !== '') {
            $sql .= ' AND c.cc = ?';
            $types .= 's';
            $params[] = $cc;
        }

        if ($turno !== null && $turno !== '') {
            $sql .= ' AND c.turno = ?';
            $types .= 's';
            $params[] = $turno;
        }

        if ($busca !== null && $busca !== '') {
            $sql .= ' AND (c.nome LIKE ? OR c.funcao LIKE ? OR c.matricula LIKE ?)';
            $types .= 'sss';
            $like = '%' . $busca . '%';
            $params[] = $like;
            $params[] = $like;
            $params[] = $like;
        }

        $sql .= ' GROUP BY c.id, c.matricula, c.nome, c.cc, c.funcao, c.turno,
                            bh.saldo_atual, bh.saldo_atual_min, bh.dias_com_he,
                            bh.dias_com_ausencia, bh.nome_gestor, bh.adm_responsavel, bh.observacao';

        if ($orderSaldo === 'desc') {
            $sql .= ' ORDER BY bh.saldo_atual_min DESC, c.nome ASC';
        } elseif ($orderSaldo === 'asc') {
            $sql .= ' ORDER BY bh.saldo_atual_min ASC, c.nome ASC';
        } else {
            $sql .= ' ORDER BY c.nome ASC';
        }

        $stmt = $this->safePrepare($sql);
        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $res = $stmt->get_result();
        $rows = $res->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return $rows;
    }

    public function getExtratoColaborador(int $colaboradorId, ?string $dataInicio = null, ?string $dataFim = null): array
    {
        $sql = 'SELECT r.*, c.nome, c.matricula, c.cc, c.funcao, c.turno
                FROM ponto_registros r
                JOIN ponto_colaboradores c ON c.id = r.colaborador_id
                WHERE r.colaborador_id = ?';

        $types = 'i';
        $params = [$colaboradorId];

        if ($dataInicio !== null && $dataInicio !== '') {
            $sql .= ' AND r.data >= ?';
            $types .= 's';
            $params[] = $dataInicio;
        }

        if ($dataFim !== null && $dataFim !== '') {
            $sql .= ' AND r.data <= ?';
            $types .= 's';
            $params[] = $dataFim;
        }

        $sql .= ' ORDER BY r.data ASC';

        $stmt = $this->safePrepare($sql);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $res = $stmt->get_result();
        $rows = $res->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return $rows;
    }

    public function listHorasExtrasSimplificadas(
        ?string $dataInicio = null,
        ?string $dataFim = null,
        ?string $cc = null,
        ?int $colaboradorId = null,
        ?string $busca = null,
        ?string $statusJustificativa = null
    ): array {
        $sql = 'SELECT
                    r.id AS registro_id,
                    r.colaborador_id,
                    r.data,
                    r.dia_semana,
                    r.e1, r.s1, r.e2, r.s2, r.e3, r.s3, r.e4, r.s4,
                    r.he, r.he_min,
                    r.observacao AS observacao_ponto,
                    c.nome, c.matricula, c.cc, c.funcao, c.turno,
                    a.nome_gestor,
                    a.adm_responsavel,
                    COALESCE(a.sobreaviso, "") AS sobreaviso,
                    a.justificativa,
                    a.updated_at AS anotacao_updated_at
                FROM ponto_registros r
                JOIN ponto_colaboradores c ON c.id = r.colaborador_id
                LEFT JOIN ponto_anotacoes_he a ON a.colaborador_id = r.colaborador_id AND a.data = r.data
                WHERE r.he_min > 0';

        $types = '';
        $params = [];

        if ($dataInicio !== null && $dataInicio !== '') {
            $sql .= ' AND r.data >= ?';
            $types .= 's';
            $params[] = $dataInicio;
        }

        if ($dataFim !== null && $dataFim !== '') {
            $sql .= ' AND r.data <= ?';
            $types .= 's';
            $params[] = $dataFim;
        }

        if ($cc !== null && $cc !== '') {
            $sql .= ' AND c.cc = ?';
            $types .= 's';
            $params[] = $cc;
        }

        if ($colaboradorId !== null && $colaboradorId > 0) {
            $sql .= ' AND c.id = ?';
            $types .= 'i';
            $params[] = $colaboradorId;
        }

        if ($busca !== null && $busca !== '') {
            $sql .= ' AND (c.nome LIKE ? OR c.matricula LIKE ?)';
            $types .= 'ss';
            $like = '%' . $busca . '%';
            $params[] = $like;
            $params[] = $like;
        }

        if ($statusJustificativa === 'pendente') {
            $sql .= ' AND (a.justificativa IS NULL OR TRIM(a.justificativa) = "")';
        } elseif ($statusJustificativa === 'preenchida') {
            $sql .= ' AND (a.justificativa IS NOT NULL AND TRIM(a.justificativa) != "")';
        }

        $sql .= ' ORDER BY r.data DESC, c.nome ASC';

        $stmt = $this->safePrepare($sql);
        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $res = $stmt->get_result();
        $rows = $res->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return $rows;
    }

    public function listCentrosDeCusto(): array
    {
        $stmt = $this->safePrepare('SELECT DISTINCT cc FROM ponto_colaboradores WHERE cc IS NOT NULL AND cc != "" ORDER BY cc ASC');
        $stmt->execute();
        $res = $stmt->get_result();
        $rows = $res->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return array_column($rows, 'cc');
    }

    public function listColaboradoresOptions(): array
    {
        $stmt = $this->safePrepare('SELECT id, matricula, nome, cc FROM ponto_colaboradores ORDER BY nome ASC');
        $stmt->execute();
        $res = $stmt->get_result();
        $rows = $res->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return $rows;
    }

    public function createUpload(string $filename): int
    {
        $stmt = $this->safePrepare('INSERT INTO ponto_uploads (nome_arquivo, status) VALUES (?, "PROCESSANDO")');
        $stmt->bind_param('s', $filename);
        $stmt->execute();
        $id = (int) $this->conn->insert_id;
        $stmt->close();
        return $id;
    }

    public function updateUpload(int $id, int $totalColabs, int $totalRegs, string $status = 'CONCLUIDO'): void
    {
        $stmt = $this->safePrepare('UPDATE ponto_uploads SET total_colaboradores = ?, total_registros = ?, status = ? WHERE id = ?');
        $stmt->bind_param('iisi', $totalColabs, $totalRegs, $status, $id);
        $stmt->execute();
        $stmt->close();
    }
}
