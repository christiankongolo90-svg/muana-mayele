<?php
class User {
    private $conn;
    private $table = 'users';

    public $id;
    public $full_name;
    public $email;
    public $phone;
    public $country_code;
    public $profession;
    public $neighborhood;
    public $created_at;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function create() {
        $query = "INSERT INTO " . $this->table . "
                  (full_name, email, phone, country_code, profession, neighborhood)
                  VALUES (:full_name, :email, :phone, :country_code, :profession, :neighborhood)";

        $stmt = $this->conn->prepare($query);

        $stmt->bindParam(':full_name', $this->full_name);
        $stmt->bindParam(':email', $this->email);
        $stmt->bindParam(':phone', $this->phone);
        $stmt->bindParam(':country_code', $this->country_code);
        $stmt->bindParam(':profession', $this->profession);
        $stmt->bindParam(':neighborhood', $this->neighborhood);

        if ($stmt->execute()) {
            $this->id = $this->conn->lastInsertId();
            return true;
        }

        return false;
    }

    public function findByPhone($countryCode, $phone) {
        $query = "SELECT * FROM " . $this->table . " WHERE country_code = :country_code AND phone = :phone LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':country_code', $countryCode);
        $stmt->bindParam(':phone', $phone);
        $stmt->execute();

        return $stmt->fetch();
    }

    public function findByPhoneOnly($phone) {
        $query = "SELECT * FROM " . $this->table . " WHERE phone = :phone LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':phone', $phone);
        $stmt->execute();

        return $stmt->fetch();
    }

    public function findByEmail($email) {
        $query = "SELECT * FROM " . $this->table . " WHERE email = :email LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':email', $email);
        $stmt->execute();

        return $stmt->fetch();
    }

    public function findById($id) {
        $query = "SELECT * FROM " . $this->table . " WHERE id = :id LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->execute();

        return $stmt->fetch();
    }

    public function getLeaderboard($limit = 10) {
        $ppc = POINTS_PER_CORRECT;
        // Use DRC timezone (Africa/Kinshasa, UTC+1) so "today" is correct
        // regardless of the DB server's timezone.
        $tz = new DateTimeZone('Africa/Kinshasa');
        $today = (new DateTime('now', $tz))->format('Y-m-d');

        $query = "SELECT id, full_name, neighborhood, best_score, total_quizzes, best_time
                  FROM (
                    SELECT
                      u.id,
                      u.full_name,
                      u.neighborhood,
                      MAX(COALESCE(qa_scores.session_score, 0)) as best_score,
                      COUNT(DISTINCT qs.id) as total_quizzes,
                      MIN(CASE WHEN qs.is_completed = 1 THEN qs.time_taken ELSE NULL END) as best_time,
                      CASE WHEN MIN(CASE WHEN qs.is_completed = 1 THEN qs.time_taken ELSE NULL END) IS NULL
                           THEN 999999
                           ELSE MIN(CASE WHEN qs.is_completed = 1 THEN qs.time_taken ELSE NULL END)
                      END as sort_time
                    FROM " . $this->table . " u
                    INNER JOIN quiz_sessions qs ON u.id = qs.user_id
                      AND DATE(CONVERT_TZ(qs.started_at, '+00:00', '+01:00')) = :today
                    LEFT JOIN (
                      SELECT session_id, COUNT(*) * {$ppc} as session_score
                      FROM quiz_answers
                      WHERE is_correct = 1
                      GROUP BY session_id
                    ) qa_scores ON qa_scores.session_id = qs.id
                    GROUP BY u.id, u.full_name, u.neighborhood
                    HAVING COUNT(DISTINCT qs.id) > 0
                  ) ranked
                  ORDER BY best_score DESC, sort_time ASC
                  LIMIT :limit";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindParam(':today', $today);
        $stmt->execute();

        return $stmt->fetchAll();
    }

    public function getUserRank($userId) {
        $ppc = POINTS_PER_CORRECT;
        $query = "SELECT ranked.rank_pos, ranked.best_score, ranked.best_time
                  FROM (
                    SELECT
                      id,
                      best_score,
                      best_time,
                      ROW_NUMBER() OVER (ORDER BY best_score DESC, sort_time ASC) as rank_pos
                    FROM (
                      SELECT
                        u.id,
                        MAX(COALESCE(qa_scores.session_score, 0)) as best_score,
                        MIN(CASE WHEN qs.is_completed = 1 THEN qs.time_taken ELSE NULL END) as best_time,
                        CASE WHEN MIN(CASE WHEN qs.is_completed = 1 THEN qs.time_taken ELSE NULL END) IS NULL
                             THEN 999999
                             ELSE MIN(CASE WHEN qs.is_completed = 1 THEN qs.time_taken ELSE NULL END)
                        END as sort_time
                      FROM users u
                      INNER JOIN quiz_sessions qs ON u.id = qs.user_id
                        AND DATE(CONVERT_TZ(qs.started_at, '+00:00', '+01:00')) = :today
                      LEFT JOIN (
                        SELECT session_id, COUNT(*) * {$ppc} as session_score
                        FROM quiz_answers
                        WHERE is_correct = 1
                        GROUP BY session_id
                      ) qa_scores ON qa_scores.session_id = qs.id
                      GROUP BY u.id
                      HAVING COUNT(DISTINCT qs.id) > 0
                    ) scores
                  ) ranked
                  WHERE ranked.id = :user_id";

        $tz = new DateTimeZone('Africa/Kinshasa');
        $today = (new DateTime('now', $tz))->format('Y-m-d');

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':user_id', $userId, PDO::PARAM_INT);
        $stmt->bindParam(':today', $today);
        $stmt->execute();

        return $stmt->fetch();
    }

    // ===== Admin Methods =====

    public function getAll($page = 1, $limit = 20, $search = '') {
        $offset = ($page - 1) * $limit;

        $query = "SELECT id, full_name, email, phone, country_code, profession,
                         neighborhood, role, created_at
                  FROM " . $this->table;

        $params = [];
        if ($search) {
            $query .= " WHERE full_name LIKE :search OR email LIKE :search2 OR phone LIKE :search3";
            $searchParam = "%$search%";
            $params[':search'] = $searchParam;
            $params[':search2'] = $searchParam;
            $params[':search3'] = $searchParam;
        }

        $query .= " ORDER BY id DESC LIMIT :limit OFFSET :offset";

        $stmt = $this->conn->prepare($query);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll();
    }

    public function count($search = '') {
        $query = "SELECT COUNT(*) as total FROM " . $this->table;
        $params = [];

        if ($search) {
            $query .= " WHERE full_name LIKE :search OR email LIKE :search2 OR phone LIKE :search3";
            $searchParam = "%$search%";
            $params[':search'] = $searchParam;
            $params[':search2'] = $searchParam;
            $params[':search3'] = $searchParam;
        }

        $stmt = $this->conn->prepare($query);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->execute();

        return (int)$stmt->fetch()['total'];
    }

    public function update($id, $data) {
        $fields = [];
        $params = [':id' => $id];

        $allowedFields = ['full_name', 'email', 'phone', 'country_code',
                          'profession', 'neighborhood', 'role'];

        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $fields[] = "$field = :$field";
                $params[":$field"] = $data[$field];
            }
        }

        if (empty($fields)) return false;

        $query = "UPDATE " . $this->table . " SET " . implode(', ', $fields) .
                 " WHERE id = :id";

        $stmt = $this->conn->prepare($query);
        return $stmt->execute($params);
    }

    public function delete($id) {
        $query = "DELETE FROM " . $this->table . " WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        return $stmt->execute();
    }
}
