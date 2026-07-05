<?php
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/cors.php';
require_once __DIR__ . '/../../models/User.php';
require_once __DIR__ . '/../../services/MuindaOtpService.php';

handleCors();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Method not allowed', 405);
}

$data = getRequestBody();

// Validate required fields
if (!isset($data['phone']) || empty(trim($data['phone']))) {
    errorResponse('Le numéro de téléphone est obligatoire');
}

if (!isset($data['country_code']) || empty(trim($data['country_code']))) {
    errorResponse('Le code pays est obligatoire');
}

if (!isset($data['passcode']) || empty(trim($data['passcode']))) {
    errorResponse('Le code de vérification est obligatoire');
}

$phone = preg_replace('/[^0-9]/', '', trim($data['phone']));
$countryCode = trim($data['country_code']);
$passcode = trim($data['passcode']);

// Registration data (for new users)
$fullName = isset($data['full_name']) ? trim($data['full_name']) : null;
$email = isset($data['email']) ? trim($data['email']) : null;
$profession = isset($data['profession']) ? trim($data['profession']) : null;
$neighborhood = isset($data['neighborhood']) ? trim($data['neighborhood']) : null;

try {
    $database = new Database();
    $db = $database->getConnection();

    $userModel = new User($db);

    // Verify passcode via the Muindatech WhatsApp OTP API.
    // Muindatech owns code generation/storage; a non-2xx response means the
    // code is wrong or expired.
    $muinda = new MuindaOtpService();
    $verifyResult = $muinda->verifyOtp($countryCode, $phone, $passcode);

    if (!$verifyResult['success']) {
        errorResponse('Code invalide ou expiré');
    }

    // Check if user exists
    $user = $userModel->findByPhone($countryCode, $phone);

    if (!$user) {
        // Registration flow - create new user
        if (!$fullName || empty($fullName)) {
            errorResponse('Le nom complet est obligatoire pour l\'inscription');
        }

        $userModel->full_name = $fullName;
        $userModel->email = $email;
        $userModel->phone = $phone;
        $userModel->country_code = $countryCode;
        $userModel->profession = $profession;
        $userModel->neighborhood = $neighborhood;

        if (!$userModel->create()) {
            errorResponse('Erreur lors de la création du compte', 500);
        }

        $user = [
            'id' => $userModel->id,
            'full_name' => $userModel->full_name,
            'email' => $userModel->email,
            'phone' => $userModel->phone,
            'country_code' => $userModel->country_code,
            'neighborhood' => $userModel->neighborhood,
            'role' => 'user'
        ];

        successResponse([
            'user' => $user,
            'is_new' => true
        ], 'Compte créé avec succès!');
    } else {
        // Login flow - return existing user
        successResponse([
            'user' => [
                'id' => $user['id'],
                'full_name' => $user['full_name'],
                'email' => $user['email'],
                'phone' => $user['phone'],
                'country_code' => $user['country_code'],
                'neighborhood' => $user['neighborhood'],
                'role' => $user['role'] ?? 'user'
            ],
            'is_new' => false
        ], 'Connexion réussie!');
    }

} catch (Exception $e) {
    error_log("Verify passcode error: " . $e->getMessage());
    errorResponse('Erreur lors de la vérification', 500);
}
