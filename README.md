# Chrome Tab Hopper by Domainhizmetleri

**Developer: Murat Tahtacı**

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285f4?style=for-the-badge&logo=googlechrome&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-34a853?style=for-the-badge)
![Version](https://img.shields.io/badge/Version-0.1-blue?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

A modern Chrome extension that automatically rotates through your open tabs. Inspired by the original **Revolver - Tabs** extension by Ben Hedrington, this project was built from the ground up with **Manifest V3** compatibility and a completely independent, modern design approach.

<img width="700" alt="image" src="https://github.com/user-attachments/assets/8508839c-7258-4ae4-895f-1e062fcde44e" />

--------------
Icons:
-
<img height="40" alt="image" src="https://github.com/user-attachments/assets/39bac548-e725-4b71-8a4e-26ad05b3c894" />
<img height="40" alt="image" src="https://github.com/user-attachments/assets/1c3b5030-0e84-4087-b73c-acd1401b4b60" />
<img height="40" alt="image" src="https://github.com/user-attachments/assets/c492e1a1-2d89-4473-a2c2-71fb276d55bc" />




## ✨ Features

### 🔄 Automatic Tab Rotation
- **Customizable timing**: Set display duration for each tab (1-300 seconds)
- **Global settings**: Default timing that applies to all tabs
- **Per-tab timing**: Override global settings for specific tabs
- **URL-based rules**: Set timing rules based on domain names

### 🎯 Smart Controls
- **Idle detection**: Only rotate when user is inactive (optional)
- **Selective reloading**: Choose which tabs to reload on switch
- **Auto-start**: Automatically begin rotation when browser starts
- **Manual override**: Start/stop rotation with extension icon

### 🌍 Multi-language Support
- **Turkish (Türkçe)**: Native language support
- **English**: Full English localization
- **Extensible**: Easy to add more languages

### 🎨 Modern UI
- **Responsive design**: Works perfectly on all screen sizes
- **Material Design**: Clean, modern interface
- **Color-coded icons**: Visual distinction for different settings
- **Real-time updates**: Settings apply immediately

## 🚀 Installation

### Manual Installation (Developer Mode)

1. **Download the extension**:
   ```bash
   git clone https://github.com/domainhizmetleri/chrome-extension-dh-tab-hopper.git
   cd chrome-extension-dh-tab-hopper
   ```

2. **Open Chrome Extension Management**:
   - Navigate to `chrome://extensions/`
   - Or go to Menu → More Tools → Extensions

3. **Enable Developer Mode**:
   - Toggle the "Developer mode" switch in the top right corner

4. **Load the extension**:
   - Click "Load unpacked"
   - Select the `chrome-extension-dh-tab-hopper` folder
   - The extension will appear in your extensions list

5. **Pin the extension** (optional):
   - Click the puzzle icon 🧩 in Chrome toolbar
   - Find "Chrome Tab Hopper by Domainhizmetleri"
   - Click the pin icon 📌 to keep it visible

## 📖 How to Use

### Basic Setup
1. **Click the extension icon** to start/stop tab rotation
2. **Right-click** and select "Options" to configure settings
3. **Set your preferred timing** in the "Seconds" field
4. **Choose additional options** as needed

### Configuration Options

#### ⏱️ Timing Settings
- **Default seconds**: Global display time for all tabs
- **Per-tab timing**: Set custom duration for specific tabs in the list below

#### 🔄 Reload Settings
- **Global reload**: Reload all tabs when switching
- **Selective reload**: Choose specific tabs to reload (overrides global setting)

#### 🎯 Behavior Settings
- **Auto start**: Begin rotation automatically when browser starts
- **Idle detection**: Only rotate when user hasn't interacted with browser for 15+ seconds

### Advanced Features

#### URL-Based Rules
The extension automatically detects similar tabs by domain and applies settings consistently:
- Timing rules apply to all tabs from the same domain
- Reload settings work across similar URLs
- Perfect for monitoring multiple pages from the same website

#### Smart Tab Management
- **Real-time tab detection**: Automatically includes new tabs
- **Dynamic updates**: Settings apply immediately without restart
- **State persistence**: Remembers your settings across browser sessions

## 🛠️ Technical Details

### Manifest V3 Compliance
Built specifically for Chrome's modern extension architecture:
- **Service Worker**: Background script uses modern service worker API
- **Permissions**: Minimal required permissions for security
- **Modern APIs**: Uses latest Chrome extension APIs

### Architecture
- **Background Service Worker**: Handles tab management and timing
- **Options Page**: Modern, responsive settings interface
- **Content Scripts**: Minimal footprint for maximum performance
- **Storage API**: Sync settings across devices (when signed in to Chrome)

### Browser Compatibility
- **Chrome**: Version 88+ (Manifest V3 support required)
- **Edge**: Chromium-based Edge with extension support
- **Other Chromium browsers**: May work with Manifest V3 support

## 🔧 Development

### Project Structure
```
chrome-extension-dh-tab-hopper/
├── manifest.json          # Extension manifest (V3)
├── background_script.js   # Service worker
├── plugin.js             # Core tab rotation logic
├── options.html          # Settings page
├── options_script.js     # Settings page logic
├── _locales/             # Internationalization
│   ├── en/messages.json  # English translations
│   └── tr/messages.json  # Turkish translations
└── icons/                # Extension icons
```

### Key Features Implementation
- **Idle Detection**: Uses Chrome's `chrome.idle` API
- **Tab Management**: Modern `chrome.tabs` API with V3 compatibility
- **Storage**: `chrome.storage.sync` for cross-device settings
- **Internationalization**: Full i18n support with `chrome.i18n`

## 🌟 Inspiration & Credits

This extension was inspired by the original **Revolver - Tabs** extension by **Ben Hedrington**. While maintaining the core concept of automatic tab rotation, this project represents a complete rewrite with:

- **Modern technology stack** (Manifest V3)
- **Independent codebase** built from scratch
- **Enhanced features** not available in the original
- **Contemporary UI/UX design** principles
- **Multi-language support** from day one

## 📝 Version History

### v0.1 (Current)
- ✅ Initial release with Manifest V3
- ✅ Multi-language support (Turkish/English)
- ✅ Modern responsive UI
- ✅ URL-based tab management
- ✅ Idle detection integration
- ✅ Per-tab timing controls

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

### Development Setup
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Developer**: [Murat Tahtacı - Domainhizmetleri.com](https://domainhizmetleri.com?utm_source=github&utm_medium=readme&utm_campaign=chrome_tab_hopper)
- **Issues**: [GitHub Issues](https://github.com/domainhizmetleri/chrome-extension-dh-tab-hopper/issues)
- **Latest Release**: [GitHub Releases](https://github.com/domainhizmetleri/chrome-extension-dh-tab-hopper/releases)

---

**Made with ❤️ by [Domainhizmetleri](https://domainhizmetleri.com)** 
