<?php
/**
 * Admin endpoint to upload images for site content
 * POST /admin/site-content/upload
 *
 * Multipart form data with 'image' file and 'id' field
 */
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../middleware/AdminAuth.php';
require_once __DIR__ . '/../../../models/SiteContent.php';

$database = new Database();
$db = $database->getConnection();

// For file uploads, admin ID comes from header or query param
$auth = new AdminAuth($db);
$auth->authenticate();

// Check if file was uploaded
if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    $errorMessages = [
        UPLOAD_ERR_INI_SIZE => 'File exceeds upload_max_filesize',
        UPLOAD_ERR_FORM_SIZE => 'File exceeds MAX_FILE_SIZE',
        UPLOAD_ERR_PARTIAL => 'File was only partially uploaded',
        UPLOAD_ERR_NO_FILE => 'No file was uploaded',
        UPLOAD_ERR_NO_TMP_DIR => 'Missing temp folder',
        UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
        UPLOAD_ERR_EXTENSION => 'A PHP extension stopped the upload',
    ];
    $error = $_FILES['image']['error'] ?? UPLOAD_ERR_NO_FILE;
    errorResponse($errorMessages[$error] ?? 'Upload failed');
}

$id = $_POST['id'] ?? null;
if (!$id) {
    errorResponse('Content ID is required');
}

$file = $_FILES['image'];

// Validate file type
$allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!in_array($mimeType, $allowedTypes)) {
    errorResponse('Invalid file type. Allowed: JPEG, PNG, GIF, WebP, SVG');
}

// Validate file size (max 5MB)
$maxSize = 5 * 1024 * 1024;
if ($file['size'] > $maxSize) {
    errorResponse('File too large. Maximum size: 5MB');
}

// Generate safe filename
$extension = pathinfo($file['name'], PATHINFO_EXTENSION);
$safeName = 'content_' . $id . '_' . time() . '.' . $extension;

// Upload directory - use the project's public folder
// Determine the uploads directory relative to backend
$uploadsDir = __DIR__ . '/../../../uploads';
if (!is_dir($uploadsDir)) {
    mkdir($uploadsDir, 0755, true);
}

$destination = $uploadsDir . '/' . $safeName;

if (!move_uploaded_file($file['tmp_name'], $destination)) {
    errorResponse('Failed to save uploaded file');
}

// Update the content value with the new filename
$siteContent = new SiteContent($db);

// Delete old image if it exists and is in uploads folder
$oldItem = $siteContent->getById($id);
if ($oldItem && $oldItem['content_type'] === 'image') {
    $oldValue = $oldItem['content_value'];
    if (strpos($oldValue, 'uploads/') === 0) {
        $oldPath = __DIR__ . '/../../../' . $oldValue;
        if (file_exists($oldPath)) {
            unlink($oldPath);
        }
    }
}

$relativePath = 'uploads/' . $safeName;
$siteContent->update($id, $relativePath);

$item = $siteContent->getById($id);
successResponse(['item' => $item, 'path' => $relativePath], 'Image uploadée avec succès');
