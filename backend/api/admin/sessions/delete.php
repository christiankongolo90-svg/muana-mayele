<?php
require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../utils/cors.php';
require_once __DIR__ . '/../../../middleware/AdminAuth.php';
require_once __DIR__ . '/../../../models/QuizSession.php';

handleCors();

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    errorResponse('Method not allowed', 405);
}

$data = json_decode(file_get_contents('php://input'), true);

$id = isset($data['id']) ? (int)$data['id'] : 0;
if (!$id) {
    errorResponse('Session ID is required', 400);
}

try {
    $database = new Database();
    $db = $database->getConnection();

    // Authenticate admin
    $auth = new AdminAuth($db);
    $auth->authenticate();

    $session = new QuizSession($db);

    // Check if session exists
    $existing = $session->findById($id);
    if (!$existing) {
        errorResponse('Session not found', 404);
    }

    // Delete session
    $result = $session->delete($id);

    if ($result) {
        successResponse(null, 'Session deleted successfully');
    } else {
        errorResponse('Failed to delete session', 500);
    }

} catch (Exception $e) {
    error_log("Admin session delete error: " . $e->getMessage());
    errorResponse('Failed to delete session', 500);
}
