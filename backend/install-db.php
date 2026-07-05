<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/database.php';

try {
    $database = new Database();
    $conn = $database->getConnection();

    // Read SQL file
    $sql = file_get_contents(__DIR__ . '/database.sql');

    // Remove the CREATE DATABASE and USE statements since we're already connected
    $sql = preg_replace('/CREATE DATABASE.*?;/s', '', $sql);
    $sql = preg_replace('/USE.*?;/s', '', $sql);

    // Execute multi-query
    $conn->setAttribute(PDO::ATTR_EMULATE_PREPARES, 0);

    // Split by semicolon and execute each statement
    $statements = array_filter(array_map('trim', explode(';', $sql)));

    $executed = 0;
    $errors = [];

    foreach ($statements as $statement) {
        if (empty($statement)) continue;

        try {
            $conn->exec($statement);
            $executed++;
        } catch (PDOException $e) {
            // Ignore duplicate errors
            if (strpos($e->getMessage(), 'already exists') === false &&
                strpos($e->getMessage(), 'Duplicate') === false) {
                $errors[] = $e->getMessage();
            }
        }
    }

    // Check tables
    $stmt = $conn->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);

    echo json_encode([
        'success' => true,
        'message' => "Database installed! Executed $executed statements.",
        'tables' => $tables,
        'errors' => $errors
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
