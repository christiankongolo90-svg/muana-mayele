<?php
class InfobipService {
    private $apiKey;
    private $baseUrl;
    private $senderNumber;

    public function __construct() {
        $this->apiKey = getenv('INFOBIP_API_KEY') ?: '';
        $this->baseUrl = getenv('INFOBIP_BASE_URL') ?: 'https://api.infobip.com';
        $this->senderNumber = getenv('INFOBIP_SENDER_NUMBER') ?: '46700861601';
    }

    /**
     * Send WhatsApp passcode using template
     */
    public function sendWhatsAppPasscode(string $countryCode, string $phone, string $passcode): array {
        // Format phone number (remove + if present in country code for concatenation)
        $fullNumber = ltrim($countryCode, '+') . ltrim($phone, '0');

        $payload = [
            'messages' => [
                [
                    'from' => $this->senderNumber,
                    'to' => $fullNumber,
                    'content' => [
                        'templateName' => 'maisoncongo_auth',
                        'templateData' => [
                            'body' => [
                                'placeholders' => [$passcode]
                            ],
                            'buttons' => [
                                [
                                    'type' => 'URL',
                                    'parameter' => $passcode
                                ]
                            ]
                        ],
                        'language' => 'fr'
                    ]
                ]
            ]
        ];

        return $this->sendRequest('/whatsapp/1/message/template', $payload);
    }

    /**
     * Send SMS passcode as fallback
     */
    public function sendSmsPasscode(string $countryCode, string $phone, string $passcode): array {
        $fullNumber = ltrim($countryCode, '+') . ltrim($phone, '0');

        $payload = [
            'messages' => [
                [
                    'from' => 'MuanaMayele',
                    'destinations' => [
                        ['to' => $fullNumber]
                    ],
                    'text' => "Votre code Muana Mayele: $passcode. Valide pendant 10 minutes."
                ]
            ]
        ];

        return $this->sendRequest('/sms/2/text/advanced', $payload);
    }

    /**
     * Make API request to Infobip
     */
    private function sendRequest(string $endpoint, array $payload): array {
        if (empty($this->apiKey)) {
            error_log("Infobip API key not configured");
            return [
                'success' => false,
                'error' => 'Infobip not configured',
                'simulated' => true
            ];
        }

        $ch = curl_init($this->baseUrl . $endpoint);

        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: App ' . $this->apiKey,
                'Content-Type: application/json',
                'Accept: application/json'
            ],
            CURLOPT_TIMEOUT => 30
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        // curl_close is deprecated in PHP 8.5+, handle is closed automatically

        if ($error) {
            error_log("Infobip curl error: $error");
            return ['success' => false, 'error' => $error];
        }

        $data = json_decode($response, true);

        if ($httpCode >= 200 && $httpCode < 300) {
            return ['success' => true, 'data' => $data];
        }

        error_log("Infobip API error: $response");
        return ['success' => false, 'error' => $data['requestError']['serviceException']['text'] ?? 'Unknown error'];
    }

    /**
     * Generate a 6-digit passcode
     */
    public static function generatePasscode(): string {
        return str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    }
}
