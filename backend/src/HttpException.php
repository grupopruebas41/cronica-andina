<?php
namespace App;

/** Error controlado que se traduce a una respuesta JSON con su código HTTP. */
final class HttpException extends \RuntimeException
{
    public function __construct(
        int $status,
        string $message,
        public readonly array $errors = []
    ) {
        parent::__construct($message, $status);
    }
}
