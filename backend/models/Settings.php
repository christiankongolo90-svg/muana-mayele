<?php

class Settings {
    private $db;
    private $table = 'quiz_settings';
    private $migrated = false;

    public function __construct($db) {
        $this->db = $db;
    }

    /**
     * Ensure schedule columns exist, auto-migrate if needed.
     */
    private function ensureScheduleColumns() {
        if ($this->migrated) return;
        $this->migrated = true;

        try {
            $stmt = $this->db->query("SHOW COLUMNS FROM {$this->table} LIKE 'schedule_enabled'");
            if ($stmt->rowCount() === 0) {
                $this->db->exec("
                    ALTER TABLE {$this->table}
                        ADD COLUMN schedule_enabled BOOLEAN NOT NULL DEFAULT FALSE AFTER is_open,
                        ADD COLUMN schedule_days JSON DEFAULT NULL AFTER schedule_enabled,
                        ADD COLUMN schedule_start_time TIME DEFAULT NULL AFTER schedule_days,
                        ADD COLUMN schedule_end_time TIME DEFAULT NULL AFTER schedule_start_time,
                        ADD COLUMN schedule_timezone VARCHAR(50) NOT NULL DEFAULT 'Africa/Kinshasa' AFTER schedule_end_time
                ");
            }
        } catch (Exception $e) {
            error_log("Settings migration check: " . $e->getMessage());
        }
    }

    public function get() {
        $this->ensureScheduleColumns();

        $stmt = $this->db->query("SELECT time_limit, is_open, schedule_enabled, schedule_days, schedule_start_time, schedule_end_time, schedule_timezone, updated_at FROM {$this->table} WHERE id = 1");
        $settings = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$settings) {
            $this->db->exec("INSERT IGNORE INTO {$this->table} (id, time_limit, is_open, schedule_enabled, schedule_timezone) VALUES (1, 1200, TRUE, FALSE, 'Africa/Kinshasa')");
            return [
                'time_limit' => 1200,
                'is_open' => true,
                'schedule_enabled' => false,
                'schedule_days' => [],
                'schedule_start_time' => null,
                'schedule_end_time' => null,
                'schedule_timezone' => 'Africa/Kinshasa',
                'updated_at' => date('Y-m-d H:i:s')
            ];
        }

        $settings['is_open'] = (bool)$settings['is_open'];
        $settings['time_limit'] = (int)$settings['time_limit'];
        $settings['schedule_enabled'] = (bool)($settings['schedule_enabled'] ?? false);
        $settings['schedule_days'] = !empty($settings['schedule_days']) ? json_decode($settings['schedule_days'], true) : [];
        $settings['schedule_timezone'] = $settings['schedule_timezone'] ?: 'Africa/Kinshasa';

        return $settings;
    }

    public function update($data) {
        $this->ensureScheduleColumns();

        $fields = [];
        $params = [];

        if (isset($data['time_limit'])) {
            $timeLimit = (int)$data['time_limit'];
            if ($timeLimit < 60 || $timeLimit > 7200) {
                throw new InvalidArgumentException('Time limit must be between 60 and 7200 seconds');
            }
            $fields[] = 'time_limit = :time_limit';
            $params[':time_limit'] = $timeLimit;
        }

        if (isset($data['is_open'])) {
            $fields[] = 'is_open = :is_open';
            $params[':is_open'] = $data['is_open'] ? 1 : 0;
        }

        if (isset($data['schedule_enabled'])) {
            $fields[] = 'schedule_enabled = :schedule_enabled';
            $params[':schedule_enabled'] = $data['schedule_enabled'] ? 1 : 0;
        }

        if (array_key_exists('schedule_days', $data)) {
            $days = $data['schedule_days'];
            if (is_array($days)) {
                foreach ($days as $day) {
                    if (!is_int($day) && !ctype_digit((string)$day)) {
                        throw new InvalidArgumentException('Invalid day number');
                    }
                    if ((int)$day < 0 || (int)$day > 6) {
                        throw new InvalidArgumentException('Day must be between 0 (Sunday) and 6 (Saturday)');
                    }
                }
                $fields[] = 'schedule_days = :schedule_days';
                $params[':schedule_days'] = json_encode(array_map('intval', $days));
            } else {
                $fields[] = 'schedule_days = NULL';
            }
        }

        if (array_key_exists('schedule_start_time', $data)) {
            if ($data['schedule_start_time'] !== null) {
                if (!preg_match('/^\d{2}:\d{2}(:\d{2})?$/', $data['schedule_start_time'])) {
                    throw new InvalidArgumentException('Invalid start time format (use HH:MM)');
                }
                $fields[] = 'schedule_start_time = :schedule_start_time';
                $params[':schedule_start_time'] = $data['schedule_start_time'];
            } else {
                $fields[] = 'schedule_start_time = NULL';
            }
        }

        if (array_key_exists('schedule_end_time', $data)) {
            if ($data['schedule_end_time'] !== null) {
                if (!preg_match('/^\d{2}:\d{2}(:\d{2})?$/', $data['schedule_end_time'])) {
                    throw new InvalidArgumentException('Invalid end time format (use HH:MM)');
                }
                $fields[] = 'schedule_end_time = :schedule_end_time';
                $params[':schedule_end_time'] = $data['schedule_end_time'];
            } else {
                $fields[] = 'schedule_end_time = NULL';
            }
        }

        if (isset($data['schedule_timezone'])) {
            $tz = $data['schedule_timezone'];
            try {
                new DateTimeZone($tz);
            } catch (Exception $e) {
                throw new InvalidArgumentException('Invalid timezone: ' . $tz);
            }
            $fields[] = 'schedule_timezone = :schedule_timezone';
            $params[':schedule_timezone'] = $tz;
        }

        if (empty($fields)) {
            throw new InvalidArgumentException('No valid fields to update');
        }

        $sql = "UPDATE {$this->table} SET " . implode(', ', $fields) . " WHERE id = 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return $this->get();
    }

    /**
     * Check if the quiz is currently accessible based on manual toggle + schedule.
     */
    public function getAccessStatus() {
        $settings = $this->get();

        if (!$settings['is_open']) {
            return [
                'is_open' => false,
                'reason' => 'manual',
                'schedule' => null
            ];
        }

        if (!$settings['schedule_enabled']) {
            return [
                'is_open' => true,
                'reason' => 'manual',
                'schedule' => null
            ];
        }

        $tz = new DateTimeZone($settings['schedule_timezone']);
        $now = new DateTime('now', $tz);
        $currentDay = (int)$now->format('w');
        $currentTime = $now->format('H:i:s');

        $days = $settings['schedule_days'];
        $startTime = $settings['schedule_start_time'];
        $endTime = $settings['schedule_end_time'];

        if (empty($days) || !$startTime || !$endTime) {
            return [
                'is_open' => true,
                'reason' => 'schedule_incomplete',
                'schedule' => null
            ];
        }

        $isScheduledDay = in_array($currentDay, $days);
        $isInTimeWindow = $currentTime >= $startTime && $currentTime <= $endTime;
        $isOpen = $isScheduledDay && $isInTimeWindow;

        $nextSession = null;
        if (!$isOpen) {
            $nextSession = $this->calculateNextSession($now, $days, $startTime, $endTime, $tz);
        }

        return [
            'is_open' => $isOpen,
            'reason' => 'schedule',
            'schedule' => [
                'enabled' => true,
                'days' => $days,
                'start_time' => $startTime,
                'end_time' => $endTime,
                'timezone' => $settings['schedule_timezone'],
                'next_session' => $nextSession
            ]
        ];
    }

    private function calculateNextSession(DateTime $now, array $days, string $startTime, string $endTime, DateTimeZone $tz) {
        $currentDay = (int)$now->format('w');
        $currentTime = $now->format('H:i:s');

        if (in_array($currentDay, $days) && $currentTime < $startTime) {
            $nextDate = clone $now;
            $nextDate->setTime(
                (int)substr($startTime, 0, 2),
                (int)substr($startTime, 3, 2),
                0
            );
            return [
                'date' => $nextDate->format('Y-m-d'),
                'start' => $startTime,
                'end' => $endTime,
                'datetime' => $nextDate->format('c'),
                'day_of_week' => (int)$nextDate->format('w')
            ];
        }

        sort($days);
        $nextDay = null;

        foreach ($days as $day) {
            if ($day > $currentDay) {
                $nextDay = $day;
                break;
            }
        }

        if ($nextDay === null) {
            $nextDay = $days[0];
        }

        $daysUntil = $nextDay - $currentDay;
        if ($daysUntil <= 0) {
            $daysUntil += 7;
        }

        $nextDate = clone $now;
        $nextDate->modify("+{$daysUntil} days");
        $nextDate->setTime(
            (int)substr($startTime, 0, 2),
            (int)substr($startTime, 3, 2),
            0
        );

        return [
            'date' => $nextDate->format('Y-m-d'),
            'start' => $startTime,
            'end' => $endTime,
            'datetime' => $nextDate->format('c'),
            'day_of_week' => (int)$nextDate->format('w')
        ];
    }

    public function isOpen() {
        $status = $this->getAccessStatus();
        return $status['is_open'];
    }

    public function getTimeLimit() {
        $settings = $this->get();
        return $settings['time_limit'];
    }
}
