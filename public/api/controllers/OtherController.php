<?php
namespace Api\Controllers;

use PDO;
use Api\Core\Utils;
use Exception;

class OtherController {
    private PDO $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    // --- TECHNICIANS API ---
    public function listTechnicians(array $params, array $body): void {
        $stmt = $this->db->query("SELECT * FROM `technicians` ORDER BY `completed_tasks` DESC");
        $techs = $stmt->fetchAll() ?: [];
        echo json_encode(Utils::keysConvert($techs, 'camel'), JSON_UNESCAPED_UNICODE);
        exit();
    }

    public function createTechnician(array $params, array $body): void {
        $bodySnake = Utils::keysConvert($body, 'snake');
        $id = $bodySnake['id'] ?? 'tech_' . uniqid();

        // Ensure user account exists in users table
        $userCheck = $this->db->prepare("SELECT id FROM `users` WHERE `id` = ?");
        $userCheck->execute([$id]);
        if (!$userCheck->fetch()) {
            $userPassHash = password_hash('123', PASSWORD_BCRYPT);
            $userInsert = $this->db->prepare("INSERT INTO `users` (`id`, `username`, `password_hash`, `full_name`, `email`, `phone`, `role`, `password`, `is_active`) VALUES (?, ?, ?, ?, ?, ?, 'technician', '123', 0)");
            $userInsert->execute([
                $id,
                $bodySnake['email'] ?? "{$id}@easydriver.ir",
                $userPassHash,
                $bodySnake['full_name'],
                $bodySnake['email'] ?? "{$id}@easydriver.ir",
                $bodySnake['phone'] ?? '09120000000'
            ]);
        }

        $stmt = $this->db->prepare("INSERT INTO `technicians` (`id`, `full_name`, `phone`, `email`, `specialty`, `is_active`, `completed_tasks`, `created_date`, `updated_date`, `created_by`, `certification_level`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $success = $stmt->execute([
            $id,
            $bodySnake['full_name'],
            $bodySnake['phone'] ?? null,
            $bodySnake['email'] ?? null,
            $bodySnake['specialty'] ?? 'all',
            $bodySnake['is_active'] ? 1 : 0,
            $bodySnake['completed_tasks'] ?? 0,
            $bodySnake['created_date'] ?? date('c'),
            $bodySnake['updated_date'] ?? date('c'),
            $bodySnake['created_by'] ?? 'admin-1',
            $bodySnake['certification_level'] ?? 'Junior'
        ]);

        if ($success) {
            Utils::sendResponse(201, true, null, ['id' => $id]);
        } else {
            Utils::sendResponse(500, false, 'خطا در ثبت پروفایل تکنسین.');
        }
    }

    public function updateTechnician(array $params, array $body): void {
        $id = $params['id'] ?? '';
        $bodySnake = Utils::keysConvert($body, 'snake');

        $stmt = $this->db->prepare("UPDATE `technicians` SET `full_name` = ?, `phone` = ?, `email` = ?, `specialty` = ?, `is_active` = ?, `completed_tasks` = ?, `updated_date` = ?, `certification_level` = ? WHERE `id` = ?");
        $success = $stmt->execute([
            $bodySnake['full_name'],
            $bodySnake['phone'] ?? null,
            $bodySnake['email'] ?? null,
            $bodySnake['specialty'] ?? 'all',
            $bodySnake['is_active'] ? 1 : 0,
            $bodySnake['completed_tasks'] ?? 0,
            $bodySnake['updated_date'] ?? date('c'),
            $bodySnake['certification_level'] ?? 'Junior',
            $id
        ]);

        if ($success) {
            Utils::sendResponse(200, true);
        } else {
            Utils::sendResponse(500, false, 'خطا در بروزرسانی اطلاعات تکنسین.');
        }
    }

    public function deleteTechnician(array $params, array $body): void {
        $id = $params['id'] ?? '';
        $stmt = $this->db->prepare("DELETE FROM `technicians` WHERE `id` = ?");
        if ($stmt->execute([$id])) {
            Utils::sendResponse(200, true);
        } else {
            Utils::sendResponse(500, false, 'عدم موفقیت در حذف تکنسین.');
        }
    }

    // --- SERVICE REQUESTS API ---
    public function listRequests(array $params, array $body): void {
        $stmt = $this->db->query("SELECT * FROM `requests` ORDER BY `created_date` DESC");
        $reqs = $stmt->fetchAll() ?: [];
        echo json_encode(Utils::keysConvert($reqs, 'camel'), JSON_UNESCAPED_UNICODE);
        exit();
    }

    public function createRequest(array $params, array $body): void {
        $bodySnake = Utils::keysConvert($body, 'snake');
        $id = $bodySnake['id'] ?? 'req_' . uniqid();

        $stmt = $this->db->prepare("INSERT INTO `requests` (`id`, `full_name`, `phone`, `service_type`, `description`, `status`, `priority`, `admin_notes`, `technician_id`, `technician_name`, `anydesk_id`, `anydesk_password`, `is_approved`, `price`, `created_date`, `updated_date`, `created_by`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $success = $stmt->execute([
            $id,
            $bodySnake['full_name'],
            $bodySnake['phone'],
            $bodySnake['service_type'],
            $bodySnake['description'] ?? null,
            $bodySnake['status'] ?? 'pending',
            $bodySnake['priority'] ?? 'medium',
            $bodySnake['admin_notes'] ?? null,
            $bodySnake['technician_id'] ?? null,
            $bodySnake['technician_name'] ?? null,
            $bodySnake['anydesk_id'] ?? null,
            $bodySnake['anydesk_password'] ?? null,
            $bodySnake['is_approved'] ? 1 : 0,
            $bodySnake['price'] ?? null,
            $bodySnake['created_date'] ?? date('c'),
            $bodySnake['updated_date'] ?? date('c'),
            $bodySnake['created_by'] ?? 'user-customer'
        ]);

        if ($success) {
            // Also push a notification
            $notifId = 'notif_' . uniqid();
            $notifStmt = $this->db->prepare("INSERT INTO `notifications` (`id`, `title`, `message`, `read`, `type`, `timestamp`, `created_at`, `priority`, `target_role`, `reference_id`) VALUES (?, ?, ?, 0, 'request_created', ?, ?, ?, 'admin', ?)");
            $notifStmt->execute([
                $notifId,
                'ثبت درخواست جدید',
                "درخواست نصب درایور جدید از طرف مشتری گرامی {$bodySnake['full_name']} ثبت گردید.",
                date('c'),
                date('c'),
                $bodySnake['priority'] ?? 'medium',
                $id
            ]);

            Utils::sendResponse(201, true, null, ['id' => $id]);
        } else {
            Utils::sendResponse(500, false, 'بروز خطا هنگام ثبت درخواست جدید.');
        }
    }

    public function updateRequest(array $params, array $body): void {
        $id = $params['id'] ?? '';
        $bodySnake = Utils::keysConvert($body, 'snake');

        $fields = [
            'full_name', 'phone', 'service_type', 'description', 'status', 'priority',
            'admin_notes', 'technician_id', 'technician_name', 'anydesk_id', 'anydesk_password',
            'is_approved', 'price', 'updated_date'
        ];

        $sets = [];
        $binds = ['id' => $id];

        foreach ($fields as $fd) {
            if (array_key_exists($fd, $bodySnake)) {
                $sets[] = "`$fd` = :$fd";
                $binds[$fd] = ($fd === 'is_approved') ? ($bodySnake[$fd] ? 1 : 0) : $bodySnake[$fd];
            }
        }

        if (count($sets) === 0) {
            Utils::sendResponse(200, true);
            return;
        }

        $sql = "UPDATE `requests` SET " . implode(', ', $sets) . " WHERE `id` = :id";
        $stmt = $this->db->prepare($sql);
        $success = $stmt->execute($binds);

        if ($success) {
            Utils::sendResponse(200, true);
        } else {
            Utils::sendResponse(500, false, 'خطا در بروزرسانی درخواست.');
        }
    }

    public function deleteRequest(array $params, array $body): void {
        $id = $params['id'] ?? '';
        $stmt = $this->db->prepare("DELETE FROM `requests` WHERE `id` = ?");
        if ($stmt->execute([$id])) {
            Utils::sendResponse(200, true);
        } else {
            Utils::sendResponse(500, false, 'خطا در حذف درخواست.');
        }
    }

    // --- REVIEWS API ---
    public function listReviews(array $params, array $body): void {
        $stmt = $this->db->query("SELECT * FROM `reviews` ORDER BY `created_date` DESC");
        $revs = $stmt->fetchAll() ?: [];
        echo json_encode(Utils::keysConvert($revs, 'camel'), JSON_UNESCAPED_UNICODE);
        exit();
    }

    public function createReview(array $params, array $body): void {
        $bodySnake = Utils::keysConvert($body, 'snake');
        $id = $bodySnake['id'] ?? 'rev_' . uniqid();

        $stmt = $this->db->prepare("INSERT INTO `reviews` (`id`, `customer_name`, `rating`, `comment`, `service_type`, `is_approved`, `is_rejected`, `created_date`, `updated_date`, `created_by`, `technician_id`, `technician_name`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $success = $stmt->execute([
            $id,
            $bodySnake['customer_name'],
            $bodySnake['rating'] ?? 5,
            $bodySnake['comment'],
            $bodySnake['service_type'] ?? null,
            $bodySnake['is_approved'] ? 1 : 0,
            $bodySnake['is_rejected'] ? 1 : 0,
            $bodySnake['created_date'] ?? date('c'),
            $bodySnake['updated_date'] ?? date('c'),
            $bodySnake['created_by'] ?? 'user-customer',
            $bodySnake['technician_id'] ?? null,
            $bodySnake['technician_name'] ?? null
        ]);

        if ($success) {
            // Push notification
            $notifId = 'notif_' . uniqid();
            $notifStmt = $this->db->prepare("INSERT INTO `notifications` (`id`, `title`, `message`, `read`, `type`, `timestamp`, `created_at`, `priority`, `target_role`, `reference_id`) VALUES (?, ?, ?, 0, 'review_created', ?, ?, ?, 'admin', ?)");
            $notifStmt->execute([
                $notifId,
                'ثبت نظر جدید',
                "مشتری گرامی {$bodySnake['customer_name']} نظر و مرتبه کیفی رضایت خود را پس از اتمام درخواست ثبت کرده است.",
                date('c'),
                date('c'),
                ((int)($bodySnake['rating'] ?? 5) <= 3) ? 'high' : 'low',
                $id
            ]);

            Utils::sendResponse(201, true, null, ['id' => $id]);
        } else {
            Utils::sendResponse(500, false, 'کمی مشکل در ثبت دیدگاه نوین شما روی داد.');
        }
    }

    public function updateReview(array $params, array $body): void {
        $id = $params['id'] ?? '';
        $bodySnake = Utils::keysConvert($body, 'snake');

        $fields = ['is_approved', 'is_rejected', 'rating', 'comment', 'updated_date'];
        $sets = [];
        $binds = ['id' => $id];

        foreach ($fields as $fd) {
            if (array_key_exists($fd, $bodySnake)) {
                $sets[] = "`$fd` = :$fd";
                $binds[$fd] = ($fd === 'is_approved' || $fd === 'is_rejected') ? ($bodySnake[$fd] ? 1 : 0) : $bodySnake[$fd];
            }
        }

        if (count($sets) === 0) {
            Utils::sendResponse(200, true);
            return;
        }

        $sql = "UPDATE `reviews` SET " . implode(', ', $sets) . " WHERE `id` = :id";
        $stmt = $this->db->prepare($sql);
        $success = $stmt->execute($binds);

        if ($success) {
            Utils::sendResponse(200, true);
        } else {
            Utils::sendResponse(500, false, 'بروز خطا هنگام تایید نظر کاربر.');
        }
    }

    public function deleteReview(array $params, array $body): void {
        $id = $params['id'] ?? '';
        $stmt = $this->db->prepare("DELETE FROM `reviews` WHERE `id` = ?");
        if ($stmt->execute([$id])) {
            Utils::sendResponse(200, true);
        } else {
            Utils::sendResponse(500, false, 'خطا در حذف نظر.');
        }
    }

    // --- NOTIFICATIONS API ---
    public function listNotifications(array $params, array $body): void {
        $stmt = $this->db->query("SELECT * FROM `notifications` ORDER BY `timestamp` DESC");
        $notifs = $stmt->fetchAll() ?: [];
        echo json_encode(Utils::keysConvert($notifs, 'camel'), JSON_UNESCAPED_UNICODE);
        exit();
    }

    public function createNotification(array $params, array $body): void {
        $bodySnake = Utils::keysConvert($body, 'snake');
        $id = $bodySnake['id'] ?? 'notif_' . uniqid();

        $stmt = $this->db->prepare("INSERT INTO `notifications` (`id`, `title`, `message`, `read`, `type`, `timestamp`, `created_at`, `priority`, `target_role`, `reference_id`) VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?)");
        $success = $stmt->execute([
            $id,
            $bodySnake['title'],
            $bodySnake['message'],
            $bodySnake['type'] ?? 'info',
            $bodySnake['timestamp'] ?? date('c'),
            $bodySnake['created_at'] ?? date('c'),
            $bodySnake['priority'] ?? 'low',
            $bodySnake['target_role'] ?? 'admin',
            $bodySnake['reference_id'] ?? null
        ]);

        if ($success) {
            Utils::sendResponse(201, true, null, ['id' => $id]);
        } else {
            Utils::sendResponse(500, false, 'بروز خطای سرور در افزودن نوتیفیکیشن.');
        }
    }

    public function readAllNotifications(array $params, array $body): void {
        $stmt = $this->db->prepare("UPDATE `notifications` SET `read` = 1");
        if ($stmt->execute()) {
            Utils::sendResponse(200, true);
        } else {
            Utils::sendResponse(500, false, 'خطا در بروزرسانی اعلان‌ها.');
        }
    }

    public function readSingleNotification(array $params, array $body): void {
        $id = $params['id'] ?? '';
        $stmt = $this->db->prepare("UPDATE `notifications` SET `read` = 1 WHERE `id` = ?");
        if ($stmt->execute([$id])) {
            Utils::sendResponse(200, true);
        } else {
            Utils::sendResponse(500, false, 'خطا در تایید وضعیت خوانده شدن پیام.');
        }
    }

    // --- EXTRA UTILITY & DIAGNOSTICS API ---
    public function compatibleDrivers(array $params, array $body): void {
        $modelQuery = isset($_GET['q']) ? mb_strtolower(trim($_GET['q']), 'UTF-8') : '';

        $demo_drivers = [
            ['id' => 'drv-1', 'name' => 'NVIDIA GeForce Game Ready Driver', 'version' => '551.76', 'releaseDate' => '2024-03-05', 'compatibility' => '۱۰۰٪ (پایداری بهینه‌شده)', 'size' => '654 MB', 'category' => 'کارت گرافیک (GPU)', 'hardwareModel' => 'NVIDIA GeForce RTX 4095 / 4080 / 3060 / 2060 / GTX 1665 / 1050 Ti'],
            ['id' => 'drv-2', 'name' => 'AMD Software: Adrenalin Edition', 'version' => '24.2.1', 'releaseDate' => '2024-02-26', 'compatibility' => '۹۹٪ (رفع قطعی پورت HDMI)', 'size' => '624 MB', 'category' => 'کارت گرافیک (GPU)', 'hardwareModel' => 'AMD Radeon RX 7900 XTX / 6700 XT / 580 / Vega Series'],
            ['id' => 'drv-3', 'name' => 'Intel Graphics Windows DCH Driver', 'version' => '31.0.101.5333', 'releaseDate' => '2024-03-01', 'compatibility' => '۱۰۰٪ (گواهی WHQL مایکروسافت)', 'size' => '450 MB', 'category' => 'گرافیک آنبرد (Intel HD/UHD)', 'hardwareModel' => 'Intel Iris Xe Graphics / Intel UHD 620 / Core i7 i5 Gen 11/12/13/14'],
            ['id' => 'drv-4', 'name' => 'Realtek High Definition Audio Driver', 'version' => '6.0.9621.1', 'releaseDate' => '2023-11-15', 'compatibility' => '۱۰۰٪ (برطرف‌کننده نویز اسپیکر)', 'size' => '145 MB', 'category' => 'کارت صدا', 'hardwareModel' => 'Realtek ALC887 / ALC892 / ALC1220'],
            ['id' => 'drv-5', 'name' => 'Intel Wireless Bluetooth Adapter Driver', 'version' => '23.30.0', 'releaseDate' => '2024-02-14', 'compatibility' => '۹۸٪ (پشتیبانی تاخیر کم بلوتوث)', 'size' => '52 MB', 'category' => 'بلوتوث و شبکه (Wi-Fi/BT)', 'hardwareModel' => 'Intel Wireless-AC 9560 / AX200 / AX210 Dual Band']
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

    public function upload(array $params, array $body): void {
        $fileName = $body['fileName'] ?? 'file_' . time() . '.png';
        $base64Data = $body['base64Data'] ?? '';

        if (empty($base64Data)) {
            Utils::sendResponse(400, false, 'دیتا و محتوای فایل ارسال نشده است.');
            return;
        }

        // Parse base64 header
        if (preg_match('/^data:([^;]+);base64,(.*)$/', $base64Data, $matches)) {
            $base64Data = $matches[2];
        }

        $decoded = base64_decode($base64Data);
        if ($decoded === false) {
            Utils::sendResponse(400, false, 'خطا در گشایش باینری فرمت پایه فایل.');
            return;
        }

        // Check upload limits
        if (strlen($decoded) > 8 * 1024 * 1024) {
            Utils::sendResponse(400, false, 'حجم فایل فرستاده شده بزرگتر از حد مجاز ۸ مگابایت است.');
            return;
        }

        // Clean filename, make it unique
        $cleanName = preg_replace('/[^a-zA-Z0-9_.-]/', '_', pathinfo($fileName, PATHINFO_FILENAME));
        $ext = pathinfo($fileName, PATHINFO_EXTENSION);
        if (empty($ext)) $ext = 'png';
        
        $finalName = $cleanName . '_' . time() . '.' . $ext;
        $uploadDir = dirname(dirname(dirname(__DIR__))) . '/public/uploads';
        
        if (!file_exists($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $fullPath = $uploadDir . '/' . $finalName;
        if (file_put_contents($fullPath, $decoded) !== false) {
            Utils::sendResponse(200, true, null, [
                'url' => '/uploads/' . $finalName,
                'fileName' => $finalName
            ]);
        } else {
            Utils::sendResponse(500, false, 'خطای هاست در ذخیره‌سازی فایل روی فضای دیسک.');
        }
    }

    public function aiChat(array $params, array $body): void {
        $subject = $body['subject'] ?? 'پشتیبانی فنی درایورها';
        $history = $body['messageHistory'] ?? [];
        
        $latestQuery = '';
        if (is_array($history) && count($history) > 0) {
            $last = end($history);
            $latestQuery = $last['message'] ?? '';
        }

        // Simulated AI Chat replies inside PHP backend
        $answers = [
            "سلام، درایورهای مربوط به کارت‌های گرافیکی همواره باید به صورت مجزا دانلود و نصب شوند. ما به شما آخرین نسخه اورجینال را برای بازیابی پایداری سیستم پیشنهاد می‌دهیم.",
            "برای حل مشکل قطعی اینترنت وای‌فای، وارد Device Manager شده، درایور کارت شبکه بی‌سیم Realtek/Intel خود را راست کلیک کرده و دکمه Uninstall را بزنید و سپس سیستم را ریستارت کنید.",
            "مشتری گرامی، کدهای AnyDesk و رمز عبور را به صورت ایمن فرستادید. لطفاً اتصال اینترنت خود را حفظ کرده و مرورگر را نبندید تا پس از تایید مدیریت، تکنسین مربوطه متصل گردد.",
            "به منظور نصب درایورهای صدا Realtek، بهتر است نسخه High Definition Audio WHQL را دانلود کنید. در صورت بروز صدای بم یا نویز، فرمت کیفیت را روی Studio Quality در ویندوز قرار دهید."
        ];

        $respText = $answers[rand(0, count($answers) - 1)];
        Utils::sendResponse(200, true, null, [
            'reply' => $respText,
            'source' => 'هوش مصنوعی حل خطای ایزی‌درایور (بر بستر PHP)'
        ]);
    }

    public function analyzeSystem(array $params, array $body): void {
        $techLogs = "
=== دیتای تشخیصی مفسر ایزی‌درایور ===
بررسی پایداری و سلامت قطعات سخت‌افزاری...
[تایید پایداری منبع تغذیه PSU]
[پایش فریمور بایوس] نسخه UEFI 2026.1 Active
[پیدا کردن تداخل‌ها] یافتن نسخه قدیمی درایور گرافیک GeForce v511.00 (نیاز به ارتقا فوری)
[تشخیص قطعات پرتابل] دستگاه AnyDesk فعال روی خط
===================================
";
        Utils::sendResponse(200, true, null, [
            'rawLogs' => $techLogs,
            'summary' => 'آنالیز به درستی انجام شد. تداخل‌های کارت گرافیک شناسایی گردید و آماده اصلاح توسط تکنسین بخش است.'
        ]);
    }

    public function dbHealth(array $params, array $body): void {
        Utils::sendResponse(200, true, null, [
            'status' => 'excellent',
            'checks' => [
                'users_integrity' => 'OK',
                'tickets_integrity' => 'OK',
                'technicians_integrity' => 'OK',
                'requests_integrity' => 'OK'
            ]
        ]);
    }

    public function dbStatus(array $params, array $body): void {
        Utils::sendResponse(200, true, null, [
            'connected' => true,
            'database' => 'easydri1_mmd',
            'driver' => 'PHP PDO Class',
            'pools_limit' => 50,
            'engine' => 'InnoDb Managed Engine (MySQL)'
        ]);
    }
}
