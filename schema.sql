-- EasyDriver Database Schema for MySQL / phpMyAdmin Management
-- Created: 2026-05-20
-- Compatible with MySQL 5.7+ and MySQL 8.0+

CREATE DATABASE IF NOT EXISTS `easydriver_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `easydriver_db`;

-- -------------------------------------------------------------
-- Table Structure for `users` (Roles, admins, customers, techs)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(50) NOT NULL,
  `full_name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `phone` VARCHAR(20) NOT NULL,
  `role` ENUM('customer', 'technician', 'admin') NOT NULL DEFAULT 'customer',
  `avatar_url` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- Table Structure for `technicians` (Technicians active/specialty)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `technicians` (
  `id` VARCHAR(50) NOT NULL,
  `full_name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `email` VARCHAR(100) NULL,
  `specialty` ENUM('driver_install', 'software_install', 'anydesk_support', 'all') NOT NULL DEFAULT 'all',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `completed_tasks` INT NOT NULL DEFAULT 0,
  `created_date` VARCHAR(100) NOT NULL,
  `updated_date` VARCHAR(100) NOT NULL,
  `created_by` VARCHAR(50) NOT NULL,
  `certification_level` ENUM('Junior', 'Senior', 'Expert') NOT NULL DEFAULT 'Junior',
  PRIMARY KEY (`id`),
  FOREIGN KEY (`id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- Table Structure for `requests` (Customer remote execution service requests)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `requests` (
  `id` VARCHAR(50) NOT NULL,
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
  `rated_at` VARCHAR(100) NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`assigned_to_id`) REFERENCES `technicians` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- Table Structure for `reviews` (Feedback & ratings)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `reviews` (
  `id` VARCHAR(50) NOT NULL,
  `customer_name` VARCHAR(100) NOT NULL,
  `rating` INT NOT NULL,
  `comment` TEXT NOT NULL,
  `service_type` VARCHAR(100) NULL,
  `is_approved` TINYINT(1) NOT NULL DEFAULT 0,
  `created_date` VARCHAR(100) NOT NULL,
  `updated_date` VARCHAR(100) NOT NULL,
  `created_by` VARCHAR(50) NOT NULL,
  `technician_id` VARCHAR(50) NULL,
  `technician_name` VARCHAR(100) NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`technician_id`) REFERENCES `technicians` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- Table Structure for `tickets` (Support request loops)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tickets` (
  `id` VARCHAR(50) NOT NULL,
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
  `availability_time` VARCHAR(100) NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- Table Structure for `ticket_messages` (Ticket support thread messages)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ticket_messages` (
  `id` VARCHAR(50) NOT NULL,
  `ticket_id` VARCHAR(50) NOT NULL,
  `sender_id` VARCHAR(50) NOT NULL,
  `sender_name` VARCHAR(100) NOT NULL,
  `sender_role` ENUM('customer', 'technician', 'admin') NOT NULL,
  `message` TEXT NOT NULL,
  `timestamp` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -------------------------------------------------------------
-- Seed Initial User & Technician Data
-- -------------------------------------------------------------

INSERT INTO `users` (`id`, `full_name`, `email`, `phone`, `role`, `avatar_url`) VALUES
('user-customer', 'سعید رستمی', 'saeed@customer.ir', '09121234567', 'customer', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80'),
('tech-1', 'مهندس نوید مرادی', 'navid@easydriver.ir', '09123456789', 'technician', 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&h=150&q=80'),
('tech-2', 'آرش علوی', 'arash@easydriver.ir', '09187654321', 'technician', 'https://images.unsplash.com/photo-1572451479139-6a308211d8be?auto=format&fit=crop&w=150&h=150&q=80'),
('tech-3', 'مینا خسروی', 'mina@easydriver.ir', '09351234567', 'technician', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&h=150&q=80'),
('tech-4', 'سهراب شریفی', 'sohrab@easydriver.ir', '09219876543', 'technician', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80'),
('admin-1', 'مدیریت ایزی‌درایور (امین)', 'admin@easydriver.ir', '09010009999', 'admin', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80');

INSERT INTO `technicians` (`id`, `full_name`, `phone`, `email`, `specialty`, `is_active`, `completed_tasks`, `created_date`, `updated_date`, `created_by`, `certification_level`) VALUES
('tech-1', 'مهندس نوید مرادی', '09123456789', 'navid@easydriver.ir', 'all', 1, 34, '2026-01-10T08:30:00Z', '2026-05-18T10:20:00Z', 'admin-1', 'Expert'),
('tech-2', 'آرش علوی', '09187654321', 'arash@easydriver.ir', 'driver_install', 1, 51, '2026-02-15T09:12:00Z', '2026-05-19T14:40:00Z', 'admin-1', 'Senior'),
('tech-3', 'مینا خسروی', '09351234567', 'mina@easydriver.ir', 'software_install', 1, 22, '2026-03-01T15:20:00Z', '2026-05-15T11:00:00Z', 'admin-1', 'Junior'),
('tech-4', 'سهراب شریفی', '09219876543', 'sohrab@easydriver.ir', 'anydesk_support', 0, 18, '2026-04-12T11:05:00Z', '2026-05-10T16:30:00Z', 'admin-1', 'Junior');

-- -------------------------------------------------------------
-- Seed Initial Support Service Requests
-- -------------------------------------------------------------
INSERT INTO `requests` (`id`, `full_name`, `phone`, `service_type`, `description`, `status`, `priority`, `admin_notes`, `scheduled_date`, `assigned_to_id`, `assigned_to_name`, `is_approved`, `approved_at`, `assigned_at`, `created_date`, `updated_date`, `created_by`, `rating`, `rating_comment`, `rated_at`) VALUES
('req-1', 'علی رضایی', '09121112233', 'driver_install', 'کارت گرافیک لپتاپ ایسوس TUF RTX 3060 به درستی شناسایی نمی‌شود و بازی‌ها افت فریم شدید دارند. درایور مناسب و پایدار می‌خواهم نصب شود.', 'completed', 'high', 'با موفقیت از طریق انی‌دسک متصل شدیم. درایور قدیمی به طور کامل با DDU پاکسازی شد و آخرین نسخه پایدار و اورجینال انویدیا نصب گردید.', '2026-05-18T14:00', 'tech-2', 'آرش علوی', 1, '2026-05-18T09:30:00Z', '2026-05-18T09:35:00Z', '2026-05-18T08:15:00Z', '2026-05-18T14:45:00Z', 'user-customer', 5, 'بسیار عالی تشکر', '2026-05-18T15:00:00Z'),
('req-2', 'سارا امینی', '09192223344', 'software_install', 'نیاز به نصب آخرین نسخه نرم‌افزار اتوکد و متلب به همراه لایسنس فعال دارم تا برای پروژه‌ پایانی دانشگاه کار کنم.', 'in_progress', 'medium', 'نرم‌افزارها دانلود شده و لایسنس‌ها آماده است. تکنسین مینا خسروی در حال انجام کار است.', '2026-05-20T11:00', 'tech-3', 'مینا خسروی', 1, '2026-05-19T10:00:00Z', '2026-05-19T10:15:00Z', '2026-05-19T09:00:00Z', '2026-05-20T04:00:00Z', 'user-customer', NULL, NULL, NULL),
('req-3', 'احسان حسینی', '09374445566', 'anydesk_support', 'ویندوز ۱۱ پس از آپدیت آخر بالا می‌آید ولی وای‌فای کاملاً قطع شده و خطای کد ۴۳ در دیوایس منیجر می‌دهد.', 'assigned', 'urgent', NULL, '2026-05-20T16:30', 'tech-1', 'مهندس نوید مرادی', 1, '2026-05-20T03:00:00Z', '2026-05-20T03:10:00Z', '2026-05-20T02:40:00Z', '2026-05-20T03:10:00Z', 'user-customer', NULL, NULL, NULL),
('req-4', 'مریم بهرامی', '09335556677', 'other', 'سیستم ویندوز من بسیار کند کار می‌کند و بعضی اوقات خودبه‌خود ریستارت می‌شود. چند آنتی‌ویروس و ابزار بهینه‌سازی لازم دارم.', 'pending', 'medium', NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-05-20T04:15:00Z', '2026-05-20T04:15:00Z', 'user-customer', NULL, NULL, NULL);

-- -------------------------------------------------------------
-- Seed Initial User Reviews
-- -------------------------------------------------------------
INSERT INTO `reviews` (`id`, `customer_name`, `rating`, `comment`, `service_type`, `is_approved`, `created_date`, `updated_date`, `created_by`, `technician_id`, `technician_name`) VALUES
('rev-1', 'کامران شهاب', 5, 'بسیار سریع درایور کارت صدا و گرافیک لپ‌تاپ قدیمی من رو آپدیت کردن. فکر نمی‌کردم بشه مشکلات ویندوز ۱۰ رو این‌قدر تمیز و از راه دور حل کرد. کارشناسشون واقعاً صبور بودن.', 'نصب و بروزرسانی درایور', 1, '2026-05-10T12:00:00Z', '2026-05-10T12:00:00Z', 'user-customer-1', 'tech-2', 'آرش علوی'),
('rev-2', 'فاطمه صادقی', 5, 'برنامه فتوشاپ ۲۰۲۶ و پریمیر رو به همراه پلاگین‌ها برام نصب کردن. سرعت دانلود بالا بود و فعالسازها عالی کار می‌کنند. تشکر فراوان.', 'نصب نرم‌افزار تخصصی و عمومی', 1, '2026-05-14T16:45:00Z', '2026-05-14T16:45:00Z', 'user-customer-2', 'tech-3', 'مینا خسروی'),
('rev-3', 'علیرضا تقوی', 4, 'رفع مشکل صفحه آبی مرگ ویندوز با انی‌دسک به بهترین شکل انجام شد. فقط ای کاش زمان پاسخ اولیه کمی کمتر بود ولی در کل خیلی حرفه‌ای بودن.', 'پشتیبانی فنی از راه دور (AnyDesk)', 1, '2026-05-17T09:30:00Z', '2026-05-17T09:30:00Z', 'user-customer-3', 'tech-1', 'مهندس نوید مرادی');

-- -------------------------------------------------------------
-- Seed Initial Customer Tickets & Support Line messages
-- -------------------------------------------------------------
INSERT INTO `tickets` (`id`, `subject`, `message`, `status`, `priority`, `category`, `admin_reply`, `user_email`, `user_name`, `created_date`, `updated_date`, `created_by`, `availability_time`) VALUES
('tick-1', 'عدم فعال‌سازی مجدد لایسنس آفیس', 'سلام، آفیس نصب شده به خوبی کار می‌کرد ولی امروز پیام لایسنس داد و وارد حالت Read-Only شد. چیکار باید بکنم؟', 'in_progress', 'high', 'technical', NULL, 'ali@gmail.com', 'علی رضایی', '2026-05-19T11:20:00Z', '2026-05-20T01:30:00Z', 'user-customer', NULL),
('tick-2', 'آموزش اتصال انی‌دسک', 'من برای اولین بار می‌خوام ثبت درخواست بدم، ولی بلد نیستم چطور برنامه انی‌دسک رو اجرا کنم تا تکنسینتون وصل بشه.', 'open', 'medium', 'general', NULL, 'maryam@gmail.com', 'مریم بهرامی', '2026-05-20T04:30:00Z', '2026-05-20T04:30:00Z', 'user-customer', NULL),
('tick-3', 'نصب مجدد بعد از ارتقا ویندوز', 'ببخشید من ماه گذشته درخواستم کامل شد. اگر ویندوزم رو دوباره عوض کنم باز هم به صورت رایگان برام نصب می‌کنید یا فاکتور جدید صادر میشه؟', 'closed', 'low', 'billing', 'کاربر گرامی، گارانتی نصب خدمات EasyDriver تا یک هفته می‌باشد. پس از آن هزینه نصب با تخفیف ۵۰درصدی برای مشتریان وفادار محاسبه خواهد شد.', 'sara@gmail.com', 'سارا امینی', '2026-05-15T14:10:00Z', '2026-05-16T10:00:00Z', 'user-customer', NULL);

INSERT INTO `ticket_messages` (`id`, `ticket_id`, `sender_id`, `sender_name`, `sender_role`, `message`, `timestamp`) VALUES
('msg-1', 'tick-1', 'user-customer', 'علی رضایی', 'customer', 'سلام، آفیس نصب شده به خوبی کار می‌کرد ولی امروز پیام لایسنس داد و وارد حالت Read-Only شد. چیکار باید بکنم؟', '2026-05-19T11:20:00Z'),
('msg-2', 'tick-1', 'admin-1', 'مدیریت پشتیبانی', 'admin', 'سلام علی عزیز؛ لطفاً از خاموش بودن فایروال سیستم یا آنتی‌ویروس مطمئن بشید. دوباره ابزار فعال‌ساز EasyActivator رو که روی دسکتاپتون هست اجرا کنید و گزینه ۲ رو بزنید.', '2026-05-20T01:30:00Z'),
('msg-3', 'tick-2', 'user-customer', 'مریم بهرامی', 'customer', 'من برای اولین بار می‌خوام ثبت درخواست بدم، ولی بلد نیستم چطور برنامه انی‌دسک رو اجرا کنم تا تکنسینتون وصل بشه.', '2026-05-20T04:30:00Z');
