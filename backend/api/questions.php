<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/cors.php';
require_once __DIR__ . '/../models/Question.php';

handleCors();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Method not allowed', 405);
}

try {
    $database = new Database();
    $db = $database->getConnection();
    $question = new Question($db);

    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : QUIZ_TOTAL_QUESTIONS;
    $limit = min($limit, 50); // Max 50 questions

    $questions = $question->getRandomQuestions($limit);

    // Remove correct_answer from response (client shouldn't know answers)
    $safeQuestions = array_map(function($q) {
        return [
            'id' => $q['id'],
            'question' => $q['question'],
            'options' => $q['options'],
            'category' => $q['category'],
            'difficulty' => $q['difficulty']
        ];
    }, $questions);

    successResponse([
        'questions' => $safeQuestions,
        'total' => count($safeQuestions),
        'timeLimit' => QUIZ_TIME_LIMIT
    ]);

} catch (Exception $e) {
    error_log("Questions error: " . $e->getMessage());
    errorResponse('Failed to fetch questions', 500);
}
