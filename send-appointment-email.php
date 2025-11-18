<?php
/**
 * Appointment Email Notification Script
 * 
 * This script handles sending confirmation emails to customers
 * and notification emails to the business.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Configure your email settings below
 * 2. Upload this file to your web server
 * 3. Update the appointment-script.js to point to this file
 * 4. Ensure your server has mail() function enabled or use PHPMailer
 */

// Prevent direct access
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

// Get POST data
$data = json_decode(file_get_contents('php://input'), true);

// Validate required fields
$requiredFields = ['firstName', 'lastName', 'email', 'phone', 'date', 'time', 'referralSource'];
foreach ($requiredFields as $field) {
    if (empty($data[$field])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => "Missing required field: $field"]);
        exit;
    }
}

// Sanitize inputs
$firstName = htmlspecialchars($data['firstName']);
$lastName = htmlspecialchars($data['lastName']);
$email = filter_var($data['email'], FILTER_SANITIZE_EMAIL);
$phone = htmlspecialchars($data['phone']);
$date = htmlspecialchars($data['date']);
$time = htmlspecialchars($data['time']);
$referralSource = htmlspecialchars($data['referralSource']);

// Validate email
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid email address']);
    exit;
}

// Business email
$businessEmail = 'flipsnbidz@gmail.com';
$businessName = 'Flips & Bidz';

// Send confirmation email to customer
$customerSubject = "Appointment Confirmation - Flips & Bidz";
$customerMessage = "
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; padding: 30px; text-align: center; }
        .content { background: #f9fafb; padding: 30px; }
        .appointment-box { background: white; border-left: 4px solid #2563eb; padding: 20px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>Appointment Confirmed!</h1>
        </div>
        <div class='content'>
            <p>Hi $firstName,</p>
            <p>Thank you for scheduling an appointment with Flips & Bidz! We're excited to see you.</p>
            
            <div class='appointment-box'>
                <h3>📅 Your Appointment Details</h3>
                <p><strong>Name:</strong> $firstName $lastName</p>
                <p><strong>Date:</strong> $date</p>
                <p><strong>Time:</strong> $time (15 minutes)</p>
                <p><strong>Location:</strong> 15300 Valley View Avenue, La Mirada, CA 90638</p>
            </div>
            
            <h3>What to Expect:</h3>
            <ul>
                <li>Please arrive 5 minutes before your scheduled time</li>
                <li>Bring a valid ID for verification</li>
                <li>Feel free to inspect items and ask questions</li>
                <li>Our team will be ready to assist you</li>
            </ul>
            
            <p><strong>Need to reschedule?</strong> Please call us at (626) 944-3190 or text us at least 24 hours in advance.</p>
            
            <div style='text-align: center;'>
                <a href='https://flipsandbidz.com' class='button'>View Current Auctions</a>
            </div>
        </div>
        <div class='footer'>
            <p>Flips & Bidz - Liquidation Auctions<br>
            15300 Valley View Avenue, La Mirada, CA 90638<br>
            Phone: (626) 944-3190 | Email: flipsnbidz@gmail.com</p>
        </div>
    </div>
</body>
</html>
";

// Send notification email to business
$businessSubject = "New Appointment Scheduled - $firstName $lastName";
$businessMessage = "
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1e40af; color: white; padding: 20px; }
        .content { background: #f9fafb; padding: 20px; }
        .info-box { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; }
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h2>🔔 New Appointment Scheduled</h2>
        </div>
        <div class='content'>
            <div class='info-box'>
                <h3>Customer Information</h3>
                <p><strong>Name:</strong> $firstName $lastName</p>
                <p><strong>Email:</strong> <a href='mailto:$email'>$email</a></p>
                <p><strong>Phone:</strong> <a href='tel:$phone'>$phone</a></p>
                <p><strong>Referral Source:</strong> $referralSource</p>
            </div>
            
            <div class='info-box'>
                <h3>Appointment Details</h3>
                <p><strong>Date:</strong> $date</p>
                <p><strong>Time:</strong> $time (15 minutes)</p>
            </div>
            
            <p><em>Confirmation email has been sent to the customer.</em></p>
        </div>
    </div>
</body>
</html>
";

// Email headers
$headers = "MIME-Version: 1.0\r\n";
$headers .= "Content-type: text/html; charset=UTF-8\r\n";
$headers .= "From: $businessName <$businessEmail>\r\n";
$headers .= "Reply-To: $businessEmail\r\n";

// Send emails
$customerEmailSent = mail($email, $customerSubject, $customerMessage, $headers);
$businessEmailSent = mail($businessEmail, $businessSubject, $businessMessage, $headers);

if ($customerEmailSent && $businessEmailSent) {
    // Log the appointment (optional - you can save to a database here)
    $logEntry = date('Y-m-d H:i:s') . " - Appointment: $firstName $lastName, $email, $phone, $date $time, Source: $referralSource\n";
    file_put_contents('appointments.log', $logEntry, FILE_APPEND);
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Appointment scheduled successfully'
    ]);
} else {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to send confirmation emails'
    ]);
}
?>
