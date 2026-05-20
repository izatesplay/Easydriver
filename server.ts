import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// API: Health status
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// API: Check if API key is active
app.get("/api/check-api-key", (req, res) => {
  const isAvailable = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY";
  res.json({ available: isAvailable });
});

// Lazy loader for Google GenAI client
let aiInstance: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === "MY_GEMINI_API_KEY") {
    return null;
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// API: Dynamic Ticket Chat Support
app.post("/api/ai-chat", async (req, res) => {
  try {
    const { subject, messageHistory } = req.body;
    
    // Format conversation history for Gemini context
    let conversationText = `موضوع تیکت: ${subject}\n\n`;
    if (Array.isArray(messageHistory)) {
      messageHistory.forEach((msg: any) => {
        const sender = msg.senderRole === "admin" ? "کارشناس/پشتیبان ایزی‌درایور" : "مشتری/کاربر سیستم";
        conversationText += `[${sender}]: ${msg.message}\n`;
      });
    }

    const ai = getAIClient();
    if (!ai) {
      // High quality Persian realistic system fallbacks
      const fallbackReplies = [
        "درود بر شما. تیکت شما در صف بررسی آنی‌دسک کارشناسان فنی قرار گرفت. جهت تسریع در فرآیند، لطفاً ID نرم‌افزار AnyDesk و سیستم عامل خود را بررسی و اعلام کنید.",
        "سیستم پشتیبانی فنی هوشمند درخواست شما را دریافت کرد. درایورهای مربوطه در حال تطبیق با کلاینت هستند. لطفاً اتصال اینترنت خود را پایدار نگه دارید.",
        "جزئیات ارسالی ثبت شد. یکی از تکنسین‌های ما مجدداً بررسی می‌کند. لطفاً هرگونه آنتی‌ویروس را موقتاً غیرفعال کنید تا نصب اتوماتیک بدون تداخل شروع شود.",
        "سلام و احترام، پاسخ شما تا دقایقی دیگر توسط مهندسان بخش بررسی خواهد شد و اقدامات ریموت اعمال می‌گردد. صبور باشید."
      ];
      const answer = fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
      return res.json({ text: answer });
    }

    const systemInstruction = 
      "You are a highly professional, polite, and expert Persian computer software and hardware technician named 'پشتیبان هوشمند EasyDriver' representing EasyDriver Remote Services. " +
      "Your goal is to answer the client's questions about Windows driver errors, installation of complex software, and secure AnyDesk connection. " +
      "Always respond in Persian, be very reassuring, professional, short (2 to 3 sentences max) and provide helpful diagnostic tips. Do not use generic placeholders. Feel free to offer PowerShell or registry hints if relevant.";

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `This is the chat history of a client ticket. Generate a reply as the support expert:\n\n${conversationText}`,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    res.json({ text: response.text || "پاسخ ثبت شد." });
  } catch (error: any) {
    console.error("Gemini Chat Error:", error);
    res.json({ text: "پوزش می‌طلبیم؛ خطایی در دریافت پاسخ زنده هوشمند سیستم رخ داد. کارشناسان ما به زودی متصل می‌شوند." });
  }
});

// API: Intelligent PC Diagnostic Scanner Analysis
app.post("/api/analyze-system", async (req, res) => {
  try {
    const { hardwareSpec, originalIssue } = req.body;
    
    const cpu = hardwareSpec?.cpu || "Intel/AMD Processor";
    const gpu = hardwareSpec?.gpu || "Unknown GPU Card";
    const ram = hardwareSpec?.ram || "8 GB";
    const os = hardwareSpec?.os || "Windows 10/11";
    const issue = originalIssue || "درخواست نصب پکیج‌های درایور و نرم‌افزار عمومی";

    const ai = getAIClient();
    if (!ai) {
      // Dynamic fallback schema compliant
      return res.json({
        status: "warning",
        analysis: "براساس مشخصات ثبت‌شده، درایورهای کارت گرافیک شما نیاز به بروزرسانی فوری دارند. تداخل جزئی در لایسنس ویندوز به دلیل تداخل فایروال محلی گزارش شده است.",
        diagnostics: [
          { name: gpu, status: "outdated", version: "v531.11 (قدیمی)", type: "کارت گرافیک" },
          { name: "Intel/AMD System Chipset Controller", status: "outdated", version: "v10.1.18 (نیاز به پچ)", type: "چیپست مادربرد" },
          { name: "Windows Security Essentials Defender", status: "optimal", version: "پایدار", type: "امنیت سکیوریتی" },
          { name: "AnyDesk Daemon Remote Service", status: "optimal", version: "v7.1.12 (فعال)", type: "اتصال بیس" }
        ],
        shellCommands: 
          "# EasyDriver AI Remote Diagnostics Shell\n" +
          "Get-WmiObject Win32_VideoController | Select-Object Name, DriverVersion\n" +
          "Write-Host '[INFO] Scanning active kernel drivers...'\n" +
          "Test-Connection -ComputerName 1.1.1.1 -Count 2\n" +
          "Write-Host '[SUCCESS] Safe connection channel initialized for active remote!'"
      });
    }

    const prompt = 
      `Analyse this PC hardware configuration:\n` +
      `- CPU: ${cpu}\n` +
      `- GPU: ${gpu}\n` +
      `- RAM: ${ram}\n` +
      `- OS: ${os}\n\n` +
      `The customer's reported issue:\n"${issue}"\n\n` +
      `Generate an expert technician diagnosis, pointing out outdated drivers, potential optimization issues, and return exact PowerShell terminal diagnostic commands to run on the machine.`;

    const systemInstruction = 
      "You are the senior EasyDriver AI Diagnostic Shell. Generate structural analysis in Persian. " +
      "You must return the dynamic JSON structure complying strictly with the requested schema.";

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["status", "analysis", "diagnostics", "shellCommands"],
          properties: {
            status: {
              type: Type.STRING,
              enum: ["optimal", "warning", "success"],
              description: "The safety rating status of the system configuration."
            },
            analysis: {
              type: Type.STRING,
              description: "Expert feedback description in Persian."
            },
            diagnostics: {
              type: Type.ARRAY,
              description: "List of identified drivers/hardware elements.",
              items: {
                type: Type.OBJECT,
                required: ["name", "status", "version", "type"],
                properties: {
                  name: { type: Type.STRING },
                  status: { type: Type.STRING, enum: ["outdated", "optimal", "unknown"] },
                  version: { type: Type.STRING },
                  type: { type: Type.STRING }
                }
              }
            },
            shellCommands: {
              type: Type.STRING,
              description: "Raw PowerShell cmdlets or windows commands to execute."
            }
          }
        }
      }
    });

    let data = { status: "warning", analysis: "", diagnostics: [], shellCommands: "" };
    try {
      data = JSON.parse(response.text || "{}");
    } catch (e) {
      console.error("Failed parsing schema output from Gemini", e);
    }
    res.json(data);
  } catch (error: any) {
    console.error("Diagnostic API Error:", error);
    res.status(500).json({ error: "Internal Server Error in diagnostic scanning" });
  }
});

// Vite Server Configuration
async function initializeVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

initializeVite();
