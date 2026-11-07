<?php
/**
 * Lightweight AWS S3 Pre-Signed URL Generator & Helper
 * Pure PHP implementation - No heavy Composer AWS SDK dependency required!
 * 
 * Works identically on both Physical Server & AWS Standby Server.
 */

class S3Helper {
    private static $bucket   = 'urvarak-media-storage'; // Set your S3 Bucket Name
    private static $region   = 'ap-south-1';           // Mumbai region (Lowest latency in India)
    private static $accessKey= 'YOUR_AWS_ACCESS_KEY';  // Or getenv('AWS_ACCESS_KEY_ID')
    private static $secretKey= 'YOUR_AWS_SECRET_KEY';  // Or getenv('AWS_SECRET_ACCESS_KEY')
    private static $cdnDomain= '';                     // e.g., 'd123456abcdef.cloudfront.net'

    public static function init() {
        if (file_exists(__DIR__ . '/env.php')) {
            require_once __DIR__ . '/env.php';
        }
        if (getenv('AWS_S3_BUCKET'))    self::$bucket    = getenv('AWS_S3_BUCKET');
        if (getenv('AWS_REGION'))       self::$region    = getenv('AWS_REGION');
        if (getenv('AWS_ACCESS_KEY_ID')) self::$accessKey = getenv('AWS_ACCESS_KEY_ID');
        if (getenv('AWS_SECRET_ACCESS_KEY')) self::$secretKey = getenv('AWS_SECRET_ACCESS_KEY');
        if (getenv('AWS_CLOUDFRONT_DOMAIN')) self::$cdnDomain = getenv('AWS_CLOUDFRONT_DOMAIN');
    }

    /**
     * Generate AWS Signature Version 4 Pre-Signed PUT URL for direct mobile upload
     */
    public static function getPresignedPutUrl($objectKey, $mimeType = 'image/jpeg', $expiresIn = 900) {
        self::init();

        $host = self::$bucket . ".s3." . self::$region . ".amazonaws.com";
        $endpoint = "https://" . $host;
        
        $now = time();
        $amzDate = gmdate('Ymd\THis\Z', $now);
        $dateStamp = gmdate('Ymd', $now);

        $credentialScope = $dateStamp . '/' . self::$region . '/s3/aws4_request';

        $query = [
            'X-Amz-Algorithm'     => 'AWS4-HMAC-SHA256',
            'X-Amz-Credential'    => self::$accessKey . '/' . $credentialScope,
            'X-Amz-Date'          => $amzDate,
            'X-Amz-Expires'       => $expiresIn,
            'X-Amz-SignedHeaders' => 'content-type;host'
        ];
        ksort($query);
        $queryString = http_build_query($query, '', '&', PHP_QUERY_RFC3986);

        $canonicalUri = '/' . str_replace('%2F', '/', rawurlencode($objectKey));
        $canonicalHeaders = "content-type:" . strtolower(trim($mimeType)) . "\nhost:" . $host . "\n";
        $signedHeaders = "content-type;host";
        $payloadHash = "UNSIGNED-PAYLOAD";

        $canonicalRequest = "PUT\n" . $canonicalUri . "\n" . $queryString . "\n" . $canonicalHeaders . "\n" . $signedHeaders . "\n" . $payloadHash;

        $stringToSign = "AWS4-HMAC-SHA256\n" . $amzDate . "\n" . $credentialScope . "\n" . hash('sha256', $canonicalRequest);

        $kDate    = hash_hmac('sha256', $dateStamp, "AWS4" . self::$secretKey, true);
        $kRegion  = hash_hmac('sha256', self::$region, $kDate, true);
        $kService = hash_hmac('sha256', 's3', $kRegion, true);
        $kSigning = hash_hmac('sha256', 'aws4_request', $kService, true);

        $signature = hash_hmac('sha256', $stringToSign, $kSigning);

        $signedUrl = $endpoint . $canonicalUri . '?' . $queryString . '&X-Amz-Signature=' . $signature;

        $publicUrl = self::$cdnDomain 
            ? "https://" . self::$cdnDomain . "/" . $objectKey 
            : $endpoint . "/" . $objectKey;

        return [
            'upload_url' => $signedUrl,
            'public_url' => $publicUrl,
            'object_key' => $objectKey,
            'expires_in' => $expiresIn
        ];
    }
}

