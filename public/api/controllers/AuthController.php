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

        // Validate active status for technicians
        if ($role === 'technician' && (int)$user['is_active'] === 0) {
            Utils::sendResponse(403, false, 'حساب کاربری تکنسینی شما هنوز توسط مدیریت ریموت تایید و فعال نگردیده است. مقتضی است منتظر تایید اولیه بمانید.');
            return;
        }

        $userPassword = $user['password'] ?? '123';
        $passwordHash = $user['password_hash'] ?? null;

        // Check if password_hash is set (secure flow)
        if (!empty($passwordHash)) {
            if (!password_verify($password, $passwordHash)) {
                Utils::sendResponse(401, false, 'رمز عبور وارد شده اشتباه است. لطفاً مجدداً بررسی فرمایید.');
                return;
            }
        } else {
            // Legacy plaintext fallback
            $expectedPlain = ($userPassword !== '') ? $userPassword : '123';
            if ($password !== $expectedPlain) {
                Utils::sendResponse(401, false, 'رمز عبور وارد شده اشتباه است. لطفاً مجدداً بررسی فرمایید.');
                return;
            }

            // Upgrading is required! Send needsPasswordSetup flags so frontend sets a secure bcrypt password
            Utils::sendResponse(200, true, null, [
                'needsPasswordSetup' => true,
                'userId' => $user['id'],
                'message' => 'حساب کاربری شما با موفقیت احراز گردید اما فاقد رمز عبور امن است. لطفاً همین حالا رمز عبور جدید خود را تعیین نمایید تا با ساختار امنیتی BCrypt ذخیره گردد.'
            ]);
            return;
        }

        // Successful authentication response
        Utils::sendResponse(200, true, null, [
            'user' => [
                'id' => $user['id'],
                'fullName' => $user['full_name'],
                'email' => $user['email'],
                'phone' => $user['phone'],
                'role' => $user['role'],
                'avatarUrl' => $user['avatar_url'],
                'isActive' => (int)$user['is_active'] === 1
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

        // Update password and hashed password in database safely
        $stmt = $this->db->prepare("UPDATE `users` SET `password_hash` = :hash, `password` = :password WHERE `id` = :id");
        $result = $stmt->execute([
            'hash' => $passwordHash,
            'password' => $password,
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
