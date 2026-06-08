<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Register highly robust PSR-4 Autoloader mapping case-sensistive and case-insensitive folders for maximum reliability
spl_autoload_register(function ($class) {
    $prefix = 'Api\\';
    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }

    $relative_class = substr($class, $len);
    
    // Direct path mapping (e.g. Core\Router => core/Router.php)
    $file = __DIR__ . '/' . str_replace('\\', '/', $relative_class) . '.php';
    if (file_exists($file)) {
        require_once $file;
        return;
    }

    // Try parts-based case normalization (e.g., Controllers\AuthController => controllers/AuthController.php)
    $parts = explode('\\', $relative_class);
    $className = array_pop($parts);
    $folders = array_map('strtolower', $parts);
    
    $folderPath = count($folders) > 0 ? implode('/', $folders) . '/' : '';
    $lowerFile = __DIR__ . '/' . $folderPath . $className . '.php';
    
    if (file_exists($lowerFile)) {
        require_once $lowerFile;
    }
});

use Api\Config\Database;
use Api\Core\Router;
use Api\Controllers\AuthController;
use Api\Controllers\TicketsController;
use Api\Controllers\UsersController;
use Api\Controllers\SupportChatController;
use Api\Controllers\OtherController;

try {
    // 1. Boot up and authenticate Database connection safely
    $dbConfig = new Database();
    $pdo = $dbConfig->getConnection();

    // 2. Instantiate controllers with injected Database pointer
    $authCtrl = new AuthController($pdo);
    $ticketsCtrl = new TicketsController($pdo);
    $usersCtrl = new UsersController($pdo);
    $chatCtrl = new SupportChatController($pdo);
    $otherCtrl = new OtherController($pdo);

    // 3. Initiate Router
    $router = new Router();

    // 4. MAP ENDPOINTS CLEANLY

    // User profiles CRUD
    $router->addRoute('GET', 'users', [$usersCtrl, 'list']);
    $router->addRoute('GET', 'users/:id', [$usersCtrl, 'read']);
    $router->addRoute('POST', 'users', [$usersCtrl, 'create']);
    $router->addRoute('PUT', 'users/:id', [$usersCtrl, 'update']);
    $router->addRoute('DELETE', 'users/:id', [$usersCtrl, 'delete']);

    // Authentications API
    $router->addRoute('POST', 'auth/login', [$authCtrl, 'login']);
    $router->addRoute('POST', 'auth/set-password', [$authCtrl, 'setPassword']);

    // Support Tickets & Replies API
    $router->addRoute('GET', 'tickets', [$ticketsCtrl, 'list']);
    $router->addRoute('GET', 'tickets/:id', [$ticketsCtrl, 'read']);
    $router->addRoute('POST', 'tickets', [$ticketsCtrl, 'create']);
    $router->addRoute('PUT', 'tickets/:id', [$ticketsCtrl, 'update']);
    $router->addRoute('DELETE', 'tickets/:id', [$ticketsCtrl, 'delete']);
    $router->addRoute('POST', 'tickets/:id/messages', [$ticketsCtrl, 'addMessage']);

    // Dedicated Support Live Chat and Conversion APIs
    $router->addRoute('POST', 'support-chat/initiate', [$chatCtrl, 'initiate']);
    $router->addRoute('POST', 'support-chat/:id/convert', [$chatCtrl, 'convert']);

    // Technicians CRUD
    $router->addRoute('GET', 'technicians', [$otherCtrl, 'listTechnicians']);
    $router->addRoute('POST', 'technicians', [$otherCtrl, 'createTechnician']);
    $router->addRoute('PUT', 'technicians/:id', [$otherCtrl, 'updateTechnician']);
    $router->addRoute('DELETE', 'technicians/:id', [$otherCtrl, 'deleteTechnician']);

    // Service Requests CRUD
    $router->addRoute('GET', 'requests', [$otherCtrl, 'listRequests']);
    $router->addRoute('POST', 'requests', [$otherCtrl, 'createRequest']);
    $router->addRoute('PUT', 'requests/:id', [$otherCtrl, 'updateRequest']);
    $router->addRoute('DELETE', 'requests/:id', [$otherCtrl, 'deleteRequest']);

    // User reviews & feedback
    $router->addRoute('GET', 'reviews', [$otherCtrl, 'listReviews']);
    $router->addRoute('POST', 'reviews', [$otherCtrl, 'createReview']);
    $router->addRoute('PUT', 'reviews/:id', [$otherCtrl, 'updateReview']);
    $router->addRoute('DELETE', 'reviews/:id', [$otherCtrl, 'deleteReview']);

    // Push notifications flags
    $router->addRoute('GET', 'notifications', [$otherCtrl, 'listNotifications']);
    $router->addRoute('POST', 'notifications', [$otherCtrl, 'createNotification']);
    $router->addRoute('POST', 'notifications/read-all', [$otherCtrl, 'readAllNotifications']);
    $router->addRoute('POST', 'notifications/:id/read', [$otherCtrl, 'readSingleNotification']);

    // Extra utilities
    $router->addRoute('GET', 'compatible-drivers', [$otherCtrl, 'compatibleDrivers']);
    $router->addRoute('POST', 'upload', [$otherCtrl, 'upload']);
    $router->addRoute('POST', 'ai-chat', [$otherCtrl, 'aiChat']);
    $router->addRoute('POST', 'analyze-system', [$otherCtrl, 'analyzeSystem']);
    $router->addRoute('GET', 'db-health', [$otherCtrl, 'dbHealth']);
    $router->addRoute('GET', 'db-status', [$otherCtrl, 'dbStatus']);

    // 5. Run Routing resolve
    $router->resolve();

} catch (Exception $e) {
    header("Content-Type: application/json; charset=UTF-8");
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'خطای سیستمی بارگذاری درگاه وب‌سرویس: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
