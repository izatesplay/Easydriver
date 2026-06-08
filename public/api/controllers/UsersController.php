<?php
namespace Api\Controllers;

use PDO;
use Api\Core\Utils;

class UsersController {
    private PDO $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    public function list(array $params, array $body): void {
        $stmt = $this->db->query("SELECT * FROM `users` ORDER BY `id` DESC");
        $users = $stmt->fetchAll() ?: [];

        $sanitizedUsers = [];
        foreach ($users as $user) {
            $sanitizedUsers[] = [
                'id' => $user['id'],
                'fullName' => $user['full_name'],
                'email' => $user['email'],
                'phone' => $user['phone'],
                'role' => $user['role'],
                'avatarUrl' => $user['avatar_url'],
                'isActive' => (int)$user['is_active'] === 1,
                'password' => $user['password'] ?? '123'
            ];
        }

        echo json_encode($sanitizedUsers, JSON_UNESCAPED_UNICODE);
        exit();
    }

    public function read(array $params, array $body): void {
        $id = $params['id'] ?? '';
        $stmt = $this->db->prepare("SELECT * FROM `users` WHERE `id` = :id");
        $stmt->execute(['id' => $id]);
        $user = $stmt->fetch();

        if (!$user) {
            Utils::sendResponse(404, false, 'کاربر مورد نظر یافت نشد.');
            return;
        }

        $userData = [
            'id' => $user['id'],
            'fullName' => $user['full_name'],
            'email' => $user['email'],
            'phone' => $user['phone'],
            'role' => $user['role'],
            'avatarUrl' => $user['avatar_url'],
            'isActive' => (int)$user['is_active'] === 1
        ];

        echo json_encode($userData, JSON_UNESCAPED_UNICODE);
        exit();
    }

    public function create(array $params, array $body): void {
        $bodySnake = Utils::keysConvert($body, 'snake');
        $id = $bodySnake['id'] ?? 'user_' . uniqid();
        $bodySnake['id'] = $id;

        $fullName = $bodySnake['full_name'] ?? '';
        $email = strtolower(trim($bodySnake['email'] ?? ''));
        $phone = trim($bodySnake['phone'] ?? '');
        $role = $bodySnake['role'] ?? 'customer';
        $password = $bodySnake['password'] ?? '123';

        if (empty($fullName) || empty($email) || empty($phone)) {
            Utils::sendResponse(400, false, 'رکوردهای نام، ایمیل و شماره تماس اجباری است.');
            return;
        }

        // Check for duplicates
        $chk = $this->db->prepare("SELECT id FROM `users` WHERE LOWER(`email`) = ? OR `phone` = ?");
        $chk->execute([$email, $phone]);
        if ($chk->fetch()) {
            Utils::sendResponse(400, false, 'یک حساب کاربری دیگر با این مشخصات یا شماره موبایل از قبل موجود است.');
            return;
        }

        // Generate safe password_hash
        $passwordHash = password_hash($password, PASSWORD_BCRYPT);
        $avatarUrl = $bodySnake['avatar_url'] ?? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80';
        $username = $email;
        $isActive = ($role === 'technician') ? 0 : 1; // Technicians require manual admin activation

        $stmt = $this->db->prepare("INSERT INTO `users` (`id`, `username`, `password_hash`, `full_name`, `email`, `phone`, `role`, `password`, `is_active`, `avatar_url`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $success = $stmt->execute([
            $id,
            $username,
            $passwordHash,
            $fullName,
            $email,
            $phone,
            $role,
            $password,
            $isActive,
            $avatarUrl
        ]);

        if ($success) {
            // Also insert into technicians table if they signed up as a technician
            if ($role === 'technician') {
                $techStmt = $this->db->prepare("INSERT INTO `technicians` (`id`, `full_name`, `phone`, `email`, `specialty`, `is_active`, `completed_tasks`, `created_date`, `updated_date`) VALUES (?, ?, ?, ?, 'all', 0, 0, ?, ?)");
                $techStmt->execute([
                    $id,
                    $fullName,
                    $phone,
                    $email,
                    date('c'),
                    date('c')
                ]);
            }

            Utils::sendResponse(201, true, null, [
                'id' => $id,
                'email' => $email,
                'fullName' => $fullName,
                'phone' => $phone,
                'role' => $role,
                'avatarUrl' => $avatarUrl,
                'isActive' => $isActive === 1
            ]);
        } else {
            Utils::sendResponse(500, false, 'بروز خطا هنگام ثبت اطلاعات کاربر جدید.');
        }
    }

    public function update(array $params, array $body): void {
        $id = $params['id'] ?? '';
        $bodySnake = Utils::keysConvert($body, 'snake');

        // Check user existence
        $stmt = $this->db->prepare("SELECT * FROM `users` WHERE `id` = :id");
        $stmt->execute(['id' => $id]);
        $user = $stmt->fetch();
        if (!$user) {
            Utils::sendResponse(404, false, 'کاربر برای بروزرسانی مشخصات یافت نشد.');
            return;
        }

        // Fields allowed for updating
        $fields = ['full_name', 'email', 'phone', 'role', 'is_active', 'avatar_url', 'password'];
        $sets = [];
        $binds = ['id' => $id];

        foreach ($fields as $fd) {
            if (array_key_exists($fd, $bodySnake)) {
                $sets[] = "`$fd` = :$fd";
                $binds[$fd] = $bodySnake[$fd];

                // If plain password is updated, sync its password_hash as well
                if ($fd === 'password') {
                    $sets[] = "`password_hash` = :password_hash";
                    $binds['password_hash'] = password_hash($bodySnake['password'], PASSWORD_BCRYPT);
                }
            }
        }

        if (count($sets) === 0) {
            Utils::sendResponse(200, true, null, ['id' => $id]);
            return;
        }

        $sql = "UPDATE `users` SET " . implode(', ', $sets) . " WHERE `id` = :id";
        $stmt = $this->db->prepare($sql);
        $success = $stmt->execute($binds);

        if ($success) {
            Utils::sendResponse(200, true, null, ['id' => $id]);
        } else {
            Utils::sendResponse(500, false, 'خطا در بروزرسانی اطلاعات کاربری.');
        }
    }

    public function delete(array $params, array $body): void {
        $id = $params['id'] ?? '';
        $stmt = $this->db->prepare("DELETE FROM `users` WHERE `id` = :id");
        $success = $stmt->execute(['id' => $id]);

        if ($success) {
            // Check if they are technician, delete their technician profile as well
            $delTech = $this->db->prepare("DELETE FROM `technicians` WHERE `id` = :id");
            $delTech->execute(['id' => $id]);

            Utils::sendResponse(200, true);
        } else {
            Utils::sendResponse(500, false, 'حذف حساب کاربری با شکست مواجه شد.');
        }
    }
}
