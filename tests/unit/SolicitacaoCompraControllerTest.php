<?php

namespace Tests\Unit;

use App\Api\Controllers\SolicitacaoCompraController;
use PHPUnit\Framework\TestCase;

class SolicitacaoCompraControllerTest extends TestCase
{
    public function testDuplicateKeyGetsFriendlyMessage(): void
    {
        $e = new \mysqli_sql_exception(
            "Duplicate entry 'SC-9' for key 'uk_solicitacao_compra_sc'"
        );

        $this->assertSame(
            'Já existe uma solicitação com esse número de SC.',
            SolicitacaoCompraController::dbErrorMessage($e)
        );
    }

    public function testForeignKeyAndNotNullGetGenericValidationMessage(): void
    {
        $fk = new \mysqli_sql_exception(
            'Cannot add or update a child row: a foreign key constraint fails'
        );
        $notNull = new \mysqli_sql_exception("Column 'data' cannot be null");

        $this->assertSame(
            'Dados inválidos para esta solicitação.',
            SolicitacaoCompraController::dbErrorMessage($fk)
        );
        $this->assertSame(
            'Dados inválidos para esta solicitação.',
            SolicitacaoCompraController::dbErrorMessage($notNull)
        );
    }

    public function testUnknownDatabaseErrorNeverLeaksSql(): void
    {
        $e = new \mysqli_sql_exception(
            "Table 'manutencao.solicitacao_compra' doesn't exist"
        );

        $message = SolicitacaoCompraController::dbErrorMessage($e);

        $this->assertSame('Não foi possível salvar a solicitação.', $message);
        $this->assertStringNotContainsString('manutencao', $message);
        $this->assertStringNotContainsString('Table', $message);
    }
}
