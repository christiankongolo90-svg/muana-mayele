<?php
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/cors.php';
require_once __DIR__ . '/../../models/User.php';
require_once __DIR__ . '/../../models/Question.php';
require_once __DIR__ . '/../../models/QuizSession.php';
require_once __DIR__ . '/../../models/Settings.php';

handleCors();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Method not allowed', 405);
}

$data = getRequestBody();

if (!isset($data['user_id'])) {
    errorResponse('User ID is required');
}

$userId = (int)$data['user_id'];

try {
    $database = new Database();
    $db = $database->getConnection();

    // Check if quiz is open (respects schedule)
    $settings = new Settings($db);
    $accessStatus = $settings->getAccessStatus();
    if (!$accessStatus['is_open']) {
        $message = 'Le quiz est actuellement ferme. Revenez plus tard.';
        if ($accessStatus['schedule'] && $accessStatus['schedule']['next_session']) {
            $next = $accessStatus['schedule']['next_session'];
            $dayNames = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
            $dayName = $dayNames[$next['day_of_week']] ?? '';
            $start = substr($next['start'], 0, 5);
            $end = substr($next['end'], 0, 5);
            $message = "Le quiz n'est pas encore ouvert. Prochaine session : {$dayName} de {$start} a {$end}.";
        }
        errorResponse($message, 403);
    }

    // Verify user exists
    $user = new User($db);
    $userData = $user->findById($userId);
    if (!$userData) {
        errorResponse('User not found', 404);
    }

    // Check if user already took the quiz during this open window
    $windowStart = null;
    if ($accessStatus['schedule'] && $accessStatus['schedule']['enabled']) {
        // Scheduled mode: window started at schedule_start_time today
        $tz = new DateTimeZone($accessStatus['schedule']['timezone'] ?? 'Africa/Kinshasa');
        $now = new DateTime('now', $tz);
        $windowStart = clone $now;
        $startTime = $accessStatus['schedule']['start_time'];
        $windowStart->setTime(
            (int)substr($startTime, 0, 2),
            (int)substr($startTime, 3, 2),
            0
        );
    } else {
        // Manual mode: use start of today (midnight Kinshasa time)
        $tz = new DateTimeZone('Africa/Kinshasa');
        $windowStart = new DateTime('now', $tz);
        $windowStart->setTime(0, 0, 0);
    }

    $checkStmt = $db->prepare("
        SELECT id FROM quiz_sessions
        WHERE user_id = :user_id
        AND started_at >= :window_start
        LIMIT 1
    ");
    $checkStmt->execute([
        ':user_id' => $userId,
        ':window_start' => $windowStart->format('Y-m-d H:i:s')
    ]);

    if ($checkStmt->fetch()) {
        errorResponse('Vous avez deja participe au quiz durant cette session. Revenez a la prochaine session !', 429);
    }

    // Get random questions (excluding previously answered ones for this user)
    $questionModel = new Question($db);
    $questions = $questionModel->getRandomQuestions(QUIZ_TOTAL_QUESTIONS, $userId);

    if (empty($questions)) {
        errorResponse('No questions available', 500);
    }

    // Create quiz session
    $session = new QuizSession($db);
    if (!$session->create($userId, count($questions))) {
        errorResponse('Failed to create quiz session', 500);
    }

    // Return questions without correct answers
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
        'session_id' => $session->id,
        'questions' => $safeQuestions,
        'total_questions' => count($safeQuestions),
        'time_limit' => $settings->getTimeLimit(),
        'points_per_correct' => POINTS_PER_CORRECT
    ]);

} catch (Exception $e) {
    error_log("Quiz start error: " . $e->getMessage());
    errorResponse('Failed to start quiz', 500);
}
