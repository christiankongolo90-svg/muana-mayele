<?php
require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../utils/cors.php';
require_once __DIR__ . '/../../../middleware/AdminAuth.php';
require_once __DIR__ . '/../../../models/Question.php';

handleCors();

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    errorResponse('Method not allowed', 405);
}

$data = json_decode(file_get_contents('php://input'), true);

$id = isset($data['id']) ? (int)$data['id'] : 0;
if (!$id) {
    errorResponse('Question ID is required', 400);
}

// Validate options if provided
if (isset($data['options']) && (!is_array($data['options']) || count($data['options']) !== 4)) {
    errorResponse('Exactly 4 options are required', 400);
}

// Validate correct_answer if provided
if (isset($data['correct_answer']) && !in_array($data['correct_answer'], [0, 1, 2, 3])) {
    errorResponse('Valid correct answer (0-3) is required', 400);
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

    // Update question
    $result = $question->update($id, $data);

    if ($result) {
        $updatedQuestion = $question->getById($id);
        successResponse(['question' => $updatedQuestion], 'Question updated successfully');
    } else {
        errorResponse('Failed to update question', 500);
    }

} catch (Exception $e) {
    error_log("Admin question update error: " . $e->getMessage());
    errorResponse('Failed to update question', 500);
}
