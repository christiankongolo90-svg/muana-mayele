<?php
require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../utils/cors.php';
require_once __DIR__ . '/../../../middleware/AdminAuth.php';
require_once __DIR__ . '/../../../models/Question.php';

handleCors();

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    errorResponse('Method not allowed', 405);
}

$data = json_decode(file_get_contents('php://input'), true);

$id = isset($data['id']) ? (int)$data['id'] : 0;
if (!$id) {
    errorResponse('Question ID is required', 400);
}

try {
    $database = new Database();
    $db = $database->getConnection();

    // Authenticate admin
    $auth = new AdminAuth($db);
    $auth->authenticate();

    $question = new Question($db);

    // Check if question exists
    $existing = $question->getById($id);
    if (!$existing) {
        errorResponse('Question not found', 404);
    }

    // Delete question
    $result = $question->delete($id);

    if ($result) {
        successResponse(null, 'Question deleted successfully');
    } else {
        errorResponse('Failed to delete question', 500);
    }

} catch (Exception $e) {
    error_log("Admin question delete error: " . $e->getMessage());
    errorResponse('Failed to delete question', 500);
}
