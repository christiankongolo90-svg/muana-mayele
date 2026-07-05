<?php
/**
 * Admin endpoint to get all site content with full details
 * GET /admin/site-content
 */
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../middleware/AdminAuth.php';
require_once __DIR__ . '/../../../models/SiteContent.php';

$database = new Database();
$db = $database->getConnection();

$auth = new AdminAuth($db);
$auth->authenticate();

$siteContent = new SiteContent($db);
$items = $siteContent->getAllDetailed();

successResponse(['content' => $items]);
