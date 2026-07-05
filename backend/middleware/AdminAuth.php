<?php
/**
 * Admin Authentication Middleware
 * Validates that the requesting user has admin role
 */
class AdminAuth {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    /**
     * Authenticate admin user
     * Returns user data if valid admin, exits with error otherwise
     */
    public function authenticate() {
        $userId = $this->getUserIdFromRequest();

        if (!$userId) {
            $this->unauthorized('User ID required');
        }

        // Check if user exists and is admin
        $query = "SELECT id, full_name, role FROM users WHERE id = :id LIMIT 1";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':id', $userId, PDO::PARAM_INT);
        $stmt->execute();

        $user = $stmt->fetch();

        if (!$user) {
            $this->unauthorized('User not found');
        }

        if ($user['role'] !== 'admin') {
            $this->forbidden('Admin access required');
        }

        return $user;
    }

    /**
     * Get user ID from request (header, query param, or body)
     */
    private function getUserIdFromRequest() {
        // Check X-Admin-User-Id header (case-insensitive)
        $headers = $this->getRequestHeaders();
        foreach ($headers as $name => $value) {
            if (strtolower($name) === 'x-admin-user-id') {
                return (int)$value;
            }
        }

        // Check $_SERVER for the header (PHP built-in server format)
        if (isset($_SERVER['HTTP_X_ADMIN_USER_ID'])) {
            return (int)$_SERVER['HTTP_X_ADMIN_USER_ID'];
        }

        // Check query parameter
        if (isset($_GET['admin_user_id'])) {
            return (int)$_GET['admin_user_id'];
        }

        // Check request body for non-GET requests
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            $data = json_decode(file_get_contents('php://input'), true);
            if (isset($data['admin_user_id'])) {
                return (int)$data['admin_user_id'];
            }
        }

        return null;
    }

    /**
     * Get request headers (case-insensitive)
     */
    private function getRequestHeaders() {
        $headers = [];

        if (function_exists('getallheaders')) {
            $headers = getallheaders();
        } else {
            // Fallback for servers that don't support getallheaders
            foreach ($_SERVER as $name => $value) {
                if (substr($name, 0, 5) === 'HTTP_') {
                    $headerName = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))));
                    $headers[$headerName] = $value;
                }
            }
        }

        return $headers;
    }

    private function unauthorized($message) {
        http_response_code(401);
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'error' => $message]);
        exit;
    }

    private function forbidden($message) {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'error' => $message]);
        exit;
    }
}
