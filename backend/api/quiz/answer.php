<?php
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/cors.php';
require_once __DIR__ . '/../../models/Question.php';
require_once __DIR__ . '/../../models/QuizSession.php';

handleCors();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Method not allowed', 405);
}

$data = getRequestBody();

// Validate required fields
$required = ['session_id', 'question_id', 'selected_answer'];
$missing = validateRequired($data, $required);
if (!empty($missing)) {
    errorResponse('Missing required fields: ' . implode(', ', $missing));
}

$sessionId = (int)$data['session_id'];
$questionId = (int)$data['question_id'];
$selectedAnswer = (int)$data['selected_answer'];

try {
    $database = new Database();
    $db = $database->getConnection();

    // Verify session exists and is not completed
    $session = new QuizSession($db);
    $sessionData = $session->findById($sessionId);

    if (!$sessionData) {
        errorResponse('Session not found', 404);
    }

    if ($sessionData['is_completed']) {
        errorResponse('Quiz already completed');
    }

    // Get question to check answer
    $questionModel = new Question($db);
    $question = $questionModel->getById($questionId);

    if (!$question) {
        errorResponse('Question not found', 404);
    }

    $isCorrect = ($selectedAnswer === (int)$question['correct_answer']);

    // Save the answer
    if (!$session->saveAnswer($sessionId, $questionId, $selectedAnswer, $isCorrect)) {
        errorResponse('Failed to save answer', 500);
    }

    successResponse([
        'is_correct' => $isCorrect,
        'correct_answer' => (int)$question['correct_answer'],
        'points_earned' => $isCorrect ? POINTS_PER_CORRECT : 0
    ]);

} catch (Exception $e) {
    error_log("Answer submission error: " . $e->getMessage());
    errorResponse('Failed to submit answer', 500);
}
