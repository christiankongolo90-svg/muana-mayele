<?php
/**
 * Admin endpoint to update site content
 * PUT /admin/site-content/update
 *
 * Body: { "items": [{ "id": 1, "value": "new value" }, ...] }
 * OR: { "id": 1, "value": "new value" } for single update
 */
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../middleware/AdminAuth.php';
require_once __DIR__ . '/../../../models/SiteContent.php';

$database = new Database();
$db = $database->getConnection();

$auth = new AdminAuth($db);
$auth->authenticate();

$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    errorResponse('Invalid request body');
}

$siteContent = new SiteContent($db);

// Bulk update
if (isset($data['items']) && is_array($data['items'])) {
    $updated = $siteContent->bulkUpdate($data['items']);
    $allContent = $siteContent->getAllDetailed();
    successResponse(['content' => $allContent, 'updated' => $updated], 'Contenu mis à jour');
}

// Single update
if (isset($data['id']) && isset($data['value'])) {
    $siteContent->update($data['id'], $data['value']);
    $item = $siteContent->getById($data['id']);
    successResponse(['item' => $item], 'Contenu mis à jour');
}

errorResponse('Missing required fields (items array or id+value)');
