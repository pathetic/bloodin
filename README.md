<img src="/src/assets/appicon.png" alt="logo" title="bloodin" align="right" height="60px" />

# Bloodin

A beautiful, modern desktop music player client for Jellyfin servers built with Tauri, React, and Rust.

![Bloodin Music Player](https://img.shields.io/badge/Version-wip-blue?style=for-the-badge)
![Tauri](https://img.shields.io/badge/Tauri-2.x-orange?style=for-the-badge&logo=tauri)
![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?style=for-the-badge&logo=typescript)
![Rust](https://img.shields.io/badge/Rust-Latest-orange?style=for-the-badge&logo=rust)

## ✨ Features

- 🎶 **High-quality audio playback** with fullscreen player
- 📚 **Complete library browsing** - songs, albums, artists
- 🔍 **Smart search** with animated glassmorphism UI
- 🎨 **Modern interface** with multiple DaisyUI themes
- ⚡ **Rust performance** - fast, efficient, cross-platform

## 📸 Screenshots

![Bloodin Home Page](/images/preview.png)

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Rust](https://rustup.rs/) (latest stable)
- [Tauri CLI](https://tauri.app/v1/guides/getting-started/prerequisites/)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/bloodin.git
   cd bloodin
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Run in development mode**

   ```bash
   npm run tauri dev
   ```

4. **Build for production**
   ```bash
   npm run tauri build
   ```

### Connecting to Jellyfin

1. Launch Bloodin
2. Enter your Jellyfin server details:
   - **Server URL**: Your Jellyfin server address (e.g., `http://192.168.1.100:8096`)
   - **Username**: Your Jellyfin username
   - **Password**: Your Jellyfin password
3. Click "Connect" and start enjoying your music!

## 🛠️ Technology Stack

### Frontend

- **[React 18](https://react.dev/)** - Modern React with hooks and TypeScript
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript development
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[DaisyUI](https://daisyui.com/)** - Beautiful UI components
- **[React Router](https://reactrouter.com/)** - Client-side routing
- **[Tabler Icons](https://tabler-icons.io/)** - Beautiful SVG icons

### Backend

- **[Rust](https://www.rust-lang.org/)** - Systems programming language for performance
- **[Tauri](https://tauri.app/)** - Desktop app framework
- **[Rodio](https://github.com/RustAudio/rodio)** with **[Symphonia](https://github.com/pdeljanov/Symphonia)** - High-quality audio playback and decoding
- **Jellyfin API** - Music library and streaming integration

## 📁 Project Structure

```
bloodin/
├── src/                      # Frontend source code
│   ├── components/           # React components
│   │   ├── TitleBar.tsx     # Custom window title bar
│   │   ├── SearchBar.tsx    # Animated search component
│   │   ├── Sidebar.tsx      # Navigation sidebar
│   │   ├── PlayerBar/       # Music player controls
│   │   └── ...
│   ├── pages/               # Application pages
│   │   ├── HomePage.tsx     # Main dashboard
│   │   ├── LoginPage.tsx    # Jellyfin connection
│   │   ├── SongsPage.tsx    # Songs browser
│   │   └── ...
│   ├── hooks/               # Custom React hooks
│   ├── contexts/            # React context providers
│   ├── services/            # API and service layers
│   └── types/               # TypeScript type definitions
├── src-tauri/               # Rust backend
│   ├── src/                 # Rust source code
│   └── tauri.conf.json      # Tauri configuration
├── public/                  # Static assets
└── dist/                    # Built application
```

## 🎨 Theming

Bloodin supports all DaisyUI themes, allowing you to customize the interface to your preference.

## 🔧 Development

### Available Scripts

- `npm run dev` - Start Vite development server
- `npm run build` - Build frontend for production
- `npm run preview` - Preview production build
- `npm run tauri dev` - Run Tauri in development mode
- `npm run tauri build` - Build Tauri application

### Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📋 Roadmap

- [x] Core UI and Authentication
- [x] Music Library Browsing
- [x] Audio Playback Engine
- [x] Offline Caching
- [ ] Better Queue Management (WIP)
- [ ] Advanced Search & Filters (WIP)
- [ ] Playlist Management (WIP)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Jellyfin](https://jellyfin.org/) - The amazing open-source media server
- [Tauri](https://tauri.app/) - Secure, fast, and lightweight desktop apps
- [DaisyUI](https://daisyui.com/) - Beautiful component library
- [Tabler Icons](https://tabler-icons.io/) - Gorgeous icon set

---

<div align="center">
  <strong>Built with ❤️ for music lovers everywhere</strong>
</div>
