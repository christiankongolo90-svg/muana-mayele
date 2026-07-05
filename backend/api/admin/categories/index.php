<?php
require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../utils/cors.php';
require_once __DIR__ . '/../../../middleware/AdminAuth.php';
require_once __DIR__ . '/../../../models/Category.php';

handleCors();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Method not allowed', 405);
}

try {
    $database = new Database();
    $db = $database->getConnection();

    // Authenticate admin
    $auth = new AdminAuth($db);
    $auth->authenticate();

    $category = new Category($db);
    $categories = $category->getAll();

    successResponse(['categories' => $categories]);

} catch (Exception $e) {
    error_log("Admin categories list error: " . $e->getMessage());
    errorResponse('Failed to fetch categories', 500);
}
