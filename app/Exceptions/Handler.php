<?php

namespace App\Exceptions;

use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class Handler extends ExceptionHandler
{
    protected function unauthenticated($request, AuthenticationException $exception): JsonResponse
    {
        return response()->json(['message' => 'Unauthenticated'], 401);
    }

    public function register(): void
    {
        $this->renderable(function (ModelNotFoundException $e) {
            return response()->json(['message' => 'Resource not found'], 404);
        });

        $this->renderable(function (NotFoundHttpException $e) {
            return response()->json(['message' => 'Route not found'], 404);
        });

        $this->renderable(function (ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        });
    }
}
