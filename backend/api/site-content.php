<?php
/**
 * Public endpoint to get all site content
 * GET /site-content
 */
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/SiteContent.php';

$database = new Database();
$db = $database->getConnection();

$siteContent = new SiteContent($db);
$content = $siteContent->getAll();

successResponse($content);
