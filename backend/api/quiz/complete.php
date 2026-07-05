<?php
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/cors.php';
require_once __DIR__ . '/../../models/QuizSession.php';

handleCors();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Method not allowed', 405);
}

$data = getRequestBody();

if (!isset($data['session_id'])) {
    errorResponse('Session ID is required');
}

$sessionId = (int)$data['session_id'];
$timeTaken = isset($data['time_taken']) ? (int)$data['time_taken'] : 0;

try {
    $database = new Database();
    $db = $database->getConnection();

    $session = new QuizSession($db);
    $sessionData = $session->findById($sessionId);

    if (!$sessionData) {
        errorResponse('Session not found', 404);
    }

    if ($sessionData['is_completed']) {
        // Already completed, return results
        $results = $session->getResults($sessionId);
        $answers = $session->getAnswers($sessionId);

        successResponse([
            'results' => $results,
            'answers' => $answers
        ]);
        exit;
    }

    // Complete the quiz
    if (!$session->complete($sessionId, $timeTaken)) {
        errorResponse('Failed to complete quiz', 500);
    }

    // Get results
    $results = $session->getResults($sessionId);
    $answers = $session->getAnswers($sessionId);

    successResponse([
        'results' => [
            'session_id' => $results['id'],
            'total_questions' => (int)$results['total_questions'],
            'correct_answers' => (int)$results['correct_answers'],
            'wrong_answers' => (int)$results['wrong_answers'],
            'score' => (int)$results['score'],
            'total_points' => (int)$results['total_points'],
            'percentage' => (float)$results['percentage'],
            'time_taken' => (int)$results['time_taken']
        ],
        'answers' => $answers
    ], 'Quiz completed!');

} catch (Exception $e) {
    error_log("Quiz complete error: " . $e->getMessage());
    errorResponse('Failed to complete quiz', 500);
}
