<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/database.php';

try {
    $database = new Database();
    $conn = $database->getConnection();

    // Test query
    $stmt = $conn->query("SELECT 1 as test");
    $result = $stmt->fetch();

    // Check tables
    $stmt = $conn->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);

    echo json_encode([
        'success' => true,
        'message' => 'Database connected!',
        'tables' => $tables,
        'host' => getenv('DB_HOST'),
        'database' => getenv('DB_NAME')
    ]);
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'host' => getenv('DB_HOST'),
        'database' => getenv('DB_NAME')
    ]);
}
