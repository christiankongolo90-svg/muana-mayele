<?php
require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../utils/cors.php';
require_once __DIR__ . '/../../../middleware/AdminAuth.php';
require_once __DIR__ . '/../../../models/User.php';

handleCors();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Method not allowed', 405);
}

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if (!$id) {
    errorResponse('User ID is required', 400);
}

try {
    $database = new Database();
    $db = $database->getConnection();

    // Authenticate admin
    $auth = new AdminAuth($db);
    $auth->authenticate();

    $user = new User($db);
    $userData = $user->findById($id);

    if (!$userData) {
        errorResponse('User not found', 404);
    }

    successResponse(['user' => $userData]);

} catch (Exception $e) {
    error_log("Admin user show error: " . $e->getMessage());
    errorResponse('Failed to fetch user', 500);
}
