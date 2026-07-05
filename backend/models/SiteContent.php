<?php

class SiteContent {
    private $db;
    private $table = 'site_content';

    public function __construct($db) {
        $this->db = $db;
    }

    /**
     * Get all content grouped by section (for public frontend)
     */
    public function getAll() {
        $stmt = $this->db->query(
            "SELECT section, content_key, content_value, content_type
             FROM {$this->table}
             ORDER BY section, sort_order"
        );

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $grouped = [];

        foreach ($rows as $row) {
            $grouped[$row['section']][$row['content_key']] = $row['content_value'];
        }

        return $grouped;
    }

    /**
     * Get all content with full details (for admin)
     */
    public function getAllDetailed() {
        $stmt = $this->db->query(
            "SELECT id, section, content_key, content_value, content_type, label, sort_order, updated_at
             FROM {$this->table}
             ORDER BY section, sort_order"
        );

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get content by section
     */
    public function getBySection($section) {
        $stmt = $this->db->prepare(
            "SELECT content_key, content_value, content_type
             FROM {$this->table}
             WHERE section = :section
             ORDER BY sort_order"
        );
        $stmt->execute([':section' => $section]);

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $result = [];

        foreach ($rows as $row) {
            $result[$row['content_key']] = $row['content_value'];
        }

        return $result;
    }

    /**
     * Update a single content item
     */
    public function update($id, $value) {
        $stmt = $this->db->prepare(
            "UPDATE {$this->table}
             SET content_value = :value
             WHERE id = :id"
        );
        $stmt->execute([':value' => $value, ':id' => $id]);

        return $stmt->rowCount() > 0;
    }

    /**
     * Bulk update content items
     */
    public function bulkUpdate($items) {
        $stmt = $this->db->prepare(
            "UPDATE {$this->table}
             SET content_value = :value
             WHERE id = :id"
        );

        $updated = 0;
        foreach ($items as $item) {
            if (isset($item['id']) && isset($item['value'])) {
                $stmt->execute([':value' => $item['value'], ':id' => $item['id']]);
                $updated += $stmt->rowCount();
            }
        }

        return $updated;
    }

    /**
     * Get a single content item by id
     */
    public function getById($id) {
        $stmt = $this->db->prepare(
            "SELECT id, section, content_key, content_value, content_type, label, sort_order, updated_at
             FROM {$this->table}
             WHERE id = :id"
        );
        $stmt->execute([':id' => $id]);

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
}
