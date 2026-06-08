<?php
/**
 * ==============================================================================
 *                     EasyDriver Advanced PHP & MySQL API Bridge
 * ==============================================================================
 * این فایل پل ارتباطی کامل و امن بین وب‌اپلیکیشن کلاینت و دیتابیس MySQL هاست شماست.
 * با آپلود این فایل در هاست سی‌پنل (cPanel) یا دایرکت‌ادمین (DirectAdmin)، می‌توانید
 * اطلاعات را به صورت زنده و دوطرفه هماهنگ (Sync) کنید و مشکل تداخل نود جی‌اس را حل نمایید.
 * 
 * راهنمای ویرایش:
 * ۱. در بخش اول زیر، اطلاعات دیتابیس خود را مطابق مشخصاتی که در سی‌پنل ساخته‌اید وارد کنید.
 * ۲. جهت استفاده از حالت Sync و پشتیبان‌گیری زنده کلاینت، آدرس این فایل را فراخوانی کنید.
 * ==============================================================================
 */

// ۱. تنظیمات اتصال دیتابیس با امکان بارگذاری پویا از فایل دات‌اینوی .env
$env_path = dirname(__DIR__) . '/.env';
if (!file_exists($env_path)) {
    $env_path = __DIR__ . '/.env';
}

$db_host = 'localhost';
$db_user = 'easydri1_mmd';
$db_pass = '09386561626mM@';
$db_name = 'easydri1_mmd';
$db_port = 3306;

if (file_exists($env_path)) {
    $lines = file($env_path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || strpos($line, '#') === 0) continue;
        if (strpos($line, '=') !== false) {
            list($key, $val) = explode('=', $line, 2);
            $key = trim($key);
            $val = trim($val);
            $val = trim($val, '"\'');
            
            if ($key === 'DB_HOST') $db_host = $val;
            if ($key === 'DB_USER') $db_user = $val;
            if ($key === 'DB_PASS') $db_pass = $val;
            if ($key === 'DB_NAME') $db_name = $val;
            if ($key === 'DB_PORT') $db_port = intval($val);
        }
    }
}

define('DB_HOST', $db_host);
define('DB_USER', $db_user);
define('DB_PASS', $db_pass);
define('DB_NAME', $db_name);
define('DB_PORT', $db_port);

// ۲. پیکربندی CORS برای اتصال بدون مشکل کلاینت‌های مختلف
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// غیرفعال کردن گزارش خطاهای مستقیم به خروجی برای حفظ قالب تمیز JSON
error_reporting(0);
ini_set('display_errors', 0);

// ساختار خروجی استاندارد
function send_response($status, $message, $data = null) {
    echo json_encode([
        'status' => $status,
        'message' => $message,
        'data' => $data,
        'timestamp' => date('Y-m-d H:i:s'),
        'api_version' => '2.1.0'
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit();
}

// تابعی برای تبدیل فیلدهای CamelCase به Snake_case
function to_snake_case($input) {
    preg_match_all('![:upper:][:lower:]?|[:lower:]+|[:digit:]+!', $input, $matches);
    $words = $matches[0];
    foreach ($words as &$word) {
        $word = ($word === strtoupper($word)) ? strtolower($word) : lcfirst($word);
    }
    return implode('_', $words);
}

// تابعی برای تبدیل فیلدهای Snake_case به CamelCase جهت هماهنگی با فرانت‌اند
function to_camel_case($string) {
    if (strpos($string, '_') === false) {
        return $string;
    }
    $str = str_replace(' ', '', ucwords(str_replace('_', ' ', $string)));
    return lcfirst($str);
}

// مرتب‌سازی آرایه کلیدها به عمق دلخواه از مارکاپ
function keys_convert($array, $target_format = 'camel') {
    if (!is_array($array)) {
        return $array;
    }
    $result = [];
    foreach ($array as $key => $value) {
        $new_key = ($target_format === 'camel') ? to_camel_case($key) : to_snake_case($key);
        if (is_array($value)) {
            $result[$new_key] = keys_convert($value, $target_format);
        } else {
            // تبدیل اتوماتیک مقادیر باینری/بولین
            if (($key === 'is_active' || $key === 'is_approved' || $key === 'read') && $value !== null) {
                $value = (bool)$value;
            }
            $result[$new_key] = $value;
        }
    }
    return $result;
}

// اتصال به سرور پایگاه داده
try {
    $mysqli = @new mysqli(DB_HOST, DB_USER, DB_PASS, '', DB_PORT);
    
    if ($mysqli->connect_error) {
        send_response('error', 'عدم برقراری ارتباط با MySQL Host: ' . $mysqli->connect_error, [
            'host' => DB_HOST,
            'user' => DB_USER,
            'database' => DB_NAME
        ]);
    }
    
    // تلاش برای اتصال یا ساخت دیتابیس در صورت نبود آن
    $db_selected = $mysqli->select_db(DB_NAME);
    if (!$db_selected) {
        $create_db_query = "CREATE DATABASE IF NOT EXISTS `" . DB_NAME . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;";
        if ($mysqli->query($create_db_query)) {
            $mysqli->select_db(DB_NAME);
        } else {
            send_response('error', 'امکان انتخاب یا ساخت دیتابیس وجود ندارد: ' . $mysqli->error);
        }
    }
    
    // تنظیم یونیکد پایگاه داده
    $mysqli->set_charset("utf8mb4");
    $mysqli->query("SET NAMES 'utf8mb4'");
    $mysqli->query("SET CHARACTER SET utf8mb4");

} catch (Exception $e) {
    send_response('error', 'یک خطای سیستمی رخ داده است: ' . $e->getMessage());
}

// ۳. ایجاد اتوماتیک جدول‌ها در صورت عدم وجود (تضمین اجرای بدون دردسر)
function verify_or_create_tables($mysqli) {
    $queries = [
        "users" => "CREATE TABLE IF NOT EXISTS `users` (
            `id` VARCHAR(50) NOT NULL PRIMARY KEY,
            `full_name` VARCHAR(100) NOT NULL,
            `email` VARCHAR(100) NOT NULL,
            `phone` VARCHAR(20) NOT NULL,
            `role` ENUM('customer', 'technician', 'admin') NOT NULL DEFAULT 'customer',
            `avatar_url` TEXT NULL,
            `password` VARCHAR(100) NULL DEFAULT '123',
            `is_active` TINYINT(1) NOT NULL DEFAULT 1,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;",

        "technicians" => "CREATE TABLE IF NOT EXISTS `technicians` (
            `id` VARCHAR(50) NOT NULL PRIMARY KEY,
            `full_name` VARCHAR(100) NOT NULL,
            `phone` VARCHAR(20) NOT NULL,
            `email` VARCHAR(100) NULL,
            `specialty` ENUM('driver_install', 'software_install', 'anydesk_support', 'all') NOT NULL DEFAULT 'all',
            `is_active` TINYINT(1) NOT NULL DEFAULT 1,
            `completed_tasks` INT NOT NULL DEFAULT 0,
            `points` INT NOT NULL DEFAULT 0,
            `created_date` VARCHAR(100) NOT NULL,
            `updated_date` VARCHAR(100) NOT NULL,
            `created_by` VARCHAR(50) NOT NULL,
            `certification_level` ENUM('Junior', 'Senior', 'Expert') NOT NULL DEFAULT 'Junior'
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;",

        "requests" => "CREATE TABLE IF NOT EXISTS `requests` (
            `id` VARCHAR(50) NOT NULL PRIMARY KEY,
            `full_name` VARCHAR(100) NOT NULL,
            `phone` VARCHAR(20) NOT NULL,
            `service_type` ENUM('driver_install', 'software_install', 'anydesk_support', 'other') NOT NULL,
            `description` TEXT NOT NULL,
            `status` ENUM('pending', 'approved', 'assigned', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
            `priority` ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
            `admin_notes` TEXT NULL,
            `scheduled_date` VARCHAR(100) NULL,
            `assigned_to_id` VARCHAR(50) NULL,
            `assigned_to_name` VARCHAR(100) NULL,
            `is_approved` TINYINT(1) NOT NULL DEFAULT 0,
            `approved_at` VARCHAR(100) NULL,
            `assigned_at` VARCHAR(100) NULL,
            `created_date` VARCHAR(100) NOT NULL,
            `updated_date` VARCHAR(100) NOT NULL,
            `created_by` VARCHAR(50) NOT NULL,
            `rating` INT NULL,
            `rating_comment` TEXT NULL,
            `rated_at` VARCHAR(100) NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;",

        "reviews" => "CREATE TABLE IF NOT EXISTS `reviews` (
            `id` VARCHAR(50) NOT NULL PRIMARY KEY,
            `customer_name` VARCHAR(100) NOT NULL,
            `rating` INT NOT NULL,
            `comment` TEXT NOT NULL,
            `service_type` VARCHAR(100) NULL,
            `is_approved` TINYINT(1) NOT NULL DEFAULT 0,
            `created_date` VARCHAR(100) NOT NULL,
            `updated_date` VARCHAR(100) NOT NULL,
            `created_by` VARCHAR(50) NOT NULL,
            `technician_id` VARCHAR(50) NULL,
            `technician_name` VARCHAR(100) NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;",

        "tickets" => "CREATE TABLE IF NOT EXISTS `tickets` (
            `id` VARCHAR(50) NOT NULL PRIMARY KEY,
            `subject` VARCHAR(200) NOT NULL,
            `message` TEXT NOT NULL,
            `status` ENUM('open', 'in_progress', 'closed') NOT NULL DEFAULT 'open',
            `priority` ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
            `category` ENUM('technical', 'billing', 'general', 'complaint') NOT NULL DEFAULT 'general',
            `admin_reply` TEXT NULL,
            `user_email` VARCHAR(100) NULL,
            `user_name` VARCHAR(100) NULL,
            `created_date` VARCHAR(100) NOT NULL,
            `updated_date` VARCHAR(100) NOT NULL,
            `created_by` VARCHAR(50) NOT NULL,
            `attached_file` LONGTEXT NULL,
            `attached_file_name` VARCHAR(255) NULL,
            `availability_time` VARCHAR(100) NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;",

        "ticket_messages" => "CREATE TABLE IF NOT EXISTS `ticket_messages` (
            `id` VARCHAR(50) NOT NULL PRIMARY KEY,
            `ticket_id` VARCHAR(50) NOT NULL,
            `sender_id` VARCHAR(50) NOT NULL,
            `sender_name` VARCHAR(100) NOT NULL,
            `sender_role` ENUM('customer', 'technician', 'admin') NOT NULL,
            `message` TEXT NOT NULL,
            `timestamp` VARCHAR(100) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;",

        "notifications" => "CREATE TABLE IF NOT EXISTS `notifications` (
            `id` VARCHAR(50) NOT NULL PRIMARY KEY,
            `title` VARCHAR(250) NOT NULL,
            `message` TEXT NOT NULL,
            `type` VARCHAR(50) NOT NULL,
            `priority` VARCHAR(20) NULL,
            `target_user_id` VARCHAR(50) NULL,
            `target_role` VARCHAR(50) NULL,
            `reference_id` VARCHAR(50) NULL,
            `created_date` VARCHAR(100) NOT NULL,
            `read` TINYINT(1) NOT NULL DEFAULT 0
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;"
    ];

    foreach ($queries as $table => $sql) {
        if (!$mysqli->query($sql)) {
            send_response('error', "خطا در برقراری ساختار پایگاه داده و جدول {$table}: " . $mysqli->error);
        }
    }

    // تضمین وجود تمام ستون‌های فرعی و اصلی جهت همخوانی ساختار دیتابیس تضمین شده
    @$mysqli->query("ALTER TABLE `users` ADD COLUMN `password` VARCHAR(100) NULL DEFAULT '123';");
    @$mysqli->query("ALTER TABLE `users` ADD COLUMN `is_active` TINYINT(1) NOT NULL DEFAULT 1;");
    @$mysqli->query("ALTER TABLE `users` ADD COLUMN `username` VARCHAR(100) NULL AFTER `id`;");
    @$mysqli->query("ALTER TABLE `users` ADD COLUMN `password_hash` VARCHAR(255) NULL AFTER `password`;");
    @$mysqli->query("ALTER TABLE `tickets` ADD COLUMN `user_id` VARCHAR(50) NULL AFTER `id`;");
    @$mysqli->query("ALTER TABLE `tickets` ADD COLUMN `content` TEXT NULL AFTER `message`;");
}

// بررسی اکشن درخواستی
$action = isset($_GET['action']) ? $_GET['action'] : 'status';

// دریافت وضعیت اتصال پایگاه داده
if ($action === 'status') {
    verify_or_create_tables($mysqli);
    
    // دریافت تعداد رکوردهای هر جدول برای راستی‌آزمایی دقیق
    $counts = [];
    $tables = ['users', 'technicians', 'requests', 'reviews', 'tickets', 'ticket_messages', 'notifications'];
    foreach ($tables as $t) {
        $res = $mysqli->query("SELECT COUNT(*) as cnt FROM `$t`");
        if ($res) {
            $row = $res->fetch_assoc();
            $counts[$t] = intval($row['cnt']);
        } else {
            $counts[$t] = 0;
        }
    }

    send_response('success', 'اتصال با دیتابیس سی‌پنل کاملاً برقرار است. جدول‌ها آماده کار هستند!', [
        'mode' => 'پل داده مستقیم MySQL (Direct MySQL Bridge)',
        'host' => DB_HOST,
        'database' => DB_NAME,
        'records' => $counts
    ]);
}

// واکشی کل اطلاعات به صورت یکپارچه
if ($action === 'get_all') {
    verify_or_create_tables($mysqli);
    
    $payload = [];
    $tables = ['users', 'technicians', 'requests', 'reviews', 'tickets', 'ticket_messages', 'notifications'];
    
    foreach ($tables as $table) {
        $list = [];
        $res = $mysqli->query("SELECT * FROM `$table` ORDER BY id ASC");
        if ($res) {
            while ($row = $res->fetch_assoc()) {
                $list[] = $row;
            }
        }
        // تبدیل استایل کلیدها از snake_case به camelCase برای هماهنگی ۱۰۰٪ با React
        $payload[$table] = keys_convert($list, 'camel');
    }
    
    send_response('success', 'اطلاعات کامل پایگاه داده هماهنگ و بارگذاری شد.', $payload);
}

// دزدگیر همزمانی اطلاعات - بازنویسی همزمان اطلاعات کلاینت و سرور به صورت تراکنشی (Transactional Sync)
if ($action === 'sync_all') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        send_response('error', 'متد درخواستی هماهنگ‌سازی باید POST باشد.');
    }
    
    verify_or_create_tables($mysqli);
    
    // دریافت اطلاعات ارسالی
    $raw_input = file_get_contents('php://input');
    $input_data = json_decode($raw_input, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        send_response('error', 'بدنه درخواست معتبر نیست. قالب ارسالی باید JSON باشد.');
    }
    
    // غیرفعال کردن موقت پایش کلیدهای خارجی برای برطرف شدن مشکلات ترتیب ورود اطلاعات
    $mysqli->query("SET FOREIGN_KEY_CHECKS = 0;");
    
    // شروع تراکنش داده
    $mysqli->begin_transaction();
    
    try {
        $tables = [
            'users' => ['id', 'full_name', 'email', 'phone', 'role', 'avatar_url', 'password', 'is_active'],
            'technicians' => ['id', 'full_name', 'phone', 'email', 'specialty', 'is_active', 'completed_tasks', 'created_date', 'updated_date', 'created_by', 'certification_level'],
            'requests' => ['id', 'full_name', 'phone', 'service_type', 'description', 'status', 'priority', 'admin_notes', 'scheduled_date', 'assigned_to_id', 'assigned_to_name', 'is_approved', 'approved_at', 'assigned_at', 'created_date', 'updated_date', 'created_by', 'rating', 'rating_comment', 'rated_at'],
            'reviews' => ['id', 'customer_name', 'rating', 'comment', 'service_type', 'is_approved', 'created_date', 'updated_date', 'created_by', 'technician_id', 'technician_name'],
            'tickets' => ['id', 'subject', 'message', 'status', 'priority', 'category', 'admin_reply', 'user_email', 'user_name', 'created_date', 'updated_date', 'created_by', 'attached_file', 'attached_file_name', 'availability_time'],
            'ticket_messages' => ['id', 'ticket_id', 'sender_id', 'sender_name', 'sender_role', 'message', 'timestamp'],
            'notifications' => ['id', 'title', 'message', 'type', 'priority', 'target_user_id', 'target_role', 'reference_id', 'created_date', 'read']
        ];
        
        $sync_summaries = [];
        
        foreach ($tables as $table => $columns) {
            // کلید هماهنگ آرایه می‌تواند با قالب camel_case یا snake_case ارسال شود
            $frontend_key = to_camel_case($table);
            $items = isset($input_data[$frontend_key]) ? $input_data[$frontend_key] : (isset($input_data[$table]) ? $input_data[$table] : null);
            
            if ($items === null) {
                continue; // در صورتی که دیتایی برای جدول فرستاده نشده باشد، رد شویم
            }
            
            if (!is_array($items)) {
                throw new Exception("دیتای ارسالی برای جدول {$table} باید به صورت فیلد آرایه معتبر باشد.");
            }
            
            // پاکسازی رکوردهای فعلی دیتابیس برای جایگزینی دقیق دیتاها
            $delete_all = "DELETE FROM `$table`";
            if (!$mysqli->query($delete_all)) {
                throw new Exception("عدم موفقیت در پاکسازی موقت جدول {$table}: " . $mysqli->error);
            }
            
            $inserted = 0;
            if (count($items) > 0) {
                // آماده‌سازی دستور INSERT با متغیرها به صورت داینامیک یا مستقیم
                foreach ($items as $item) {
                    $item_snake = keys_convert($item, 'snake');
                    
                    $val_fields = [];
                    $val_strings = [];
                    
                    foreach ($columns as $col) {
                        $val_fields[] = "`$col`";
                        $raw_val = isset($item_snake[$col]) ? $item_snake[$col] : null;
                        
                        if ($raw_val === null) {
                            $val_strings[] = "NULL";
                        } elseif (is_bool($raw_val)) {
                            $val_strings[] = $raw_val ? "1" : "0";
                        } elseif (is_numeric($raw_val)) {
                            $val_strings[] = "'" . $mysqli->real_escape_string($raw_val) . "'";
                        } else {
                            $val_strings[] = "'" . $mysqli->real_escape_string($raw_val) . "'";
                        }
                    }
                    
                    $insert_sql = "INSERT INTO `$table` (" . implode(', ', $val_fields) . ") VALUES (" . implode(', ', $val_strings) . ")";
                    if (!$mysqli->query($insert_sql)) {
                        throw new Exception("خطا هنگام درج رکورد جدید در جدول {$table}: " . $mysqli->error . " | دستور اجرا شده: " . $insert_sql);
                    }
                    $inserted++;
                }
            }
            $sync_summaries[$table] = $inserted;
        }
        
        // تایید تراکنش مقتدرانه
        $mysqli->commit();
        $mysqli->query("SET FOREIGN_KEY_CHECKS = 1;");
        
        send_response('success', 'هماهنگ‌سازی پایگاه داده با موفقیت و در قالب یک تراکنش امن انجام پذیرفت.', [
            'synchronized_records' => $sync_summaries
        ]);
        
    } catch (Exception $e) {
        // در صورت بروز هر خطایی، بازگردانی تراکنش به حالت اول
        $mysqli->rollback();
        $mysqli->query("SET FOREIGN_KEY_CHECKS = 1;");
        send_response('error', 'هماهنگ‌سازی به علت خطا متوقف و تراکنش لغو (Rollback) شد: ' . $e->getMessage());
    }
}

// Check if route-based API request is matched
$route = isset($_GET['route']) ? trim($_GET['route'], '/') : '';

if ($route !== '') {
    // Determine the route path and request method
    $method = $_SERVER['REQUEST_METHOD'];
    $route_parts = explode('/', $route);
    $resource = $route_parts[0];
    $id = isset($route_parts[1]) ? $route_parts[1] : null;
    $sub_resource = isset($route_parts[2]) ? $route_parts[2] : null;

    // Read the raw JSON input from React
    $raw_input = file_get_contents('php://input');
    $body = json_decode($raw_input, true);
    if ($body === null) {
        $body = [];
    }

    // Map resources to database tables
    $allowed_resources = ['users', 'technicians', 'requests', 'reviews', 'tickets', 'notifications', 'auth', 'compatible-drivers', 'upload', 'ai-chat', 'analyze-system', 'db-health', 'db-status'];
    
    if (in_array($resource, $allowed_resources)) {
        verify_or_create_tables($mysqli);

        // GET /api/db-health
        if ($resource === 'db-health' && $method === 'GET') {
            echo json_encode(['status' => 'healthy', 'database' => 'connected'], JSON_UNESCAPED_UNICODE);
            exit();
        }

        // GET /api/db-status
        if ($resource === 'db-status' && $method === 'GET') {
            echo json_encode(['connected' => true, 'schemaStatus' => 'synchronized', 'database' => DB_NAME], JSON_UNESCAPED_UNICODE);
            exit();
        }

        // POST /api/upload
        if ($resource === 'upload' && $method === 'POST') {
            $fileName = isset($body['fileName']) ? trim($body['fileName']) : '';
            $base64Data = isset($body['base64Data']) ? trim($body['base64Data']) : '';

            if ($fileName === '' || $base64Data === '') {
                http_response_code(400);
                echo json_encode(['error' => 'نام فایل و داده‌های Base64 هر دو الزامی هستند.'], JSON_UNESCAPED_UNICODE);
                exit();
            }

            try {
                $path_info = pathinfo($fileName);
                $fileExt = isset($path_info['extension']) ? '.' . $path_info['extension'] : '';
                $baseName = preg_replace('/[^a-zA-Z0-9]/', '_', $path_info['filename']);
                $uniqueFileName = $baseName . '_' . time() . $fileExt;

                // Strip data URL prefixes if they exist
                $cleanBase64 = $base64Data;
                if (strpos($base64Data, ';base64,') !== false) {
                    $parts = explode(';base64,', $base64Data);
                    $cleanBase64 = $parts[1];
                }

                $decodedData = base64_decode($cleanBase64);
                if ($decodedData === false) {
                    http_response_code(400);
                    echo json_encode(['error' => 'قالب فشرده‌سازی Base64 ارسالی معتبر نمی‌باشد.'], JSON_UNESCAPED_UNICODE);
                    exit();
                }

                $uploadsDir = __DIR__ . '/uploads';
                if (!is_dir($uploadsDir)) {
                    mkdir($uploadsDir, 0755, true);
                }

                $filePath = $uploadsDir . '/' . $uniqueFileName;
                file_put_contents($filePath, $decodedData);

                $fileUrl = '/uploads/' . $uniqueFileName;
                echo json_encode([
                    'success' => true,
                    'url' => $fileUrl,
                    'originalName' => $fileName
                ], JSON_UNESCAPED_UNICODE);
            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode(['error' => 'خطا در ذخیره فایل بر روی سرور: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
            }
            exit();
        }

        // POST /api/ai-chat
        if ($resource === 'ai-chat' && $method === 'POST') {
            $subject = isset($body['subject']) ? trim($body['subject']) : '';
            $messageHistory = isset($body['messageHistory']) ? $body['messageHistory'] : [];

            $lastUserMessage = '';
            if (is_array($messageHistory)) {
                $userMsgs = [];
                foreach ($messageHistory as $m) {
                    $senderRole = isset($m['senderRole']) ? $m['senderRole'] : '';
                    if ($senderRole === 'customer' || $senderRole === '') {
                        $userMsgs[] = isset($m['message']) ? $m['message'] : '';
                    }
                }
                if (count($userMsgs) > 0) {
                    $lastUserMessage = $userMsgs[count($userMsgs) - 1];
                }
            }

            $textInput = mb_strtolower($lastUserMessage . " " . $subject, 'UTF-8');
            $reply = '';

            if (strpos($textInput, 'آفیس') !== false || strpos($textInput, 'office') !== false || strpos($textInput, 'اکتیو') !== false || strpos($textInput, 'لایسنس') !== false || strpos($textInput, 'کرک') !== false) {
                $reply = "سلام و احترام. برای رفع مشکل لایسنس آفیس، ابتدا موقتاً بخش Real-time Protection آنتی‌ویروس ویندوز را خاموش بفرمایید. سپس ابزار فعال‌ساز EasyActivator موجود روی میز کار (Desktop) را با دسترسی ادمین باز کرده و کلید [2] را فشار دهید. پس از مشاهده پیام موفقیت، سیستم را ریستارت کنید.";
            } elseif (strpos($textInput, 'گرافیک') !== false || strpos($textInput, 'کارت گرافیک') !== false || strpos($textInput, 'nvidia') !== false || strpos($textInput, 'amd') !== false || strpos($textInput, 'intel') !== false || strpos($textInput, 'radeon') !== false || strpos($textInput, 'بازی') !== false || strpos($textInput, 'درایور') !== false) {
                $reply = "درود فراوان بر شما. بروز اختلال در گرافیک به دلیل فایل‌های کش درایور قبلی رایج است. توصیه می‌شود ابتدا نرم‌افزار DDU را در حالت Safe Mode اجرا کنید تا درایورهای معیوب قبلی کاملاً حذف (Clean Install) شود؛ ما آماده‌ایم آخرین نسخه پایدار و کاملاً تست‌شده WHQL را به طور خودکار روی سیستم شما مچ و بارگذاری کنیم.";
            } elseif (strpos($textInput, 'انی دسک') !== false || strpos($textInput, 'anydesk') !== false || strpos($textInput, 'آی دی') !== false || strpos($textInput, 'وصل') !== false || strpos($textInput, 'کد') !== false || strpos($textInput, 'کنترل') !== false) {
                $reply = "سلام. لطفاً نرم‌افزار AnyDesk را روی سیستم باز بگذارید و شناسه ۹ رقمی قرمز رنگ نمایش داده شده در بخش Your Address را بنویسید. کارشناسان ارشد ایزی‌درایور به محض دریافت شناسه، با دسترسی ایمن اتصال ریموت را جهت بررسی سیستم برقرار خواهند کرد.";
            } elseif (strpos($textInput, 'پرینتر') !== false || strpos($textInput, 'چاپگر') !== false || strpos($textInput, 'اسکنر') !== false || strpos($textInput, 'نصب نشد') !== false) {
                $reply = "سلام کاربر گرامی. مشکل عدم چاپ معمولاً به علت تداخل پورت‌های مجازی و یا توقف سرویس Print Spooler ویندوز است. در عملیات ریموت، ما پورت پیش‌فرض را روی USB001 تنطیم کرده و یک بار سرویس چاپگر را از طریق خط فرمان ری‌استارت خواهیم کرد.";
            } elseif (strpos($textInput, 'کندی') !== false || strpos($textInput, 'هنگ') !== false || strpos($textInput, 'ویندوز') !== false || strpos($textInput, 'اپدیت') !== false || strpos($textInput, 'آپدیت') !== false || strpos($textInput, 'ریستارت') !== false) {
                $reply = "درود. افت سرعت شدید ویندوز اغلب ناشی از انباشته شدن فایل‌های موقت کش درایو C، حضور بدافزارها در Startup و یا دمای نامتعارف سخت‌افزار است. با ابزارهای بهینه‌ساز تخصصی ما، بخش کش مرورگرها، کلیدهای اضافی رجیستری و فایل‌های تکراری سیستم شما را به طور کامل پاکسازی می‌کنیم.";
            } elseif (strpos($textInput, 'صدا') !== false || strpos($textInput, 'میکروفون') !== false || strpos($textInput, 'هدست') !== false || strpos($textInput, 'قطع') !== false) {
                $reply = "سلام. اختلال صدا اکثراً به خاطر عدم تطابق درایور Realtek با پچ امنیتی جدید ویندوز رخ می‌دهد. ما درایور اورجینال مادربرد شما را پیدا کرده و با ابزار مدیریت افزونه صوتی همگام خواهیم ساخت.";
            } else {
                $naturalReplies = [
                    "درود و وقت بخیر؛ اطلاعات ثبت‌شده توسط سیستم هوشمند ما تحلیل شد. کارشناسان فنی ایزی‌درایور هم‌اکنون آماده برقراری اتصال ریموت AnyDesk روی سیستم شما هستند تا به صورت دقیق‌تر عیب‌یابی را نهایی کنند.",
                    "سلام دوست گرامی؛ درخواست شما در صف اولویت‌های مانیتورینگ آنلاین قرار گرفت. برای تایید نهایی ابزارهای نصب درایور، همکاران بخش پشتیبانی فنی تا لحظاتی دیگر مستقیم روی سیستم شما لاگین خواهند کرد.",
                    "ارسال توضیحات با موفقیت ثبت شد. سیستم پیشنهاد می‌دهد برای جلوگیری از هرگونه تداخل در حین اتوماسیون آنلاین نصب درایورها، برنامه‌های سنگین و دانلودهای پس‌زمینه خود را موقتاً متوقف کنید.",
                    "سیستم پشتیبان ارشد ایزی‌درایور پیام شما را تحلیل کرد. جهت سرعت‌بخشی به امر نصب و عیب‌یابی ریموت، پیشنهاد داریم سیستم عامل خود را در حالت آماده‌باش برای مانیتورینگ قرار دهید."
                ];
                $reply = $naturalReplies[mt_rand(0, count($naturalReplies) - 1)];
            }

            echo json_encode(['text' => $reply], JSON_UNESCAPED_UNICODE);
            exit();
        }

        // POST /api/analyze-system
        if ($resource === 'analyze-system' && $method === 'POST') {
            $hardwareSpec = isset($body['hardwareSpec']) ? $body['hardwareSpec'] : [];
            $originalIssue = isset($body['originalIssue']) ? trim($body['originalIssue']) : '';

            $cpu = isset($hardwareSpec['cpu']) ? $hardwareSpec['cpu'] : 'Intel/AMD Processor';
            $gpu = isset($hardwareSpec['gpu']) ? $hardwareSpec['gpu'] : 'Unknown GPU Card';
            $ram = isset($hardwareSpec['ram']) ? $hardwareSpec['ram'] : '16 GB DDR4';
            $os = isset($hardwareSpec['os']) ? $hardwareSpec['os'] : 'Windows 11 Enterprise';
            $issue = $originalIssue !== '' ? $originalIssue : 'درخواست نصب پکیج‌های درایور و نرم‌افزار عمومی';

            $isNvidia = (strpos(strtolower($gpu), 'nvidia') !== false || strpos(strtolower($gpu), 'rtx') !== false || strpos(strtolower($gpu), 'gtx') !== false);
            $gpuStatus = (strpos(mb_strtolower($issue, 'UTF-8'), 'کارت گرافیک') !== false || strpos(mb_strtolower($issue, 'UTF-8'), 'بازی') !== false || strpos(mb_strtolower($issue, 'UTF-8'), 'گرافیک') !== false) ? 'outdated' : 'optimal';
            
            $analysisText = "براساس عیب‌یابی مکانیزه سیستم EasyDriver، مشخصات سخت‌افزار ایده آل شما ({$cpu}) مجهز به پردازشگر تصویری ({$gpu}) و رم ({$ram}) کشش فوق‌العاده‌ای برای پردازش‌های بهینه دارد. با این حال تداخل گزارش شده تحت عنوان «{$issue}» احتمالاً به علت تداخل مستقیم کلیدهای فرعی رجیستری و قدیمی بودن بسته درایورهای هسته فرعی است. نصب پچ بهینه‌ساز و بروزرسانی درایورها پیشنهاد صریح سیستم است.";

            $diagnosticsArray = [
                [ 
                    'name' => $gpu, 
                    'status' => $gpuStatus, 
                    'version' => $isNvidia ? 'v531.11 (پیش‌فرض قدیمی)' : 'v23.2.1 (نیاز به ارتقا)', 
                    'type' => 'هدایتگر تصویری (Graphic GPU)' 
                ],
                [ 
                    'name' => $cpu, 
                    'status' => 'optimal', 
                    'version' => 'شناسایی‌شده (تحت بار متعادل)', 
                    'type' => 'پردازشگر مرکزی (CPU)' 
                ],
                [ 
                    'name' => "ویندوز {$os}", 
                    'status' => 'warning', 
                    'version' => 'بیلد پایدار (نیازمند هماهنگی رجیستری)', 
                    'type' => 'بستر سیستم‌عامل (OS)' 
                ],
                [ 
                    'name' => 'پورت ریموت AnyDesk Service', 
                    'status' => 'optimal', 
                    'version' => 'کانال امن فعال (SSL 256bit)', 
                    'type' => 'سرویس اتصال پشتیبان' 
                ]
            ];

            $customShellCommands = 
                "# =========================================================================\n" .
                "#     سند عیب‌یابی سیستم هوشمند EasyDriver - گزارش موقت PowerShell\n" .
                "#     سازگار با سخت‌افزار: CPU {$cpu} | GPU {$gpu}\n" .
                "# =========================================================================\n\n" .
                "Write-Host \">>> در حال شروع اسکن سلامت سیستم برای پردازنده {$cpu} ...\"\n" .
                "# بررسی وضعیت اتصال اینترنت جهت همگام‌سازی ابزارهای ریموت\n" .
                "\$PingCheck = Test-Connection -ComputerName \"8.8.8.8\" -Count 1 -Quiet\n" .
                "if (\$PingCheck) {\n" .
                "    Write-Host \"[OK] اتصال اینترنت برقرار است. بارگذاری سرورهای ردیاب...\" -ForegroundColor Green\n" .
                "} else {\n" .
                "    Write-Warning \"[WARN] اختلال جزئی در شبکه شناسایی شد؛ پیشنهاد می‌شود اتصالات بررسی شود.\"\n" .
                "}\n\n" .
                "# اسکن کلیورهای فعال تصویر و کش برای کارت گرافیک {$gpu}\n" .
                "Get-WmiObject Win32_VideoController | Select-Object Name, VideoProcessor, DriverVersion\n" .
                "Write-Host \"[SUCCESS] گزارش اولیه با موفقیت ثبت گردید. آماده اتصال تکنسین ریموت.\" -ForegroundColor Cyan\n";

            echo json_encode([
                'status' => 'warning',
                'analysis' => $analysisText,
                'diagnostics' => $diagnosticsArray,
                'shellCommands' => $customShellCommands
            ], JSON_UNESCAPED_UNICODE);
            exit();
        }

        // Subroute for AUTH
        if ($resource === 'auth') {
            $sub_action = isset($route_parts[1]) ? $route_parts[1] : '';
            
            // POST /api/auth/login
            if ($sub_action === 'login' && $method === 'POST') {
                $emailOrPhone = isset($body['emailOrPhone']) ? trim($body['emailOrPhone']) : '';
                $password = isset($body['password']) ? trim($body['password']) : '';
                $role = isset($body['role']) ? trim($body['role']) : 'customer';

                if ($emailOrPhone === '' || $password === '') {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'اطلاعات ارسالی برای ورود ناقص یا نامعتبر می‌باشد.'], JSON_UNESCAPED_UNICODE);
                    exit();
                }

                $identifier = strtolower($emailOrPhone);
                $stmt = $mysqli->prepare("SELECT * FROM `users` WHERE (LOWER(`email`) = ? OR `phone` = ?) AND `role` = ?");
                $stmt->bind_param('sss', $identifier, $identifier, $role);
                $stmt->execute();
                $res = $stmt->get_result();
                $matchedUser = $res->fetch_assoc();

                if (!$matchedUser) {
                    http_response_code(401);
                    echo json_encode(['success' => false, 'error' => 'کاربری با این مشخصات و نقش در سامانه یافت نشد. صحت نقش و اطلاعات ارسالی را مجدداً بررسی نمایید.'], JSON_UNESCAPED_UNICODE);
                    exit();
                }

                if ($role === 'technician' && intval($matchedUser['is_active']) === 0) {
                    http_response_code(403);
                    echo json_encode(['success' => false, 'error' => 'حساب کاربری تکنسینی شما هنوز توسط مدیریت ریموت تایید و فعال نگردیده است. مقتضی است منتظر تایید اولیه بمانید.'], JSON_UNESCAPED_UNICODE);
                    exit();
                }

                $userPassword = isset($matchedUser['password']) ? $matchedUser['password'] : '123';
                // Check if password is a bcrypt hash
                $isHashed = (substr($userPassword, 0, 4) === '$2y$' || substr($userPassword, 0, 4) === '$2a$');

                if (!$isHashed) {
                    $expectedPlain = ($userPassword !== '') ? $userPassword : '123';
                    if ($password !== $expectedPlain) {
                        http_response_code(401);
                        echo json_encode(['success' => false, 'error' => 'رمز عبور وارد شده اشتباه است. لطفاً مجدداً بررسی فرمایید.'], JSON_UNESCAPED_UNICODE);
                        exit();
                    }

                    // Pre-hashed profile update needed
                    echo json_encode([
                        'success' => true,
                        'needsPasswordSetup' => true,
                        'userId' => $matchedUser['id'],
                        'message' => 'حساب کاربری شما با موفقیت احراز گردید اما فاقد رمز عبور امن است. لطفاً همین حالا رمز عبور جدید خود را تعیین نمایید تا با ساختار امنیتی BCrypt ذخیره گردد.'
                    ], JSON_UNESCAPED_UNICODE);
                    exit();
                }

                // Verify bcrypt password in PHP
                if (!password_verify($password, $userPassword)) {
                    http_response_code(401);
                    echo json_encode(['success' => false, 'error' => 'رمز عبور وارد شده اشتباه است. لطفاً مجدداً بررسی فرمایید.'], JSON_UNESCAPED_UNICODE);
                    exit();
                }

                echo json_encode([
                    'success' => true,
                    'user' => [
                        'id' => $matchedUser['id'],
                        'fullName' => $matchedUser['full_name'],
                        'email' => $matchedUser['email'],
                        'phone' => $matchedUser['phone'],
                        'role' => $matchedUser['role'],
                        'avatarUrl' => $matchedUser['avatar_url'],
                        'isActive' => intval($matchedUser['is_active']) === 1
                    ]
                ], JSON_UNESCAPED_UNICODE);
                exit();
            }

            // POST /api/auth/set-password
            if ($sub_action === 'set-password' && $method === 'POST') {
                $userId = isset($body['userId']) ? trim($body['userId']) : '';
                $password = isset($body['password']) ? trim($body['password']) : '';

                if ($userId === '' || strlen($password) < 6) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'شناسه کاربر یا رمز عبور نامعتبر است (حداقل ۶ کاراکتر).'], JSON_UNESCAPED_UNICODE);
                    exit();
                }

                $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
                $stmt = $mysqli->prepare("UPDATE `users` SET `password` = ? WHERE `id` = ?");
                $stmt->bind_param('ss', $hashedPassword, $userId);
                
                if ($stmt->execute()) {
                    echo json_encode([
                        'success' => true,
                        'message' => 'رمز عبور جدید شما با موفقیت به پروتکل امنیتی ارتقاء یافت و ذخیره شد. شما هم اکنون مجاز به ورود هستید.'
                    ], JSON_UNESCAPED_UNICODE);
                } else {
                    http_response_code(500);
                    echo json_encode(['success' => false, 'error' => 'خطا در ذخیره رمز عبور در دیتابیس.'], JSON_UNESCAPED_UNICODE);
                }
                exit();
            }
        }

        // GET /api/compatible-drivers
        if ($resource === 'compatible-drivers' && $method === 'GET') {
            $modelQuery = isset($_GET['model']) ? trim(mb_strtolower($_GET['model'], 'UTF-8')) : '';
            
            $demo_drivers = [
                ['id' => 'drv-1', 'name' => 'NVIDIA GeForce Game Ready Driver', 'version' => '551.23', 'releaseDate' => '2024-03-12', 'compatibility' => '۹۹٪ (سازگار با ویندوز ۱۰/۱۱)', 'size' => '640 MB', 'category' => 'کارت گرافیک (GPU)', 'hardwareModel' => 'NVIDIA GeForce RTX 3060 / 3070 / 3080 / 4060 / 4070'],
                ['id' => 'drv-2', 'name' => 'NVIDIA GeForce Driver Legacy', 'version' => '472.12', 'releaseDate' => '2022-09-21', 'compatibility' => '۹۵٪ (ثبات بالا در ویندوز ۷/۱۰)', 'size' => '480 MB', 'category' => 'کارت گرافیک (GPU)', 'hardwareModel' => 'NVIDIA GeForce GTX 1060 / 1070 / 1050 / 960'],
                ['id' => 'drv-3', 'name' => 'AMD Radeon Adrenalin Edition', 'version' => '24.2.1', 'releaseDate' => '2024-02-28', 'compatibility' => '۹۸٪ (بهینه‌سازی شده برای گیمینگ)', 'size' => '612 MB', 'category' => 'کارت گرافیک (GPU)', 'hardwareModel' => 'AMD Radeon RX 580 / 5700 / 6605 / 6700 XT / 7800 XT'],
                ['id' => 'drv-4', 'name' => 'Intel Graphics Windows DCH Driver', 'version' => '31.0.101.5333', 'releaseDate' => '2024-03-01', 'compatibility' => '۱۰۰٪ (تایید شده مایکروسافت WHQL)', 'size' => '450 MB', 'category' => 'گرافیک آنبرد (Intel HD/UHD)', 'hardwareModel' => 'Intel Iris Xe / UHD Graphics 620 / Core i3 i5 i7 i9 Gen 10/11/12/13/14'],
                ['id' => 'drv-5', 'name' => 'Realtek High Definition Audio Driver', 'version' => '6.0.9621.1', 'releaseDate' => '2023-11-15', 'compatibility' => '۱۰۰٪ (برطرف‌کننده نویز و صدای بم)', 'size' => '145 MB', 'category' => 'کارت صدا (Audio)', 'hardwareModel' => 'Realtek ALC887 / ALC892 / ALC1220 / High Definition Audio Adaptor'],
                ['id' => 'drv-6', 'name' => 'Intel Wireless Bluetooth Driver', 'version' => '23.30.0', 'releaseDate' => '2024-02-14', 'compatibility' => '۹۹٪ (حل مشکل قطعی هدفون بلوتوث)', 'size' => '52 MB', 'category' => 'شبکه و بلوتوث (Wi-Fi/Bluetooth)', 'hardwareModel' => 'Intel Wireless-AC 9560 / AX200 / AX201 / AX210'],
                ['id' => 'drv-7', 'name' => 'Synaptics Precision Touchpad Driver', 'version' => '19.5.35.85', 'releaseDate' => '2023-05-10', 'compatibility' => '۹۷٪ (افزودن ژست‌های حرکتی چند انگشتی)', 'size' => '35 MB', 'category' => 'تاچ پد لپ‌تاپ', 'hardwareModel' => 'HP Pavilion / Lenovo ThinkPad / Asus ZenBook Touchpads'],
                ['id' => 'drv-8', 'name' => 'HP LaserJet Pro Certified Print Driver', 'version' => '15.0.22', 'releaseDate' => '2023-08-01', 'compatibility' => '۱۰۰٪ (پشتیبانی از پرینت مستقیم شبکه)', 'size' => '115 MB', 'category' => 'چاپگر و اسکنر (Printer)', 'hardwareModel' => 'HP LaserJet Pro M12 / M15 / M102 / M130fn'],
                ['id' => 'drv-9', 'name' => 'Canon PIXMA Multifunction Printer Driver', 'version' => '1.04', 'releaseDate' => '2023-12-10', 'compatibility' => '۹۶٪ (شامل اسکنر پیشرفته رنگی)', 'size' => '85 MB', 'category' => 'چاپگر و اسکنر (Printer)', 'hardwareModel' => 'Canon PIXMA G3010 / G2010 / TS3140 / MG2540'],
                ['id' => 'drv-10', 'name' => 'Logitech G HUB Advanced Device Driver', 'version' => '2024.1', 'releaseDate' => '2024-01-30', 'compatibility' => '۹۹٪ (برنامه‌ریزی دکمه‌ها و نور RGB)', 'size' => '128 MB', 'category' => 'کیبورد و موس گیمینگ', 'hardwareModel' => 'Logitech G502 / G213 / G402 / G903 Mouse/Keyboard']
            ];

            if ($modelQuery === '') {
                echo json_encode($demo_drivers, JSON_UNESCAPED_UNICODE);
                exit();
            }

            $matches = [];
            foreach ($demo_drivers as $drv) {
                if (strpos(mb_strtolower($drv['name'], 'UTF-8'), $modelQuery) !== false ||
                    strpos(mb_strtolower($drv['hardwareModel'], 'UTF-8'), $modelQuery) !== false ||
                    strpos(mb_strtolower($drv['category'], 'UTF-8'), $modelQuery) !== false) {
                    $matches[] = $drv;
                }
            }
            echo json_encode($matches, JSON_UNESCAPED_UNICODE);
            exit();
        }

        $table_name = $resource;
        
        // --- READ LIST WITH EXPANSIONS (GET /api/tickets) ---
        if ($table_name === 'tickets' && $method === 'GET' && !$id) {
            $tickets_res = $mysqli->query("SELECT * FROM `tickets` ORDER BY `created_date` DESC");
            $messages_res = $mysqli->query("SELECT * FROM `ticket_messages` ORDER BY `timestamp` ASC");
            
            $msg_map = [];
            if ($messages_res) {
                while ($msg = $messages_res->fetch_assoc()) {
                    $t_id = $msg['ticket_id'];
                    if (!isset($msg_map[$t_id])) {
                        $msg_map[$t_id] = [];
                    }
                    $msg_map[$t_id][] = [
                        'id' => $msg['id'],
                        'senderId' => $msg['sender_id'],
                        'senderName' => $msg['sender_name'],
                        'senderRole' => $msg['sender_role'],
                        'message' => $msg['message'],
                        'timestamp' => $msg['timestamp']
                    ];
                }
            }

            $list = [];
            if ($tickets_res) {
                while ($t = $tickets_res->fetch_assoc()) {
                    $list[] = [
                        'id' => $t['id'],
                        'subject' => $t['subject'],
                        'message' => $t['message'],
                        'status' => $t['status'],
                        'priority' => $t['priority'],
                        'category' => $t['category'],
                        'adminReply' => $t['admin_reply'],
                        'userEmail' => $t['user_email'],
                        'userName' => $t['user_name'],
                        'createdDate' => $t['created_date'],
                        'updatedDate' => $t['updated_date'],
                        'createdBy' => $t['created_by'],
                        'availabilityTime' => $t['availability_time'],
                        'attachedFile' => $t['attached_file'],
                        'attachedFileName' => $t['attached_file_name'],
                        'messages' => isset($msg_map[$t['id']]) ? $msg_map[$t['id']] : []
                    ];
                }
            }
            echo json_encode($list, JSON_UNESCAPED_UNICODE);
            exit();
        }

        // --- READ LIST (GET /api/resource) ---
        if ($method === 'GET' && !$id) {
            $res = $mysqli->query("SELECT * FROM `$table_name` ORDER BY 1 DESC");
            $list = [];
            if ($res) {
                while ($row = $res->fetch_assoc()) {
                    $list[] = $row;
                }
            }
            $converted = keys_convert($list, 'camel');
            echo json_encode($converted, JSON_UNESCAPED_UNICODE);
            exit();
        }

        // --- READ ONE (GET /api/resource/:id) ---
        if ($method === 'GET' && $id) {
            $stmt = $mysqli->prepare("SELECT * FROM `$table_name` WHERE `id` = ?");
            $stmt->bind_param('s', $id);
            $stmt->execute();
            $res = $stmt->get_result();
            $row = $res->fetch_assoc();
            if ($row) {
                echo json_encode(keys_convert($row, 'camel'), JSON_UNESCAPED_UNICODE);
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'رکورد مورد نظر یافت نشد.'], JSON_UNESCAPED_UNICODE);
            }
            exit();
        }

        // --- DELETE (DELETE /api/resource/:id) ---
        if ($method === 'DELETE' && $id) {
            $stmt = $mysqli->prepare("DELETE FROM `$table_name` WHERE `id` = ?");
            $stmt->bind_param('s', $id);
            if ($stmt->execute()) {
                echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'خطا در حذف رکورد.'], JSON_UNESCAPED_UNICODE);
            }
            exit();
        }

        // --- CREATE (POST /api/resource) ---
        if ($method === 'POST') {
            // Special subroutes check like: POST /api/tickets/:id/messages
            if ($table_name === 'tickets' && $id && $sub_resource === 'messages') {
                $msg_id = isset($body['msgId']) ? $body['msgId'] : 'msg_' . uniqid() . '_' . rand(1000, 9999);
                $ticket_id = $id;
                $sender_id = isset($body['senderId']) ? $body['senderId'] : '';
                $sender_name = isset($body['senderName']) ? $body['senderName'] : '';
                $sender_role = isset($body['senderRole']) ? $body['senderRole'] : 'customer';
                $message_text = isset($body['message']) ? $body['message'] : '';
                $timestamp = isset($body['timestamp']) ? $body['timestamp'] : date('Y-m-d H:i:s');

                $stmt = $mysqli->prepare("INSERT INTO `ticket_messages` (`id`, `ticket_id`, `sender_id`, `sender_name`, `sender_role`, `message`, `timestamp`) VALUES (?, ?, ?, ?, ?, ?, ?)");
                $stmt->bind_param('sssssss', $msg_id, $ticket_id, $sender_id, $sender_name, $sender_role, $message_text, $timestamp);
                
                if ($stmt->execute()) {
                    echo json_encode(['success' => true, 'id' => $msg_id], JSON_UNESCAPED_UNICODE);
                } else {
                    http_response_code(500);
                    echo json_encode(['error' => 'خطا در ذخیره پیام: ' . $mysqli->error], JSON_UNESCAPED_UNICODE);
                }
                exit();
            }

            // Special routes check for notifications mark-read / read-all
            if ($table_name === 'notifications') {
                if ($id === 'read-all') {
                    $mysqli->query("UPDATE `notifications` SET `read` = 1");
                    echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);
                    exit();
                } elseif ($id && $sub_resource === 'read') {
                    $stmt = $mysqli->prepare("UPDATE `notifications` SET `read` = 1 WHERE `id` = ?");
                    $stmt->bind_param('s', $id);
                    $stmt->execute();
                    echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);
                    exit();
                }
            }

            // Map and parse the incoming body
            $body_snake = keys_convert($body, 'snake');
            
            // Generate IDs
            $record_id = isset($body_snake['id']) ? $body_snake['id'] : (($table_name === 'users') ? 'user_' . uniqid() : 'rec_' . uniqid());
            $body_snake['id'] = $record_id;

            // Auto-populate required MySQL columns asked in database checks
            if ($table_name === 'users') {
                if (!isset($body_snake['username']) || empty($body_snake['username'])) {
                    $body_snake['username'] = isset($body_snake['email']) ? $body_snake['email'] : '';
                }
                if (!isset($body_snake['password_hash']) || empty($body_snake['password_hash'])) {
                    $body_snake['password_hash'] = isset($body_snake['password']) ? $body_snake['password'] : '123';
                }
            }
            if ($table_name === 'tickets') {
                if (!isset($body_snake['user_id']) || empty($body_snake['user_id'])) {
                    $body_snake['user_id'] = isset($body_snake['created_by']) ? $body_snake['created_by'] : '';
                }
                if (!isset($body_snake['content']) || empty($body_snake['content'])) {
                    $body_snake['content'] = isset($body_snake['message']) ? $body_snake['message'] : '';
                }
            }

            // Secure user password if not hashed
            if ($table_name === 'users') {
                $raw_pass = isset($body_snake['password']) ? $body_snake['password'] : '123';
                $isHashed = (substr($raw_pass, 0, 4) === '$2y$' || substr($raw_pass, 0, 4) === '$2a$');
                if (!$isHashed) {
                    $body_snake['password'] = password_hash($raw_pass, PASSWORD_BCRYPT);
                }
                
                $email = isset($body_snake['email']) ? $body_snake['email'] : '';
                $phone = isset($body_snake['phone']) ? $body_snake['phone'] : '';
                $stmt_chk = $mysqli->prepare("SELECT * FROM `users` WHERE (`email` = ? OR `phone` = ?) AND `id` != ?");
                $stmt_chk->bind_param('sss', $email, $phone, $record_id);
                $stmt_chk->execute();
                if ($stmt_chk->get_result()->num_rows > 0) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'یک حساب کاربری دیگر با این ایمیل یا شماره موبایل از قبل در سامانه ثبت شده است.'], JSON_UNESCAPED_UNICODE);
                    exit();
                }
            }

            // Insert dynamically with ON DUPLICATE KEY UPDATE check
            $columns = [];
            $values = [];
            $updates = [];
            $types = '';
            $bind_params = [];

            foreach ($body_snake as $col => $val) {
                // Skip virtual sub-arrays which don't map to DB columns
                if ($col === 'messages') continue;
                
                $columns[] = "`$col`";
                if ($val === null) {
                    $values[] = "NULL";
                } else {
                    $values[] = "?";
                    $bind_params[] = is_bool($val) ? ($val ? 1 : 0) : $val;
                    if (is_int($val) || is_bool($val)) {
                        $types .= 'i';
                    } else {
                        $types .= 's';
                    }
                }
                if ($col !== 'id') {
                    $updates[] = "`$col` = VALUES(`$col`)";
                }
            }

            $sql = "INSERT INTO `$table_name` (" . implode(', ', $columns) . ") VALUES (" . implode(', ', $values) . ")";
            if (count($updates) > 0) {
                $sql .= " ON DUPLICATE KEY UPDATE " . implode(', ', $updates);
            }

            $stmt = $mysqli->prepare($sql);
            if ($stmt) {
                $stmt->bind_param($types, ...$bind_params);
                $success = $stmt->execute();
            } else {
                $success = false;
            }

            if ($success) {
                echo json_encode(['success' => true, 'id' => $record_id], JSON_UNESCAPED_UNICODE);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'خطا در ذخیره‌سازی داده: ' . $mysqli->error], JSON_UNESCAPED_UNICODE);
            }
            exit();
        }

        // --- UPDATE (PUT /api/resource/:id) ---
        if ($method === 'PUT' && $id) {
            $body_snake = keys_convert($body, 'snake');

            // Auto-populate custom alias columns if updated
            if ($table_name === 'users') {
                if (isset($body_snake['email']) && (!isset($body_snake['username']) || empty($body_snake['username']))) {
                    $body_snake['username'] = $body_snake['email'];
                }
                if (isset($body_snake['password']) && (!isset($body_snake['password_hash']) || empty($body_snake['password_hash']))) {
                    $body_snake['password_hash'] = $body_snake['password'];
                }
            }
            if ($table_name === 'tickets') {
                if (isset($body_snake['created_by']) && (!isset($body_snake['user_id']) || empty($body_snake['user_id']))) {
                    $body_snake['user_id'] = $body_snake['created_by'];
                }
                if (isset($body_snake['message']) && (!isset($body_snake['content']) || empty($body_snake['content']))) {
                    $body_snake['content'] = $body_snake['message'];
                }
            }
            
            $sets = [];
            $types = '';
            $bind_params = [];
            
            foreach ($body_snake as $col => $val) {
                if ($col === 'id' || $col === 'messages') continue;
                $sets[] = "`$col` = ?";
                $bind_params[] = is_bool($val) ? ($val ? 1 : 0) : $val;
                if (is_int($val) || is_bool($val)) {
                    $types .= 'i';
                } else {
                    $types .= 's';
                }
            }
            
            if (count($sets) > 0) {
                $sql = "UPDATE `$table_name` SET " . implode(', ', $sets) . " WHERE `id` = ?";
                $types .= 's';
                $bind_params[] = $id;
                
                $stmt = $mysqli->prepare($sql);
                $stmt->bind_param($types, ...$bind_params);
                $success = $stmt->execute();
                
                if ($success) {
                    echo json_encode(['success' => true, 'id' => $id], JSON_UNESCAPED_UNICODE);
                } else {
                    http_response_code(500);
                    echo json_encode(['error' => 'خطا در بروزرسانی رکورد: ' . $mysqli->error], JSON_UNESCAPED_UNICODE);
                }
            } else {
                echo json_encode(['success' => true, 'id' => $id], JSON_UNESCAPED_UNICODE);
            }
            exit();
        }
    }
}

// اکشن نامعتبر
send_response('error', 'اکشن درخواستی نامعتبر است یا مشخص نشده است.');
