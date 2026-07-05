<?php
require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../utils/cors.php';
require_once __DIR__ . '/../../../middleware/AdminAuth.php';
require_once __DIR__ . '/../../../models/QuizSession.php';

handleCors();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Method not allowed', 405);
}

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
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
    $sessionData = $session->getResults($id);

    if (!$sessionData) {
        errorResponse('Session not found', 404);
    }

    // Get answers for the session
    $answers = $session->getAnswers($id);

    successResponse([
        'session' => $sessionData,
        'answers' => $answers
    ]);

} catch (Exception $e) {
    error_log("Admin session show error: " . $e->getMessage());
    errorResponse('Failed to fetch session', 500);
}
