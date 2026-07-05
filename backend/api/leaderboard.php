<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/cors.php';
require_once __DIR__ . '/../models/User.php';

handleCors();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Method not allowed', 405);
}

$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
$limit = min($limit, 100); // Max 100 entries

try {
    $database = new Database();
    $db = $database->getConnection();

    $user = new User($db);
    $leaderboard = $user->getLeaderboard($limit);

    // Get user rank if user_id provided
    $userRank = null;
    if (isset($_GET['user_id'])) {
        $userRank = $user->getUserRank((int)$_GET['user_id']);
    }

    // Format leaderboard data
    $formattedLeaderboard = array_map(function($entry, $index) {
        return [
            'rank' => $index + 1,
            'user_id' => $entry['id'],
            'name' => $entry['full_name'],
            'neighborhood' => $entry['neighborhood'],
            'best_score' => (int)$entry['best_score'],
            'total_points' => (int)$entry['total_points'],
            'total_quizzes' => (int)$entry['total_quizzes'],
            'best_time' => $entry['best_time'] !== null ? (int)$entry['best_time'] : null
        ];
    }, $leaderboard, array_keys($leaderboard));

    $response = [
        'leaderboard' => $formattedLeaderboard,
        'total' => count($formattedLeaderboard)
    ];

    if ($userRank) {
        $response['user_rank'] = [
            'rank' => (int)$userRank['rank_pos'],
            'best_score' => (int)$userRank['best_score'],
            'best_time' => $userRank['best_time'] !== null ? (int)$userRank['best_time'] : null
        ];
    }

    successResponse($response);

} catch (Exception $e) {
    error_log("Leaderboard error: " . $e->getMessage());
    errorResponse('Failed to fetch leaderboard', 500);
}
