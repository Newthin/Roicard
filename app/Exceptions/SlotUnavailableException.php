<?php

namespace App\Exceptions;

use RuntimeException;

class SlotUnavailableException extends RuntimeException
{
    public function __construct(string $message = 'The requested time slot is unavailable.', int $code = 422)
    {
        parent::__construct($message, $code);
    }
}
