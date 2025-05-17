import { Bot, Context, InputFile } from "grammy";
    import dotenv from "dotenv";
    import fs from "fs";
    import ffmpeg from "fluent-ffmpeg";
    import { fetch } from "undici";
    import { pipeline } from "stream";
    import { promisify } from "util";
    import path from "path";
    import express from "express";
    import { MongoClient } from "mongodb";

    dotenv.config();

    const app = express();
    const PORT = process.env.PORT || 3000;

    app.get("/", (req, res) => {
    res.send("Bot ishlayapti!");
    });

    app.listen(PORT, () => {
    console.log(`Server portda tinglanmoqda: ${PORT}`);
    });

    const pipelineAsync = promisify(pipeline);
    const outputDir = "output";
    const MAX_DURATION = 60; // sekund

    // MongoDB sozlamalari
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
    const client = new MongoClient(uri);
    const dbName = "audioToVoiceBot";
    const userStatsCollection = "userStats";

    // MongoDBga ulanish
    async function connectDb() {
        await client.connect();
    }

    // Foydalanuvchini saqlash
    async function saveUserStats(userId: number, firstName: string, username: string | undefined) {
        await connectDb();
        const db = client.db(dbName);
        const collection = db.collection(userStatsCollection);

        const userStats = {
            userId,
            firstName,
            username,
        };

        await collection.updateOne(
            { userId },
            { $set: userStats },
            { upsert: true }
        );
    }

    // Barcha foydalanuvchilarni olish
    async function getUserStats() {
        await connectDb();
        const db = client.db(dbName);
        const collection = db.collection(userStatsCollection);

        return await collection.find({}).toArray();
    }

    // Papkalarni tekshirish yoki yaratish
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    const BOT_OWNER_ID = process.env.BOT_OWNER_ID;
    const bot = new Bot(process.env.TOKEN!);

    // Oddiy reply helper
    const reply = async (ctx: Context, text: string) => {
        try {
            await ctx.reply(text, { parse_mode: "Markdown" });
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
                .on("error", reject)
                .save(outputPath);
        });
    };

    function escapeMarkdown(text: string = ""): string {
        return text
            .replace(/_/g, "\\_")
            .replace(/\*/g, "\\*")
            .replace(/\[/g, "\\[")
            .replace(/`/g, "\\`")
            .replace(/\(/g, "\\(")
            .replace(/\)/g, "\\)");
    }

    // /start komandasi
    bot.command("start", async (ctx) => {
        const userId = ctx.from?.id;
        const firstName = ctx.from?.first_name;
        const username = ctx.from?.username;

        if (userId && firstName) {
            await saveUserStats(userId, firstName, username);
        }

        await reply(ctx,
            `👋 Salom, ${firstName}!\n\n` +
            `🎧 Menga *audio fayl* yuboring — men uni ovozli xabar shaklida qaytaraman.\n` +
            `⏱ 1 daqiqadan uzun bo‘lsa, faqat birinchi 60 soniyasi olinadi.\n\n` +
            `Made by - [Sodiq](https://t.me/sodops)`
        );
    });

    // /help komandasi
    bot.command("help", async (ctx) => {
        await reply(ctx,
            `ℹ️ *Yordam:*\n\n` +
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
            const users = await getUserStats();
            const allUsers = users
                .map((user: any) =>
                    `🆔 ${user.userId} | 👤 ${escapeMarkdown(user.firstName)} (${escapeMarkdown(user.username) || "N/A"})`
                )
                .join("\n");

            await reply(ctx, `📊 Barcha foydalanuvchilar ro‘yxati:\n\n${allUsers}`);
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

        await reply(ctx, "✅ Audio qabul qilindi. Iltimos, kuting...");

        try {
            const file = await ctx.api.getFile(fileId);
            const fileUrl = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;
            const timestamp = Date.now();
            const tempPath = path.join(outputDir, `${fileId}_${timestamp}.mp3`);
            const trimmedPath = path.join(outputDir, `${fileId}_${timestamp}_trimmed.oga`);

            const res = await fetch(fileUrl);
            if (!res.ok || !res.body) throw new Error("Audio faylni yuklab bo‘lmadi.");

            await pipelineAsync(res.body, fs.createWriteStream(tempPath));

            if (audio.duration > MAX_DURATION) {
                await reply(ctx, "⚠️ Audio 60 soniyadan uzun edi. Faqat birinchi qismini yuboraman.");
            }

            await trimAudio(tempPath, trimmedPath, MAX_DURATION);

            await ctx.replyWithVoice(new InputFile(trimmedPath), { caption });

            // Tozalash
            [tempPath, trimmedPath].forEach((file) =>
                fs.unlink(file, (err) => {
                    if (err) console.warn("Faylni o‘chirishda xatolik:", file);
                })
            );
        } catch (err) {
            console.error("❌ Audio ishlovida xatolik:", err);
            await reply(ctx, "⚠️ Xatolik yuz berdi. Iltimos, keyinroq urinib ko‘ring.");
        }
    });

    // Voice yuborsa eslatma
    bot.on("message:voice", async (ctx) => {
        await reply(ctx, "📢 Iltimos, voice emas, *audio fayl* yuboring.");
    });

    // Boshqa har qanday xabar uchun
    bot.on("message", async (ctx) => {
        if (!ctx.message.audio) {
            await reply(ctx, "📩 Faqat audio fayl yuboring.");
        }
    });

    // Toza yopish
    process.once("SIGINT", async () => {
        await client.close();
        bot.stop();
    });
    process.once("SIGTERM", async () => {
        await client.close();
        bot.stop();
    });

    // Botni ishga tushurish
    bot.start();
