<?php
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/cors.php';
require_once __DIR__ . '/../../middleware/AdminAuth.php';

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

    // Get total users
    $stmt = $db->query("SELECT COUNT(*) as total FROM users");
    $totalUsers = (int)$stmt->fetch()['total'];

    // Get total questions
    $stmt = $db->query("SELECT COUNT(*) as total FROM questions");
    $totalQuestions = (int)$stmt->fetch()['total'];

    // Get total sessions
    $stmt = $db->query("SELECT COUNT(*) as total FROM quiz_sessions");
    $totalSessions = (int)$stmt->fetch()['total'];

    // Get completed sessions
    $stmt = $db->query("SELECT COUNT(*) as total FROM quiz_sessions WHERE is_completed = TRUE");
    $completedSessions = (int)$stmt->fetch()['total'];

    // Get average score
    $stmt = $db->query("SELECT AVG(total_points) as avg FROM quiz_sessions WHERE is_completed = TRUE");
    $avgResult = $stmt->fetch();
    $averageScore = round((float)($avgResult['avg'] ?? 0), 1);

    // Get recent users (last 5)
    $stmt = $db->query("SELECT id, full_name, phone, country_code, role
                        FROM users ORDER BY id DESC LIMIT 5");
    $recentUsers = $stmt->fetchAll();

    // Get recent sessions (last 5)
    $stmt = $db->query("SELECT qs.id, qs.total_points, qs.correct_answers, qs.total_questions,
                               qs.started_at, u.full_name
                        FROM quiz_sessions qs
                        JOIN users u ON qs.user_id = u.id
                        WHERE qs.is_completed = TRUE
                        ORDER BY qs.ended_at DESC LIMIT 5");
    $recentSessions = $stmt->fetchAll();

    successResponse([
        'totalUsers' => $totalUsers,
        'totalQuestions' => $totalQuestions,
        'totalSessions' => $totalSessions,
        'completedSessions' => $completedSessions,
        'averageScore' => $averageScore,
        'recentUsers' => $recentUsers,
        'recentSessions' => $recentSessions
    ]);

} catch (Exception $e) {
    error_log("Admin stats error: " . $e->getMessage());
    errorResponse('Failed to fetch stats', 500);
}
