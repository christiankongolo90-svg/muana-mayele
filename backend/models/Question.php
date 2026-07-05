<?php
class Question {
    private $conn;
    private $table = 'questions';

    public $id;
    public $category_id;
    public $question;
    public $options;
    public $correct_answer;
    public $difficulty;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function getRandomQuestions($limit = 20, ?int $userId = null) {
        // Get previously answered question IDs for this user
        $excludeIds = [];
        if ($userId) {
            $exStmt = $this->conn->prepare("
                SELECT DISTINCT qa.question_id
                FROM quiz_answers qa
                JOIN quiz_sessions qs ON qa.session_id = qs.id
                WHERE qs.user_id = :user_id
            ");
            $exStmt->execute([':user_id' => $userId]);
            $excludeIds = $exStmt->fetchAll(PDO::FETCH_COLUMN);
        }

        // Count available unseen questions
        $excludeClause = '';
        if (!empty($excludeIds)) {
            $placeholders = implode(',', array_fill(0, count($excludeIds), '?'));
            $excludeClause = " AND q.id NOT IN ($placeholders)";
        }

        // Check if we have enough unseen questions
        $countQuery = "SELECT COUNT(*) FROM " . $this->table . " q WHERE q.is_active = TRUE" . $excludeClause;
        $countStmt = $this->conn->prepare($countQuery);
        if (!empty($excludeIds)) {
            foreach ($excludeIds as $i => $id) {
                $countStmt->bindValue($i + 1, $id, PDO::PARAM_INT);
            }
        }
        $countStmt->execute();
        $availableUnseen = (int)$countStmt->fetchColumn();

        // If not enough unseen questions, reset (allow all questions)
        if ($availableUnseen < $limit) {
            $excludeIds = [];
            $excludeClause = '';
        }

        // Select questions weighted towards harder difficulty:
        // 20% easy, 40% medium, 40% hard
        $easyCount = max(1, (int)round($limit * 0.2));
        $mediumCount = max(1, (int)round($limit * 0.4));
        $hardCount = $limit - $easyCount - $mediumCount;

        $allQuestions = [];

        foreach (['easy' => $easyCount, 'medium' => $mediumCount, 'hard' => $hardCount] as $difficulty => $count) {
            $query = "SELECT q.id, q.question, q.options, q.correct_answer, q.difficulty, c.name as category
                      FROM " . $this->table . " q
                      JOIN categories c ON q.category_id = c.id
                      WHERE q.is_active = TRUE AND q.difficulty = :difficulty" . $excludeClause . "
                      ORDER BY RAND()
                      LIMIT :lim";

            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(':difficulty', $difficulty);
            $paramIndex = 1;
            if (!empty($excludeIds)) {
                foreach ($excludeIds as $id) {
                    $stmt->bindValue($paramIndex++, $id, PDO::PARAM_INT);
                }
            }
            $stmt->bindValue(':lim', $count, PDO::PARAM_INT);
            $stmt->execute();
            $rows = $stmt->fetchAll();
            $allQuestions = array_merge($allQuestions, $rows);
        }

        // If we didn't get enough (some difficulty levels may have fewer questions), fill up randomly
        if (count($allQuestions) < $limit) {
            $gotIds = array_map(fn($q) => $q['id'], $allQuestions);
            $allExclude = array_merge($excludeIds, $gotIds);
            $remaining = $limit - count($allQuestions);

            $fillExclude = '';
            if (!empty($allExclude)) {
                $ph = implode(',', array_fill(0, count($allExclude), '?'));
                $fillExclude = " AND q.id NOT IN ($ph)";
            }

            $fillQuery = "SELECT q.id, q.question, q.options, q.correct_answer, q.difficulty, c.name as category
                          FROM " . $this->table . " q
                          JOIN categories c ON q.category_id = c.id
                          WHERE q.is_active = TRUE" . $fillExclude . "
                          ORDER BY RAND()
                          LIMIT :lim";

            $fillStmt = $this->conn->prepare($fillQuery);
            $pi = 1;
            foreach ($allExclude as $id) {
                $fillStmt->bindValue($pi++, $id, PDO::PARAM_INT);
            }
            $fillStmt->bindValue(':lim', $remaining, PDO::PARAM_INT);
            $fillStmt->execute();
            $allQuestions = array_merge($allQuestions, $fillStmt->fetchAll());
        }

        // Shuffle the final set
        shuffle($allQuestions);

        // Parse JSON options
        foreach ($allQuestions as &$q) {
            $q['options'] = json_decode($q['options'], true);
        }

        return $allQuestions;
    }

    public function getById($id) {
        $query = "SELECT
                    q.id,
                    q.question,
                    q.options,
                    q.correct_answer,
                    q.difficulty,
                    c.name as category
                  FROM " . $this->table . " q
                  JOIN categories c ON q.category_id = c.id
                  WHERE q.id = :id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->execute();

        $question = $stmt->fetch();
        if ($question) {
            $question['options'] = json_decode($question['options'], true);
        }

        return $question;
    }

    public function getByIds($ids) {
        if (empty($ids)) return [];

        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $query = "SELECT
                    q.id,
                    q.question,
                    q.options,
                    q.correct_answer,
                    q.difficulty,
                    c.name as category
                  FROM " . $this->table . " q
                  JOIN categories c ON q.category_id = c.id
                  WHERE q.id IN ($placeholders)";

        $stmt = $this->conn->prepare($query);
        $stmt->execute($ids);

        $questions = $stmt->fetchAll();

        foreach ($questions as &$q) {
            $q['options'] = json_decode($q['options'], true);
        }

        return $questions;
    }

    public function getAllCategories() {
        $query = "SELECT * FROM categories ORDER BY name";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    // ===== Admin Methods =====

    public function getAll($page = 1, $limit = 20, $categoryId = null, $search = '') {
        $offset = ($page - 1) * $limit;

        $query = "SELECT q.*, c.name as category_name
                  FROM " . $this->table . " q
                  JOIN categories c ON q.category_id = c.id
                  WHERE 1=1";

        $params = [];

        if ($categoryId) {
            $query .= " AND q.category_id = :category_id";
            $params[':category_id'] = $categoryId;
        }

        if ($search) {
            $query .= " AND q.question LIKE :search";
            $params[':search'] = "%$search%";
        }

        $query .= " ORDER BY q.id DESC LIMIT :limit OFFSET :offset";

        $stmt = $this->conn->prepare($query);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        $questions = $stmt->fetchAll();
        foreach ($questions as &$q) {
            $q['options'] = json_decode($q['options'], true);
        }

        return $questions;
    }

    public function count($categoryId = null, $search = '') {
        $query = "SELECT COUNT(*) as total FROM " . $this->table . " WHERE 1=1";
        $params = [];

        if ($categoryId) {
            $query .= " AND category_id = :category_id";
            $params[':category_id'] = $categoryId;
        }

        if ($search) {
            $query .= " AND question LIKE :search";
            $params[':search'] = "%$search%";
        }

        $stmt = $this->conn->prepare($query);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->execute();

        return (int)$stmt->fetch()['total'];
    }

    public function create($data) {
        $query = "INSERT INTO " . $this->table . "
                  (category_id, question, options, correct_answer, difficulty, is_active)
                  VALUES (:category_id, :question, :options, :correct_answer, :difficulty, :is_active)";

        $stmt = $this->conn->prepare($query);
        $stmt->bindValue(':category_id', $data['category_id'], PDO::PARAM_INT);
        $stmt->bindValue(':question', $data['question']);
        $stmt->bindValue(':options', json_encode($data['options']));
        $stmt->bindValue(':correct_answer', $data['correct_answer'], PDO::PARAM_INT);
        $stmt->bindValue(':difficulty', $data['difficulty'] ?? 'medium');
        $stmt->bindValue(':is_active', $data['is_active'] ?? true, PDO::PARAM_BOOL);

        if ($stmt->execute()) {
            return $this->conn->lastInsertId();
        }
        return false;
    }

    public function update($id, $data) {
        $fields = [];
        $params = [':id' => $id];

        if (isset($data['category_id'])) {
            $fields[] = "category_id = :category_id";
            $params[':category_id'] = $data['category_id'];
        }
        if (isset($data['question'])) {
            $fields[] = "question = :question";
            $params[':question'] = $data['question'];
        }
        if (isset($data['options'])) {
            $fields[] = "options = :options";
            $params[':options'] = json_encode($data['options']);
        }
        if (isset($data['correct_answer'])) {
            $fields[] = "correct_answer = :correct_answer";
            $params[':correct_answer'] = $data['correct_answer'];
        }
        if (isset($data['difficulty'])) {
            $fields[] = "difficulty = :difficulty";
            $params[':difficulty'] = $data['difficulty'];
        }
        if (isset($data['is_active'])) {
            $fields[] = "is_active = :is_active";
            $params[':is_active'] = $data['is_active'] ? 1 : 0;
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
