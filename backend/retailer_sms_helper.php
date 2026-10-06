<?php
/**
 * SMS Helper Utility
 * This function is a placeholder for actual SMS API integration.
 * It will currently log the intended SMS message to a debug file.
 */

function send_notification_sms($phone, $message)
{
    if (empty($phone) || empty($message)) {
        return false;
    }

    // Sanitize phone number (remove spaces, dashes, etc.)
    $phone = preg_replace('/[^0-9]/', '', $phone);

    // Logging for debug purposes instead of actual API call
    $timestamp = date('Y-m-d H:i:s');
    $log_entry = "[$timestamp] TO: $phone | MSG: $message\n";

    // Log to a file named 'sms_log.txt' in the same directory
    // In production, this would be replaced with actual CURL call to SMS API
    file_put_contents(__DIR__ . '/sms_log.txt', $log_entry, FILE_APPEND);

    // Placeholder for API success check
    return true;
}

/**
 * Message Templates
 */

function get_registration_message($action, $name)
{
    if ($action === 'approve') {
        return "Namaste $name, aapka SFMS registration safaltapurvak approve ho gaya hai. Ab aap khaad ki booking kar sakte hain.";
    } else {
        return "Namaste $name, khed hai ki aapka SFMS registration aswikar (reject) kar diya gaya hai. Kripya nikatam Kendra se sampark karein.";
    }
}

function get_booking_message($action, $name, $product, $date, $token)
{
    if ($action === 'confirm') {
        return "Namaste $name, aapki $product ki booking (Date: $date) confirm ho gayi hai. Aapka Token No: $token hai.";
    } else if ($action === 'cancel') {
        return "Namaste $name, aapki $product ki booking (Date: $date) cancel kar di gayi hai.";
    } else if ($action === 'extend') {
        return "Namaste $name, aapki $product ki booking ka samay badha diya gaya hai. Kripya app mein naya samay check karein.";
    }
    return "";
}

function get_change_request_message($action, $name, $retailer_name = "")
{
    if ($action === 'approve') {
        return "Namaste $name, aapka retailer badalne ka anurodh approve ho gaya hai. Ab aap $retailer_name se jude hain.";
    } else {
        return "Namaste $name, aapka retailer badalne ka anurodh aswikar kar diya gaya hai.";
    }
}

function get_retailer_alert_message($farmer_name)
{
    return "Alert: Farmer $farmer_name ne aapke Kendra par registration change kiya hai aur ab wo aapse juda hai.";
}
?>