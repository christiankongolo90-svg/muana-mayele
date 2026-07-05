<?php
require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../utils/cors.php';
require_once __DIR__ . '/../../../middleware/AdminAuth.php';
require_once __DIR__ . '/../../../models/Question.php';

handleCors();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Method not allowed', 405);
}

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
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
    $questionData = $question->getById($id);

    if (!$questionData) {
        errorResponse('Question not found', 404);
    }

    successResponse(['question' => $questionData]);

} catch (Exception $e) {
    error_log("Admin question show error: " . $e->getMessage());
    errorResponse('Failed to fetch question', 500);
}
