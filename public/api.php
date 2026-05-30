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

// ۱. تنظیمات اتصال دیتابیس (مشخصات دیتابیس خود را در اینجا قرار دهید)
define('DB_HOST', 'localhost');
define('DB_USER', 'easydri1_mmd');
define('DB_PASS', '09386561626mM@');
define('DB_NAME', 'easydri1_mmd');
define('DB_PORT', 3306);

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
        $res = $mysqli->query("SELECT COUNT(*) as cnt FROM `$t`Table");
        if ($res) {
            $row = $res->fetch_assoc();
            $counts[$t] = intval($row['cnt']);
        } else {
            // ممکن است جدول هنوز به دلیل سینک نشدن دیتای پایه خالی باشد
            $res_sec = $mysqli->query("SELECT COUNT(*) as cnt FROM `$t`");
            $row_sec = $res_sec ? $res_sec->fetch_assoc() : ['cnt' => 0];
            $counts[$t] = intval($row_sec['cnt']);
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
            'users' => ['id', 'full_name', 'email', 'phone', 'role', 'avatar_url'],
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

// اکشن نامعتبر
send_response('error', 'اکشن درخواستی نامعتبر است یا مشخص نشده است.');
