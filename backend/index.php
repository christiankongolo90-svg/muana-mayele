<?php
/**
 * Muana Mayele Quiz API
 * Main entry point and router
 */

require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/utils/cors.php';

handleCors();

// Get the request URI and method
$requestUri = $_SERVER['REQUEST_URI'];
$requestMethod = $_SERVER['REQUEST_METHOD'];

// Remove query string and base path
$path = parse_url($requestUri, PHP_URL_PATH);
$path = preg_replace('/^\/muana-mayele-api/', '', $path); // Remove XAMPP folder prefix
$path = preg_replace('/^\/backend/', '', $path); // Remove /backend prefix if present
$path = preg_replace('/^\/api/', '', $path); // Remove /api prefix if present
$path = trim($path, '/');

// Simple router
$routes = [
    'GET' => [
        '' => function() {
            successResponse([
                'name' => 'Muana Mayele Quiz API',
                'version' => '1.0.0',
                'endpoints' => [
                    'POST /api/auth/send-passcode' => 'Send passcode for login/register',
                    'POST /api/auth/verify-passcode' => 'Verify passcode and login/register',
                    'POST /api/register' => 'Register a new user (legacy)',
                    'GET /api/questions' => 'Get random quiz questions',
                    'POST /api/quiz/start' => 'Start a new quiz session',
                    'POST /api/quiz/answer' => 'Submit an answer',
                    'POST /api/quiz/complete' => 'Complete the quiz',
                    'GET /api/quiz/results' => 'Get quiz results',
                    'GET /api/leaderboard' => 'Get leaderboard',
                    'GET /api/user/stats' => 'Get user stats and quiz history',
                    'GET /api/admin/*' => 'Admin endpoints (requires admin role)'
                ]
            ]);
        },
        'questions' => __DIR__ . '/api/questions.php',
        'leaderboard' => __DIR__ . '/api/leaderboard.php',
        'quiz/settings' => __DIR__ . '/api/quiz/settings.php',
        'quiz/results' => __DIR__ . '/api/quiz/results.php',
        'user/stats' => __DIR__ . '/api/user/stats.php',
        // Admin routes
        'admin/stats' => __DIR__ . '/api/admin/stats.php',
        'admin/users' => __DIR__ . '/api/admin/users/index.php',
        'admin/users/show' => __DIR__ . '/api/admin/users/show.php',
        'admin/questions' => __DIR__ . '/api/admin/questions/index.php',
        'admin/questions/show' => __DIR__ . '/api/admin/questions/show.php',
        'admin/categories' => __DIR__ . '/api/admin/categories/index.php',
        'admin/sessions' => __DIR__ . '/api/admin/sessions/index.php',
        'admin/sessions/show' => __DIR__ . '/api/admin/sessions/show.php',
        'admin/settings' => __DIR__ . '/api/admin/settings.php',
        'site-content' => __DIR__ . '/api/site-content.php',
        'admin/site-content' => __DIR__ . '/api/admin/site-content/index.php',
    ],
    'POST' => [
        'auth/send-passcode' => __DIR__ . '/api/auth/send-passcode.php',
        'auth/verify-passcode' => __DIR__ . '/api/auth/verify-passcode.php',
        'register' => __DIR__ . '/api/register.php',
        'quiz/start' => __DIR__ . '/api/quiz/start.php',
        'quiz/answer' => __DIR__ . '/api/quiz/answer.php',
        'quiz/complete' => __DIR__ . '/api/quiz/complete.php',
        // Admin routes
        'admin/questions/create' => __DIR__ . '/api/admin/questions/create.php',
        'admin/categories/create' => __DIR__ . '/api/admin/categories/create.php',
        'admin/site-content/upload' => __DIR__ . '/api/admin/site-content/upload.php',
    ],
    'PUT' => [
        'admin/settings/update' => __DIR__ . '/api/admin/settings-update.php',
        'admin/users/update' => __DIR__ . '/api/admin/users/update.php',
        'admin/questions/update' => __DIR__ . '/api/admin/questions/update.php',
        'admin/categories/update' => __DIR__ . '/api/admin/categories/update.php',
        'admin/sessions/update' => __DIR__ . '/api/admin/sessions/update.php',
        'admin/site-content/update' => __DIR__ . '/api/admin/site-content/update.php',
    ],
    'DELETE' => [
        'admin/users/delete' => __DIR__ . '/api/admin/users/delete.php',
        'admin/questions/delete' => __DIR__ . '/api/admin/questions/delete.php',
        'admin/categories/delete' => __DIR__ . '/api/admin/categories/delete.php',
        'admin/sessions/delete' => __DIR__ . '/api/admin/sessions/delete.php',
    ]
];

// Serve uploaded files directly
if (strpos($path, 'uploads/') === 0) {
    $filePath = __DIR__ . '/' . $path;
    if (file_exists($filePath) && is_file($filePath)) {
        $mimeTypes = [
            'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg',
            'png' => 'image/png', 'gif' => 'image/gif',
            'webp' => 'image/webp', 'svg' => 'image/svg+xml',
        ];
        $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
        $mime = $mimeTypes[$ext] ?? 'application/octet-stream';
        header('Content-Type: ' . $mime);
        header('Cache-Control: public, max-age=86400');
        readfile($filePath);
        exit;
    }
    errorResponse('File not found', 404);
}

// Handle the request
if (isset($routes[$requestMethod][$path])) {
    $handler = $routes[$requestMethod][$path];

    if (is_callable($handler)) {
        $handler();
    } else if (is_string($handler) && file_exists($handler)) {
        require $handler;
    } else {
        errorResponse('Route handler not found', 500);
    }
} else {
    // Check if it's a valid endpoint but wrong method
    $allRoutes = array_merge(
        array_keys($routes['GET'] ?? []),
        array_keys($routes['POST'] ?? []),
        array_keys($routes['PUT'] ?? []),
        array_keys($routes['DELETE'] ?? [])
    );

    if (in_array($path, $allRoutes)) {
        errorResponse('Method not allowed', 405);
    } else {
        errorResponse('Endpoint not found', 404);
    }
}
