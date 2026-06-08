<?php
namespace Api\Controllers;

use PDO;
use Api\Core\Utils;

class SupportChatController {
    private PDO $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    /**
     * POST /api/support-chat/initiate
     * Initiates a live support chat from any page.
     * Looks up if there's already an open chat session (general category ticket with status != closed),
     * otherwise creates a new one so dialogue begins instantly without switching contexts.
     */
    public function initiate(array $params, array $body): void {
        $userId = $body['userId'] ?? 'user-customer';
        $userName = $body['userName'] ?? 'مشتری';
        $userEmail = $body['userEmail'] ?? 'customer@easydriver.ir';
        $initialMessage = $body['message'] ?? 'سلام، من نیاز به راهنمایی در مورد روش نصب با AnyDesk و دریافت لایسنس دارم.';

        // Search for an active open support chat session (category 'general' and status != 'closed')
        $stmt = $this->db->prepare("SELECT * FROM `tickets` WHERE `user_id` = ? AND `category` = 'general' AND `status` != 'closed' ORDER BY `created_date` DESC LIMIT 1");
        $stmt->execute([$userId]);
        $activeChat = $stmt->fetch();

        if ($activeChat) {
            Utils::sendResponse(200, true, null, [
                'isNew' => false,
                'chatId' => $activeChat['id'],
                'subject' => $activeChat['subject']
            ]);
            return;
        }

        // None exists, let's create a new live chat room
        $chatId = 'chat_' . uniqid();
        $timestamp = date('c');

        $stmt = $this->db->prepare("INSERT INTO `tickets` (`id`, `user_id`, `status`, `content`, `subject`, `message`, `priority`, `category`, `user_email`, `user_name`, `created_date`, `updated_date`, `created_by`) VALUES (?, ?, 'open', ?, ?, ?, 'medium', 'general', ?, ?, ?, ?, ?)");
        $success = $stmt->execute([
            $chatId,
            $userId,
            $initialMessage,
            'گفتگوی آنلاین حل خطای ویندوز',
            $initialMessage,
            $userEmail,
            $userName,
            $timestamp,
            $timestamp,
            $userId
        ]);

        if ($success) {
            // Add initial message row
            $msgId = 'msg_init_' . uniqid();
            $msgStmt = $this->db->prepare("INSERT INTO `ticket_messages` (`id`, `ticket_id`, `sender_id`, `sender_name`, `sender_role`, `message`, `timestamp`) VALUES (?, ?, ?, ?, 'customer', ?, ?)");
            $msgStmt->execute([
                $msgId,
                $chatId,
                $userId,
                $userName,
                $initialMessage,
                $timestamp
            ]);

            Utils::sendResponse(201, true, null, [
                'isNew' => true,
                'chatId' => $chatId,
                'subject' => 'گفتگوی آنلاین حل خطای ویندوز'
            ]);
        } else {
            Utils::sendResponse(500, false, 'ایجاد روم گفتگوی جدید با خطا مواجه شد.');
        }
    }

    /**
     * POST /api/support-chat/:id/convert
     * Converts an active live support chat into an official technical support ticket.
     */
    public function convert(array $params, array $body): void {
        $chatId = $params['id'] ?? '';
        $targetCategory = $body['category'] ?? 'technical'; // technical, billing, complaint
        $subject = $body['subject'] ?? '';

        // Check if chat room exists
        $stmt = $this->db->prepare("SELECT * FROM `tickets` WHERE `id` = ?");
        $stmt->execute([$chatId]);
        $ticket = $stmt->fetch();

        if (!$ticket) {
            Utils::sendResponse(404, false, 'گفتگوی مورد نظر یافت نشد.');
            return;
        }

        $finalSubject = !empty($subject) ? $subject : 'تیکت رسمی: ' . $ticket['subject'];

        $update = $this->db->prepare("UPDATE `tickets` SET `category` = ?, `subject` = ?, `updated_date` = ? WHERE `id` = ?");
        $success = $update->execute([
            $targetCategory,
            $finalSubject,
            date('c'),
            $chatId
        ]);

        if ($success) {
            // Append log comment message in history
            $msgId = 'msg_log_' . uniqid();
            $logMsgStr = "⚠️ این گفتگوی پشتیبانی در تاریخ " . date('Y-m-d H:i') . " توسط کاربر به یک تیکت رسمی پشتیبانی در دسته‌بندی «" . $targetCategory . "» تبدیل گردید تا توسط کارشناسان بخش پیگیری شود.";
            
            $msgStmt = $this->db->prepare("INSERT INTO `ticket_messages` (`id`, `ticket_id`, `sender_id`, `sender_name`, `sender_role`, `message`, `timestamp`) VALUES (?, ?, 'system', 'سیستم', 'admin', ?, ?)");
            $msgStmt->execute([
                $msgId,
                $chatId,
                $logMsgStr,
                date('c')
            ]);

            Utils::sendResponse(200, true, null, [
                'message' => 'گفتگوی آنلاین شما با موفقیت به تیکت رسمی ارتقا یافت.',
                'chatId' => $chatId,
                'category' => $targetCategory,
                'subject' => $finalSubject
            ]);
        } else {
            Utils::sendResponse(500, false, 'عدم موفقیت در ارتقای گفتگوی آنلاین به تیکت.');
        }
    }
}
