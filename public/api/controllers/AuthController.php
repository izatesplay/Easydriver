<?php
namespace Api\Controllers;

use PDO;
use Api\Core\Utils;

class AuthController {
    private PDO $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    public function login(array $params, array $body): void {
        $emailOrPhone = isset($body['emailOrPhone']) ? trim($body['emailOrPhone']) : '';
        $password = isset($body['password']) ? trim($body['password']) : '';
        $role = isset($body['role']) ? trim($body['role']) : 'customer';

        if ($emailOrPhone === '' || $password === '') {
            Utils::sendResponse(400, false, 'اطلاعات ارسالی برای ورود ناقص یا نامعتبر می‌باشد.');
            return;
        }

        $identifier = strtolower($emailOrPhone);

        // Find user by email or phone and matching role securely using PDO
        $stmt = $this->db->prepare("SELECT * FROM `users` WHERE (LOWER(`email`) = :email OR `phone` = :phone) AND `role` = :role");
        $stmt->execute([
            'email' => $identifier,
            'phone' => $identifier,
            'role' => $role
        ]);
        $user = $stmt->fetch();

        if (!$user) {
            Utils::sendResponse(401, false, 'کاربری با این مشخصات و نقش در سامانه یافت نشد. صحت نقش و اطلاعات ارسالی را مجدداً بررسی نمایید.');
            return;
        }

        // Validate active status for technicians safely with fallback
        $isActive = isset($user['is_active']) ? (int)$user['is_active'] : 1;
        if ($role === 'technician' && $isActive === 0) {
            Utils::sendResponse(403, false, 'حساب کاربری تکنسینی شما هنوز توسط مدیریت ریموت تایید و فعال نگردیده است. مقتضی است منتظر تایید اولیه بمانید.');
            return;
        }

        $dbPassword = $user['password'] ?? '123';

        // Check if value is a bcrypt hash (starts with $2y$, $2a$, or $2b$)
        $isHash = (substr($dbPassword, 0, 4) === '$2y$' || substr($dbPassword, 0, 4) === '$2a$' || substr($dbPassword, 0, 4) === '$2b$');

        if ($isHash) {
            if (!password_verify($password, $dbPassword)) {
                Utils::sendResponse(401, false, 'رمز عبور وارد شده اشتباه است. لطفاً مجدداً بررسی فرمایید.');
                return;
            }
        } else {
            // Legacy plaintext fallback
            if ($password !== $dbPassword) {
                Utils::sendResponse(401, false, 'رمز عبور وارد شده اشتباه است. لطفاً مجدداً بررسی فرمایید.');
                return;
            }

            // Auto-upgrade legacy plaintext password to secure bcrypt hash
            $newHash = password_hash($password, PASSWORD_BCRYPT);
            $updateStmt = $this->db->prepare("UPDATE `users` SET `password` = :hash WHERE `id` = :id");
            $updateStmt->execute([
                'hash' => $newHash,
                'id' => $user['id']
            ]);
        }

        // Successful authentication response
        $isActiveVal = isset($user['is_active']) ? (int)$user['is_active'] : 1;
        Utils::sendResponse(200, true, null, [
            'user' => [
                'id' => $user['id'],
                'fullName' => $user['full_name'],
                'email' => $user['email'],
                'phone' => $user['phone'],
                'role' => $user['role'],
                'avatarUrl' => $user['avatar_url'],
                'isActive' => $isActiveVal === 1
            ]
        ]);
    }

    public function setPassword(array $params, array $body): void {
        $userId = isset($body['userId']) ? trim($body['userId']) : '';
        $password = isset($body['password']) ? trim($body['password']) : '';

        if ($userId === '' || strlen($password) < 6) {
            Utils::sendResponse(400, false, 'شناسه کاربر نامعتبر یا طول کلمه عبور کمتر از ۶ کاراکتر است.');
            return;
        }

        $passwordHash = password_hash($password, PASSWORD_BCRYPT);

        // Update password with hash in database safely
        $stmt = $this->db->prepare("UPDATE `users` SET `password` = :password WHERE `id` = :id");
        $result = $stmt->execute([
            'password' => $passwordHash,
            'id' => $userId
        ]);

        if ($result) {
            Utils::sendResponse(200, true, null, [
                'message' => 'رمز عبور شما با موفقیت به استاندارد نوین و امن BCrypt ارتقا یافت. هم‌اکنون می‌توانید وارد حساب کاربری خود شوید.'
            ]);
        } else {
            Utils::sendResponse(500, false, 'خطای سیستمی رخ داد؛ تایید ثبت رمز عبور امن ناموفق بود.');
        }
    }
}
