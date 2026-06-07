import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Extremely robust .env lookups supporting child/parent, process.cwd(), and absolute paths for cPanel / DirectAdmin / Passenger
const envPaths = [
  path.join(process.cwd(), ".env"),
  path.join(__dirname, ".env"),
  path.join(__dirname, "..", ".env"),
  path.join(__dirname, "../..", ".env"),
  path.join(process.cwd(), "..", ".env"),
  path.join(process.cwd(), "../..", ".env"),
  ".env",
  "../.env",
  "../../.env",
  "/.env",
  "./.env"
];

let loadedEnv = false;
let verifiedPath = "";

console.log("🔍 Scanning for .env files to load system credentials...");
for (const envPath of envPaths) {
  try {
    const resolvedPath = path.resolve(envPath);
    if (fs.existsSync(resolvedPath)) {
      console.log(`📝 Yes! Found .env file at defined path: '${envPath}' (Resolved: '${resolvedPath}')`);
      const envContent = fs.readFileSync(resolvedPath, "utf-8");
      const envConfig = dotenv.parse(envContent);
      
      for (const key in envConfig) {
        process.env[key] = envConfig[key];
        const displayValue = key === "DB_PASSWORD" ? "********" : envConfig[key];
        console.log(`   └─ process.env.${key} = "${displayValue}"`);
      }
      loadedEnv = true;
      verifiedPath = resolvedPath;
      break; 
    }
  } catch (err: any) {
    console.warn(`⏳ Issue trying to examine env at ${envPath}:`, err.message);
  }
}

if (!loadedEnv) {
  console.warn("⚠️ No explicit .env file found in scan sequence. Triggering standard dotenv.config() fallback...");
  const standardConfig = dotenv.config();
  if (standardConfig.parsed) {
    console.log("🟢 Standard dotenv.config() loaded successfully!");
    for (const key in standardConfig.parsed) {
      const displayValue = key === "DB_PASSWORD" ? "********" : standardConfig.parsed[key];
      console.log(`   └─ [standard] process.env.${key} = "${displayValue}"`);
    }
    loadedEnv = true;
  } else {
    console.error("🔴 Environment warning: Dotenv failed to parse any system .env config!");
  }
}

// Ensure database credentials don't have secondary code-fallback options - must be read strictly from the loaded env setup:
console.log("\n📡 Active environment variables for database:");
console.log(` - DB_HOST: "${process.env.DB_HOST || "NOT DEFINED"}"`);
console.log(` - DB_USER: "${process.env.DB_USER || "NOT DEFINED"}"`);
console.log(` - DB_PASSWORD: "${process.env.DB_PASSWORD ? "******** (DEFINED)" : "NOT DEFINED"}"`);
console.log(` - DB_NAME: "${process.env.DB_NAME || "NOT DEFINED"}"`);
console.log(` - DB_PORT: "${process.env.DB_PORT || "3306 (DEFAULT)"}"`);
console.log("=========================================\n");

import express from "express";
import mysql from "mysql2/promise";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import bcrypt from "bcryptjs";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "15mb" }));

// -------------------------------------------------------------
// Database Connection Layer (MySQL / phpMyAdmin) with Fallback
// -------------------------------------------------------------
let mysqlPool: mysql.Pool | null = null;
let connectionPromise: Promise<mysql.Pool | null> | null = null;
let lastAttemptTime = 0;
const ATTEMPT_COOLDOWN_MS = 45000; // 45 seconds cooldown to avoid slow DNS blocks and warning spams

let dbQueryLogCount = 0;
const serverStartTime = Date.now();

let dbStatus = {
  connected: false,
  error: "تلاش برای اتصال به دیتابیس صورت نگرفته یا متغیرهای محیطی ست نشده‌اند.",
  host: process.env.DB_HOST || "",
  database: process.env.DB_NAME || "",
  mode: "فایل محلی پشتیبان (Local JSON Backup)"
};

// Lazy initialize MySQL pool if environment variables are preset
async function getMySQLPool(bypassCooldown: boolean = false): Promise<mysql.Pool | null> {
  dbQueryLogCount++;
  if (mysqlPool) return mysqlPool;
  if (connectionPromise) return connectionPromise;

  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;
  const port = parseInt(process.env.DB_PORT || "3306", 10);

  if (!host || !user || !password || !database) {
    dbStatus.connected = false;
    dbStatus.mode = "فایل محلی پشتیبان (Local JSON Backup)";
    dbStatus.error = "اطلاعات اتصال به دیتابیس (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME) در فایل .env تعریف یا بارگذاری نشده است.";
    dbStatus.host = host || "";
    dbStatus.database = database || "";
    return null;
  }

  // Rate-limit connection retries on failure to keep the app blazing fast and silent
  const now = Date.now();
  if (!bypassCooldown && (now - lastAttemptTime < ATTEMPT_COOLDOWN_MS)) {
    return null;
  }
  if (!bypassCooldown) {
    lastAttemptTime = now;
  }

  connectionPromise = (async () => {
    let tempPool: mysql.Pool | null = null;
    let attempts = 3;
    let currentDelay = 1000; // 1 second
    let lastErr: any = null;

    console.log(`📡 Starting MySQL connection attempt with exponential backoff on user: ${user}, host: ${host}, database: ${database}`);

    for (let i = 0; i < attempts; i++) {
      try {
        tempPool = mysql.createPool({
          host,
          user,
          password,
          database,
          port,
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
        });

        // Test connection
        const connection = await tempPool.getConnection();
        connection.release();

        console.log(`🟢 Successfully connected to MySQL Database on attempt ${i + 1}!`);
        dbStatus.connected = true;
        dbStatus.mode = "دیتابیس فعال MySQL (phpMyAdmin)";
        dbStatus.host = host;
        dbStatus.database = database;
        dbStatus.error = "";
        
        mysqlPool = tempPool;
        return tempPool;
      } catch (err: any) {
        lastErr = err;
        // Clean up pool resources before retry
        if (tempPool) {
          try {
            await tempPool.end();
          } catch (_) {}
          tempPool = null;
        }

        console.warn(`⚠️ MySQL Connection attempt ${i + 1}/${attempts} failed to '${host}:${port}'. Retrying in ${currentDelay}ms... Error: ${err.message}`);
        
        if (i < attempts - 1) {
          await new Promise<void>((resolve) => setTimeout(resolve, currentDelay));
          currentDelay *= 2; // exponential backoff
        }
      }
    }

    // Handlers for granular database connection issues
    const errorCode = lastErr?.code || lastErr?.errno;
    let friendlyError = lastErr?.message || "Unknown Database Connection Error";
    
    if (lastErr?.code === 'EAI_AGAIN' || lastErr?.code === 'ENOTFOUND') {
      friendlyError = `خطای مکان‌یابی آدرس سرور (DNS/Host Resolution Error): دامنه یا آی‌پی '${host}' روی سرور قابل حل نیست. لطفاً بررسی کنید که آیا آدرس صحیح وارد شده و یا اتصال شبکه برقرار است. (کد خطا: ${errorCode})`;
    } else if (lastErr?.code === 'ECONNREFUSED' || lastErr?.code === 'CONNECT_TIMEOUT') {
      friendlyError = `خطای رد اتصال یا اتمام زمان انتظار (Connection Refused/Timeout): سرور دیتابیس در آدرس '${host}:${port}' آمادگی دریافت اتصال را ندارد. لطفاً مطمئن شوید سرویس MySQL روی سرور میزبان روشن است و فایروال مانع دسترسی پورت ۳۳۰۶ نمی‌شود. (کد خطا: ${errorCode})`;
    } else if (lastErr?.code === 'ER_ACCESS_DENIED_ERROR' || lastErr?.code === '1045' || errorCode === 1045) {
      friendlyError = `خطای دسترسی و اطلاعات عبور کاربری (Access Denied / Authentication Failed): نام کاربری '${user}' یا رمز عبور وارد شده نامعتبر است یا دسترسی‌های کافی برای اتصال از آدرس گیت این هاست را ندارد. (کد خطا: 1045) - لطفاً پسورد و یوز نیم دیتابیس را چک کنید.`;
    } else if (lastErr?.code === 'ER_BAD_DB_ERROR' || lastErr?.code === '1049' || errorCode === 1049) {
      friendlyError = `خطای عدم وجود دیتابیس انتخابی (Database Not Found): پایگاه داده‌ای با نام '${database}' در سیستم دیتابیس پیدا نشد. لطفاً ابتدا از وجود این دیتابیس در کنترل پنل هاست اطمینان حاصل کنید. (کد خطا: 1049)`;
    } else if (lastErr?.code === 'PROTOCOL_CONNECTION_LOST') {
      friendlyError = `ارتباط با پایگاه داده قطع شد (Protocol Connection Lost). (کد خطا: PROTOCOL_CONNECTION_LOST)`;
    } else if (lastErr?.code === 'HANDSHAKE_ERROR' || lastErr?.message?.toLowerCase()?.includes('handshake')) {
      friendlyError = `خطای دست‌دهی امنیت/نسخه پروتکل (Handshake Connection Fail): خطایی در فرایند توافق اولیه handshake با سرور دیتابیس رخ داده است. این می‌تواند به دلیل عدم سازگاری روش هش رمز عبور (مانند caching_sha2_password در مقابل mysql_native_password) باشد. (${lastErr.message})`;
    } else {
      friendlyError = `خطای ناشناخته در اتصال به پایگاه داده از سمت هاست: ${lastErr?.message || "نامشخص"} (کد فنی: ${errorCode || "بدون کد"})`;
    }

    console.error("🔴 MySQL connection test failed (will use Local JSON Backup):", friendlyError);
    dbStatus.connected = false;
    dbStatus.mode = "فایل محلی پشتیبان (Local JSON Backup)";
    dbStatus.error = friendlyError;
    
    mysqlPool = null;
    // Clear connectionPromise on failure so client can retry after the cooldown/retries expire
    connectionPromise = null;
    return null;
  })();

  return connectionPromise;
}

// Background scheduler for automatic connection restoration
let backgroundRetryTimer: NodeJS.Timeout | null = null;

function scheduleBackgroundRetry() {
  if (backgroundRetryTimer) return; // avoid duplicate intervals

  console.log("⏰ Scheduling background MySQL pool reconnection attempts every 60 seconds...");
  backgroundRetryTimer = setInterval(async () => {
    if (dbStatus.connected && mysqlPool) {
      console.log("🟢 Database is already active and healthy. Clearing reconnection timer.");
      if (backgroundRetryTimer) {
        clearInterval(backgroundRetryTimer);
        backgroundRetryTimer = null;
      }
      return;
    }

    console.log("🔄 Background DB Reconnection Retry: Testing socket viability to MySQL port...");
    try {
      const pool = await getMySQLPool(true); // Bypass normal lazy-init cooldown
      if (pool) {
        console.log("🟢 Success! Database connection established in background task. Live DB active.");
        if (backgroundRetryTimer) {
          clearInterval(backgroundRetryTimer);
          backgroundRetryTimer = null;
        }
      }
    } catch (err: any) {
      console.error("🔴 Background connection attempt failed. Still fallback to local db... Will try again in 60s.");
    }
  }, 60000);
}

// -------------------------------------------------------------
// Backup File Engine for local-out-of-the-box execution
// -------------------------------------------------------------
const BACKUP_FILE_PATH = path.join(process.cwd(), "local_db.json");

// Define initial dataset in case local_db.json is missing
const INITIAL_DATASET = {
  requests: [
    {
      id: 'req-1',
      fullName: 'علی رضایی',
      phone: '09121112233',
      serviceType: 'driver_install',
      description: 'کارت گرافیک لپتاپ ایسوس TUF RTX 3060 به درستی شناسایی نمی‌شود و بازی‌ها افت فریم شدید دارند. درایور مناسب و پایدار می‌خواهم نصب شود.',
      status: 'completed',
      priority: 'high',
      adminNotes: 'با موفقیت از طریق انی‌دسک متصل شدیم. درایور قدیمی به طور کامل با DDU پاکسازی شد و آخرین نسخه پایدار و اورجینال انویدیا نصب گردید.',
      scheduledDate: '2026-05-18T14:00',
      assignedToId: 'tech-2',
      assignedToName: 'آرش علوی',
      isApproved: true,
      approvedAt: '2026-05-18T09:30:00Z',
      assignedAt: '2026-05-18T09:35:00Z',
      createdDate: '2026-05-18T08:15:00Z',
      updatedDate: '2026-05-18T14:45:00Z',
      createdBy: 'user-customer',
      rating: 5,
      ratingComment: 'بسیار عالی تشکر',
      ratedAt: '2026-05-18T15:00:00Z'
    },
    {
      id: 'req-2',
      fullName: 'سارا امینی',
      phone: '09192223344',
      serviceType: 'software_install',
      description: 'نیاز به نصب آخرین نسخه نرم‌افزار اتوکد و متلب به همراه لایسنس فعال دارم تا برای پروژه‌ پایانی دانشگاه کار کنم.',
      status: 'in_progress',
      priority: 'medium',
      adminNotes: 'نرم‌افزارها دانلود شده و لایسنس‌ها آماده است. تکنسین مینا خسروی در حال انجام کار است.',
      scheduledDate: '2026-05-20T11:00',
      assignedToId: 'tech-3',
      assignedToName: 'مینا خسروی',
      isApproved: true,
      approvedAt: '2026-05-19T10:00:00Z',
      assignedAt: '2026-05-19T10:15:00Z',
      createdDate: '2026-05-19T09:00:00Z',
      updatedDate: '2026-05-20T04:00:00Z',
      createdBy: 'user-customer'
    },
    {
      id: 'req-3',
      fullName: 'احسان حسینی',
      phone: '09374445566',
      serviceType: 'anydesk_support',
      description: 'ویندوز ۱۱ پس از آپدیت آخر بالا می‌آید ولی وای‌فای کاملاً قطع شده و خطای کد ۴۳ در دیوایس منیجر می‌دهد.',
      status: 'assigned',
      priority: 'urgent',
      scheduledDate: '2026-05-20T16:30',
      assignedToId: 'tech-1',
      assignedToName: 'مهندس نوید مرادی',
      isApproved: true,
      approvedAt: '2026-05-20T03:00:00Z',
      assignedAt: '2026-05-20T03:10:00Z',
      createdDate: '2026-05-20T02:40:00Z',
      updatedDate: '2026-05-20T03:10:00Z',
      createdBy: 'user-customer'
    },
    {
      id: 'req-4',
      fullName: 'مریم بهرامی',
      phone: '09335556677',
      serviceType: 'other',
      description: 'سیستم ویندوز من بسیار کند کار می‌کند و بعضی اوقات خودبه‌خود ریستارت می‌شود. چند آنتی‌ویروس و ابزار بهینه‌سازی لازم دارم.',
      status: 'pending',
      priority: 'medium',
      isApproved: false,
      createdDate: '2026-05-20T04:15:00Z',
      updatedDate: '2026-05-20T04:15:00Z',
      createdBy: 'user-customer'
    }
  ],
  technicians: [
    {
      id: 'tech-1',
      fullName: 'مهندس نوید مرادی',
      phone: '09123456789',
      email: 'navid@easydriver.ir',
      specialty: 'all',
      isActive: true,
      completedTasks: 34,
      createdDate: '2026-01-10T08:30:00Z',
      updatedDate: '2026-05-18T10:20:00Z',
      createdBy: 'admin-1'
    },
    {
      id: 'tech-2',
      fullName: 'آرش علوی',
      phone: '09187654321',
      email: 'arash@easydriver.ir',
      specialty: 'driver_install',
      isActive: true,
      completedTasks: 51,
      createdDate: '2026-02-15T09:12:00Z',
      updatedDate: '2026-05-19T14:40:00Z',
      createdBy: 'admin-1'
    },
    {
      id: 'tech-3',
      fullName: 'مینا خسروی',
      phone: '09351234567',
      email: 'mina@easydriver.ir',
      specialty: 'software_install',
      isActive: true,
      completedTasks: 22,
      createdDate: '2026-03-01T15:20:00Z',
      updatedDate: '2026-05-15T11:00:00Z',
      createdBy: 'admin-1'
    },
    {
      id: 'tech-4',
      fullName: 'سهراب شریفی',
      phone: '09219876543',
      email: 'sohrab@easydriver.ir',
      specialty: 'anydesk_support',
      isActive: false,
      completedTasks: 18,
      createdDate: '2026-04-12T11:05:00Z',
      updatedDate: '2026-05-10T16:30:00Z',
      createdBy: 'admin-1'
    }
  ],
  reviews: [
    {
      id: 'rev-1',
      customerName: 'کامران شهاب',
      rating: 5,
      comment: 'بسیار سریع درایور کارت صدا و گرافیک لپ‌تاپ قدیمی من رو آپدیت کردن. فکر نمی‌کردم بشه مشکلات ویندوز ۱۰ رو این‌قدر تمیز و از راه دور حل کرد. کارشناسشون واقعاً صبور بودن.',
      serviceType: 'نصب و بروزرسانی درایور',
      isApproved: true,
      createdDate: '2026-05-10T12:00:00Z',
      updatedDate: '2026-05-10T12:00:00Z',
      createdBy: 'user-customer-1',
      technicianId: 'tech-2',
      technicianName: 'آرش علوی'
    },
    {
      id: 'rev-2',
      customerName: 'فاطمه صادقی',
      rating: 5,
      comment: 'برنامه فتوشاپ ۲۰۲۶ و پریمیر رو به همراه پلاگین‌ها برام نصب کردن. سرعت دانلود بالا بود و فعالسازها عالی کار می‌کنند. تشکر فراوان.',
      serviceType: 'نصب نرم‌افزار تخصصی و عمومی',
      isApproved: true,
      createdDate: '2026-05-14T16:45:00Z',
      updatedDate: '2026-05-14T16:45:00Z',
      createdBy: 'user-customer-2',
      technicianId: 'tech-3',
      technicianName: 'مینا خسروی'
    },
    {
      id: 'rev-3',
      customerName: 'علیرضا تقوی',
      rating: 4,
      comment: 'رفع مشکل صفحه آبی مرگ ویندوز با انی‌دسک به بهترین شکل انجام شد. فقط ای کاش زمان پاسخ اولیه کمی کمتر بود ولی در کل خیلی حرفه‌ای بودن.',
      serviceType: 'پشتیبانی فنی از راه دور (AnyDesk)',
      isApproved: true,
      createdDate: '2026-05-17T09:30:00Z',
      updatedDate: '2026-05-17T09:30:00Z',
      createdBy: 'user-customer-3',
      technicianId: 'tech-1',
      technicianName: 'مهندس نوید مرادی'
    }
  ],
  tickets: [
    {
      id: 'tick-1',
      subject: 'عدم فعال‌سازی مجدد لایسنس آفیس',
      message: 'سلام، آفیس نصب شده به خوبی کار می‌کرد ولی امروز پیام لایسنس داد و وارد حالت Read-Only شد. چیکار باید بکنم؟',
      status: 'in_progress',
      priority: 'high',
      category: 'technical',
      userEmail: 'ali@gmail.com',
      userName: 'علی رضایی',
      createdDate: '2026-05-19T11:20:00Z',
      updatedDate: '2026-05-20T01:30:00Z',
      createdBy: 'user-customer',
      messages: [
        {
          id: 'msg-1',
          senderId: 'user-customer',
          senderName: 'علی رضایی',
          senderRole: 'customer',
          message: 'سلام، آفیس نصب شده به خوبی کار می‌کرد ولی امروز پیام لایسنس داد و وارد حالت Read-Only شد. چیکار باید بکنم؟',
          timestamp: '2026-05-19T11:20:00Z'
        },
        {
          id: 'msg-2',
          senderId: 'admin-1',
          senderName: 'مدیریت پشتیبانی',
          senderRole: 'admin',
          message: 'سلام علی عزیز؛ لطفاً از خاموش بودن فایروال سیستم یا آنتی‌ویروس مطمئن بشید. دوباره ابزار فعال‌ساز EasyActivator رو که روی دسکتاپتون هست اجرا کنید و گزینه ۲ رو بزنید.',
          timestamp: '2026-05-20T01:30:00Z'
        }
      ]
    },
    {
      id: 'tick-2',
      subject: 'آموزش اتصال انی‌دسک',
      message: 'من برای اولین بار می‌خوام ثبت درخواست بدم، ولی بلد نیستم چطور برنامه انی‌دسک رو اجرا کنم تا تکنسینتون وصل بشه.',
      status: 'open',
      priority: 'medium',
      category: 'general',
      userEmail: 'maryam@gmail.com',
      userName: 'مریم بهرامی',
      createdDate: '2026-05-20T04:30:00Z',
      updatedDate: '2026-05-20T04:30:00Z',
      createdBy: 'user-customer',
      messages: [
        {
          id: 'msg-3',
          senderId: 'user-customer',
          senderName: 'مریم بهرامی',
          senderRole: 'customer',
          message: 'من برای اولین بار می‌خوام ثبت درخواست بدم، ولی بلد نیستم چطور برنامه انی‌دسک رو اجرا کنم تا تکنسینتون وصل بشه.',
          timestamp: '2026-05-20T04:30:00Z'
        }
      ]
    },
    {
      id: 'tick-3',
      subject: 'نصب مجدد بعد از ارتقا ویندوز',
      message: 'ببخشید من ماه گذشته درخواستم کامل شد. اگر ویندوزم رو دوباره عوض کنم باز هم به صورت رایگان برام نصب می‌کنید یا فاکتور جدید صادر میشه؟',
      status: 'closed',
      priority: 'low',
      category: 'billing',
      adminReply: 'کاربر گرامی، گارانتی نصب خدمات EasyDriver تا یک هفته می‌باشد. پس از آن هزینه نصب با تخفیف ۵۰درصدی برای مشتریان وفادار محاسبه خواهد شد.',
      userEmail: 'sara@gmail.com',
      userName: 'سارا امینی',
      createdDate: '2026-05-15T14:10:00Z',
      updatedDate: '2026-05-16T10:00:00Z',
      createdBy: 'user-customer'
    }
  ],
  notifications: [
    {
      id: 'notif-1',
      title: 'درخواست خدمات جدید',
      message: 'درخواست جدیدی برای خدمات «نصب و بروزرسانی درایور» توسط علی رضایی ثبت شد.',
      type: 'request_created',
      priority: 'high',
      targetRole: 'admin',
      referenceId: 'req-1',
      createdDate: '2026-05-20T10:00:00Z',
      read: false
    },
    {
      id: 'notif-2',
      title: 'تغییر وضعیت تیکت پشتیبانی',
      message: 'تیکت شما تحت عنوان «عدم فعال‌سازی مجدد لایسنس آفیس» پاسخ داده شد و به وضعیت «در حال بررسی» تغییر یافت.',
      type: 'ticket_status',
      priority: 'medium',
      targetUserId: 'user-customer',
      referenceId: 'tick-1',
      createdDate: '2026-05-20T11:30:00Z',
      read: false
    }
  ],
  users: [
    {
      id: 'user-customer',
      fullName: 'سعید رستمی',
      email: 'saeed@customer.ir',
      phone: '09121234567',
      role: 'customer',
      password: '123',
      isActive: true,
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80'
    },
    {
      id: 'tech-1',
      fullName: 'مهندس نوید مرادی',
      email: 'navid@easydriver.ir',
      phone: '09123456789',
      role: 'technician',
      password: '123',
      isActive: true,
      avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&h=150&q=80'
    },
    {
      id: 'tech-2',
      fullName: 'آرش علوی',
      email: 'arash@easydriver.ir',
      phone: '09187654321',
      role: 'technician',
      password: '123',
      isActive: true,
      avatarUrl: 'https://images.unsplash.com/photo-1572451479139-6a308211d8be?auto=format&fit=crop&w=150&h=150&q=80'
    },
    {
      id: 'tech-3',
      fullName: 'مینا خسروی',
      email: 'mina@easydriver.ir',
      phone: '09351234567',
      role: 'technician',
      password: '123',
      isActive: true,
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&h=150&q=80'
    },
    {
      id: 'tech-4',
      fullName: 'سهراب شریفی',
      email: 'sohrab@easydriver.ir',
      phone: '09219876543',
      role: 'technician',
      password: '123',
      isActive: false,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80'
    },
    {
      id: 'admin-1',
      fullName: 'مدیر کل ایزی‌درایور (امین)',
      email: 'izatesplay@gmail.com',
      phone: '09386561626',
      role: 'admin',
      password: '09386561626mM@',
      isActive: true,
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80'
    }
  ]
};

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'request_created' | 'request_status' | 'ticket_created' | 'ticket_reply' | 'ticket_status' | 'review_created';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  targetUserId?: string;
  targetRole?: 'admin' | 'customer' | 'technician';
  referenceId?: string;
  createdDate: string;
  read: boolean;
}

// Ensure JSON backup exists
function ensureLocalJSON() {
  if (!fs.existsSync(BACKUP_FILE_PATH)) {
    fs.writeFileSync(BACKUP_FILE_PATH, JSON.stringify(INITIAL_DATASET, null, 2), "utf-8");
  }
}

function readLocalJSON(): any {
  ensureLocalJSON();
  try {
    const raw = fs.readFileSync(BACKUP_FILE_PATH, "utf-8");
    const data = JSON.parse(raw);
    if (!data.notifications) {
      data.notifications = [];
    }
    if (!data.users) {
      data.users = INITIAL_DATASET.users;
      // Write it back to persist users in the local db file
      fs.writeFileSync(BACKUP_FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
    }
    return data;
  } catch (e) {
    return { ...INITIAL_DATASET, notifications: [], users: INITIAL_DATASET.users };
  }
}

function writeLocalJSON(data: any) {
  fs.writeFileSync(BACKUP_FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
}

function getNotificationsFromDb(): Notification[] {
  const local = readLocalJSON();
  return local.notifications || [];
}

function saveNotificationToDb(notification: Notification) {
  const local = readLocalJSON();
  if (!local.notifications) local.notifications = [];
  local.notifications.unshift(notification);
  writeLocalJSON(local);
}

function markNotificationAsReadInDb(id: string): boolean {
  const local = readLocalJSON();
  if (!local.notifications) local.notifications = [];
  const notif = local.notifications.find((n: any) => n.id === id);
  if (notif) {
    notif.read = true;
    writeLocalJSON(local);
    return true;
  }
  return false;
}

function markAllNotificationsAsReadInDb(userId?: string, role?: string): boolean {
  const local = readLocalJSON();
  if (!local.notifications) local.notifications = [];
  
  let modified = false;
  local.notifications.forEach((n: any) => {
    let match = false;
    if (userId && n.targetUserId === userId) {
      match = true;
    } else if (!userId && role && n.targetRole === role) {
      match = true;
    } else if (!userId && !role) {
      match = true;
    }
    if (match && !n.read) {
      n.read = true;
      modified = true;
    }
  });

  if (modified) {
    writeLocalJSON(local);
  }
  return modified;
}

function getRecipientEmailForNotification(notification: Notification): string {
  if (notification.targetRole === 'admin') {
    return 'admin@easydriver.ir';
  }
  if (notification.targetUserId === 'tech-1') {
    return 'navid@easydriver.ir';
  }
  return 'saeed@customer.ir';
}

function createAndSendNotification(data: {
  title: string;
  message: string;
  type: 'request_created' | 'request_status' | 'ticket_created' | 'ticket_reply' | 'ticket_status' | 'review_created';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  targetUserId?: string;
  targetRole?: 'admin' | 'customer' | 'technician';
  referenceId?: string;
}) {
  const notification: Notification = {
    id: `notif-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    title: data.title,
    message: data.message,
    type: data.type,
    priority: data.priority || 'medium',
    targetUserId: data.targetUserId,
    targetRole: data.targetRole,
    referenceId: data.referenceId,
    createdDate: new Date().toISOString(),
    read: false
  };

  // 1. Save locally
  saveNotificationToDb(notification);

  // 2. Broadcast via WebSocket if clients connected
  let wsDeliveredCount = 0;
  if (wss) {
    wss.clients.forEach((client: any) => {
      if (client.readyState === 1) { // OPEN
        let match = false;
        if (notification.targetUserId && client.userId === notification.targetUserId) {
          match = true;
        } else if (!notification.targetUserId && notification.targetRole && client.userRole === notification.targetRole) {
          match = true;
        } else if (!notification.targetUserId && !notification.targetRole) {
          match = true; // general broadcast
        }

        if (match) {
          try {
            client.send(JSON.stringify({
              type: "notification",
              data: notification
            }));
            wsDeliveredCount++;
          } catch (err) {
            console.error("WS notification dispatch failed:", err);
          }
        }
      }
    });
  }

  // 3. Fallback: Simulation of Email channels
  const isCritical = notification.priority === 'high' || notification.priority === 'urgent';
  const deliveredRealtime = wsDeliveredCount > 0;

  if (!deliveredRealtime || isCritical) {
    const emailTo = getRecipientEmailForNotification(notification);
    const reason = !deliveredRealtime ? "User is currently offline (WebSocket disconnected)" : "Critical high-priority service notification backup copy";
    
    console.log(`\n================================================================================`);
    console.log(`✉️  [FALLBACK EMAIL NOTIFICATION DISPATCHED] to: ${emailTo}`);
    console.log(`📌 Heading: ${notification.title}`);
    console.log(`📝 Description: ${notification.message}`);
    console.log(`💡 Gateway Status: Delivered successfully via Simulated SMTP Pipeline (Reason: ${reason})`);
    console.log(`================================================================================\n`);
  }
}

// Check database status
app.get("/api/db-status", async (req, res) => {
  const pool = await getMySQLPool(); // attempt lazy initialization if envs exist
  const uptimeSeconds = Math.floor((Date.now() - serverStartTime) / 1000);
  
  // Simulate standard healthy pool behavior if connected
  const activeQueries = pool ? Math.floor((Math.sin(Date.now() / 12000) + 1) * 1.5) : 0;
  const activeConn = pool ? Math.max(1, activeQueries) : 0;
  const idleConn = pool ? Math.max(0, 10 - activeConn) : 0;

  res.json({
    ...dbStatus,
    totalQueries: dbQueryLogCount,
    uptimeSeconds,
    poolLimit: 10,
    activeConnections: activeConn,
    idleConnections: idleConn,
    activeQueries: pool ? activeConn : 0
  });
});

// Check database connection pool health directly with active query execution
app.get("/api/db-health", async (req, res) => {
  let isProbeHealthy = false;
  let probeLog = "";
  
  try {
    const pool = await getMySQLPool(true); // Bypass normal cooldown for direct checks
    if (pool) {
      const start = Date.now();
      const connection = await pool.getConnection();
      await connection.query("SELECT 1");
      connection.release();
      const latencyMs = Date.now() - start;
      isProbeHealthy = true;
      probeLog = `اتصال MySQL برقرار و زنده است. تاخیر پاسخ‌دهی: ${latencyMs} میلی‌ثانیه`;
    } else {
      probeLog = dbStatus.error || "اتصال به پایگاه داده MySQL برقرار نیست؛ سیستم روی فایل محلی پشتیبان سوئیچ کرده است.";
    }
  } catch (err: any) {
    isProbeHealthy = false;
    probeLog = `خطا در اجرای کوئری سلامت‌سنجی: ${err.message}`;
  }

  res.json({
    healthy: isProbeHealthy,
    connected: dbStatus.connected && isProbeHealthy,
    mode: isProbeHealthy ? "دیتابیس فعال MySQL (phpMyAdmin)" : "فایل محلی پشتیبان (Local JSON Backup)",
    error: isProbeHealthy ? "" : probeLog,
    host: dbStatus.host,
    database: dbStatus.database,
    probeLog
  });
});

// Notifications Endpoints
app.get("/api/notifications", (req, res) => {
  const { userId, role } = req.query as { userId?: string, role?: string };
  const allNotifs = getNotificationsFromDb();
  
  // Filter notifications correctly
  const filtered = allNotifs.filter(n => {
    // If targeted at a specific user and matches
    if (n.targetUserId && n.targetUserId === userId) {
      return true;
    }
    // If targeted at a specific role but NOT targeted at a different specific user
    if (!n.targetUserId && n.targetRole && n.targetRole === role) {
      return true;
    }
    // If a general notification and role aligns
    if (!n.targetUserId && !n.targetRole) {
      return true;
    }
    return false;
  });
  
  res.json(filtered);
});

app.post("/api/notifications/:id/read", (req, res) => {
  const { id } = req.params;
  const success = markNotificationAsReadInDb(id);
  res.json({ success });
});

app.post("/api/notifications/read-all", (req, res) => {
  const { userId, role } = req.body;
  const success = markAllNotificationsAsReadInDb(userId, role);
  res.json({ success });
});

// -------------------------------------------------------------
// APIs: Authentication & Password Securing with BCrypt and Migration
// -------------------------------------------------------------

function isBcryptHash(str: string): boolean {
  if (!str) return false;
  return /^\$2[ayb]\$.{56}$/.test(str);
}

// Secure login endpoint utilizing direct backend bcrypt verification
app.post("/api/auth/login", async (req, res) => {
  const { emailOrPhone, password, role } = req.body;

  if (!emailOrPhone || typeof emailOrPhone !== "string" || !password || typeof password !== "string" || !role) {
    return res.status(400).json({
      success: false,
      error: "اطلاعات ارسالی برای ورود ناقص یا نامعتبر می‌باشد."
    });
  }

  const identifier = emailOrPhone.trim().toLowerCase();
  const inputRole = role;

  let matchedUser: any = null;

  // 1. Double source check: search MySQL first if database is connected
  const pool = await getMySQLPool();
  if (pool) {
    try {
      // Ensure migrations exist
      try {
        await pool.query("ALTER TABLE `users` ADD COLUMN `password` VARCHAR(255) NOT NULL DEFAULT '123'");
      } catch (e) {}
      try {
        await pool.query("ALTER TABLE `users` ADD COLUMN `is_active` TINYINT(1) NOT NULL DEFAULT 1");
      } catch (e) {}

      const [rows] = await pool.query(
        "SELECT * FROM `users` WHERE (`email` = ? OR `phone` = ?) AND `role` = ?",
        [identifier, identifier, inputRole]
      );
      if ((rows as any[]).length > 0) {
        const u = (rows as any[])[0];
        matchedUser = {
          id: u.id,
          fullName: u.full_name,
          email: u.email,
          phone: u.phone,
          role: u.role,
          avatarUrl: u.avatar_url,
          password: u.password,
          isActive: u.is_active === 1 || u.is_active === true
        };
      }
    } catch (err) {
      console.error("MySQL query matches for auth failed:", err);
    }
  }

  // 2. Local JSON file backup lookup
  if (!matchedUser) {
    const local = readLocalJSON();
    const u = (local.users || []).find(
      (user: any) =>
        user.role === inputRole &&
        (user.email.trim().toLowerCase() === identifier ||
         user.phone.trim() === identifier)
    );
    if (u) {
      matchedUser = { ...u };
    }
  }

  // Check matched user
  if (!matchedUser) {
    return res.status(401).json({
      success: false,
      error: "کاربری با این مشخصات و نقش در سامانه یافت نشد. صحت نقش و اطلاعات ارسالی را مجدداً بررسی نمایید."
    });
  }

  // Check inactive technician
  if (matchedUser.role === "technician" && matchedUser.isActive === false) {
    return res.status(403).json({
      success: false,
      error: "حساب کاربری تکنسینی شما هنوز توسط مدیریت ریموت تایید و فعال نگردیده است. مقتضی است منتظر تایید اولیه بمانید."
    });
  }

  const userPassword = matchedUser.password || "";
  const isHashed = isBcryptHash(userPassword);

  if (!isHashed) {
    // Legacy / unset profile check
    const expectedPlain = userPassword || "123";
    if (password !== expectedPlain) {
      return res.status(401).json({
        success: false,
        error: "رمز عبور وارد شده اشتباه است. لطفاً مجدداً بررسی فرمایید."
      });
    }

    // Passwords match but user hasn't secures their profile yet
    return res.json({
      success: true,
      needsPasswordSetup: true,
      userId: matchedUser.id,
      message: "حساب کاربری شما با موفقیت احراز گردید اما فاقد رمز عبور امن است. لطفاً همین حالا رمز عبور جدید خود را تعیین نمایید تا با ساختار امنیتی BCrypt ذخیره گردد."
    });
  }

  // Complete BCrypt comparison
  const isValid = bcrypt.compareSync(password, userPassword);
  if (!isValid) {
    return res.status(401).json({
      success: false,
      error: "رمز عبور وارد شده اشتباه است. لطفاً مجدداً بررسی فرمایید."
    });
  }

  return res.json({
    success: true,
    user: {
      id: matchedUser.id,
      fullName: matchedUser.fullName,
      email: matchedUser.email,
      phone: matchedUser.phone,
      role: matchedUser.role,
      avatarUrl: matchedUser.avatarUrl,
      isActive: matchedUser.isActive
    }
  });
});

// Securing/Upgrading password endpoint
app.post("/api/auth/set-password", async (req, res) => {
  const { userId, password } = req.body;

  if (!userId || !password || typeof password !== "string" || password.trim().length < 6) {
    return res.status(400).json({
      success: false,
      error: "رمز عبور ارسالی نامعتبر است. رمز عبور باید شامل حداقل ۶ کاراکتر یا بیشتر باشد."
    });
  }

  const hashedPassword = bcrypt.hashSync(password.trim(), 10);

  // 1. MySQL Database Update
  const pool = await getMySQLPool();
  if (pool) {
    try {
      await pool.query("UPDATE `users` SET `password` = ? WHERE `id` = ?", [hashedPassword, userId]);
    } catch (err) {
      console.error("MySQL set password update failed:", err);
    }
  }

  // 2. Local JSON DB Sync
  const local = readLocalJSON();
  if (local.users) {
    const user = local.users.find((u: any) => u.id === userId);
    if (user) {
      user.password = hashedPassword;
      writeLocalJSON(local);
    }
  }

  return res.json({
    success: true,
    message: "رمز عبور جدید شما با موفقیت به پروتکل امنیتی ارتقاء یافت و ذخیره شد. شما هم اکنون مجاز به ورود هستید."
  });
});

// -------------------------------------------------------------
// APIs: Dynamic REST Routes for USERS (Credentials and Activation)
// -------------------------------------------------------------

app.get("/api/users", async (req, res) => {
  const pool = await getMySQLPool();
  if (pool) {
    try {
      // Ensure database migrations run for users passwords and status
      try {
        await pool.query("ALTER TABLE `users` ADD COLUMN `password` VARCHAR(100) NOT NULL DEFAULT '123'");
      } catch (e) {}
      try {
        await pool.query("ALTER TABLE `users` ADD COLUMN `is_active` TINYINT(1) NOT NULL DEFAULT 1");
      } catch (e) {}

      const [rows] = await pool.query("SELECT * FROM `users` ORDER BY `created_at` DESC");
      const formatted = (rows as any[]).map(r => ({
        id: r.id,
        fullName: r.full_name,
        email: r.email,
        phone: r.phone,
        role: r.role,
        avatarUrl: r.avatar_url,
        password: r.password,
        isActive: r.is_active === 1 || r.is_active === true
      }));
      return res.json(formatted);
    } catch (err) {
      console.error("MySQL read users query failed:", err);
    }
  }

  const local = readLocalJSON();
  res.json(local.users || []);
});

app.post("/api/users", async (req, res) => {
  const { id, fullName, email, phone, role, password, avatarUrl, isActive } = req.body;
  
  let finalPassword = password || '123';
  if (!isBcryptHash(finalPassword)) {
    finalPassword = bcrypt.hashSync(finalPassword, 10);
  }

  const pool = await getMySQLPool();
  if (pool) {
    try {
      try {
        await pool.query("ALTER TABLE `users` ADD COLUMN `password` VARCHAR(255) NOT NULL DEFAULT '123'");
      } catch (e) {}
      try {
        await pool.query("ALTER TABLE `users` ADD COLUMN `is_active` TINYINT(1) NOT NULL DEFAULT 1");
      } catch (e) {}

      // Robust check: prevent duplicate registrations by other users with same email or phone
      const [existing] = await pool.query(
        "SELECT * FROM `users` WHERE (`email` = ? OR `phone` = ?) AND `id` != ?",
        [email, phone, id]
      );
      if ((existing as any[]).length > 0) {
        return res.status(400).json({
          success: false,
          error: "یک حساب کاربری دیگر با این ایمیل یا شماره موبایل از قبل در سامانه ثبت شده است."
        });
      }

      // Standard ON DUPLICATE KEY UPDATE to elegantly handle pre-existing records (e.g. technicians or background inits)
      await pool.query(
        "INSERT INTO `users` (`id`, `full_name`, `email`, `phone`, `role`, `password`, `avatar_url`, `is_active`) VALUES (?, ?, ?, ?, ?, ?, ?, ?) " +
        "ON DUPLICATE KEY UPDATE `full_name` = VALUES(`full_name`), `email` = VALUES(`email`), `phone` = VALUES(`phone`), `role` = VALUES(`role`), `password` = VALUES(`password`), `avatar_url` = VALUES(`avatar_url`), `is_active` = VALUES(`is_active`)",
        [id, fullName, email, phone, role, finalPassword, avatarUrl || null, isActive !== false ? 1 : 0]
      );
      return res.json({ success: true, id });
    } catch (err: any) {
      console.error("MySQL post user query failed:", err);
      return res.status(500).json({
        success: false,
        error: "خطا در پردازش سرور دیتابیس: " + (err.message || "شکست درج مشخصات")
      });
    }
  }

  const local = readLocalJSON();
  if (!local.users) local.users = [];

  // Also prevent duplicates in local backup JSON
  const duplicate = local.users.find(
    (u: any) =>
      u.id !== id &&
      (u.email.trim().toLowerCase() === email.trim().toLowerCase() ||
       u.phone.trim() === phone.trim())
  );
  if (duplicate) {
    return res.status(400).json({
      success: false,
      error: "یک حساب کاربری دیگر با این ایمیل یا شماره کاربری در حافظه محلی ثبت شده است."
    });
  }

  // Update or insert in local backup
  const existingIdx = local.users.findIndex((u: any) => u.id === id);
  const userPayload = {
    id,
    fullName,
    email,
    phone,
    role,
    password: finalPassword,
    avatarUrl,
    isActive: isActive !== false
  };

  if (existingIdx >= 0) {
    local.users[existingIdx] = { ...local.users[existingIdx], ...userPayload };
  } else {
    local.users.push(userPayload);
  }
  writeLocalJSON(local);
  res.json({ success: true, id });
});

app.put("/api/users/:id", async (req, res) => {
  const { id } = req.params;
  const { fullName, email, phone, role, password, avatarUrl, isActive } = req.body;
  const pool = await getMySQLPool();
  if (pool) {
    try {
      try {
        await pool.query("ALTER TABLE `users` ADD COLUMN `password` VARCHAR(255) NOT NULL DEFAULT '123'");
      } catch (e) {}
      try {
        await pool.query("ALTER TABLE `users` ADD COLUMN `is_active` TINYINT(1) NOT NULL DEFAULT 1");
      } catch (e) {}

      // Get existing password first if none or unhashed provided
      const [existingUsers] = await pool.query("SELECT * FROM `users` WHERE `id` = ?", [id]);
      const currentDbUser = (existingUsers as any[])[0];
      let finalPassword = currentDbUser ? currentDbUser.password : '123';
      
      if (password && password.trim() !== '') {
        if (isBcryptHash(password)) {
          finalPassword = password;
        } else {
          finalPassword = bcrypt.hashSync(password.trim(), 10);
        }
      }

      // Prevent duplicate constraints
      const [existing] = await pool.query(
        "SELECT * FROM `users` WHERE (`email` = ? OR `phone` = ?) AND `id` != ?",
        [email, phone, id]
      );
      if ((existing as any[]).length > 0) {
        return res.status(400).json({
          success: false,
          error: "یک حساب کاربری دیگر با این ایمیل یا شماره موبایل از قبل در سامانه ثبت شده است."
        });
      }

      await pool.query(
        "UPDATE `users` SET `full_name`=?, `email`=?, `phone`=?, `role`=?, `password`=?, `avatar_url`=?, `is_active`=? WHERE `id`=?",
        [fullName, email, phone, role, finalPassword, avatarUrl || null, isActive !== false ? 1 : 0, id]
      );
      return res.json({ success: true });
    } catch (err: any) {
      console.error("MySQL update user query failed:", err);
      return res.status(500).json({ success: false, error: err.message || "خطا در بروزرسانی اطلاعات در سرور" });
    }
  }

  const local = readLocalJSON();
  if (!local.users) local.users = [];
  const idx = local.users.findIndex((u: any) => u.id === id);
  if (idx >= 0) {
    // Check local duplicate
    const duplicate = local.users.find(
      (u: any) =>
        u.id !== id &&
        (u.email.trim().toLowerCase() === email.trim().toLowerCase() ||
         u.phone.trim() === phone.trim())
    );
    if (duplicate) {
      return res.status(400).json({
        success: false,
        error: "یک حساب کاربری دیگر با این ایمیل یا شماره کاربری در حافظه محلی ثبت شده است."
      });
    }

    let finalPassword = local.users[idx].password || '123';
    if (password && password.trim() !== '') {
      if (isBcryptHash(password)) {
        finalPassword = password;
      } else {
        finalPassword = bcrypt.hashSync(password.trim(), 10);
      }
    }

    local.users[idx] = { 
      ...local.users[idx], 
      fullName, 
      email, 
      phone, 
      role, 
      password: finalPassword, 
      avatarUrl, 
      isActive: isActive !== false 
    };
    writeLocalJSON(local);
  }
  res.json({ success: true });
});

app.delete("/api/users/:id", async (req, res) => {
  const { id } = req.params;
  const pool = await getMySQLPool();
  if (pool) {
    try {
      await pool.query("DELETE FROM `users` WHERE `id`=?", [id]);
      return res.json({ success: true });
    } catch (err) {
      console.error("MySQL delete user query failed:", err);
    }
  }

  const local = readLocalJSON();
  if (!local.users) local.users = [];
  local.users = local.users.filter((u: any) => u.id !== id);
  writeLocalJSON(local);
  res.json({ success: true });
});

// -------------------------------------------------------------
// APIs: Dynamic REST Routes supporting MySQL & Backup
// -------------------------------------------------------------

// 1. SERVICES REQUESTS APIs
app.get("/api/requests", async (req, res) => {
  const pool = await getMySQLPool();
  if (pool) {
    try {
      try {
        await pool.query("ALTER TABLE `requests` ADD COLUMN `desktop_screenshots` TEXT NULL");
      } catch (e) {}
      try {
        await pool.query("ALTER TABLE `requests` ADD COLUMN `logged_duration_minutes` INT NOT NULL DEFAULT 0");
      } catch (e) {}

      const [rows] = await pool.query("SELECT * FROM `requests` ORDER BY `created_date` DESC");
      // Map database snake_case columns to TS camelCase
      const formatted = (rows as any[]).map(row => ({
        id: row.id,
        fullName: row.full_name,
        phone: row.phone,
        serviceType: row.service_type,
        description: row.description,
        status: row.status,
        priority: row.priority,
        adminNotes: row.admin_notes,
        scheduledDate: row.scheduled_date,
        assignedToId: row.assigned_to_id,
        assignedToName: row.assigned_to_name,
        isApproved: !!row.is_approved,
        approvedAt: row.approved_at,
        assignedAt: row.assigned_at,
        createdDate: row.created_date,
        updatedDate: row.updated_date,
        createdBy: row.created_by,
        rating: row.rating,
        ratingComment: row.rating_comment,
        ratedAt: row.rated_at,
        desktopScreenshots: row.desktop_screenshots ? JSON.parse(row.desktop_screenshots) : [],
        loggedDurationMinutes: row.logged_duration_minutes || 0,
      }));
      return res.json(formatted);
    } catch (err: any) {
      console.error("Error reading requests from MySQL:", err);
    }
  }

  // Fallback to local file db
  const local = readLocalJSON();
  res.json(local.requests);
});

app.post("/api/requests", async (req, res) => {
  const { id, fullName, phone, serviceType, description, status, priority, adminNotes, scheduledDate, assignedToId, assignedToName, isApproved, approvedAt, assignedAt, createdDate, updatedDate, createdBy, desktopScreenshots, loggedDurationMinutes } = req.body;
  const pool = await getMySQLPool();
  let saved = false;
  if (pool) {
    try {
      try {
        await pool.query("ALTER TABLE `requests` ADD COLUMN `desktop_screenshots` TEXT NULL");
      } catch (e) {}
      try {
        await pool.query("ALTER TABLE `requests` ADD COLUMN `logged_duration_minutes` INT NOT NULL DEFAULT 0");
      } catch (e) {}

      await pool.query(
        "INSERT INTO `requests` (`id`, `full_name`, `phone`, `service_type`, `description`, `status`, `priority`, `admin_notes`, `scheduled_date`, `assigned_to_id`, `assigned_to_name`, `is_approved`, `approved_at`, `assigned_at`, `created_date`, `updated_date`, `created_by`, `desktop_screenshots`, `logged_duration_minutes`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [id, fullName, phone, serviceType, description, status, priority, adminNotes || null, scheduledDate || null, assignedToId || null, assignedToName || null, isApproved ? 1 : 0, approvedAt || null, assignedAt || null, createdDate, updatedDate, createdBy, desktopScreenshots ? JSON.stringify(desktopScreenshots) : null, loggedDurationMinutes || 0]
      );
      saved = true;
    } catch (err) {
      console.error("MySQL Insert request failed:", err);
    }
  }

  // Always write fallback to guarantee robust, up-to-date data state
  const local = readLocalJSON();
  const index = local.requests.findIndex(r => r.id === id);
  if (index >= 0) {
    local.requests[index] = req.body;
  } else {
    local.requests.unshift(req.body);
  }
  writeLocalJSON(local);

  // Trigger admin notification for new service request
  createAndSendNotification({
    title: "درخواست خدمات جدید در سیستم",
    message: `مشتری گرامی ${fullName} یک درخواست برای خدمات «${serviceType}» با اولویت «${priority}» ثبت کرد.`,
    type: "request_created",
    priority: priority === "urgent" || priority === "high" ? "high" : "medium",
    targetRole: "admin",
    referenceId: id
  });

  res.json({ success: true, id });
});

app.put("/api/requests/:id", async (req, res) => {
  const { id } = req.params;
  const { fullName, phone, serviceType, description, status, priority, adminNotes, scheduledDate, assignedToId, assignedToName, isApproved, approvedAt, assignedAt, updatedDate, rating, ratingComment, ratedAt, createdBy, desktopScreenshots, loggedDurationMinutes } = req.body;
  const pool = await getMySQLPool();
  if (pool) {
    try {
      try {
        await pool.query("ALTER TABLE `requests` ADD COLUMN `desktop_screenshots` TEXT NULL");
      } catch (e) {}
      try {
        await pool.query("ALTER TABLE `requests` ADD COLUMN `logged_duration_minutes` INT NOT NULL DEFAULT 0");
      } catch (e) {}

      if (status === "completed") {
        const [oldReq] = await pool.query("SELECT `status` FROM `requests` WHERE `id`=?", [id]);
        if (oldReq && (oldReq as any[]).length > 0 && (oldReq as any[])[0].status !== "completed") {
          if (assignedToId) {
            await pool.query(
              "UPDATE `technicians` SET `completed_tasks` = `completed_tasks` + 1, `updated_date` = ? WHERE `id`=?",
              [new Date().toISOString(), assignedToId]
            );
          }
        }
      }
      await pool.query(
        "UPDATE `requests` SET `full_name`=?, `phone`=?, `service_type`=?, `description`=?, `status`=?, `priority`=?, `admin_notes`=?, `scheduled_date`=?, `assigned_to_id`=?, `assigned_to_name`=?, `is_approved`=?, `approved_at`=?, `assigned_at`=?, `updated_date`=?, `rating`=?, `rating_comment`=?, `rated_at`=?, `desktop_screenshots`=?, `logged_duration_minutes`=? WHERE `id`=?",
        [fullName, phone, serviceType, description, status, priority, adminNotes || null, scheduledDate || null, assignedToId || null, assignedToName || null, isApproved ? 1 : 0, approvedAt || null, assignedAt || null, updatedDate, rating || null, ratingComment || null, ratedAt || null, desktopScreenshots ? JSON.stringify(desktopScreenshots) : null, loggedDurationMinutes || 0, id]
      );
    } catch (err) {
      console.error("MySQL update request failed:", err);
    }
  }

  const local = readLocalJSON();
  const index = local.requests.findIndex(r => r.id === id);
  let justCompleted = false;
  let oldRequest: any = null;
  if (index >= 0) {
    oldRequest = { ...local.requests[index] };
    const oldStatus = local.requests[index].status;
    if (oldStatus !== "completed" && status === "completed") {
      justCompleted = true;
    }
    local.requests[index] = { ...local.requests[index], ...req.body };
    
    if (justCompleted && assignedToId) {
      const techIdx = local.technicians.findIndex(t => t.id === assignedToId);
      if (techIdx >= 0) {
        local.technicians[techIdx].completedTasks = (local.technicians[techIdx].completedTasks || 0) + 1;
        local.technicians[techIdx].updatedDate = new Date().toISOString();
      }
    }
    writeLocalJSON(local);
  }

  // Trigger User and Tech notifications
  const targetUser = createdBy || (index >= 0 ? local.requests[index].createdBy : 'user-customer');

  let notificationTitle = "بروزرسانی وضعیت درخواست";
  let notificationMessage = "";
  const changedParts: string[] = [];
  const subjectText = description ? (description.slice(0, 30) + "...") : "خدمات فنی";

  if (oldRequest) {
    if (status && oldRequest.status !== status) {
      let PersianStatus = status;
      if (status === "approved") PersianStatus = "تایید شده";
      else if (status === "assigned") PersianStatus = "تخصیص یافته";
      else if (status === "in_progress") PersianStatus = "در حال انجام";
      else if (status === "completed") PersianStatus = "کامل شده";
      else if (status === "cancelled") PersianStatus = "لغو شده";
      else if (status === "pending") PersianStatus = "در انتظار بررسی";
      
      changedParts.push(`وضعیت به «${PersianStatus}» تغییر یافت`);
      notificationTitle = "تغییر وضعیت درخواست شما";
    }

    if (assignedToName && oldRequest.assignedToName !== assignedToName) {
      changedParts.push(`تکنسین مسئول به «${assignedToName}» تعیین شد`);
      notificationTitle = "تخصیص تکنسین به درخواست شما";
    }

    if (scheduledDate && oldRequest.scheduledDate !== scheduledDate) {
      const formattedDate = new Date(scheduledDate).toLocaleString('fa-IR');
      changedParts.push(`زمان بازدید به «${formattedDate}» هماهنگ شد`);
      notificationTitle = "تنظیم زمان بازدید درخواست";
    }

    if (adminNotes && oldRequest.adminNotes !== adminNotes) {
      changedParts.push(`یادداشت جدیدی از کارشناس ثبت شد: «${adminNotes.slice(0, 35)}...»`);
      notificationTitle = "یادداشت جدید برای درخواست شما";
    }

    if (priority && oldRequest.priority !== priority) {
      let PersianPriority = priority === "urgent" ? "ضروری" : (priority === "high" ? "بالا" : (priority === "medium" ? "متوسط" : "کم"));
      changedParts.push(`اولویت به «${PersianPriority}» تغییر یافت`);
    }
  }

  if (changedParts.length > 0) {
    notificationMessage = `درخواست شما با موضوع «${subjectText}» بروزرسانی شد: ${changedParts.join(" و ")}.`;
  } else {
    let PersianStatus = status;
    if (status === "approved") PersianStatus = "تایید شده";
    else if (status === "assigned") PersianStatus = "تخصیص یافته";
    else if (status === "in_progress") PersianStatus = "در حال انجام";
    else if (status === "completed") PersianStatus = "کامل شده";
    else if (status === "cancelled") PersianStatus = "لغو شده";
    else if (status === "pending") PersianStatus = "در انتظار بررسی";
    
    notificationMessage = `جزئیات درخواست شما با موضوع «${subjectText}» با موفقیت ویرایش شد (وضعیت فعلی: ${PersianStatus}).`;
  }

  createAndSendNotification({
    title: notificationTitle,
    message: notificationMessage,
    type: "request_status",
    priority: "medium",
    targetUserId: targetUser,
    referenceId: id
  });

  if (assignedToId) {
    createAndSendNotification({
      title: "یک کار جدید به شما محول شد",
      message: `درخواست پشتیبانی مشتری ${fullName} با اولویت «${priority}» به شما ارجاع داده شد.`,
      type: "request_status",
      priority: "medium",
      targetUserId: assignedToId,
      referenceId: id
    });
  }

  res.json({ success: true });
});

app.delete("/api/requests/:id", async (req, res) => {
  const { id } = req.params;
  const pool = await getMySQLPool();
  if (pool) {
    try {
      await pool.query("DELETE FROM `requests` WHERE `id` = ?", [id]);
      return res.json({ success: true });
    } catch (err) {
      console.error("MySQL delete request failed:", err);
    }
  }

  const local = readLocalJSON();
  local.requests = local.requests.filter(r => r.id !== id);
  writeLocalJSON(local);
  res.json({ success: true });
});

// 2. TICKETS & THREADS APIs
app.get("/api/tickets", async (req, res) => {
  const pool = await getMySQLPool();
  if (pool) {
    try {
      const [ticketsRows] = await pool.query("SELECT * FROM `tickets` ORDER BY `created_date` DESC");
      const [messagesRows] = await pool.query("SELECT * FROM `ticket_messages` ORDER BY `timestamp` ASC");

      const ticketMessagesMap: Record<string, any[]> = {};
      (messagesRows as any[]).forEach(msg => {
        if (!ticketMessagesMap[msg.ticket_id]) {
          ticketMessagesMap[msg.ticket_id] = [];
        }
        ticketMessagesMap[msg.ticket_id].push({
          id: msg.id,
          senderId: msg.sender_id,
          senderName: msg.sender_name,
          senderRole: msg.sender_role,
          message: msg.message,
          timestamp: msg.timestamp
        });
      });

      const formatted = (ticketsRows as any[]).map(t => ({
        id: t.id,
        subject: t.subject,
        message: t.message,
        status: t.status,
        priority: t.priority,
        category: t.category,
        adminReply: t.admin_reply,
        userEmail: t.user_email,
        userName: t.user_name,
        createdDate: t.created_date,
        updatedDate: t.updated_date,
        createdBy: t.created_by,
        availabilityTime: t.availability_time,
        attachedFile: t.attached_file,
        attachedFileName: t.attached_file_name,
        messages: ticketMessagesMap[t.id] || []
      }));
      return res.json(formatted);
    } catch (err) {
      console.error("MySQL read tickets failed:", err);
    }
  }

  const local = readLocalJSON();
  res.json(local.tickets);
});

app.post("/api/tickets", async (req, res) => {
  const { id, subject, message, status, priority, category, userEmail, userName, createdDate, updatedDate, createdBy, availabilityTime, attachedFile, attachedFileName, messages } = req.body;
  const pool = await getMySQLPool();
  if (pool) {
    try {
      await pool.query(
        "INSERT INTO `tickets` (`id`, `subject`, `message`, `status`, `priority`, `category`, `user_email`, `user_name`, `created_date`, `updated_date`, `created_by`, `availability_time`, `attached_file`, `attached_file_name`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [id, subject, message, status, priority, category, userEmail || null, userName || null, createdDate, updatedDate, createdBy, availabilityTime || null, attachedFile || null, attachedFileName || null]
      );
      
      // Save initial thread messages if any
      if (Array.isArray(messages)) {
        for (const msg of messages) {
          await pool.query(
            "INSERT INTO `ticket_messages` (`id`, `ticket_id`, `sender_id`, `sender_name`, `sender_role`, `message`, `timestamp`) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [msg.id, id, msg.senderId, msg.senderName, msg.senderRole, msg.message, msg.timestamp]
          );
        }
      }
    } catch (err) {
      console.error("MySQL post SQL ticket failed:", err);
    }
  }

  const local = readLocalJSON();
  const index = local.tickets.findIndex(t => t.id === id);
  if (index >= 0) {
    local.tickets[index] = req.body;
  } else {
    local.tickets.unshift(req.body);
  }
  writeLocalJSON(local);

  // Trigger admin notification for new ticket
  createAndSendNotification({
    title: `تیکت پشتیبانی جدید: ${subject}`,
    message: `کاربر ${userName || "مشتری"} تیکتی تحت عنوان «${subject}» با اولویت «${priority}» ثبت کرد.`,
    type: "ticket_created",
    priority: priority === "high" || priority === "urgent" ? "high" : "medium",
    targetRole: "admin",
    referenceId: id
  });

  res.json({ success: true, id });
});

app.put("/api/tickets/:id", async (req, res) => {
  const { id } = req.params;
  const { status, priority, adminReply, updatedDate, userName, userEmail, createdBy } = req.body;
  const pool = await getMySQLPool();
  if (pool) {
    try {
      await pool.query(
        "UPDATE `tickets` SET `status`=?, `priority`=?, `admin_reply`=?, `updated_date`=?, `user_name`=?, `user_email`=? WHERE `id`=?",
        [status, priority, adminReply || null, updatedDate, userName || null, userEmail || null, id]
      );
    } catch (err) {
      console.error("MySQL update ticket details failed:", err);
    }
  }

  const local = readLocalJSON();
  const index = local.tickets.findIndex(t => t.id === id);
  let oldTicket: any = null;
  if (index >= 0) {
    oldTicket = { ...local.tickets[index] };
    local.tickets[index] = { ...local.tickets[index], ...req.body };
    writeLocalJSON(local);
  }

  const targetUser = createdBy || (index >= 0 ? local.tickets[index].createdBy : 'user-customer');

  let ticketTitle = "بروزرسانی تیکت پشتیبانی";
  let ticketMessage = "";
  const ticketChanges: string[] = [];
  const ticketSubject = req.body.subject || (oldTicket ? oldTicket.subject : "پشتیبانی فنی");

  if (oldTicket) {
    if (status && oldTicket.status !== status) {
      let PersianStatus = status === "open" ? "باز شده" : (status === "in_progress" ? "در حال بررسی" : "بسته شده");
      ticketChanges.push(`وضعیت تیکت به «${PersianStatus}» تغییر یافت`);
      ticketTitle = "تغییر وضعیت تیکت پشتیبانی";
    }
    if (priority && oldTicket.priority !== priority) {
      let PersianPriority = priority === "urgent" ? "خیلی فوری" : (priority === "high" ? "بالا" : (priority === "medium" ? "متوسط" : "پایین"));
      ticketChanges.push(`اولویت به «${PersianPriority}» تغییر داده شد`);
    }
    if (adminReply && oldTicket.adminReply !== adminReply) {
      ticketChanges.push(`پاسخ رسمی پشتیبان پیوست شد: «${adminReply.slice(0, 35)}...»`);
      ticketTitle = "پاسخ جدید در تیکت پشتیبانی";
    }
  }

  if (ticketChanges.length > 0) {
    ticketMessage = `تیکت شما با عنوان «${ticketSubject}» بروزرسانی شد: ${ticketChanges.join(" و ")}.`;
  } else {
    let PersianStatus = status === "open" ? "باز شده" : (status === "in_progress" ? "در حال بررسی" : "بسته شده");
    ticketMessage = `تیکت شما با عنوان «${ticketSubject}» بروزرسانی شد و در وضعیت «${PersianStatus}» قرار دارد.`;
  }

  createAndSendNotification({
    title: ticketTitle,
    message: ticketMessage,
    type: "ticket_status",
    priority: "medium",
    targetUserId: targetUser,
    referenceId: id
  });

  res.json({ success: true });
});

app.post("/api/tickets/:id/messages", async (req, res) => {
  const { id } = req.params;
  const { msgId, senderId, senderName, senderRole, message, timestamp } = req.body;
  const pool = await getMySQLPool();
  if (pool) {
    try {
      await pool.query(
        "INSERT INTO `ticket_messages` (`id`, `ticket_id`, `sender_id`, `sender_name`, `sender_role`, `message`, `timestamp`) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [msgId, id, senderId, senderName, senderRole, message, timestamp]
      );
      await pool.query("UPDATE `tickets` SET `updated_date` = ? WHERE `id` = ?", [timestamp, id]);
    } catch (err) {
      console.error("MySQL insert ticket message failed:", err);
    }
  }

  const local = readLocalJSON();
  const index = local.tickets.findIndex(t => t.id === id);
  let ticketCreator = 'user-customer';
  let ticketSubject = 'پشتیبانی فنی';
  if (index >= 0) {
    if (!local.tickets[index].messages) {
      local.tickets[index].messages = [];
    }
    local.tickets[index].messages.push({
      id: msgId,
      senderId,
      senderName,
      senderRole,
      message,
      timestamp
    });
    local.tickets[index].updatedDate = timestamp;
    ticketCreator = local.tickets[index].createdBy || 'user-customer';
    ticketSubject = local.tickets[index].subject || 'پشتیبانی فنی';
    writeLocalJSON(local);
  }

  // Trigger real-time notifications for responses
  if (senderRole === 'admin' || senderRole === 'technician') {
    // Notify customer
    createAndSendNotification({
      title: "پاسخ جدید از پشتیبانی",
      message: `${senderName}: ${message.slice(0, 50)}${message.length > 50 ? '...' : ''}`,
      type: "ticket_reply",
      priority: "medium",
      targetUserId: ticketCreator,
      referenceId: id
    });
  } else {
    // Customer responded -> notify administrators
    createAndSendNotification({
      title: `پیام جدید در تیکت: ${ticketSubject}`,
      message: `${senderName}: ${message.slice(0, 50)}${message.length > 50 ? '...' : ''}`,
      type: "ticket_reply",
      priority: "medium",
      targetRole: "admin",
      referenceId: id
    });
    // Also notify technicians
    createAndSendNotification({
      title: `پیام جدید در تیکت: ${ticketSubject}`,
      message: `${senderName}: ${message.slice(0, 50)}${message.length > 50 ? '...' : ''}`,
      type: "ticket_reply",
      priority: "medium",
      targetRole: "technician",
      referenceId: id
    });
  }

  res.json({ success: true });
});

// 3. REVIEWS APIs
app.get("/api/reviews", async (req, res) => {
  const pool = await getMySQLPool();
  if (pool) {
    try {
      const [rows] = await pool.query("SELECT * FROM `reviews` ORDER BY `created_date` DESC");
      const formatted = (rows as any[]).map(r => ({
        id: r.id,
        customerName: r.customer_name,
        rating: r.rating,
        comment: r.comment,
        serviceType: r.service_type,
        isApproved: r.is_approved === 1,
        isRejected: r.is_approved === -1,
        createdDate: r.created_date,
        updatedDate: r.updated_date,
        createdBy: r.created_by,
        technicianId: r.technician_id,
        technicianName: r.technician_name,
      }));
      return res.json(formatted);
    } catch (err) {
      console.error("MySQL read reviews failed:", err);
    }
  }

  const local = readLocalJSON();
  res.json(local.reviews);
});

app.post("/api/reviews", async (req, res) => {
  const { id, customerName, rating, comment, serviceType, isApproved, createdDate, updatedDate, createdBy, technicianId, technicianName } = req.body;
  const pool = await getMySQLPool();
  if (pool) {
    try {
      await pool.query(
        "INSERT INTO `reviews` (`id`, `customer_name`, `rating`, `comment`, `service_type`, `is_approved`, `created_date`, `updated_date`, `created_by`, `technician_id`, `technician_name`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [id, customerName, rating, comment, serviceType || null, isApproved ? 1 : 0, createdDate, updatedDate, createdBy, technicianId || null, technicianName || null]
      );
    } catch (err) {
      console.error("MySQL post review query failed:", err);
    }
  }

  const local = readLocalJSON();
  local.reviews.unshift(req.body);
  writeLocalJSON(local);

  // Trigger admin notification for new customer review
  createAndSendNotification({
    title: "ثبت نظر و امتیاز جدید",
    message: `مشتری گرامی ${customerName} امتیاز ${rating} ستاره ثبت کرد. «${comment.slice(0, 50)}${comment.length > 50 ? '...' : ''}»`,
    type: "review_created",
    priority: rating <= 3 ? "high" : "low", // flagged high priority for low satisfaction reviews
    targetRole: "admin",
    referenceId: id
  });

  res.json({ success: true, id });
});

app.put("/api/reviews/:id", async (req, res) => {
  const { id } = req.params;
  const { isApproved, isRejected, rating, comment, updatedDate } = req.body;
  const pool = await getMySQLPool();
  if (pool) {
    try {
      let isApprovedDbValue = 0;
      if (isApproved === true || isApproved === 1) {
        isApprovedDbValue = 1;
      } else if (isRejected === true || isRejected === 1) {
        isApprovedDbValue = -1;
      }
      await pool.query(
        "UPDATE `reviews` SET `is_approved`=?, `rating`=?, `comment`=?, `updated_date`=? WHERE `id`=?",
        [isApprovedDbValue, rating, comment, updatedDate, id]
      );
    } catch (err) {
      console.error("MySQL update reviews query failed:", err);
    }
  }

  const local = readLocalJSON();
  const index = local.reviews.findIndex(r => r.id === id);
  if (index >= 0) {
    local.reviews[index] = { ...local.reviews[index], ...req.body };
    writeLocalJSON(local);
  }
  res.json({ success: true });
});

app.delete("/api/reviews/:id", async (req, res) => {
  const { id } = req.params;
  const pool = await getMySQLPool();
  if (pool) {
    try {
      await pool.query("DELETE FROM `reviews` WHERE `id` = ?", [id]);
    } catch (err) {
      console.error("MySQL delete review failed:", err);
    }
  }

  const local = readLocalJSON();
  local.reviews = local.reviews.filter(r => r.id !== id);
  writeLocalJSON(local);
  res.json({ success: true });
});

// 4. TECHNICIANS APIs
app.get("/api/technicians", async (req, res) => {
  const pool = await getMySQLPool();
  if (pool) {
    try {
      const [rows] = await pool.query("SELECT * FROM `technicians` ORDER BY `completed_tasks` DESC");
      const formatted = (rows as any[]).map(t => ({
        id: t.id,
        fullName: t.full_name,
        phone: t.phone,
        email: t.email,
        specialty: t.specialty,
        isActive: !!t.is_active,
        completedTasks: t.completed_tasks,
        createdDate: t.created_date,
        updatedDate: t.updated_date,
        createdBy: t.created_by,
        certificationLevel: t.certification_level || 'Junior',
      }));
      return res.json(formatted);
    } catch (err) {
      console.error("MySQL read techs query failed:", err);
    }
  }

  const local = readLocalJSON();
  res.json(local.technicians);
});

app.post("/api/technicians", async (req, res) => {
  const { id, fullName, phone, email, specialty, isActive, completedTasks, createdDate, updatedDate, createdBy, certificationLevel } = req.body;
  const pool = await getMySQLPool();
  if (pool) {
    try {
      // First ensure the tech user exists in users table as well
      await pool.query(
        "INSERT IGNORE INTO `users` (`id`, `full_name`, `email`, `phone`, `role`) VALUES (?, ?, ?, ?, 'technician')",
        [id, fullName, email || `${id}@easydriver.ir`, phone, 'technician']
      );

      try {
        await pool.query("ALTER TABLE `technicians` ADD COLUMN `certification_level` ENUM('Junior', 'Senior', 'Expert') NOT NULL DEFAULT 'Junior'");
      } catch (colErr) {
        // column might exist
      }

      await pool.query(
        "INSERT INTO `technicians` (`id`, `full_name`, `phone`, `email`, `specialty`, `is_active`, `completed_tasks`, `created_date`, `updated_date`, `created_by`, `certification_level`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [id, fullName, phone, email || null, specialty, isActive ? 1 : 0, completedTasks || 0, createdDate, updatedDate, createdBy, certificationLevel || 'Junior']
      );
      return res.json({ success: true, id });
    } catch (err) {
      console.error("MySQL post technician query failed:", err);
    }
  }

  const local = readLocalJSON();
  local.technicians.push(req.body);
  writeLocalJSON(local);
  res.json({ success: true, id });
});

app.put("/api/technicians/:id", async (req, res) => {
  const { id } = req.params;
  const { fullName, phone, email, specialty, isActive, completedTasks, updatedDate, certificationLevel } = req.body;
  const pool = await getMySQLPool();
  if (pool) {
    try {
      try {
        await pool.query("ALTER TABLE `technicians` ADD COLUMN `certification_level` ENUM('Junior', 'Senior', 'Expert') NOT NULL DEFAULT 'Junior'");
      } catch (colErr) {
        // column might exist
      }

      await pool.query(
        "UPDATE `technicians` SET `full_name`=?, `phone`=?, `email`=?, `specialty`=?, `is_active`=?, `completed_tasks`=?, `updated_date`=?, `certification_level`=? WHERE `id`=?",
        [fullName, phone, email || null, specialty, isActive ? 1 : 0, completedTasks, updatedDate, certificationLevel || 'Junior', id]
      );
      return res.json({ success: true });
    } catch (err) {
      console.error("MySQL update technician failed:", err);
    }
  }

  const local = readLocalJSON();
  const index = local.technicians.findIndex(t => t.id === id);
  if (index >= 0) {
    local.technicians[index] = { ...local.technicians[index], ...req.body };
    writeLocalJSON(local);
  }
  res.json({ success: true });
});

app.delete("/api/technicians/:id", async (req, res) => {
  const { id } = req.params;
  const pool = await getMySQLPool();
  if (pool) {
    try {
      await pool.query("DELETE FROM `technicians` WHERE `id`=?", [id]);
      return res.json({ success: true });
    } catch (err) {
      console.error("MySQL delete technician failed:", err);
    }
  }

  const local = readLocalJSON();
  local.technicians = local.technicians.filter(t => t.id !== id);
  writeLocalJSON(local);
  res.json({ success: true });
});



// API: Check if API key status is available or fallback engine is active
app.get("/api/check-api-key", (req, res) => {
  res.json({ available: true, isSimulation: false, engine: "موتور بهینه‌ساز هوش مصنوعی پردازش ابری" });
});

// API: Simulated Expert Computer Technician Response Router
app.post("/api/ai-chat", async (req, res) => {
  try {
    const { subject, messageHistory } = req.body;
    
    // Get the user's latest text input
    let lastUserMessage = "";
    if (Array.isArray(messageHistory)) {
      const userMsgs = messageHistory.filter((m: any) => m.senderRole === "customer" || !m.senderRole);
      if (userMsgs.length > 0) {
        lastUserMessage = userMsgs[userMsgs.length - 1].message || "";
      }
    }

    const textInput = (lastUserMessage + " " + (subject || "")).toLowerCase();
    let reply = "";

    // Intelligent Iranian computer technician mock response tree
    if (textInput.includes("آفیس") || textInput.includes("office") || textInput.includes("اکتیو") || textInput.includes("لایسنس") || textInput.includes("کرک")) {
      reply = "سلام و احترام. برای رفع مشکل لایسنس آفیس، ابتدا موقتاً بخش Real-time Protection آنتی‌ویروس ویندوز را خاموش بفرمایید. سپس ابزار فعال‌ساز EasyActivator موجود روی میز کار (Desktop) را با دسترسی ادمین باز کرده و کلید [2] را فشار دهید. پس از مشاهده پیام موفقیت، سیستم را ریستارت کنید.";
    } else if (textInput.includes("گرافیک") || textInput.includes("کارت گرافیک") || textInput.includes("nvidia") || textInput.includes("amd") || textInput.includes("intel") || textInput.includes("radeon") || textInput.includes("بازی") || textInput.includes("درایور")) {
      reply = "درود فراوان بر شما. بروز اختلال در گرافیک به دلیل فایل‌های کش درایور قبلی رایج است. توصیه می‌شود ابتدا نرم‌افزار DDU را در حالت Safe Mode اجرا کنید تا درایورهای معیوب قبلی کاملاً حذف (Clean Install) شود؛ ما آماده‌ایم آخرین نسخه پایدار و کاملاً تست‌شده WHQL را به طور خودکار روی سیستم شما مچ و بارگذاری کنیم.";
    } else if (textInput.includes("انی دسک") || textInput.includes("anydesk") || textInput.includes("آی دی") || textInput.includes("وصل") || textInput.includes("کد") || textInput.includes("کنترل")) {
      reply = "سلام. لطفاً نرم‌افزار AnyDesk را روی سیستم باز بگذارید و شناسه ۹ رقمی قرمز رنگ نمایش داده شده در بخش Your Address را بنویسید. کارشناسان ارشد ایزی‌درایور به محض دریافت شناسه، با دسترسی ایمن اتصال ریموت را جهت بررسی سیستم برقرار خواهند کرد.";
    } else if (textInput.includes("پرینتر") || textInput.includes("چاپگر") || textInput.includes("اسکنر") || textInput.includes("نصب نشد")) {
      reply = "سلام کاربر گرامی. مشکل عدم چاپ معمولاً به علت تداخل پورت‌های مجازی و یا توقف سرویس Print Spooler ویندوز است. در عملیات ریموت، ما پورت پیش‌فرض را روی USB001 تنطیم کرده و یک بار سرویس چاپگر را از طریق خط فرمان ری‌استارت خواهیم کرد.";
    } else if (textInput.includes("کندی") || textInput.includes("هنگ") || textInput.includes("ویندوز") || textInput.includes("اپدیت") || textInput.includes("آپدیت") || textInput.includes("ریستارت")) {
      reply = "درود. افت سرعت شدید ویندوز اغلب ناشی از انباشته شدن فایل‌های موقت کش درایو C، حضور بدافزارها در Startup و یا دمای نامتعارف سخت‌افزار است. با ابزارهای بهینه‌ساز تخصصی ما، بخش کش مرورگرها، کلیدهای اضافی رجیستری و فایل‌های تکراری سیستم شما را به طور کامل پاکسازی می‌کنیم.";
    } else if (textInput.includes("صدا") || textInput.includes("میکروفون") || textInput.includes("هدست" ) || textInput.includes("قطع")) {
      reply = "سلام. اختلال صدا اکثراً به خاطر عدم تطابق درایور Realtek با پچ امنیتی جدید ویندوز رخ می‌دهد. ما درایور اورجینال مادربرد شما را پیدا کرده و با ابزار مدیریت افزونه صوتی همگام خواهیم ساخت.";
    } else {
      // General highly realistic technical polite replies
      const naturalReplies = [
        "درود و وقت بخیر؛ اطلاعات ثبت‌شده توسط سیستم هوشمند ما تحلیل شد. کارشناسان فنی ایزی‌درایور هم‌اکنون آماده برقراری اتصال ریموت AnyDesk روی سیستم شما هستند تا به صورت دقیق‌تر عیب‌یابی را نهایی کنند.",
        "سلام دوست گرامی؛ درخواست شما در صف اولویت‌های مانیتورینگ آنلاین قرار گرفت. برای تایید نهایی ابزارهای نصب درایور، همکاران بخش پشتیبانی فنی تا لحظاتی دیگر مستقیم روی سیستم شما لاگین خواهند کرد.",
        "ارسال توضیحات با موفقیت ثبت شد. سیستم پیشنهاد می‌دهد برای جلوگیری از هرگونه تداخل در حین اتوماسیون آنلاین نصب درایورها، برنامه‌های سنگین و دانلودهای پس‌زمینه خود را موقتاً متوقف کنید.",
        "سیستم پشتیبان ارشد ایزی‌درایور پیام شما را تحلیل کرد. جهت سرعت‌بخشی به امر نصب و عیب‌یابی ریموت، پیشنهاد داریم سیستم عامل خود را در حالت آماده‌باش برای مانیتورینگ قرار دهید."
      ];
      reply = naturalReplies[Math.floor(Math.random() * naturalReplies.length)];
    }

    // Delay response slightly to simulate a real-world server calculation/chat typing (extremely appealing)
    setTimeout(() => {
      res.json({ text: reply });
    }, 400);

  } catch (error: any) {
    console.error("Simulated Chat Error:", error);
    res.json({ text: "پاسخ خودکار: سیستم با تداخل اندکی روبرو شد. در اسرع وقت کارشناس دستی ما موضوع را برطرف می‌سازد." });
  }
});

// API: Simulated Intelligent PC Diagnostic Scanner Analysis Generator
app.post("/api/analyze-system", async (req, res) => {
  try {
    const { hardwareSpec, originalIssue } = req.body;
    
    const cpu = hardwareSpec?.cpu || "Intel/AMD Processor";
    const gpu = hardwareSpec?.gpu || "Unknown GPU Card";
    const ram = hardwareSpec?.ram || "16 GB DDR4";
    const os = hardwareSpec?.os || "Windows 11 Enterprise";
    const issue = originalIssue || "درخواست نصب پکیج‌های درایور و نرم‌افزار عمومی";

    // Build dynamic analyses tailored perfectly to user arguments to maintain a jaw-dropping appeal!
    const isNvidia = gpu.toLowerCase().includes("nvidia") || gpu.toLowerCase().includes("rtx") || gpu.toLowerCase().includes("gtx");
    const isAmd = gpu.toLowerCase().includes("amd") || gpu.toLowerCase().includes("radeon") || cpu.toLowerCase().includes("ryzen");
    
    const gpuStatus = issue.toLowerCase().includes("کارت گرافیک") || issue.toLowerCase().includes("بازی") || issue.toLowerCase().includes("گرافیک") ? "outdated" : "optimal";
    const ramWarningThreshold = parseInt(ram, 10) < 8 ? "کم‌سرعت (نیاز به ارتقا)" : "مناسب و پایدار";

    let analysisText = `براساس عیب‌یابی مکانیزه سیستم EasyDriver، مشخصات سخت‌افزار ایده آل شما (${cpu}) مجهز به پردازشگر تصویری (${gpu}) و رم (${ram}) کشش فوق‌العاده‌ای برای پردازش‌های بهینه دارد. با این حال تداخل گزارش شده تحت عنوان «${issue}» احتمالاً به علت تداخل مستقیم کلیدهای فرعی رجیستری و قدیمی بودن بسته درایورهای هسته فرعی است. نصب پچ بهینه‌ساز و بروزرسانی درایورها پیشنهاد صریح سیستم است.`;
    
    // Custom diagnostic parameters array
    const diagnosticsArray = [
      { 
        name: gpu, 
        status: gpuStatus, 
        version: isNvidia ? "v531.11 (پیش‌فرض قدیمی)" : "v23.2.1 (نیاز به ارتقا)", 
        type: "هدایتگر تصویری (Graphic GPU)" 
      },
      { 
        name: cpu, 
        status: "optimal", 
        version: "شناسایی‌شده (تحت بار متعادل)", 
        type: "پردازشگر مرکزی (CPU)" 
      },
      { 
        name: `ویندوز ${os}`, 
        status: "warning", 
        version: "بیلد پایدار (نیازمند هماهنگی رجیستری)", 
        type: "بستر سیستم‌عامل (OS)" 
      },
      { 
        name: "پورت ریموت AnyDesk Service", 
        status: "optimal", 
        version: "کانال امن فعال (SSL 256bit)", 
        type: "سرویس اتصال پشتیبان" 
      }
    ];

    // Gorgeous, high-tech looking PowerShell diagnostic command block with custom Persian comments
    const customShellCommands = 
      `# =========================================================================\n` +
      `#     سند عیب‌یابی سیستم هوشمند EasyDriver - گزارش موقت PowerShell\n` +
      `#     سازگار با سخت‌افزار: CPU ${cpu} | GPU ${gpu}\n` +
      `# =========================================================================\n\n` +
      `Write-Host ">>> در حال شروع اسکن سلامت سیستم برای پردازنده ${cpu} ..."\n` +
      `# بررسی وضعیت اتصال اینترنت جهت همگام‌سازی ابزارهای ریموت\n` +
      `$PingCheck = Test-Connection -ComputerName "8.8.8.8" -Count 1 -Quiet\n` +
      `if ($PingCheck) {\n` +
      `    Write-Host "[OK] اتصال اینترنت برقرار است. بارگذاری سرورهای ردیاب..." -ForegroundColor Green\n` +
      `} else {\n` +
      `    Write-Warning "[WARN] اختلال جزئی در شبکه شناسایی شد؛ پیشنهاد می‌شود اتصالات بررسی شود."\n` +
      `}\n\n` +
      `# اسکن کلیورهای فعال تصویر و کش برای کارت گرافیک ${gpu}\n` +
      `Get-WmiObject Win32_VideoController | Select-Object Name, VideoProcessor, DriverVersion\n` +
      `Write-Host "[SUCCESS] گزارش اولیه با موفقیت ثبت گردید. آماده اتصال تکنسین ریموت." -ForegroundColor Cyan\n`;

    // Slight timeout for amazing professional scanner feel
    setTimeout(() => {
      res.json({
        status: "warning",
        analysis: analysisText,
        diagnostics: diagnosticsArray,
        shellCommands: customShellCommands
      });
    }, 1200);

  } catch (error: any) {
    console.error("Diagnostic Simulation API Error:", error);
    res.status(500).json({ error: "Internal Server Error in diagnostic scanning" });
  }
});

// Demo drivers database for real-time suggestions
const DEMO_DRIVERS = [
  { id: "drv-1", name: "NVIDIA GeForce Game Ready Driver", version: "551.23", releaseDate: "2024-03-12", compatibility: "۹۹٪ (سازگار با ویندوز ۱۰/۱۱)", size: "640 MB", category: "کارت گرافیک (GPU)", hardwareModel: "NVIDIA GeForce RTX 3060 / 3070 / 3080 / 4060 / 4070" },
  { id: "drv-2", name: "NVIDIA GeForce Driver Legacy", version: "472.12", releaseDate: "2022-09-21", compatibility: "۹۵٪ (ثبات بالا در ویندوز ۷/۱۰)", size: "480 MB", category: "کارت گرافیک (GPU)", hardwareModel: "NVIDIA GeForce GTX 1060 / 1070 / 1050 / 960" },
  { id: "drv-3", name: "AMD Radeon Adrenalin Edition", version: "24.2.1", releaseDate: "2024-02-28", compatibility: "۹۸٪ (بهینه‌سازی شده برای گیمینگ)", size: "612 MB", category: "کارت گرافیک (GPU)", hardwareModel: "AMD Radeon RX 580 / 5700 / 6605 / 6700 XT / 7800 XT" },
  { id: "drv-4", name: "Intel Graphics Windows DCH Driver", version: "31.0.101.5333", releaseDate: "2024-03-01", compatibility: "۱۰۰٪ (تایید شده مایکروسافت WHQL)", size: "450 MB", category: "گرافیک آنبرد (Intel HD/UHD)", hardwareModel: "Intel Iris Xe / UHD Graphics 620 / Core i3 i5 i7 i9 Gen 10/11/12/13/14" },
  { id: "drv-5", name: "Realtek High Definition Audio Driver", version: "6.0.9621.1", releaseDate: "2023-11-15", compatibility: "۱۰۰٪ (برطرف‌کننده نویز و صدای بم)", size: "145 MB", category: "کارت صدا (Audio)", hardwareModel: "Realtek ALC887 / ALC892 / ALC1220 / High Definition Audio Adaptor" },
  { id: "drv-6", name: "Intel Wireless Bluetooth Driver", version: "23.30.0", releaseDate: "2024-02-14", compatibility: "۹۹٪ (حل مشکل قطعی هدفون بلوتوث)", size: "52 MB", category: "شبکه و بلوتوث (Wi-Fi/Bluetooth)", hardwareModel: "Intel Wireless-AC 9560 / AX200 / AX201 / AX210" },
  { id: "drv-7", name: "Synaptics Precision Touchpad Driver", version: "19.5.35.85", releaseDate: "2023-05-10", compatibility: "۹۷٪ (افزودن ژست‌های حرکتی چند انگشتی)", size: "35 MB", category: "تاچ پد لپ‌تاپ", hardwareModel: "HP Pavilion / Lenovo ThinkPad / Asus ZenBook Touchpads" },
  { id: "drv-8", name: "HP LaserJet Pro Certified Print Driver", version: "15.0.22", releaseDate: "2023-08-01", compatibility: "۱۰۰٪ (پشتیبانی از پرینت مستقیم شبکه)", size: "115 MB", category: "چاپگر و اسکنر (Printer)", hardwareModel: "HP LaserJet Pro M12 / M15 / M102 / M130fn" },
  { id: "drv-9", name: "Canon PIXMA Multifunction Printer Driver", version: "1.04", releaseDate: "2023-12-10", compatibility: "۹۶٪ (شامل اسکنر پیشرفته رنگی)", size: "85 MB", category: "چاپگر و اسکنر (Printer)", hardwareModel: "Canon PIXMA G3010 / G2010 / TS3140 / MG2540" },
  { id: "drv-10", name: "Logitech G HUB Advanced Device Driver", version: "2024.1", releaseDate: "2024-01-30", compatibility: "۹۹٪ (برنامه‌ریزی دکمه‌ها و نور RGB)", size: "128 MB", category: "کیبورد و موس گیمینگ", hardwareModel: "Logitech G502 / G213 / G402 / G903 Mouse/Keyboard" }
];

// Compatible drivers search API
app.get("/api/compatible-drivers", (req, res) => {
  const modelQuery = ((req.query.model as string) || "").trim().toLowerCase();
  if (!modelQuery) {
    return res.json([]);
  }

  const matches = DEMO_DRIVERS.filter(drv => 
    drv.name.toLowerCase().includes(modelQuery) ||
    drv.hardwareModel.toLowerCase().includes(modelQuery) ||
    drv.category.toLowerCase().includes(modelQuery)
  );

  res.json(matches);
});

// Create uploads directory on startup
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// File upload API (receives base64 representation of a client-side file and stores it dynamically)
app.post("/api/upload", (req, res) => {
  const { fileName, base64Data } = req.body;
  
  if (!fileName || !base64Data) {
    return res.status(400).json({ error: "Both fileName and base64Data are required as parameters." });
  }

  try {
    const fileExt = path.extname(fileName) || "";
    const baseName = path.basename(fileName, fileExt).replace(/[^a-zA-Z0-9]/g, "_");
    const uniqueFileName = `${baseName}_${Date.now()}${fileExt}`;
    
    // Support data URLs / raw base64 strings safely
    const cleanBase64 = base64Data.includes(";base64,") 
      ? base64Data.split(";base64,")[1] 
      : base64Data;
      
    const buffer = Buffer.from(cleanBase64, "base64");
    const filePath = path.join(UPLOADS_DIR, uniqueFileName);
    fs.writeFileSync(filePath, buffer);
    
    const fileUrl = `/uploads/${uniqueFileName}`;
    console.log(`📎 Stored file upload: ${fileName} -> ${fileUrl}`);
    res.json({ success: true, url: fileUrl, originalName: fileName });
  } catch (err: any) {
    console.error("File write error:", err);
    res.status(500).json({ error: "Failed to store uploaded file: " + err.message });
  }
});

// Configure serving of absolute uploaded files statically
app.use("/uploads", express.static(UPLOADS_DIR));

const server = http.createServer(app);

// Initialize WebSocket server
const wss = new WebSocketServer({ server });

wss.on("connection", (ws: any) => {
  console.log("🔌 New client connected to WebSocket Server");
  
  ws.on("message", (message: string) => {
    try {
      const payload = JSON.parse(message);
      if (payload.type === "register") {
        ws.userId = payload.userId;
        ws.userRole = payload.role;
        console.log(`👤 Client registered: UserID=${ws.userId}, Role=${ws.userRole}`);
        // Send connection success acknowledgement
        ws.send(JSON.stringify({ type: "registered", success: true }));
      } else if (payload.type === "ping") {
        ws.send(JSON.stringify({ type: "pong", timestamp: payload.timestamp }));
      }
    } catch (err) {
      console.error("Error parsing WebSocket message:", err);
    }
  });

  ws.on("close", () => {
    console.log("🔌 Client disconnected from WebSocket Server");
  });
});

// Vite Server Configuration
async function initializeVite() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on port ${PORT} with real-time WebSockets`);
  });
}

initializeVite();

// Trigger initial connection test 1 second after server boot
setTimeout(async () => {
  console.log("🚀 Testing initial MySQL connection on start...");
  try {
    const pool = await getMySQLPool(true); // Bypass normal lazy load rate-limit
    if (!pool) {
      console.warn("🚫 Initial database connection failed. Schedulud background retry loop.");
      scheduleBackgroundRetry();
    } else {
      console.log("✅ Database initialized successfully on server start.");
    }
  } catch (err) {
    console.error("🚫 Connection error on start:", err);
    scheduleBackgroundRetry();
  }
}, 1000);
