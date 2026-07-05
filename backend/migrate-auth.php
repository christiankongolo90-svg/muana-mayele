<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/database.php';

try {
    $database = new Database();
    $conn = $database->getConnection();

    $executed = 0;
    $errors = [];

    // Add country_code column if not exists
    try {
        $conn->exec("ALTER TABLE users ADD COLUMN country_code VARCHAR(5) DEFAULT '+243' AFTER phone");
        $executed++;
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate column') === false) {
            $errors[] = "country_code: " . $e->getMessage();
        }
    }

    // Drop old phone index if exists
    try {
        $conn->exec("ALTER TABLE users DROP INDEX phone");
        $executed++;
    } catch (PDOException $e) {
        // Index might not exist
    }

    // Drop old idx_phone index if exists
    try {
        $conn->exec("ALTER TABLE users DROP INDEX idx_phone");
        $executed++;
    } catch (PDOException $e) {
        // Index might not exist
    }

    // Add composite unique index
    try {
        $conn->exec("ALTER TABLE users ADD UNIQUE INDEX idx_country_phone (country_code, phone)");
        $executed++;
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate key name') === false) {
            $errors[] = "idx_country_phone: " . $e->getMessage();
        }
    }

    // Create passcodes table
    try {
        $conn->exec("CREATE TABLE IF NOT EXISTS passcodes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NULL,
            phone VARCHAR(20) NOT NULL,
            country_code VARCHAR(5) NOT NULL,
            passcode VARCHAR(6) NOT NULL,
            type ENUM('register', 'login') NOT NULL DEFAULT 'login',
            is_used BOOLEAN DEFAULT FALSE,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_phone_code (country_code, phone, passcode),
            INDEX idx_expires (expires_at)
        ) ENGINE=InnoDB");
        $executed++;
    } catch (PDOException $e) {
        $errors[] = "passcodes table: " . $e->getMessage();
    }

    // Check tables
    $stmt = $conn->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);

    // Check users columns
    $stmt = $conn->query("DESCRIBE users");
    $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);

    echo json_encode([
        'success' => true,
        'message' => "Migration completed! Executed $executed statements.",
        'tables' => $tables,
        'user_columns' => $columns,
        'errors' => $errors
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
