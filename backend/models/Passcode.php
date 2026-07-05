<?php
class Passcode {
    private $conn;
    private $table = 'passcodes';

    public $id;
    public $user_id;
    public $phone;
    public $country_code;
    public $passcode;
    public $type;
    public $is_used;
    public $expires_at;

    // Passcode validity in minutes
    const VALIDITY_MINUTES = 10;

    public function __construct($db) {
        $this->conn = $db;
    }

    /**
     * Create a new passcode
     */
    public function create(string $countryCode, string $phone, string $passcode, string $type = 'login', ?int $userId = null): bool {
        // Invalidate any existing unused passcodes for this phone
        $this->invalidateExisting($countryCode, $phone);

        $query = "INSERT INTO " . $this->table . "
                  (user_id, country_code, phone, passcode, type, expires_at)
                  VALUES (:user_id, :country_code, :phone, :passcode, :type, DATE_ADD(NOW(), INTERVAL " . self::VALIDITY_MINUTES . " MINUTE))";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':user_id', $userId);
        $stmt->bindParam(':country_code', $countryCode);
        $stmt->bindParam(':phone', $phone);
        $stmt->bindParam(':passcode', $passcode);
        $stmt->bindParam(':type', $type);

        if ($stmt->execute()) {
            $this->id = $this->conn->lastInsertId();
            return true;
        }

        return false;
    }

    /**
     * Verify a passcode
     */
    public function verify(string $countryCode, string $phone, string $passcode): ?array {
        $query = "SELECT * FROM " . $this->table . "
                  WHERE country_code = :country_code
                  AND phone = :phone
                  AND passcode = :passcode
                  AND is_used = FALSE
                  AND expires_at > NOW()
                  ORDER BY created_at DESC
                  LIMIT 1";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':country_code', $countryCode);
        $stmt->bindParam(':phone', $phone);
        $stmt->bindParam(':passcode', $passcode);
        $stmt->execute();

        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($result) {
            // Mark as used
            $this->markAsUsed($result['id']);
            return $result;
        }

        return null;
    }

    /**
     * Mark passcode as used
     */
    private function markAsUsed(int $id): void {
        $query = "UPDATE " . $this->table . " SET is_used = TRUE WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->execute();
    }

    /**
     * Invalidate existing passcodes for a phone number
     */
    private function invalidateExisting(string $countryCode, string $phone): void {
        $query = "UPDATE " . $this->table . "
                  SET is_used = TRUE
                  WHERE country_code = :country_code AND phone = :phone AND is_used = FALSE";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':country_code', $countryCode);
        $stmt->bindParam(':phone', $phone);
        $stmt->execute();
    }

    /**
     * Clean up expired passcodes
     */
    public function cleanupExpired(): int {
        $query = "DELETE FROM " . $this->table . " WHERE expires_at < NOW()";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt->rowCount();
    }

    /**
     * Check if there's a recent passcode (rate limiting)
     */
    public function hasRecentPasscode(string $countryCode, string $phone, int $seconds = 60): bool {
        $query = "SELECT id FROM " . $this->table . "
                  WHERE country_code = :country_code
                  AND phone = :phone
                  AND created_at > DATE_SUB(NOW(), INTERVAL :seconds SECOND)
                  LIMIT 1";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':country_code', $countryCode);
        $stmt->bindParam(':phone', $phone);
        $stmt->bindParam(':seconds', $seconds, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetch() !== false;
    }
}
