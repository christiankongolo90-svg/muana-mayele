<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/cors.php';
require_once __DIR__ . '/../models/User.php';

handleCors();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Method not allowed', 405);
}

$data = getRequestBody();

// Validate required fields
$required = ['full_name', 'phone'];
$missing = validateRequired($data, $required);
if (!empty($missing)) {
    errorResponse('Missing required fields: ' . implode(', ', $missing));
}

// Sanitize input
$fullName = sanitizeString($data['full_name']);
$phone = sanitizeString($data['phone']);
$countryCode = isset($data['country_code']) ? sanitizeString($data['country_code']) : '+243';
$email = isset($data['email']) ? sanitizeString($data['email']) : null;
$profession = isset($data['profession']) ? sanitizeString($data['profession']) : null;
$neighborhood = isset($data['neighborhood']) ? sanitizeString($data['neighborhood']) : null;

// Clean phone number (remove non-digits except +)
$phone = preg_replace('/[^0-9]/', '', $phone);

// Validate phone format
if (strlen($phone) < 8 || strlen($phone) > 15) {
    errorResponse('Invalid phone number format');
}

// Validate email if provided
if ($email && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    errorResponse('Invalid email format');
}

try {
    $database = new Database();
    $db = $database->getConnection();
    $user = new User($db);

    // Check if phone already exists
    $existingUser = $user->findByPhone($countryCode, $phone);
    if ($existingUser) {
        // Return existing user (allow re-login with phone)
        successResponse([
            'user' => [
                'id' => $existingUser['id'],
                'full_name' => $existingUser['full_name'],
                'phone' => $existingUser['phone'],
                'country_code' => $existingUser['country_code'],
                'email' => $existingUser['email'],
                'neighborhood' => $existingUser['neighborhood']
            ]
        ], 'Welcome back!');
    }

    // Check if email already exists
    if ($email) {
        $existingEmail = $user->findByEmail($email);
        if ($existingEmail) {
            errorResponse('This email is already registered');
        }
    }

    // Create new user
    $user->full_name = $fullName;
    $user->phone = $phone;
    $user->country_code = $countryCode;
    $user->email = $email;
    $user->profession = $profession;
    $user->neighborhood = $neighborhood;

    if ($user->create()) {
        successResponse([
            'user' => [
                'id' => $user->id,
                'full_name' => $fullName,
                'phone' => $phone,
                'country_code' => $countryCode,
                'email' => $email,
                'neighborhood' => $neighborhood
            ]
        ], 'Registration successful!');
    } else {
        errorResponse('Failed to create user', 500);
    }

} catch (PDOException $e) {
    error_log("Registration error: " . $e->getMessage());
    errorResponse('Database error', 500);
} catch (Exception $e) {
    errorResponse($e->getMessage(), 500);
}
