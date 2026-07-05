<?php
require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../utils/cors.php';
require_once __DIR__ . '/../../../middleware/AdminAuth.php';
require_once __DIR__ . '/../../../models/User.php';

handleCors();

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
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

    $user = new User($db);

    // Check if user exists
    $existing = $user->findById($id);
    if (!$existing) {
        errorResponse('User not found', 404);
    }

    // Prevent admin from changing their own role
    if ($id === (int)$adminUser['id'] && isset($data['role']) && $data['role'] !== 'admin') {
        errorResponse('Cannot change your own admin role', 400);
    }

    // Update user
    $result = $user->update($id, $data);

    if ($result) {
        $updatedUser = $user->findById($id);
        successResponse(['user' => $updatedUser], 'User updated successfully');
    } else {
        errorResponse('Failed to update user', 500);
    }

} catch (Exception $e) {
    error_log("Admin user update error: " . $e->getMessage());
    errorResponse('Failed to update user', 500);
}
