<?php
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/cors.php';
require_once __DIR__ . '/../../models/QuizSession.php';

handleCors();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Method not allowed', 405);
}

if (!isset($_GET['session_id'])) {
    errorResponse('Session ID is required');
}

$sessionId = (int)$_GET['session_id'];

try {
    $database = new Database();
    $db = $database->getConnection();

    $session = new QuizSession($db);
    $results = $session->getResults($sessionId);

    if (!$results) {
        errorResponse('Session not found', 404);
    }

    if (!$results['is_completed']) {
        errorResponse('Quiz not yet completed');
    }

    $answers = $session->getAnswers($sessionId);

    successResponse([
        'results' => [
            'session_id' => $results['id'],
            'user_name' => $results['full_name'],
            'total_questions' => (int)$results['total_questions'],
            'correct_answers' => (int)$results['correct_answers'],
            'wrong_answers' => (int)$results['wrong_answers'],
            'score' => (int)$results['score'],
            'total_points' => (int)$results['total_points'],
            'percentage' => (float)$results['percentage'],
            'time_taken' => (int)$results['time_taken'],
            'started_at' => $results['started_at'],
            'ended_at' => $results['ended_at']
        ],
        'answers' => $answers
    ]);

} catch (Exception $e) {
    error_log("Results error: " . $e->getMessage());
    errorResponse('Failed to fetch results', 500);
}
