<?php

declare(strict_types=1);

namespace App\Api\Repositories;

use App\Api\Entities\TermoResponsabilidade;
use App\Api\Entities\TermoItem;
use mysqli;

class TermoRepository extends BaseRepository
{
    public function __construct(?mysqli $conn = null)
    {
        if ($conn !== null) {
            $this->conn = $conn;
        } else {
            parent::__construct();
        }
    }

    public function formatCode(int $seq, int $year): string
    {
        return sprintf('TR-%04d-%04d', $year, $seq);
    }

    public function generateNextCode(): string
    {
        $currentYear = (int) date('Y');
        $prefix = "TR-{$currentYear}-%";
        $stmt = $this->conn->prepare("SELECT codigo FROM termos_responsabilidade WHERE codigo LIKE ? ORDER BY id DESC LIMIT 1");
        if (!$stmt) {
            return $this->formatCode(1, $currentYear);
        }
        $stmt->bind_param('s', $prefix);
        $stmt->execute();
        $res = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if ($res && !empty($res['codigo'])) {
            $parts = explode('-', $res['codigo']);
            $lastSeq = (int) end($parts);
            return $this->formatCode($lastSeq + 1, $currentYear);
        }

        return $this->formatCode(1, $currentYear);
    }

    public function create(array $data, array $itens, ?int $emissorId): int
    {
        $this->beginTransaction();
        try {
            $stmt = $this->conn->prepare(
                'INSERT INTO termos_responsabilidade 
                (codigo, emissor_id, entregue_por, tecnico_nome, tecnico_documento, tecnico_telefone, status, token_assinatura, token_expira_em, observacoes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );
            if (!$stmt) {
                $this->rollback();
                return 0;
            }

            $codigo = $data['codigo'];
            $entreguePor = $data['entregue_por'];
            $tecnicoNome = $data['tecnico_nome'];
            $tecnicoDoc = !empty($data['tecnico_documento']) ? $data['tecnico_documento'] : null;
            $tecnicoTel = !empty($data['tecnico_telefone']) ? $data['tecnico_telefone'] : null;
            $status = $data['status'] ?? 'pendente';
            $token = $data['token_assinatura'];
            $expiraEm = $data['token_expira_em'];
            $obs = !empty($data['observacoes']) ? $data['observacoes'] : null;

            $stmt->bind_param(
                'sissssssss',
                $codigo,
                $emissorId,
                $entreguePor,
                $tecnicoNome,
                $tecnicoDoc,
                $tecnicoTel,
                $status,
                $token,
                $expiraEm,
                $obs
            );
            $stmt->execute();
            $termoId = (int) $stmt->insert_id;
            $stmt->close();

            if ($termoId <= 0) {
                $this->rollback();
                return 0;
            }

            if (!empty($itens)) {
                $itemStmt = $this->conn->prepare(
                    'INSERT INTO termo_itens (termo_id, inventario_id, material_nome, modelo, serial, status_item)
                     VALUES (?, ?, ?, ?, ?, ?)'
                );
                if (!$itemStmt) {
                    $this->rollback();
                    return 0;
                }

                $statusItem = 'em_posse';
                foreach ($itens as $item) {
                    $inventarioId = !empty($item['inventario_id']) ? (int) $item['inventario_id'] : null;
                    $material = $item['material_nome'] ?? '';
                    $modelo = $item['modelo'] ?? '';
                    $serial = $item['serial'] ?? '';

                    $itemStmt->bind_param('iissss', $termoId, $inventarioId, $material, $modelo, $serial, $statusItem);
                    $itemStmt->execute();
                }
                $itemStmt->close();
            }

            $this->commit();
            return $termoId;
        } catch (\Throwable $e) {
            $this->rollback();
            error_log('Error creating termo: ' . $e->getMessage());
            return 0;
        }
    }

    public function findById(int $id): ?TermoResponsabilidade
    {
        $stmt = $this->conn->prepare('SELECT * FROM termos_responsabilidade WHERE id = ?');
        if (!$stmt) {
            return null;
        }
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if (!$row) {
            return null;
        }

        $row['itens'] = $this->getItemsByTermoId($id);
        return new TermoResponsabilidade($row);
    }

    public function findByToken(string $token): ?TermoResponsabilidade
    {
        $stmt = $this->conn->prepare('SELECT * FROM termos_responsabilidade WHERE token_assinatura = ?');
        if (!$stmt) {
            return null;
        }
        $stmt->bind_param('s', $token);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if (!$row) {
            return null;
        }

        $row['itens'] = $this->getItemsByTermoId((int) $row['id']);
        return new TermoResponsabilidade($row);
    }

    public function getItemsByTermoId(int $termoId): array
    {
        $stmt = $this->conn->prepare('SELECT * FROM termo_itens WHERE termo_id = ? ORDER BY id ASC');
        if (!$stmt) {
            return [];
        }
        $stmt->bind_param('i', $termoId);
        $stmt->execute();
        $result = $stmt->get_result();

        $itens = [];
        while ($row = $result->fetch_assoc()) {
            $itens[] = new TermoItem($row);
        }
        $stmt->close();
        return $itens;
    }

    public function saveSignature(int $termoId, string $signatureData, string $ip, string $userAgent): bool
    {
        $stmt = $this->conn->prepare(
            "UPDATE termos_responsabilidade 
             SET status = 'assinado', assinatura_imagem = ?, assinado_em = NOW(), assinado_ip = ?, assinado_user_agent = ?
             WHERE id = ? AND status = 'pendente'"
        );
        if (!$stmt) {
            return false;
        }
        $stmt->bind_param('sssi', $signatureData, $ip, $userAgent, $termoId);
        $success = $stmt->execute();
        $affected = $stmt->affected_rows;
        $stmt->close();
        return $success && $affected > 0;
    }

    public function returnItems(int $termoId, array $itemIds, string $dataDevolucao, ?string $obs = null): bool
    {
        $this->beginTransaction();
        try {
            $updateItemStmt = $this->conn->prepare(
                "UPDATE termo_itens 
                 SET status_item = 'devolvido', data_devolucao = ?, observacao_devolucao = ?
                 WHERE id = ? AND termo_id = ?"
            );
            if (!$updateItemStmt) {
                $this->rollback();
                return false;
            }

            foreach ($itemIds as $itemId) {
                $updateItemStmt->bind_param('ssii', $dataDevolucao, $obs, $itemId, $termoId);
                $updateItemStmt->execute();
            }
            $updateItemStmt->close();

            // Verificar se ainda existem itens pendentes
            $checkStmt = $this->conn->prepare(
                "SELECT COUNT(*) as pending FROM termo_itens WHERE termo_id = ? AND status_item = 'em_posse'"
            );
            $checkStmt->bind_param('i', $termoId);
            $checkStmt->execute();
            $res = $checkStmt->get_result()->fetch_assoc();
            $checkStmt->close();

            $pendingCount = (int) ($res['pending'] ?? 0);
            $newStatus = ($pendingCount === 0) ? 'devolvido' : 'devolvido_parcial';

            $statusStmt = $this->conn->prepare("UPDATE termos_responsabilidade SET status = ? WHERE id = ?");
            $statusStmt->bind_param('si', $newStatus, $termoId);
            $statusStmt->execute();
            $statusStmt->close();

            $this->commit();
            return true;
        } catch (\Throwable $e) {
            $this->rollback();
            error_log('Error returning items: ' . $e->getMessage());
            return false;
        }
    }

    public function list(array $filters = [], int $limit = 20, int $offset = 0): array
    {
        $where = [];
        $params = [];
        $types = '';

        if (!empty($filters['search'])) {
            $term = '%' . $filters['search'] . '%';
            $where[] = '(codigo LIKE ? OR entregue_por LIKE ? OR tecnico_nome LIKE ?)';
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $types .= 'sss';
        }

        if (!empty($filters['status']) && in_array($filters['status'], ['pendente', 'assinado', 'devolvido_parcial', 'devolvido', 'cancelado'], true)) {
            $where[] = 'status = ?';
            $params[] = $filters['status'];
            $types .= 's';
        }

        $sql = 'SELECT id, codigo, emissor_id, entregue_por, tecnico_nome, tecnico_documento, tecnico_telefone, status, token_assinatura, token_expira_em, assinado_em, assinado_ip, assinado_user_agent, observacoes, created_at, updated_at FROM termos_responsabilidade';
        if (!empty($where)) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY id DESC LIMIT ? OFFSET ?';
        $params[] = $limit;
        $params[] = $offset;
        $types .= 'ii';

        $stmt = $this->conn->prepare($sql);
        if (!$stmt) {
            return [];
        }
        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $result = $stmt->get_result();

        $items = [];
        while ($row = $result->fetch_assoc()) {
            $row['itens'] = $this->getItemsByTermoId((int) $row['id']);
            $items[] = (new TermoResponsabilidade($row))->toArray();
        }
        $stmt->close();
        return $items;
    }

    public function count(array $filters = []): int
    {
        $where = [];
        $params = [];
        $types = '';

        if (!empty($filters['search'])) {
            $term = '%' . $filters['search'] . '%';
            $where[] = '(codigo LIKE ? OR entregue_por LIKE ? OR tecnico_nome LIKE ?)';
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $types .= 'sss';
        }

        if (!empty($filters['status']) && in_array($filters['status'], ['pendente', 'assinado', 'devolvido_parcial', 'devolvido', 'cancelado'], true)) {
            $where[] = 'status = ?';
            $params[] = $filters['status'];
            $types .= 's';
        }

        $sql = 'SELECT COUNT(*) as total FROM termos_responsabilidade';
        if (!empty($where)) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }

        $stmt = $this->conn->prepare($sql);
        if (!$stmt) {
            return 0;
        }
        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $res = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return (int) ($res['total'] ?? 0);
    }

    public function delete(int $id): bool
    {
        $stmt = $this->conn->prepare('DELETE FROM termos_responsabilidade WHERE id = ?');
        if (!$stmt) {
            return false;
        }
        $stmt->bind_param('i', $id);
        $res = $stmt->execute();
        $stmt->close();
        return $res;
    }
}
