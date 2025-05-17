import { Bot, Context, InputFile } from "grammy";
import { ratelimiter } from "@grammyjs/ratelimiter";
import dotenv from "dotenv";
import fsPromises from "fs/promises"; // Renamed to avoid confusion
import { createWriteStream } from "fs"; // Import createWriteStream from fs
import ffmpeg from "fluent-ffmpeg";
import { fetch } from "undici";
import { pipeline } from "stream";
import { promisify } from "util";
import path from "path";

dotenv.config();

// Environment variable validation
if (!process.env.TOKEN || !process.env.BOT_OWNER_ID) {
    console.error("TOKEN yoki BOT_OWNER_ID env o‘zgaruvchilari topilmadi!");
    process.exit(1);
}

const pipelineAsync = promisify(pipeline);
const outputDir = "output";
const userStatsFile = "user_stats.json";
const MAX_DURATION = 60; // sekund

// User stats interface
interface UserStats {
    [userId: string]: { firstName: string; username?: string };
}

// Papkalarni tekshirish yoki yaratish
const initializeFiles = async () => {
    try {
        await fsPromises.mkdir(outputDir, { recursive: true });
        try {
            await fsPromises.access(userStatsFile);
        } catch {
            await fsPromises.writeFile(userStatsFile, "{}");
        }
    } catch (err) {
        console.error("Papka/fayl yaratishda xatolik:", err);
        process.exit(1);
    }
};

// Statistika saqlash
const saveUserStats = async (userId: number, firstName: string, username: string | undefined) => {
    try {
        const userStats: UserStats = JSON.parse(await fsPromises.readFile(userStatsFile, "utf-8"));
        userStats[userId] = { firstName, username };
        await fsPromises.writeFile(userStatsFile, JSON.stringify(userStats, null, 2));
    } catch (err) {
        console.error("Statistikani saqlashda xatolik:", err);
    }
};

const BOT_OWNER_ID = process.env.BOT_OWNER_ID;
const bot = new Bot(process.env.TOKEN!);

// Rate limiting
bot.use(ratelimiter({ timeFrame: 60000, limit: 5 }));

// Oddiy reply helper
const reply = async (ctx: Context, text: string) => {
    try {
        await ctx.reply(text, { parse_mode: "HTML" });
    } catch (err) {
        console.error("Javob berishda xatolik:", err);
    }
};

// Audio faylni kesish va oga formatga o‘tkazish
const trimAudio = (inputPath: string, outputPath: string, duration: number): Promise<void> => {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .setStartTime(0)
            .duration(duration)
            .audioChannels(1)
            .audioFrequency(48000)
            .audioCodec("libopus")
            .audioBitrate("64k")
            .format("oga")
            .on("end", () => resolve())
            .on("error", (err: Error) => reject(new Error(`Audio konvertatsiyasida xatolik: ${err.message}`)))
            .save(outputPath);
    });
};

// /start komandasi
bot.command("start", async (ctx) => {
    const userId = ctx.from?.id;
    const firstName = ctx.from?.first_name;
    const username = ctx.from?.username;

    if (userId && firstName) {
        await saveUserStats(userId, firstName, username);
    }

    await reply(ctx,
        `👋 Salom, <b>${firstName}</b>!\n\n` +
        `🎧 Menga <i>audio fayl</i> yuboring — men uni ovozli xabar shaklida qaytaraman.\n` +
        `⏱ 1 daqiqadan uzun bo‘lsa, faqat birinchi 60 soniyasi olinadi.\n\n` +
        `Made by - <a href="https://t.me/sodops">Sodiq</a>`
    );
});

// /help komandasi
bot.command("help", async (ctx) => {
    await reply(ctx,
        `ℹ️ <b>Yordam:</b>\n\n` +
        `📤 Menga audio fayl yuboring — men uni ovozli xabar shaklida qaytaraman.\n` +
        `⏱ Maksimal 60 sekundlik qismi olinadi.\n`
    );
});

// /stats — faqat bot egasiga
bot.command("stats", async (ctx) => {
    const userId = ctx.from?.id?.toString();

    if (userId !== BOT_OWNER_ID) {
        return reply(ctx, "❌ Bu buyruq faqat bot egasi uchun.");
    }

    try {
        const userStats: UserStats = JSON.parse(await fsPromises.readFile(userStatsFile, "utf-8"));
        const allUsers = Object.entries(userStats)
            .map(([id, user]) => `🆔 ${id} | 👤 ${user.firstName} (${user.username || "N/A"})`)
            .join("\n");

        await reply(ctx, `📊 <b>Barcha foydalanuvchilar ro‘yxati:</b>\n\n${allUsers || "Hech qanday foydalanuvchi yo‘q."}`);
    } catch (err) {
        console.error("Statistika xatoligi:", err);
        await reply(ctx, "⚠️ Statistikani o‘qishda xatolik yuz berdi.");
    }
});

// Audio fayl kelganda ishlov berish
bot.on("message:audio", async (ctx) => {
    const audio = ctx.message.audio;
    const fileId = audio.file_id;
    const caption = ctx.message.caption || "";

    if (audio.duration > MAX_DURATION) {
        await reply(ctx, "⚠️ Audio 60 soniyadan uzun. Faqat birinchi qismini yuboraman.");
    }

    await reply(ctx, "✅ Audio qabul qilindi. Iltimos, kuting...");

    let tempPath = "";
    let trimmedPath = "";
    try {
        const file = await ctx.api.getFile(fileId);
        const fileUrl = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;
        const timestamp = Date.now();
        tempPath = path.join(outputDir, `${fileId}_${timestamp}.mp3`);
        trimmedPath = path.join(outputDir, `${fileId}_${timestamp}_trimmed.oga`);

        const res = await fetch(fileUrl);
        if (!res.ok) throw new Error(`Audio faylni yuklab bo‘lmadi: ${res.status}`);
        if (!res.body) throw new Error("Response body yo‘q");

        await pipelineAsync(res.body, createWriteStream(tempPath));
        await trimAudio(tempPath, trimmedPath, MAX_DURATION);

        await ctx.replyWithVoice(new InputFile(trimmedPath), { caption });
    } catch (err: Error) {
        console.error("❌ Audio ishlovida xatolik:", err);
        await reply(ctx, `⚠️ Xatolik yuz berdi: ${err.message}. Iltimos, keyinroq urinib ko‘ring.`);
    } finally {
        // Tozalash
        await Promise.all(
            [tempPath, trimmedPath]
                .filter(file => file) // Faqat bo‘sh bo‘lmagan fayllarni o‘chirish
                .map(file => fsPromises.unlink(file).catch((err: Error) => console.warn("Faylni o‘chirishda xatolik:", file, err)))
        );
    }
});

// Voice yuborsa eslatma
bot.on("message:voice", async (ctx) => {
    await reply(ctx, "📢 Iltimos, voice emas, <i>audio fayl</i> yuboring.");
});

// Boshqa har qanday xabar uchun
bot.on("message", async (ctx) => {
    if (!ctx.message.audio) {
        await reply(ctx, "📩 Faqat audio fayl yuboring.");
    }
});

// Toza yopish
process.once("SIGINT", () => bot.stop());
process.once("SIGTERM", () => bot.stop());

// Keep-alive with retry
const keepAlive = async () => {
    try {
        await fetch("https://audio-to-voice-bot.onrender.com");
    } catch (err) {
        console.warn("Keep-alive xatosi:", err);
    }
};

// Botni ishga tushurish
const startBot = async () => {
    await initializeFiles();
    bot.start();
    setInterval(keepAlive, 5 * 60 * 1000); // Har 5 daqiqa
};

startBot().catch(err => {
    console.error("Botni ishga tushirishda xatolik:", err);
    process.exit(1);
});
