<?php
require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../utils/cors.php';
require_once __DIR__ . '/../../../middleware/AdminAuth.php';
require_once __DIR__ . '/../../../models/Category.php';

handleCors();

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    errorResponse('Method not allowed', 405);
}

$data = json_decode(file_get_contents('php://input'), true);

$id = isset($data['id']) ? (int)$data['id'] : 0;
if (!$id) {
    errorResponse('Category ID is required', 400);
}

if (empty($data['name'])) {
    errorResponse('Category name is required', 400);
}

try {
    $database = new Database();
    $db = $database->getConnection();

    // Authenticate admin
    $auth = new AdminAuth($db);
    $auth->authenticate();

    $category = new Category($db);

    // Check if category exists
    $existing = $category->findById($id);
    if (!$existing) {
        errorResponse('Category not found', 404);
    }

    // Update category
    $result = $category->update($id, [
        'name' => $data['name'],
        'description' => $data['description'] ?? null
    ]);

    if ($result) {
        $updatedCategory = $category->findById($id);
        successResponse(['category' => $updatedCategory], 'Category updated successfully');
    } else {
        errorResponse('Failed to update category', 500);
    }

} catch (Exception $e) {
    error_log("Admin category update error: " . $e->getMessage());
    errorResponse('Failed to update category', 500);
}
