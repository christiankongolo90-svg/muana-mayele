<?php
require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../utils/cors.php';
require_once __DIR__ . '/../../../middleware/AdminAuth.php';
require_once __DIR__ . '/../../../models/Question.php';

handleCors();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Method not allowed', 405);
}

$data = json_decode(file_get_contents('php://input'), true);

// Validate required fields
if (empty($data['category_id'])) {
    errorResponse('Category is required', 400);
}
if (empty($data['question'])) {
    errorResponse('Question text is required', 400);
}
if (empty($data['options']) || !is_array($data['options']) || count($data['options']) !== 4) {
    errorResponse('Exactly 4 options are required', 400);
}
if (!isset($data['correct_answer']) || !in_array($data['correct_answer'], [0, 1, 2, 3])) {
    errorResponse('Valid correct answer (0-3) is required', 400);
}

try {
    $database = new Database();
    $db = $database->getConnection();

    // Authenticate admin
    $auth = new AdminAuth($db);
    $auth->authenticate();

    $question = new Question($db);

    $questionId = $question->create([
        'category_id' => $data['category_id'],
        'question' => $data['question'],
        'options' => $data['options'],
        'correct_answer' => $data['correct_answer'],
        'difficulty' => $data['difficulty'] ?? 'medium',
        'is_active' => $data['is_active'] ?? true
    ]);

    if ($questionId) {
        $newQuestion = $question->getById($questionId);
        successResponse(['question' => $newQuestion], 'Question created successfully');
    } else {
        errorResponse('Failed to create question', 500);
    }

} catch (Exception $e) {
    error_log("Admin question create error: " . $e->getMessage());
    errorResponse('Failed to create question', 500);
}
