# OpenChat - Real-time Public Chat Application

A modern, minimal, real-time web chat application built with React.js, Vite, Tailwind CSS, and Supabase. This is a public chat room where users can send text messages, voice recordings, and images without requiring authentication.

## ✨ Features

- **No Authentication Required**: Users enter a nickname and start chatting immediately
- **Unique Nicknames**: System ensures nickname uniqueness across users
- **Cross-Device Access**: Users can access their account from any device using their User ID
- **Real-time Messaging**: Messages appear instantly using Supabase Realtime
- **Multi-media Support**: Send text, voice recordings, and images
- **Auto-deletion**: Messages automatically delete after 24 hours
- **Privacy Protection**: Only first 2 letters of nicknames are shown to other users
- **Modern UI**: Clean, responsive design with dark mode support
- **Mobile Friendly**: Fully responsive design for all screen sizes

## 🚀 Tech Stack

- **Frontend**: React.js with Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (Database, Storage, Realtime)
- **Audio Recording**: MediaRecorder API
- **File Upload**: Image compression and optimization
- **Icons**: React Icons (Font Awesome)

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/openchat.git
   cd openchat
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url_here
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```

4. **Set up Supabase Database**
   
   Run the following SQL in your Supabase SQL editor:
   ```sql
   -- Create users table
   CREATE TABLE users (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     nickname text NOT NULL UNIQUE,
     created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
     last_active timestamp with time zone DEFAULT timezone('utc'::text, now())
   );

   -- Create messages table
   CREATE TABLE messages (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     nickname text NOT NULL,
     content text,
     image_url text,
     audio_url text,
     user_id uuid REFERENCES users(id),
     created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
   );

   -- Enable RLS
   ALTER TABLE users ENABLE ROW LEVEL SECURITY;
   ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

   -- Create policies for users table
   CREATE POLICY "Allow anonymous read users" ON users
     FOR SELECT TO anon USING (true);

   CREATE POLICY "Allow anonymous insert users" ON users
     FOR INSERT TO anon WITH CHECK (true);

   CREATE POLICY "Allow anonymous update users" ON users
     FOR UPDATE TO anon USING (true);

   -- Create policies for messages table
   CREATE POLICY "Allow anonymous read messages" ON messages
     FOR SELECT TO anon USING (true);

   CREATE POLICY "Allow anonymous insert messages" ON messages
     FOR INSERT TO anon WITH CHECK (true);

   -- Grant permissions
   GRANT SELECT, INSERT, UPDATE ON users TO anon;
   GRANT SELECT, INSERT ON messages TO anon;
   ```

5. **Set up Supabase Storage**
   
   Create a storage bucket named `chat-files` in your Supabase dashboard and set it to public, or run:
   ```sql
   -- Create storage bucket
   INSERT INTO storage.buckets (id, name, public)
   VALUES ('chat-files', 'chat-files', true);

   -- Create storage policies
   CREATE POLICY "Allow anonymous read" ON storage.objects
     FOR SELECT TO anon USING (bucket_id = 'chat-files');

   CREATE POLICY "Allow anonymous upload" ON storage.objects
     FOR INSERT TO anon WITH CHECK (bucket_id = 'chat-files');
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

## 🎯 Usage

1. **First Visit**: Enter a unique nickname to create your account
2. **Account Recovery**: Save your User ID to access your account from other devices
3. **Messaging**: Send text messages, upload images, or record voice messages
4. **Privacy**: Your full nickname is only visible to you; others see just the first 2 letters

## 🔐 Security Features

- **Row-Level Security (RLS)**: Enabled on all database tables
- **Environment Variables**: Sensitive credentials stored in `.env` file
- **Anonymous Access**: No personal information required
- **File Size Limits**: Images limited to 1MB, audio optimized for web
- **Rate Limiting**: 3-second cooldown between messages

## 🌐 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Netlify

1. Build the project: `npm run build`
2. Deploy the `dist` folder to Netlify
3. Set environment variables in Netlify dashboard

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── AudioRecorder.jsx
│   ├── ChatBox.jsx
│   ├── MessageBubble.jsx
│   ├── MessageInput.jsx
│   ├── NicknameSetup.jsx
│   └── UserProfile.jsx
├── lib/                 # External service configurations
│   └── supabase.js
├── utils/               # Utility functions
│   ├── storage.js
│   └── userManager.js
├── App.jsx             # Main application component
├── main.jsx            # Application entry point
└── index.css           # Global styles
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Supabase](https://supabase.com/) for the amazing backend-as-a-service
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework
- [React Icons](https://react-icons.github.io/react-icons/) for the beautiful icons
- [Vite](https://vitejs.dev/) for the fast build tool

## 📞 Support

If you have any questions or need help, please open an issue on GitHub.

---

Made with ❤️ by [Your Name]
