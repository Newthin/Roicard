<?php

namespace App\Exceptions;

use RuntimeException;

class InvalidBookingStateException extends RuntimeException
{
    public function __construct(string $message = 'The booking is not in a valid state for this action.', int $code = 422)
    {
        parent::__construct($message, $code);
    }
}
