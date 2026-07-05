<?php
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/cors.php';
require_once __DIR__ . '/../../models/Settings.php';

handleCors();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Method not allowed', 405);
}

try {
    $database = new Database();
    $db = $database->getConnection();

    $settings = new Settings($db);
    $data = $settings->get();
    $accessStatus = $settings->getAccessStatus();

    successResponse([
        'is_open' => $accessStatus['is_open'],
        'time_limit' => $data['time_limit'],
        'schedule' => $accessStatus['schedule']
    ]);

} catch (Exception $e) {
    error_log("Quiz settings error: " . $e->getMessage());
    errorResponse('Failed to fetch quiz settings', 500);
}
