<?php

namespace Tests\Unit;

use App\Api\Helpers\Validator;
use PHPUnit\Framework\TestCase;
use Exception;

class ValidatorTest extends TestCase
{
    public function testRequiredPassesWhenFieldExistsAndNotEmpty(): void
    {
        $data = ['name' => 'John'];
        Validator::required($data, ['name']);
        $this->expectNotToPerformAssertions();
    }

    public function testRequiredThrowsWhenFieldMissing(): void
    {
        $this->expectException(Exception::class);
        $this->expectExceptionMessage("Campo 'name' é obrigatório");

        Validator::required([], ['name']);
    }

    public function testRequiredThrowsWhenFieldIsEmptyString(): void
    {
        $this->expectException(Exception::class);
        $this->expectExceptionMessage("Campo 'name' é obrigatório");

        Validator::required(['name' => ''], ['name']);
    }

    public function testRequiredThrowsWhenFieldIsWhitespace(): void
    {
        $this->expectException(Exception::class);
        $this->expectExceptionMessage("Campo 'name' é obrigatório");

        Validator::required(['name' => '   '], ['name']);
    }

    public function testRequiredPassesForMultipleFields(): void
    {
        $data = ['name' => 'John', 'email' => 'john@test.com'];
        Validator::required($data, ['name', 'email']);
        $this->expectNotToPerformAssertions();
    }

    public function testRequiredThrowsOnFirstMissingField(): void
    {
        $this->expectException(Exception::class);
        $this->expectExceptionMessage("Campo 'email' é obrigatório");

        Validator::required(['name' => 'John'], ['name', 'email']);
    }

    public function testIntegerPassesWhenFieldIsInt(): void
    {
        $data = ['age' => 25];
        Validator::integer($data, 'age');
        $this->expectNotToPerformAssertions();
    }

    public function testIntegerPassesWhenFieldIsIntString(): void
    {
        $data = ['age' => '25'];
        Validator::integer($data, 'age');
        $this->expectNotToPerformAssertions();
    }

    public function testIntegerPassesWhenFieldNotSet(): void
    {
        $data = [];
        Validator::integer($data, 'age');
        $this->expectNotToPerformAssertions();
    }

    public function testIntegerThrowsForNonNumeric(): void
    {
        $this->expectException(Exception::class);
        $this->expectExceptionMessage("Campo 'age' deve ser inteiro");

        Validator::integer(['age' => 'abc'], 'age');
    }

    public function testIntegerThrowsForFloat(): void
    {
        $this->expectException(Exception::class);
        $this->expectExceptionMessage("Campo 'age' deve ser inteiro");

        Validator::integer(['age' => 25.5], 'age');
    }

    public function testMaxPassesWhenFieldShorterThanLimit(): void
    {
        $data = ['name' => 'John'];
        Validator::max($data, 'name', 10);
        $this->expectNotToPerformAssertions();
    }

    public function testMaxPassesWhenFieldEqualsLimit(): void
    {
        $data = ['name' => '1234567890'];
        Validator::max($data, 'name', 10);
        $this->expectNotToPerformAssertions();
    }

    public function testMaxPassesWhenFieldNotSet(): void
    {
        $data = [];
        Validator::max($data, 'name', 10);
        $this->expectNotToPerformAssertions();
    }

    public function testMaxThrowsWhenFieldExceedsLimit(): void
    {
        $this->expectException(Exception::class);
        $this->expectExceptionMessage("Campo 'name' excede 5 caracteres");

        Validator::max(['name' => 'John Doe'], 'name', 5);
    }

    public function testMaxRespectsMultibyteCharacters(): void
    {
        $data = ['name' => 'ãéíóú'];
        Validator::max($data, 'name', 5);
        $this->expectNotToPerformAssertions();
    }
}
