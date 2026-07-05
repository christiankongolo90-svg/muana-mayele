<?php
require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../utils/cors.php';
require_once __DIR__ . '/../../../middleware/AdminAuth.php';
require_once __DIR__ . '/../../../models/User.php';

handleCors();

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    errorResponse('Method not allowed', 405);
}

$data = json_decode(file_get_contents('php://input'), true);

$id = isset($data['id']) ? (int)$data['id'] : 0;
if (!$id) {
    errorResponse('User ID is required', 400);
}

try {
    $database = new Database();
    $db = $database->getConnection();

    // Authenticate admin
    $auth = new AdminAuth($db);
    $adminUser = $auth->authenticate();

    // Prevent admin from deleting themselves
    if ($id === (int)$adminUser['id']) {
        errorResponse('Cannot delete your own account', 400);
    }

    $user = new User($db);

    // Check if user exists
    $existing = $user->findById($id);
    if (!$existing) {
        errorResponse('User not found', 404);
    }

    // Delete user
    $result = $user->delete($id);

    if ($result) {
        successResponse(null, 'User deleted successfully');
    } else {
        errorResponse('Failed to delete user', 500);
    }

} catch (Exception $e) {
    error_log("Admin user delete error: " . $e->getMessage());
    errorResponse('Failed to delete user', 500);
}
