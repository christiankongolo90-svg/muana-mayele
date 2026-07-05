<?php
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/cors.php';

handleCors();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Method not allowed', 405);
}

$userId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : 0;

if (!$userId) {
    errorResponse('User ID is required', 400);
}

try {
    $database = new Database();
    $conn = $database->getConnection();

    // Get user info
    $userQuery = "SELECT id, full_name, phone, country_code, email, neighborhood
                  FROM users WHERE id = :user_id";
    $userStmt = $conn->prepare($userQuery);
    $userStmt->bindParam(':user_id', $userId, PDO::PARAM_INT);
    $userStmt->execute();
    $user = $userStmt->fetch();

    if (!$user) {
        errorResponse('User not found', 404);
    }

    // Get first quiz date as member_since
    $firstQuizQuery = "SELECT MIN(started_at) as first_quiz FROM quiz_sessions WHERE user_id = :user_id";
    $firstQuizStmt = $conn->prepare($firstQuizQuery);
    $firstQuizStmt->bindParam(':user_id', $userId, PDO::PARAM_INT);
    $firstQuizStmt->execute();
    $firstQuizResult = $firstQuizStmt->fetch();
    $memberSince = $firstQuizResult['first_quiz'] ?? date('Y-m-d H:i:s');

    // Get user statistics
    $statsQuery = "SELECT
                    COUNT(CASE WHEN is_completed = TRUE THEN 1 END) as total_quizzes,
                    COALESCE(MAX(total_points), 0) as best_score,
                    COALESCE(SUM(total_points), 0) as total_points,
                    COALESCE(AVG(CASE WHEN is_completed = TRUE THEN total_points END), 0) as average_score,
                    COALESCE(SUM(correct_answers), 0) as total_correct,
                    COALESCE(SUM(wrong_answers), 0) as total_wrong
                   FROM quiz_sessions
                   WHERE user_id = :user_id";
    $statsStmt = $conn->prepare($statsQuery);
    $statsStmt->bindParam(':user_id', $userId, PDO::PARAM_INT);
    $statsStmt->execute();
    $stats = $statsStmt->fetch();

    // Get user rank
    $rankQuery = "SELECT COUNT(*) + 1 as rank
                  FROM (
                      SELECT user_id, MAX(total_points) as best_score
                      FROM quiz_sessions
                      WHERE is_completed = TRUE
                      GROUP BY user_id
                      HAVING best_score > (
                          SELECT COALESCE(MAX(total_points), 0)
                          FROM quiz_sessions
                          WHERE user_id = :user_id AND is_completed = TRUE
                      )
                  ) as higher_scores";
    $rankStmt = $conn->prepare($rankQuery);
    $rankStmt->bindParam(':user_id', $userId, PDO::PARAM_INT);
    $rankStmt->execute();
    $rankResult = $rankStmt->fetch();
    $rank = $stats['total_quizzes'] > 0 ? (int)$rankResult['rank'] : null;

    // Get recent quiz history (last 10 quizzes)
    $historyQuery = "SELECT
                        id as session_id,
                        total_questions,
                        correct_answers,
                        wrong_answers,
                        total_points as score,
                        time_taken,
                        started_at,
                        ended_at
                     FROM quiz_sessions
                     WHERE user_id = :user_id AND is_completed = TRUE
                     ORDER BY ended_at DESC
                     LIMIT 10";
    $historyStmt = $conn->prepare($historyQuery);
    $historyStmt->bindParam(':user_id', $userId, PDO::PARAM_INT);
    $historyStmt->execute();
    $history = $historyStmt->fetchAll();

    // Calculate accuracy
    $totalAnswers = (int)$stats['total_correct'] + (int)$stats['total_wrong'];
    $accuracy = $totalAnswers > 0 ? round(((int)$stats['total_correct'] / $totalAnswers) * 100, 1) : 0;

    successResponse([
        'user' => [
            'id' => (int)$user['id'],
            'full_name' => $user['full_name'],
            'phone' => $user['phone'],
            'country_code' => $user['country_code'],
            'email' => $user['email'],
            'neighborhood' => $user['neighborhood'],
            'member_since' => $memberSince
        ],
        'stats' => [
            'total_quizzes' => (int)$stats['total_quizzes'],
            'best_score' => (int)$stats['best_score'],
            'total_points' => (int)$stats['total_points'],
            'average_score' => round((float)$stats['average_score'], 1),
            'total_correct' => (int)$stats['total_correct'],
            'total_wrong' => (int)$stats['total_wrong'],
            'accuracy' => $accuracy,
            'rank' => $rank
        ],
        'history' => array_map(function($quiz) {
            return [
                'session_id' => (int)$quiz['session_id'],
                'total_questions' => (int)$quiz['total_questions'],
                'correct_answers' => (int)$quiz['correct_answers'],
                'wrong_answers' => (int)$quiz['wrong_answers'],
                'score' => (int)$quiz['score'],
                'time_taken' => (int)$quiz['time_taken'],
                'played_at' => $quiz['ended_at']
            ];
        }, $history)
    ]);

} catch (Exception $e) {
    error_log("User stats error: " . $e->getMessage());
    errorResponse('Server error', 500);
}
