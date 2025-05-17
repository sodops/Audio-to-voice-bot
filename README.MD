# Audio to Voice Converter Bot

## O‘zbekcha

### Bot haqida
Ushbu Telegram boti foydalanuvchilar yuborgan ovozli xabarlarni (OGG formatida) MP3 formatiga aylantirib, ularga qaytaradi. Shuningdek, bot foydalanuvchi statistikasini saqlaydi va adminlar uchun statistika ma’lumotlarini ko‘rsatadi.

### Imkoniyatlar
- Ovozli xabarlarni OGG dan MP3 ga aylantirish.
- Foydalanuvchi ma’lumotlarini (ism, username) saqlash.
- Adminlar uchun `/stats` buyrug‘i orqali statistikani ko‘rish.

### O‘rnatish
1. **Node.js va FFmpeg o‘rnatish**:
   - Node.js (v16 yoki undan yuqori) o‘rnating: [Node.js rasmiy sayti](https://nodejs.org/).
   - FFmpeg o‘rnating:
     ```bash
     sudo apt-get install ffmpeg
     ```
2. **Repozitoriyani klonlash**:
   ```bash
   git clone https://github.com/username/audio-to-voice-converter-bot.git
   cd audio-to-voice-converter-bot
