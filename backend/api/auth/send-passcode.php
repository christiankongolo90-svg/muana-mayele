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

$phone = trim($data['phone']);
$countryCode = trim($data['country_code']);
$type = isset($data['type']) ? $data['type'] : 'login'; // 'login' or 'register'
$fullName = isset($data['full_name']) ? trim($data['full_name']) : null;
$email = isset($data['email']) ? trim($data['email']) : null;
$profession = isset($data['profession']) ? trim($data['profession']) : null;
$neighborhood = isset($data['neighborhood']) ? trim($data['neighborhood']) : null;

// Validate phone number format (basic validation)
$phone = preg_replace('/[^0-9]/', '', $phone);
if (strlen($phone) < 8 || strlen($phone) > 15) {
    errorResponse('Numéro de téléphone invalide');
}

try {
    $database = new Database();
    $db = $database->getConnection();

    $userModel = new User($db);

    // Check if user exists
    $existingUser = $userModel->findByPhone($countryCode, $phone);

    if ($type === 'register') {
        if ($existingUser) {
            errorResponse('Ce numéro est déjà enregistré. Veuillez vous connecter.');
        }
        if (!$fullName || empty($fullName)) {
            errorResponse('Le nom complet est obligatoire pour l\'inscription');
        }
    } else {
        // Login
        if (!$existingUser) {
            errorResponse('Aucun compte trouvé avec ce numéro. Veuillez vous inscrire.');
        }
    }

    // Store registration data in session if registering
    // (used after verification to create the account)
    if ($type === 'register' && !$existingUser) {
        $_SESSION['pending_registration'] = [
            'full_name' => $fullName,
            'email' => $email,
            'phone' => $phone,
            'country_code' => $countryCode,
            'profession' => $profession,
            'neighborhood' => $neighborhood
        ];
    }

    // Send passcode via the Muindatech WhatsApp OTP API.
    // Muindatech generates, stores, throttles and later verifies the code —
    // this backend only triggers the send.
    $muinda = new MuindaOtpService();
    $result = $muinda->sendOtp($countryCode, $phone);

    if (!$result['success']) {
        error_log('Muinda OTP send failed for ' . $countryCode . $phone . ': ' . json_encode($result));
        // Surface throttling distinctly so the client can show a wait message
        if (($result['status'] ?? 0) === 429) {
            errorResponse('Veuillez patienter avant de demander un nouveau code', 429);
        }
        errorResponse('Erreur lors de l\'envoi du code', 500);
    }

    // Derive expiry (seconds) from Muinda's response when available
    $expiresIn = 300;
    if (!empty($result['data']['expiresAt'])) {
        $ts = strtotime($result['data']['expiresAt']);
        if ($ts) {
            $expiresIn = max(60, $ts - time());
        }
    }

    successResponse([
        'message' => 'Code envoyé par WhatsApp',
        'phone' => $phone,
        'country_code' => $countryCode,
        'type' => $type,
        'expires_in' => $expiresIn
    ], 'Code envoyé avec succès!');

} catch (Exception $e) {
    error_log("Send passcode error: " . $e->getMessage());
    errorResponse('Erreur lors de l\'envoi du code', 500);
}
