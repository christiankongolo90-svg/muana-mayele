<?php
class QuizSession {
    private $conn;
    private $table = 'quiz_sessions';

    public $id;
    public $user_id;
    public $started_at;
    public $ended_at;
    public $time_taken;
    public $total_questions;
    public $correct_answers;
    public $wrong_answers;
    public $score;
    public $total_points;
    public $percentage;
    public $is_completed;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function create($userId, $totalQuestions = 20) {
        $query = "INSERT INTO " . $this->table . "
                  (user_id, total_questions)
                  VALUES (:user_id, :total_questions)";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':user_id', $userId);
        $stmt->bindParam(':total_questions', $totalQuestions);

        if ($stmt->execute()) {
            $this->id = $this->conn->lastInsertId();
            $this->user_id = $userId;
            $this->total_questions = $totalQuestions;
            return true;
        }

        return false;
    }

    public function findById($id) {
        $query = "SELECT * FROM " . $this->table . " WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->execute();
        return $stmt->fetch();
    }

    public function saveAnswer($sessionId, $questionId, $selectedAnswer, $isCorrect) {
        $query = "INSERT INTO quiz_answers
                  (session_id, question_id, selected_answer, is_correct)
                  VALUES (:session_id, :question_id, :selected_answer, :is_correct)";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':session_id', $sessionId);
        $stmt->bindParam(':question_id', $questionId);
        $stmt->bindParam(':selected_answer', $selectedAnswer);
        $stmt->bindParam(':is_correct', $isCorrect, PDO::PARAM_BOOL);

        return $stmt->execute();
    }

    public function complete($sessionId, $timeTaken) {
        // Calculate results
        $query = "SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct
                  FROM quiz_answers
                  WHERE session_id = :session_id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':session_id', $sessionId);
        $stmt->execute();
        $result = $stmt->fetch();

        $total = (int)$result['total'];
        $correct = (int)$result['correct'];
        $wrong = $total - $correct;
        $points = $correct * POINTS_PER_CORRECT;
        $percentage = $total > 0 ? round(($correct / $total) * 100, 2) : 0;

        // Update session
        $query = "UPDATE " . $this->table . "
                  SET ended_at = NOW(),
                      time_taken = :time_taken,
                      correct_answers = :correct,
                      wrong_answers = :wrong,
                      score = :correct,
                      total_points = :points,
                      percentage = :percentage,
                      is_completed = TRUE
                  WHERE id = :session_id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':time_taken', $timeTaken);
        $stmt->bindParam(':correct', $correct);
        $stmt->bindParam(':wrong', $wrong);
        $stmt->bindParam(':points', $points);
        $stmt->bindParam(':percentage', $percentage);
        $stmt->bindParam(':session_id', $sessionId);

        return $stmt->execute();
    }

    public function getResults($sessionId) {
        $query = "SELECT
                    qs.*,
                    u.full_name
                  FROM " . $this->table . " qs
                  JOIN users u ON qs.user_id = u.id
                  WHERE qs.id = :session_id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':session_id', $sessionId);
        $stmt->execute();

        return $stmt->fetch();
    }

    public function getAnswers($sessionId) {
        $query = "SELECT
                    qa.question_id,
                    qa.selected_answer,
                    qa.is_correct,
                    q.question,
                    q.options,
                    q.correct_answer,
                    c.name as category
                  FROM quiz_answers qa
                  JOIN questions q ON qa.question_id = q.id
                  JOIN categories c ON q.category_id = c.id
                  WHERE qa.session_id = :session_id
                  ORDER BY qa.id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':session_id', $sessionId);
        $stmt->execute();

        $answers = $stmt->fetchAll();

        foreach ($answers as &$a) {
            $a['options'] = json_decode($a['options'], true);
        }

        return $answers;
    }

    public function getUserSessions($userId, $limit = 10) {
        $query = "SELECT * FROM " . $this->table . "
                  WHERE user_id = :user_id AND is_completed = TRUE
                  ORDER BY ended_at DESC
                  LIMIT :limit";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':user_id', $userId);
        $stmt->bindParam(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll();
    }

    // ===== Admin Methods =====

    public function getAll($page = 1, $limit = 20, $userId = null) {
        $offset = ($page - 1) * $limit;

        $ppc = POINTS_PER_CORRECT;
        $query = "SELECT qs.*, u.full_name, u.phone,
                  (SELECT COUNT(*) FROM quiz_answers qa WHERE qa.session_id = qs.id AND qa.is_correct = 1) as live_correct,
                  (SELECT COUNT(*) FROM quiz_answers qa WHERE qa.session_id = qs.id) as live_answered,
                  (SELECT COUNT(*) FROM quiz_answers qa WHERE qa.session_id = qs.id AND qa.is_correct = 1) * {$ppc} as live_points,
                  CASE
                    WHEN qs.is_completed = 1 THEN qs.time_taken
                    WHEN (SELECT MAX(qa.answered_at) FROM quiz_answers qa WHERE qa.session_id = qs.id) IS NOT NULL
                      THEN TIMESTAMPDIFF(SECOND, qs.started_at, (SELECT MAX(qa.answered_at) FROM quiz_answers qa WHERE qa.session_id = qs.id))
                    ELSE NULL
                  END as live_duration
                  FROM " . $this->table . " qs
                  JOIN users u ON qs.user_id = u.id
                  WHERE 1=1";

        $params = [];

        if ($userId) {
            $query .= " AND qs.user_id = :user_id";
            $params[':user_id'] = $userId;
        }

        $query .= " ORDER BY qs.started_at DESC LIMIT :limit OFFSET :offset";

        $stmt = $this->conn->prepare($query);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll();
    }

    public function count($userId = null) {
        $query = "SELECT COUNT(*) as total FROM " . $this->table;
        $params = [];

        if ($userId) {
            $query .= " WHERE user_id = :user_id";
            $params[':user_id'] = $userId;
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

        $allowedFields = ['total_questions', 'correct_answers', 'wrong_answers',
                          'score', 'total_points', 'percentage', 'time_taken'];

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
