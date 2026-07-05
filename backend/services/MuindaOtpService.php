<?php
// Thin client for Muindatech's OTP API (api.muindatech.com/api/v1/otp).
// Muindatech generates, stores, throttles, and verifies the code — we just
// trigger send/verify and react.

class MuindaOtpService {
    private string $apiKey;
    private string $baseUrl;
    private string $template;
    private string $language;

    public function __construct() {
        $this->apiKey   = getenv('MUINDA_API_KEY') ?: '';
        $this->baseUrl  = getenv('MUINDA_API_BASE_URL') ?: 'https://api.muindatech.com';
        $this->template = getenv('MUINDA_OTP_TEMPLATE') ?: 'muinda_login_fr';
        $this->language = getenv('MUINDA_OTP_LANGUAGE') ?: 'fr';
    }

    public function sendOtp(string $countryCode, string $phone): array {
        $to = $this->toE164($countryCode, $phone);
        return $this->request('POST', '/api/v1/otp/send', [
            'to'           => $to,
            'templateName' => $this->template,
            'language'     => $this->language,
        ]);
    }

    public function verifyOtp(string $countryCode, string $phone, string $code): array {
        $to = $this->toE164($countryCode, $phone);
        return $this->request('POST', '/api/v1/otp/verify', [
            'to'   => $to,
            'code' => $code,
        ]);
    }

    private function toE164(string $countryCode, string $phone): string {
        return '+' . ltrim($countryCode, '+') . ltrim(preg_replace('/[^0-9]/', '', $phone), '0');
    }

    private function request(string $method, string $path, array $payload): array {
        if (empty($this->apiKey)) {
            error_log('Muinda OTP API key not configured');
            return ['success' => false, 'status' => 0, 'error' => 'OTP service not configured'];
        }

        $ch = curl_init($this->baseUrl . $path);
        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST  => $method,
            CURLOPT_POSTFIELDS     => json_encode($payload),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_HTTPHEADER     => [
                'Authorization: Bearer ' . $this->apiKey,
                'Content-Type: application/json',
                'Accept: application/json',
            ],
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr  = curl_error($ch);

        if ($curlErr) {
            error_log("Muinda OTP curl error: $curlErr");
            return ['success' => false, 'status' => 0, 'error' => $curlErr];
        }

        $data = json_decode($response, true) ?: [];

        if ($httpCode >= 200 && $httpCode < 300) {
            return ['success' => true, 'status' => $httpCode, 'data' => $data];
        }

        return [
            'success' => false,
            'status'  => $httpCode,
            'error'   => $data['error'] ?? ('HTTP ' . $httpCode),
            'reason'  => $data['reason'] ?? null,
            'data'    => $data,
        ];
    }
}
