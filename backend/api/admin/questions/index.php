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

try {
    $database = new Database();
    $db = $database->getConnection();

    // Authenticate admin
    $auth = new AdminAuth($db);
    $auth->authenticate();

    $question = new Question($db);

    $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
    $limit = isset($_GET['limit']) ? min(100, max(1, (int)$_GET['limit'])) : 20;
    $categoryId = isset($_GET['category_id']) ? (int)$_GET['category_id'] : null;
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';

    $questions = $question->getAll($page, $limit, $categoryId, $search);
    $total = $question->count($categoryId, $search);

    successResponse([
        'questions' => $questions,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => $total,
            'pages' => ceil($total / $limit)
        ]
    ]);

} catch (Exception $e) {
    error_log("Admin questions list error: " . $e->getMessage());
    errorResponse('Failed to fetch questions', 500);
}
