<?php

namespace App\Api;

use App\Api\Helpers\Response;

class Router
{
    private array $routes = [];

    public function addRoute(string $route, string $method, callable $handler): self
    {
        $this->routes[$route][$method] = $handler;
        return $this;
    }

    public function getRoutes(): array
    {
        return $this->routes;
    }

    public function dispatch(string $route, string $method): void
    {
        if (empty($route)) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'message' => 'Rota não encontrada'
            ]);
            return;
        }

        if (!isset($this->routes[$route])) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'message' => 'Rota não encontrada'
            ]);
            return;
        }

        if (!isset($this->routes[$route][$method])) {
            Response::error('Método não permitido', 405);
            return;
        }

        ($this->routes[$route][$method])();
    }
}
