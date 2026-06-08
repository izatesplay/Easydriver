<?php
namespace Api\Core;

use Exception;

class Router {
    private array $routes = [];

    public function addRoute(string $method, string $path, callable $handler): void {
        // Clean path and build regex for parameters like :id
        $cleanPath = trim($path, '/');
        // Convert :id to ([^/]+)
        $pattern = preg_replace('/:([a-zA-Z0-9_]+)/', '(?P<$1>[^/]+)', $cleanPath);
        $pattern = '#^' . $pattern . '$#';

        $this->routes[] = [
            'method' => strtoupper($method),
            'pattern' => $pattern,
            'handler' => $handler
        ];
    }

    public function resolve(): void {
        header("Access-Control-Allow-Origin: *");
        header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
        header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
        header("Content-Type: application/json; charset=UTF-8");

        $method = $_SERVER['REQUEST_METHOD'];
        if ($method === 'OPTIONS') {
            http_response_code(200);
            exit();
        }

        // Determine request URI or fallback route parameter
        if (isset($_GET['route'])) {
            $uri = trim($_GET['route'], '/');
        } else {
            // Check direct request uri e.g. /api/users
            $requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
            // strip "/api" or "/api/index.php" or "/public/api" prefix
            $prefixes = ['/api/index.php', '/public/api', '/api'];
            foreach ($prefixes as $prefix) {
                if (strpos($requestUri, $prefix) === 0) {
                    $requestUri = substr($requestUri, strlen($prefix));
                    break;
                }
            }
            $uri = trim($requestUri, '/');
        }

        // Read raw JSON requests
        $rawInput = file_get_contents('php://input');
        $body = json_decode($rawInput, true) ?? [];

        foreach ($this->routes as $route) {
            if ($route['method'] === $method && preg_match($route['pattern'], $uri, $matches)) {
                // Extract named parameters from regex match
                $params = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);
                try {
                    // Call the custom closure or controller method
                    call_user_func($route['handler'], $params, $body);
                    return;
                } catch (Exception $e) {
                    http_response_code(500);
                    echo json_encode([
                        'success' => false,
                        'error' => 'خطای داخلی سرور رخ داد: ' . $e->getMessage(),
                        'trace' => $e->getTraceAsString()
                    ], JSON_UNESCAPED_UNICODE);
                    return;
                }
            }
        }

        // If no route matches, return a clear 404
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'error' => "آدرس وب‌سرویس یافت نشد (مسیر: {$uri}).",
            'resolved_route' => $uri,
            'method' => $method
        ], JSON_UNESCAPED_UNICODE);
    }
}
