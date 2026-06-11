<?php
namespace Api\Config;

use PDO;
use PDOException;
use Exception;

class Database {
    private static ?PDO $instance = null;
    private string $host = 'localhost';
    private string $user = 'easydri1_mmd';
    private string $pass = '09386561626mM@';
    private string $dbname = 'easydri1_mmd';

    public function __construct() {
        // Load configuration from .env if present
        $envPaths = [
            dirname(dirname(dirname(__DIR__))) . '/.env',
            dirname(dirname(__DIR__)) . '/.env',
            __DIR__ . '/.env'
        ];

        foreach ($envPaths as $path) {
            if (file_exists($path)) {
                $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
                foreach ($lines as $line) {
                    $line = trim($line);
                    if ($line === '' || strpos($line, '#') === 0) continue;
                    if (strpos($line, '=') !== false) {
                        list($key, $val) = explode('=', $line, 2);
                        $key = trim($key);
                        $val = trim($val);
                        $val = trim($val, '"\'');

                        if ($key === 'DB_HOST') $this->host = $val;
                        if ($key === 'DB_USER') $this->user = $val;
                        if ($key === 'DB_PASS' || $key === 'DB_PASSWORD') $this->pass = $val;
                        if ($key === 'DB_NAME') $this->dbname = $val;
                    }
                }
                break; // stop scanning after the first found .env
            }
        }
    }

    public function getConnection(): PDO {
        if (self::$instance === null) {
            try {
                $dsn = "mysql:host={$this->host};dbname={$this->dbname};charset=utf8mb4";
                $options = [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                ];
                self::$instance = new PDO($dsn, $this->user, $this->pass, $options);
                
                // Perform quick table integrity checks
                $this->verifyAndCreateTables(self::$instance);
            } catch (PDOException $e) {
                // Return a clear error if connection fails
                throw new Exception("خطای اتصال به پایگاه داده میزبان: " . $e->getMessage(), (int)$e->getCode());
            }
        }
        return self::$instance;
    }

    private function verifyAndCreateTables(PDO $pdo): void {
        try {
            // 1. Users Table
            $pdo->exec("CREATE TABLE IF NOT EXISTS `users` (
                `id` VARCHAR(50) NOT NULL PRIMARY KEY,
                `username` VARCHAR(100) NULL,
                `full_name` VARCHAR(100) NOT NULL,
                `email` VARCHAR(100) NOT NULL,
                `phone` VARCHAR(20) NOT NULL,
                `role` VARCHAR(20) NOT NULL,
                `password` VARCHAR(255) NULL DEFAULT '$2y$10$6RbyyA7A9o7W7KzWv5ZpSeRbe0D41jR5rBvGzDxeXq.bQfXy89bKy',
                `is_active` TINYINT(1) NOT NULL DEFAULT 1,
                `avatar_url` TEXT NULL,
                UNIQUE KEY `idx_email` (`email`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

            // Safe migration checks for columns that might not exist in old setups
            $this->safeAddColumn($pdo, 'users', 'username', "VARCHAR(100) NULL AFTER `id`");
            $this->safeAddColumn($pdo, 'users', 'is_active', "TINYINT(1) NOT NULL DEFAULT 1");
            $this->safeAddColumn($pdo, 'users', 'password', "VARCHAR(255) NULL DEFAULT '$2y$10$6RbyyA7A9o7W7KzWv5ZpSeRbe0D41jR5rBvGzDxeXq.bQfXy89bKy'");

            // 2. Technicians Table
            $pdo->exec("CREATE TABLE IF NOT EXISTS `technicians` (
                `id` VARCHAR(50) NOT NULL PRIMARY KEY,
                `full_name` VARCHAR(100) NOT NULL,
                `phone` VARCHAR(20) NULL,
                `email` VARCHAR(100) NULL,
                `specialty` VARCHAR(50) NULL,
                `is_active` TINYINT(1) NOT NULL DEFAULT 1,
                `completed_tasks` INT NOT NULL DEFAULT 0,
                `created_date` VARCHAR(50) NULL,
                `updated_date` VARCHAR(50) NULL,
                `created_by` VARCHAR(50) NULL,
                `certification_level` VARCHAR(50) NOT NULL DEFAULT 'Junior'
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

            $this->safeAddColumn($pdo, 'technicians', 'certification_level', "VARCHAR(50) NOT NULL DEFAULT 'Junior'");

            // 3. Requests Table
            $pdo->exec("CREATE TABLE IF NOT EXISTS `requests` (
                `id` VARCHAR(50) NOT NULL PRIMARY KEY,
                `full_name` VARCHAR(100) NOT NULL,
                `phone` VARCHAR(20) NOT NULL,
                `service_type` VARCHAR(50) NOT NULL,
                `description` TEXT NULL,
                `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
                `priority` VARCHAR(20) NOT NULL DEFAULT 'medium',
                `admin_notes` TEXT NULL,
                `technician_id` VARCHAR(50) NULL,
                `technician_name` VARCHAR(100) NULL,
                `anydesk_id` VARCHAR(20) NULL,
                `anydesk_password` VARCHAR(50) NULL,
                `is_approved` TINYINT(1) NOT NULL DEFAULT 0,
                `price` VARCHAR(50) NULL,
                `created_date` VARCHAR(50) NULL,
                `updated_date` VARCHAR(50) NULL,
                `created_by` VARCHAR(50) NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

            // 4. Reviews Table
            $pdo->exec("CREATE TABLE IF NOT EXISTS `reviews` (
                `id` VARCHAR(50) NOT NULL PRIMARY KEY,
                `customer_name` VARCHAR(100) NOT NULL,
                `rating` INT NOT NULL DEFAULT 5,
                `comment` TEXT NOT NULL,
                `service_type` VARCHAR(50) NULL,
                `is_approved` TINYINT(1) NOT NULL DEFAULT 0,
                `is_rejected` TINYINT(1) NOT NULL DEFAULT 0,
                `created_date` VARCHAR(50) NULL,
                `updated_date` VARCHAR(50) NULL,
                `created_by` VARCHAR(50) NULL,
                `technician_id` VARCHAR(50) NULL,
                `technician_name` VARCHAR(100) NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

            // 5. Tickets Table
            $pdo->exec("CREATE TABLE IF NOT EXISTS `tickets` (
                `id` VARCHAR(50) NOT NULL PRIMARY KEY,
                `user_id` VARCHAR(50) NULL,
                `status` VARCHAR(20) NOT NULL DEFAULT 'open',
                `content` TEXT NULL,
                `subject` VARCHAR(200) NOT NULL,
                `message` TEXT NOT NULL,
                `priority` VARCHAR(20) NOT NULL DEFAULT 'medium',
                `category` VARCHAR(20) NOT NULL DEFAULT 'general',
                `admin_reply` TEXT NULL,
                `user_email` VARCHAR(100) NULL,
                `user_name` VARCHAR(100) NULL,
                `created_date` VARCHAR(50) NULL,
                `updated_date` VARCHAR(50) NULL,
                `created_by` VARCHAR(50) NULL,
                `availability_time` VARCHAR(100) NULL,
                `attached_file` TEXT NULL,
                `attached_file_name` VARCHAR(200) NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

            $this->safeAddColumn($pdo, 'tickets', 'user_id', "VARCHAR(50) NULL AFTER `id`");
            $this->safeAddColumn($pdo, 'tickets', 'content', "TEXT NULL AFTER `status`");

            // 6. Ticket Messages (or Support Chat Messages) Table
            $pdo->exec("CREATE TABLE IF NOT EXISTS `ticket_messages` (
                `id` VARCHAR(50) NOT NULL PRIMARY KEY,
                `ticket_id` VARCHAR(50) NOT NULL,
                `sender_id` VARCHAR(50) NOT NULL,
                `sender_name` VARCHAR(100) NOT NULL,
                `sender_role` VARCHAR(20) NOT NULL DEFAULT 'customer',
                `message` TEXT NOT NULL,
                `timestamp` VARCHAR(50) NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

            // 7. Notifications Table
            $pdo->exec("CREATE TABLE IF NOT EXISTS `notifications` (
                `id` VARCHAR(50) NOT NULL PRIMARY KEY,
                `title` VARCHAR(200) NOT NULL,
                `message` TEXT NOT NULL,
                `read` TINYINT(1) NOT NULL DEFAULT 0,
                `type` VARCHAR(100) NULL,
                `timestamp` VARCHAR(50) NULL,
                `created_at` VARCHAR(50) NULL,
                `priority` VARCHAR(50) NOT NULL DEFAULT 'low',
                `target_role` VARCHAR(50) NULL,
                `reference_id` VARCHAR(50) NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

            // 8. Orders Table
            $pdo->exec("CREATE TABLE IF NOT EXISTS `orders` (
                `id` VARCHAR(50) NOT NULL PRIMARY KEY,
                `user_id` VARCHAR(50) NOT NULL,
                `driver_details` TEXT NOT NULL,
                `amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                `payment_status` VARCHAR(20) NOT NULL DEFAULT 'pending',
                `transaction_id` VARCHAR(100) NULL,
                `created_date` VARCHAR(50) NOT NULL,
                `updated_date` VARCHAR(50) NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

            // 9. Chat Messages Table
            $pdo->exec("CREATE TABLE IF NOT EXISTS `chat_messages` (
                `id` VARCHAR(50) NOT NULL PRIMARY KEY,
                `chat_id` VARCHAR(50) NOT NULL,
                `sender_id` VARCHAR(50) NOT NULL,
                `sender_name` VARCHAR(100) NOT NULL,
                `sender_role` VARCHAR(20) NOT NULL,
                `message` TEXT NOT NULL,
                `timestamp` VARCHAR(50) NOT NULL,
                `file_url` TEXT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
            
            // Seed a default admin if none exists
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM `users` WHERE `role` = 'admin'");
            $stmt->execute();
            if ($stmt->fetchColumn() == 0) {
                // Insert default supervisor account (with password_hash for bcrypt)
                $admin_pass_hash = password_hash('09386561626mM@', PASSWORD_BCRYPT);
                $stmt = $pdo->prepare("INSERT INTO `users` (`id`, `username`, `full_name`, `email`, `phone`, `role`, `password`, `is_active`, `avatar_url`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([
                    'admin-1',
                    'admin@easydriver.ir',
                    'مدیریت ایزی‌درایور (امین)',
                    'admin@easydriver.ir',
                    '09010009999',
                    'admin',
                    $admin_pass_hash,
                    1,
                    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80'
                ]);
            }

            // Seed a default customer if none exists
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM `users` WHERE `id` = 'user-customer'");
            $stmt->execute();
            if ($stmt->fetchColumn() == 0) {
                $user_pass_hash = password_hash('123', PASSWORD_BCRYPT);
                $stmt = $pdo->prepare("INSERT INTO `users` (`id`, `username`, `full_name`, `email`, `phone`, `role`, `password`, `is_active`, `avatar_url`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([
                    'user-customer',
                    'saeed@customer.ir',
                    'سعید رستمی',
                    'saeed@customer.ir',
                    '09121234567',
                    'customer',
                    $user_pass_hash,
                    1,
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80'
                ]);
            }
            
        } catch (PDOException $e) {
            // Suppress error or log it silently so it doesn't break JSON flow
            error_log("Database migrations check failed: " . $e->getMessage());
        }
    }

    private function safeAddColumn(PDO $pdo, string $table, string $column, string $definition): void {
        try {
            $stmt = $pdo->prepare("SHOW COLUMNS FROM `$table` LIKE ?");
            $stmt->execute([$column]);
            if ($stmt->rowCount() === 0) {
                $pdo->exec("ALTER TABLE `$table` ADD COLUMN `$column` $definition;");
            }
        } catch (PDOException $e) {
            // column or table error
        }
    }
}
