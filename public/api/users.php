<?php
/**
 * EasyDriver Users API Endpoint Router
 * این فایل درخواست‌های مربوط به کاربران را به پل ارتباطی اصلی هدایت می‌کند.
 */

// تنظیمات CORS جهت امنیت اتصال
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// پردازش اتوماتیک پارامترهای مسیر جهت سازگاری کامل با فرانت‌اند
$path_info = isset($_SERVER['PATH_INFO']) ? trim($_SERVER['PATH_INFO'], '/') : '';
$route = 'users';
if ($path_info !== '') {
    $route .= '/' . $path_info;
}

$_GET['route'] = $route;

// بارگزاری هسته اصلی API
require_once dirname(__DIR__) . '/api.php';
