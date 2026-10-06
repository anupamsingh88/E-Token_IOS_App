<?php
// h:\htdocs\backend\firebase_helper.php

/**
 * Generates an OAuth2 Access Token for Firebase HTTP v1 API using the Service Account JSON.
 * This pure PHP implementation removes the need for Composer and google/apiclient,
 * making it perfect for shared hosting environments.
 */
function getFirebaseAccessToken($serviceAccountPath) {
    if (!file_exists($serviceAccountPath)) {
        throw new Exception("Service account file not found at: " . $serviceAccountPath);
    }

    $json = file_get_contents($serviceAccountPath);
    $credentials = json_decode($json, true);

    if (!$credentials || !isset($credentials['private_key'])) {
        throw new Exception("Invalid service account JSON format.");
    }

    $header = json_encode(['alg' => 'RS256', 'typ' => 'JWT']);
    $now = time();
    $exp = $now + 3600; // Token expires in 1 hour
    
    $payload = json_encode([
        'iss' => $credentials['client_email'],
        'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
        'aud' => $credentials['token_uri'],
        'exp' => $exp,
        'iat' => $now
    ]);

    $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
    $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));

    $signatureInput = $base64UrlHeader . "." . $base64UrlPayload;
    
    $signature = '';
    $success = openssl_sign($signatureInput, $signature, $credentials['private_key'], OPENSSL_ALGO_SHA256);
    
    if (!$success) {
        throw new Exception("Failed to sign JWT for Firebase Auth.");
    }

    $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    $jwt = $signatureInput . "." . $base64UrlSignature;

    $options = [
        "http" => [
            "method" => "POST",
            "header" => "Content-Type: application/x-www-form-urlencoded\r\n",
            "content" => http_build_query([
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => $jwt
            ]),
            "ignore_errors" => true
        ],
        "ssl" => [
            "verify_peer" => false,
            "verify_peer_name" => false
        ]
    ];
    $context = stream_context_create($options);
    $response = @file_get_contents($credentials['token_uri'], false, $context);
    
    $httpCode = 0;
    if (isset($http_response_header) && is_array($http_response_header)) {
        if (preg_match('#HTTP/\d+\.\d+ (\d+)#', $http_response_header[0], $matches)) {
            $httpCode = intval($matches[1]);
        }
    }

    if ($httpCode !== 200) {
        throw new Exception("Failed to fetch access token: " . $response);
    }

    $responseData = json_decode($response, true);
    return [
        'access_token' => $responseData['access_token'],
        'project_id' => $credentials['project_id']
    ];
}

/**
 * Sends a Firebase Push Notification via HTTP v1 API
 */
function sendFirebaseNotification($fcmToken, $title, $body, $dataPayload = []) {
    if (empty($fcmToken)) return false;

    try {
        // Automatically look for the firebase-key.json in the same folder
        $keyFilePath = __DIR__ . '/firebase-key.json';
        $authData = getFirebaseAccessToken($keyFilePath);
        
        $url = "https://fcm.googleapis.com/v1/projects/" . $authData['project_id'] . "/messages:send";

        $message = [
            "message" => [
                "token" => $fcmToken,
                "notification" => [
                    "title" => $title,
                    "body" => $body
                ],
                "data" => $dataPayload
            ]
        ];

        $headers = [
            'Authorization: Bearer ' . $authData['access_token'],
            'Content-Type: application/json'
        ];

        $options = [
            "http" => [
                "method" => "POST",
                "header" => implode("\r\n", $headers) . "\r\n",
                "content" => json_encode($message),
                "ignore_errors" => true
            ],
            "ssl" => [
                "verify_peer" => false,
                "verify_peer_name" => false
            ]
        ];
        $context = stream_context_create($options);
        $response = @file_get_contents($url, false, $context);
        
        $httpCode = 0;
        if (isset($http_response_header) && is_array($http_response_header)) {
            if (preg_match('#HTTP/\d+\.\d+ (\d+)#', $http_response_header[0], $matches)) {
                $httpCode = intval($matches[1]);
            }
        }

        return $httpCode === 200;
    } catch (Exception $e) {
        error_log("Firebase Notification Error: " . $e->getMessage());
        return false;
    }
}
?>
