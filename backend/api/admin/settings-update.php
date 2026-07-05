<?php
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/cors.php';
require_once __DIR__ . '/../../middleware/AdminAuth.php';
require_once __DIR__ . '/../../models/Settings.php';

handleCors();

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    errorResponse('Method not allowed', 405);
}

$data = getRequestBody();

try {
    $database = new Database();
    $db = $database->getConnection();

    // Authenticate admin
    $auth = new AdminAuth($db);
    $auth->authenticate();

    $settings = new Settings($db);
    $updated = $settings->update($data);

    successResponse(['settings' => $updated], 'Settings updated successfully');

} catch (InvalidArgumentException $e) {
    errorResponse($e->getMessage());
} catch (Exception $e) {
    error_log("Admin settings update error: " . $e->getMessage());
    errorResponse('Failed to update settings', 500);
}
