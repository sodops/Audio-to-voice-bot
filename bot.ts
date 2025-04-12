import { Bot, Context, InputFile } from "grammy";
import dotenv from "dotenv";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import fetch from "node-fetch";
import { pipeline } from "stream";
import { promisify } from "util";

dotenv.config();

const pipelineAsync = promisify(pipeline);
const outputDir = "output";
const MAX_DURATION = 60; // Telegram voice message limit (60s)

// Papka mavjudligini tekshirish yoki yaratish
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

const userStatsFile = "user_stats.json"; // Statistika saqlanadigan fayl

// Statistika saqlash
const saveUserStats = (userId: number, firstName: string, username: string | undefined) => {
    const userStats = fs.existsSync(userStatsFile)
        ? JSON.parse(fs.readFileSync(userStatsFile, "utf-8"))
        : {};

    // Foydalanuvchi ma'lumotlarini qo'shish yoki yangilash
    userStats[userId] = { firstName, username };

    // Faylga saqlash
    fs.writeFileSync(userStatsFile, JSON.stringify(userStats, null, 2));
};

// Bot egasi ID sini .env faylidan olish
const BOT_OWNER_ID = process.env.BOT_OWNER_ID;

// Bot yaratish
// @ts-ignore
const bot = new Bot(process.env.TOKEN);

// Oddiy javob yozuvchi funksiya
const reply = async (ctx: Context, text: string) => {
    try {
        await ctx.reply(text, { parse_mode: "Markdown" });
    } catch (err) {
        console.error("Javob berishda xatolik:", err);
    }
};

// Audio faylni kesish (1 daqiqagacha)
const trimAudio = (inputPath: string, outputPath: string, duration: number): Promise<void> => {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .setStartTime(0)
            .duration(duration)
            .audioChannels(1) // Yagona kanal (mono)
            .audioFrequency(48000) // 48kHz
            .audioCodec("libopus")
            .audioBitrate("64k") // Bitrate balansli
            .format("oga")
            .on("end", () => resolve())
            .on("error", reject)
            .save(outputPath);
    });
};
// Botga /start komandasi
bot.command("start", async (ctx) => {
    const userId = ctx.from?.id;
    const firstName = ctx.from?.first_name;
    const username = ctx.from?.username;

    if (userId && firstName) {
        // Statistika saqlash
        saveUserStats(userId, firstName, username);
    }

    await reply(ctx,
        `👋 Salom, ${ctx.from?.first_name || "foydalanuvchi"}!\n\n` +
        `🎧 Menga audio fayl yuboring — men uni ovozli xabar shaklida qaytaraman!\n` +
        `⏱ Agar audio 1 daqiqadan uzun bo‘lsa, faqat 1 daqiqalik qismi yuboriladi.\n\n` +
        `Made by - [Sodiq](t.me/sodiqqq)`
    );
});

// Faqat bot egasi uchun /stats komandasini qo‘shish
bot.command("stats", async (ctx) => {
    const userId = ctx.from?.id;

    if (!userId) {
        await reply(ctx, "❌ Sizning identifikatsiyangizni olishda xatolik yuz berdi.");
        return;
    }

    // Faqat bot egasi uchun
    if (userId.toString() !== BOT_OWNER_ID) {
        await reply(ctx, "❌ Bu buyruq faqat bot egasi uchun mavjud.");
        return;
    }

    try {
        // Statistika faylini o‘qish
        const userStats = fs.existsSync(userStatsFile)
            ? JSON.parse(fs.readFileSync(userStatsFile, "utf-8"))
            : {};

        // Foydalanuvchi statistikasi mavjudligini tekshirish
        const user = userStats[userId];
        if (user) {
            await reply(ctx, 
                `🔍 Foydalanuvchi Statistikasi:\n` +
                `👤 Ism: ${user.firstName}\n` +
                `📱 Username: ${user.username || "N/A"}`
            );
        } else {
            await reply(ctx, "⚠️ Sizning statistikangiz mavjud emas.");
        }
    } catch (err) {
        console.error("❌ Xatolik:", err);
        await reply(ctx, "⚠️ Statistikani olishda xatolik yuz berdi.");
    }
});

// Asosiy audio ishlov berish (faqat audio fayllarni qabul qilish)
bot.on("message:audio", async (ctx) => {
    const audio = ctx.message.audio;
    const caption = ctx.message.caption || "";
    const fileId = audio.file_id;

    await reply(ctx, "✅ Audio qabul qilindi. Iltimos kuting, ishlov berilmoqda...");

    try {
        const file = await ctx.api.getFile(fileId);
        if (!file.file_path) throw new Error("Fayl yo‘li topilmadi.");

        const fileUrl = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;
        const tempPath = `${outputDir}/${fileId}.mp3`;
        const trimmedPath = `${outputDir}/${fileId}_trimmed.oga`;

        const response = await fetch(fileUrl);
        if (!response.ok || !response.body) {
            throw new Error("Faylni yuklab olishda xatolik.");
        }

        // Yuklab olish
        await pipelineAsync(response.body, fs.createWriteStream(tempPath));

        // Trim qilish
        const isLong = audio.duration > MAX_DURATION;
        if (isLong) {
            await reply(ctx, "⚠️ Audio 1 daqiqadan uzun. Faqat 60 soniyalik qism yuboriladi.");
        }

        await trimAudio(tempPath, trimmedPath, MAX_DURATION);

        // Ovozli habar sifatida qaytarish
        await ctx.replyWithVoice(new InputFile(trimmedPath), { caption });

        // Tozalash
        [tempPath, trimmedPath].forEach((path) => {
            fs.unlink(path, (err) => {
                if (err) console.warn("Faylni o‘chirishda xatolik:", path, err);
            });
        });

    } catch (err) {
        console.error("❌ Xatolik:", err);
        await reply(ctx, "⚠️ Nimadadir xatolik yuz berdi. Iltimos, keyinroq qayta urinib ko‘ring.");
    }
});

// Faqat audio qabul qilinmasa
bot.on("message", async (ctx) => {
    // Komanda bo‘lmagan boshqa xabarlar uchun faqat audio kutiladi
    if (!ctx.message.audio) {
        await reply(ctx, "🚫 Iltimos, menga audio fayl yuboring.");
    }
});

// Botni ishga tushurish
bot.start();