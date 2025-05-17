# Audio to Voice Converter Bot

## Bot haqida
Ushbu Telegram boti foydalanuvchilar yuborgan ovozli xabarlarni (OGG formatida) MP3 formatiga aylantirib, ularga qaytaradi. Shuningdek, bot foydalanuvchi statistikasini saqlaydi va adminlar uchun statistikani ko‘rsatadi.

## Imkoniyatlar
- Ovozli xabarlarni OGG dan MP3 ga aylantirish.
- Foydalanuvchi ma’lumotlarini (ism, username) saqlash.
- Adminlar uchun `/stats` buyrug‘i orqali statistikani ko‘rish.

## O‘rnatish

### Talablar
- Node.js (v16 yoki undan yuqori)
- FFmpeg

### Qadamlar
1. Repozitoriyani klonlash:
   ```
   git clone https://github.com/username/audio-to-voice-converter-bot.git
   cd audio-to-voice-converter-bot
   ```

2. Bog‘liqliklarni o‘rnatish:
   ```
   npm install
   ```

3. Muhit sozlamalari:
   - `.env` faylini yarating va Telegram bot tokenini qo‘shing:
     ```
     BOT_TOKEN=your_bot_token_here
     ```
   - Tokenni Telegram’dagi @BotFather orqali olishingiz mumkin.

4. Botni ishga tushirish:
   ```
   npm run dev
   ```

## Foydalanish

### Oddiy foydalanuvchilar uchun
- Botga ovozli xabar yuboring, u MP3 formatida qaytariladi.

### Adminlar uchun
- `/stats` buyrug‘i yordamida barcha foydalanuvchilar statistikasini ko‘ring. Admin huquqlari faqat `6984554888` ID ga ega foydalanuvchi uchun mavjud.

## Xatolarni bartaraf qilish
- **FFmpeg topilmadi**: FFmpeg o‘rnatilganligiga ishonch hosil qiling.
- **TypeScript xatolari**: `npm install` orqali barcha bog‘liqliklarni yangilang.
- **Bot javob bermayapti**: `.env` faylidagi token to‘g‘ri ekanligini tekshiring.

## Hissa qo‘shish
1. Repozitoriyani fork qiling.
2. Yangi branch yarating:
   ```
   git checkout -b feature/your-feature
   ```
3. O‘zgarishlarni commit qiling:
   ```
   git commit -m "Add your feature"
   ```
4. Push qiling:
   ```
   git push origin feature/your-feature
   ```
5. Pull request oching.

## Litsenziya
MIT Litsenziyasi ostida tarqatiladi. Batafsil ma’lumot uchun LICENSE faylini ko‘ring.

---

# Audio to Voice Converter Bot

## About the Bot
This Telegram bot converts voice messages (in OGG format) sent by users into MP3 format and sends them back. Additionally, it stores user statistics and provides admin access to view these statistics.

## Features
- Converts voice messages from OGG to MP3.
- Stores user information (first name, username).
- Allows admins to view user statistics via the `/stats` command.

## Installation

### Prerequisites
- Node.js (v16 or higher)
- FFmpeg

### Steps
1. Clone the repository:
   ```
   git clone https://github.com/username/audio-to-voice-converter-bot.git
   cd audio-to-voice-converter-bot
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables:
   - Create a `.env` file and add your Telegram bot token:
     ```
     BOT_TOKEN=your_bot_token_here
     ```
   - Obtain the token from Telegram’s @BotFather.

4. Run the bot:
   ```
   npm run dev
   ```

## Usage

### For Regular Users
- Send a voice message to the bot, and it will return the message in MP3 format.

### For Admins
- Use the `/stats` command to view statistics of all users. Admin privileges are restricted to the user with ID `6984554888`.

## Troubleshooting
- **FFmpeg not found**: Ensure FFmpeg is installed.
- **TypeScript errors**: Run `npm install` to update dependencies.
- **Bot not responding**: Verify the token in the `.env` file is correct.

## Contributing
1. Fork the repository.
2. Create a new branch:
   ```
   git checkout -b feature/your-feature
   ```
3. Commit your changes:
   ```
   git commit -m "Add your feature"
   ```
4. Push to the branch:
   ```
   git push origin feature/your-feature
   ```
5. Open a pull request.

## License
Distributed under the MIT License. See LICENSE for more information.
