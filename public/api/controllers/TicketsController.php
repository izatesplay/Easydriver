<?php
namespace Api\Controllers;

use PDO;
use Api\Core\Utils;
use Exception;

class TicketsController {
    private PDO $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    public function list(array $params, array $body): void {
        // Fetch all tickets ordered by newest first
        $stmt = $this->db->query("SELECT * FROM `tickets` ORDER BY `created_date` DESC");
        $tickets = $stmt->fetchAll() ?: [];

        // Fetch all support messages for embedding
        $msgStmt = $this->db->query("SELECT * FROM `ticket_messages` ORDER BY `timestamp` ASC");
        $messages = $msgStmt->fetchAll() ?: [];

        // Group messages by ticket_id
        $groupedMessages = [];
        foreach ($messages as $msg) {
            $ticketId = $msg['ticket_id'];
            if (!isset($groupedMessages[$ticketId])) {
                $groupedMessages[$ticketId] = [];
            }
            $groupedMessages[$ticketId][] = [
                'id' => $msg['id'],
                'senderId' => $msg['sender_id'],
                'senderName' => $msg['sender_name'],
                'senderRole' => $msg['sender_role'],
                'message' => $msg['message'],
                'timestamp' => $msg['timestamp']
            ];
        }

        // Format outputs in camelCase
        $outputList = [];
        foreach ($tickets as $t) {
            $outputList[] = [
                'id' => $t['id'],
                'userId' => $t['user_id'] ?? $t['created_by'],
                'subject' => $t['subject'],
                'message' => $t['message'],
                'content' => $t['content'] ?? $t['message'],
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
                'messages' => $groupedMessages[$t['id']] ?? []
            ];
        }

        echo json_encode($outputList, JSON_UNESCAPED_UNICODE);
        exit();
    }

    public function read(array $params, array $body): void {
        $id = $params['id'] ?? '';
        $stmt = $this->db->prepare("SELECT * FROM `tickets` WHERE `id` = :id");
        $stmt->execute(['id' => $id]);
        $ticket = $stmt->fetch();

        if (!$ticket) {
            Utils::sendResponse(404, false, 'رکورد مورد نظر یافت نشد.');
            return;
        }

        // Get messages
        $msgStmt = $this->db->prepare("SELECT * FROM `ticket_messages` WHERE `ticket_id` = :ticket_id ORDER BY `timestamp` ASC");
        $msgStmt->execute(['ticket_id' => $id]);
        $messages = $msgStmt->fetchAll() ?: [];

        $formattedMessages = [];
        foreach ($messages as $msg) {
            $formattedMessages[] = [
                'id' => $msg['id'],
                'senderId' => $msg['sender_id'],
                'senderName' => $msg['sender_name'],
                'senderRole' => $msg['sender_role'],
                'message' => $msg['message'],
                'timestamp' => $msg['timestamp']
            ];
        }

        $ticketData = [
            'id' => $ticket['id'],
            'userId' => $ticket['user_id'] ?? $ticket['created_by'],
            'subject' => $ticket['subject'],
            'message' => $ticket['message'],
            'content' => $ticket['content'] ?? $ticket['message'],
            'status' => $ticket['status'],
            'priority' => $ticket['priority'],
            'category' => $ticket['category'],
            'adminReply' => $ticket['admin_reply'],
            'userEmail' => $ticket['user_email'],
            'userName' => $ticket['user_name'],
            'createdDate' => $ticket['created_date'],
            'updatedDate' => $ticket['updated_date'],
            'createdBy' => $ticket['created_by'],
            'availabilityTime' => $ticket['availability_time'],
            'attachedFile' => $ticket['attached_file'],
            'attachedFileName' => $ticket['attached_file_name'],
            'messages' => $formattedMessages
        ];

        echo json_encode($ticketData, JSON_UNESCAPED_UNICODE);
        exit();
    }

    public function create(array $params, array $body): void {
        $bodySnake = Utils::keysConvert($body, 'snake');
        $recordId = $bodySnake['id'] ?? 'tick_' . uniqid();
        $bodySnake['id'] = $recordId;

        // Fallbacks for the unique database schema requested (user_id and content columns)
        if (!isset($bodySnake['user_id']) || empty($bodySnake['user_id'])) {
            $bodySnake['user_id'] = $bodySnake['created_by'] ?? 'user-customer';
        }
        if (!isset($bodySnake['content']) || empty($bodySnake['content'])) {
            $bodySnake['content'] = $bodySnake['message'] ?? '';
        }

        // Insert dynamically using helper or exact parameterized insertion to ensure complete safety
        $fields = [
            'id', 'user_id', 'status', 'content', 'subject', 'message', 'priority', 'category',
            'admin_reply', 'user_email', 'user_name', 'created_date', 'updated_date', 'created_by',
            'availability_time', 'attached_file', 'attached_file_name'
        ];

        $insertFields = [];
        $paramsMap = [];

        foreach ($fields as $fd) {
            $insertFields[] = "`$fd`";
            $value = $bodySnake[$fd] ?? null;

            if ($fd === 'status' && empty($value)) {
                $value = 'open';
            }
            if ($fd === 'priority' && empty($value)) {
                $value = 'medium';
            }
            if ($fd === 'category' && empty($value)) {
                $value = 'general';
            }

            $paramsMap[$fd] = $value;
        }

        $placeholders = implode(', ', array_map(fn($f) => ":$f", $fields));
        $sql = "INSERT INTO `tickets` (" . implode(', ', $insertFields) . ") VALUES ($placeholders)";

        $stmt = $this->db->prepare($sql);
        $success = $stmt->execute($paramsMap);

        if ($success) {
            // Also insert a default first message into ticket_messages for consistent chat views
            $msgId = 'msg_init_' . uniqid();
            $msgStmt = $this->db->prepare("INSERT INTO `ticket_messages` (`id`, `ticket_id`, `sender_id`, `sender_name`, `sender_role`, `message`, `timestamp`) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $msgStmt->execute([
                $msgId,
                $recordId,
                $paramsMap['created_by'] ?? 'user-customer',
                $paramsMap['user_name'] ?? 'مشتری پلتفرم',
                'customer',
                $paramsMap['message'],
                $paramsMap['created_date'] ?? date('c')
            ]);

            Utils::sendResponse(201, true, null, ['id' => $recordId]);
        } else {
            Utils::sendResponse(500, false, 'خطا در ثبت تیکت پشتیبانی جدید.');
        }
    }

    public function update(array $params, array $body): void {
        $id = $params['id'] ?? '';
        $bodySnake = Utils::keysConvert($body, 'snake');

        // Verify if ticket exists
        $chk = $this->db->prepare("SELECT * FROM `tickets` WHERE `id` = :id");
        $chk->execute(['id' => $id]);
        if (!$chk->fetch()) {
            Utils::sendResponse(404, false, 'ثبت تغییرات تیکت با ممانعت روبرو شد؛ تیکت یافت نگردید.');
            return;
        }

        // Support column fallback updates
        if (isset($bodySnake['created_by']) && (!isset($bodySnake['user_id']) || empty($bodySnake['user_id']))) {
            $bodySnake['user_id'] = $bodySnake['created_by'];
        }
        if (isset($bodySnake['message']) && (!isset($bodySnake['content']) || empty($bodySnake['content']))) {
            $bodySnake['content'] = $bodySnake['message'];
        }

        $fields = [
            'status', 'content', 'subject', 'message', 'priority', 'category',
            'admin_reply', 'user_email', 'user_name', 'updated_date', 'availability_time'
        ];

        $sets = [];
        $binds = ['id' => $id];

        foreach ($fields as $fd) {
            if (array_key_exists($fd, $bodySnake)) {
                $sets[] = "`$fd` = :$fd";
                $binds[$fd] = $bodySnake[$fd];
            }
        }

        if (count($sets) === 0) {
            Utils::sendResponse(200, true, null, ['id' => $id]);
            return;
        }

        $sql = "UPDATE `tickets` SET " . implode(', ', $sets) . " WHERE `id` = :id";
        $stmt = $this->db->prepare($sql);
        $success = $stmt->execute($binds);

        if ($success) {
            // If admin_reply shifted, push it into ticket_messages for live chat support viewing as well
            if (isset($bodySnake['admin_reply']) && !empty($bodySnake['admin_reply'])) {
                $msgId = 'msg_admin_rep_' . uniqid();
                $msgStmt = $this->db->prepare("INSERT INTO `ticket_messages` (`id`, `ticket_id`, `sender_id`, `sender_name`, `sender_role`, `message`, `timestamp`) VALUES (?, ?, ?, ?, ?, ?, ?)");
                $msgStmt->execute([
                    $msgId,
                    $id,
                    'admin-1',
                    'مدیریت پشتیبانی (امین)',
                    'admin',
                    $bodySnake['admin_reply'],
                    $bodySnake['updated_date'] ?? date('c')
                ]);
            }

            Utils::sendResponse(200, true, null, ['id' => $id]);
        } else {
            Utils::sendResponse(500, false, 'امکان بروزرسانی مشخصات تیکت فراهم نشد.');
        }
    }

    public function delete(array $params, array $body): void {
        $id = $params['id'] ?? '';
        
        $stmt = $this->db->prepare("DELETE FROM `tickets` WHERE `id` = :id");
        $success = $stmt->execute(['id' => $id]);

        if ($success) {
            // Also cascade delete replies
            $delMsg = $this->db->prepare("DELETE FROM `ticket_messages` WHERE `ticket_id` = :id");
            $delMsg->execute(['id' => $id]);

            Utils::sendResponse(200, true);
        } else {
            Utils::sendResponse(500, false, 'حذف تیکت با شکست مواجه شد.');
        }
    }

    public function addMessage(array $params, array $body): void {
        $ticketId = $params['id'] ?? '';
        $msgId = $body['id'] ?? $body['msgId'] ?? 'msg_' . uniqid();
        $senderId = $body['senderId'] ?? 'user-customer';
        $senderName = $body['senderName'] ?? 'مشتری';
        $senderRole = $body['senderRole'] ?? 'customer';
        $messageText = $body['message'] ?? '';
        $timestamp = $body['timestamp'] ?? date('c');

        if (empty($messageText)) {
            Utils::sendResponse(400, false, 'محتوای پیام نمی‌تواند خالی باشد.');
            return;
        }

        // Insert new reply securely
        $stmt = $this->db->prepare("INSERT INTO `ticket_messages` (`id`, `ticket_id`, `sender_id`, `sender_name`, `sender_role`, `message`, `timestamp`) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $success = $stmt->execute([$msgId, $ticketId, $senderId, $senderName, $senderRole, $messageText, $timestamp]);

        if ($success) {
            // Touch updated_date inside tickets table
            $touch = $this->db->prepare("UPDATE `tickets` SET `updated_date` = ? WHERE `id` = ?");
            $touch->execute([$timestamp, $ticketId]);

            Utils::sendResponse(201, true, null, ['id' => $msgId]);
        } else {
            Utils::sendResponse(500, false, 'ثبت پیام زنده ناموفق بود.');
        }
    }
}
