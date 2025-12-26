# Task Time Tracker

[![Jest tests & linter checks](https://github.com/MisterGoodDeal/task-time-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/MisterGoodDeal/task-time-tracker/actions/workflows/ci.yml)
[![VS Code Marketplace](https://img.shields.io/badge/VS%20Code-Marketplace-blue)](https://marketplace.visualstudio.com/items?itemName=MisterGoodDeal.task-time-tracker)

A powerful Visual Studio Code extension for tracking time spent on tasks directly from your Git branches. Automatically detect ticket IDs from branch names and track your work time with precision.

![Task Time Tracker](https://github.com/MisterGoodDeal/task-time-tracker/blob/main/images/Capture%20d%E2%80%99%C3%A9cran%202025-12-26%20%C3%A0%2001.56.04.png?raw=true)

📦 **[Install from VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=MisterGoodDeal.task-time-tracker)**

## ✨ Features

### 🎯 Automatic Ticket Detection

- Automatically extracts ticket IDs from Git branch names (e.g., `feat/GDD-750_my-feature`)
- Supports multiple ticket prefix patterns (configurable)
- Works with any ticket system (Jira, GitHub Issues, Linear, etc.)

### ⏱️ Time Tracking

- **Precise time calculation** in days with configurable increments (0.1, 0.2, 0.5, 1, etc.)
- **Detailed time breakdown** showing days, hours, minutes, and seconds spent on each ticket
- **Multiple work sessions** support with automatic pause/resume
- **Real-time tracking** for active tickets with live time updates
- **Configurable working hours** (24h or 12h format)
- **Customizable time increment** for rounding (default: 0.5 days)
- Automatic time calculation based on configured work hours
- **Smart period merging** to avoid double-counting overlapping work periods

![Time tracking](https://github.com/MisterGoodDeal/task-time-tracker/blob/main/images/Capture%20d%E2%80%99%C3%A9cran%202025-12-26%20%C3%A0%2001.47.22.png?raw=true)

### 🔄 Smart Branch Management

- **Automatic pause** of active tickets when switching branches
- **Automatic resume** of tracking when switching to a tracked ticket's branch
- **One-click branch checkout** by double-clicking on a tracked ticket

### 📊 Visual Interface

- Custom panel in Source Control view
- **Current branch display** with ticket information
- **Collapsible monthly tracking** sections
- **Visual indicators** for ticket status:
  - ☕ Coffee icon: Completed/Paused tickets
  - ✏️ Edit session icon: Active tickets
- **Quick settings** panel showing current configuration

### 📤 Export to Spreadsheet

- **Export monthly tracking** to spreadsheet files
- **Multiple formats** supported:
  - XLSX (Excel)
  - ODS (OpenDocument Spreadsheet)
  - CSV (Comma-separated values)
- **Configurable output path** for exported files
- **Automatic file opening** with configured application (optional)
- **Comprehensive data** including:
  - Ticket ID and branch name
  - Author information
  - Time spent (days and detailed breakdown)
  - Status and completion date

![Spreadsheet config](https://github.com/MisterGoodDeal/task-time-tracker/blob/main/images/Capture%20d%E2%80%99%C3%A9cran%202025-12-26%20%C3%A0%2001.45.27.png?raw=true)

### 🎨 User Experience

- **Quick actions** directly from the panel:
  - Add ticket to tracking
  - Remove ticket from tracking
  - Mark ticket as completed
  - Resume paused ticket
  - Delete ticket
  - Open ticket in browser
  - Checkout associated branch
  - Export month to spreadsheet
- **Real-time updates** when Git branch changes
- **Automatic refresh** every minute for active tickets
  ![Language](https://github.com/MisterGoodDeal/task-time-tracker/blob/main/images/Capture%20d%E2%80%99%C3%A9cran%202025-12-26%20%C3%A0%2001.46.33.png?raw=true)

### ⚙️ Configuration

- **Ticket base URL**: Configure your ticket system URL
  ![Ticket base URL](https://github.com/MisterGoodDeal/task-time-tracker/blob/main/images/Capture%20d%E2%80%99%C3%A9cran%202025-12-26%20%C3%A0%2001.46.44.png?raw=true)
- **Branch prefixes**: Customize ticket prefix patterns (e.g., `EDI`, `GDD`)
- **Working hours**: Set start and end times (24h or 12h format)
- **Time format**: Choose between 24h and 12h display format
- **Export settings**: Configure export format, output path, and application to open files

## 📦 Installation

### From VS Code Marketplace

**[Install from VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=MisterGoodDeal.task-time-tracker)**

Or manually:

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "Task Time Tracker"
4. Click Install

### From VSIX File

1. Download the `.vsix` file from the [Releases](https://github.com/MisterGoodDeal/task-time-tracker/releases) page
2. Open VS Code
3. Go to Extensions
4. Click the `...` menu and select "Install from VSIX..."
5. Select the downloaded file

## 🚀 Quick Start

1. **Configure your ticket system URL**:

   - Open VS Code Settings (Ctrl+, / Cmd+,)
   - Search for "Task Time Tracker"
   - Set `Task Time Tracker: Ticket Base Url` (e.g., `https://your-company.atlassian.net/browse`)

2. **Configure branch prefixes** (optional):

   - Set `Task Time Tracker: Branch Prefixes` (default: `["EDI", "GDD"]`)

3. **Set your working hours**:

   - Configure `Task Time Tracker: Work Start Hour` and `Work End Hour`
   - Choose your preferred time format (24h or 12h)

4. **Start tracking**:
   - Create a branch with a ticket ID (e.g., `feat/GDD-750_my-feature`)
   - Open the Source Control panel
   - Find the "Task Time Tracker" tab
   - Click the "Add to tracking" button next to your branch

## 📖 Usage

### Adding a Ticket to Tracking

1. Ensure your current branch contains a ticket ID matching your configured prefixes
2. In the Task Time Tracker panel, click the **"Add to tracking"** button (📄 icon)
3. The ticket will be automatically added to the current month's tracking

### Managing Tickets

- **Mark as completed**: Click the checkmark icon on an active ticket
- **Resume tracking**: Click the refresh icon on a completed ticket
- **Delete ticket**: Click the trash icon
- **Open ticket**: Click the external link icon to open the ticket in your browser
- **Checkout branch**: Double-click on a ticket to checkout its associated branch

### Viewing Tracking Data

- Expand the monthly sections (e.g., "Suivi décembre 2025") to see all tracked tickets
- Each ticket displays:
  - Ticket ID
  - Status (En cours / Completion date)
  - Time spent in days (rounded to configured increment)
  - **Precise time breakdown** in format: `Xj Yh Zm` (days, hours, minutes)
    - Example: `2j 5h 30m` means 2 days, 5 hours, and 30 minutes
    - Only non-zero units are displayed
    - Seconds are shown only if all other units are zero
  - Associated branch name

### Exporting Monthly Tracking

1. In the Task Time Tracker panel, expand a monthly section (e.g., "Suivi décembre 2025")
2. Click the **table icon** (📊) next to the month title
3. The file will be generated in the configured format (XLSX, ODS, or CSV)
4. If configured, the file will automatically open with your specified application
5. The exported file contains:
   - Ticket ID
   - Branch name
   - Author
   - Time spent (days and detailed breakdown)
   - Status
   - Completion date

### Automatic Features

- **Branch switching**: When you switch Git branches, active tickets are automatically paused
- **Auto-resume**: If you switch to a branch whose ticket is already tracked, tracking automatically resumes
- **Real-time updates**: Time spent is calculated in real-time for active tickets

## ⚙️ Configuration Options

| Configuration                         | Description                                                                                                                                                           | Default          | Example                                                                                                                                        |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `task-time-tracker.ticketBaseUrl`     | Base URL for your ticket system. The ticket ID will be appended to this URL.                                                                                          | `""`             | `https://your-company.atlassian.net/browse`                                                                                                    |
| `task-time-tracker.branchPrefixes`    | Array of branch prefixes to detect ticket IDs from.                                                                                                                   | `["EDI", "GDD"]` | `["EDI", "GDD", "TASK"]`                                                                                                                       |
| `task-time-tracker.workStartHour`     | Hour when your work day starts (24h format, 0-23).                                                                                                                    | `9`              | `9`                                                                                                                                            |
| `task-time-tracker.workEndHour`       | Hour when your work day ends (24h format, 0-23).                                                                                                                      | `18`             | `18`                                                                                                                                           |
| `task-time-tracker.timeFormat`        | Time display format: `"24h"` or `"12h"`.                                                                                                                              | `"24h"`          | `"24h"` or `"12h"`                                                                                                                             |
| `task-time-tracker.workStartHour12h`  | Work start hour in 12h format (1-12). Used when `timeFormat` is `"12h"`.                                                                                              | `9`              | `9`                                                                                                                                            |
| `task-time-tracker.workStartPeriod`   | AM/PM period for work start. Used when `timeFormat` is `"12h"`.                                                                                                       | `"AM"`           | `"AM"` or `"PM"`                                                                                                                               |
| `task-time-tracker.workEndHour12h`    | Work end hour in 12h format (1-12). Used when `timeFormat` is `"12h"`.                                                                                                | `6`              | `6`                                                                                                                                            |
| `task-time-tracker.workEndPeriod`     | AM/PM period for work end. Used when `timeFormat` is `"12h"`.                                                                                                         | `"PM"`           | `"AM"` or `"PM"`                                                                                                                               |
| `task-time-tracker.timeIncrement`     | Time increment in days for tracking. Time spent will be rounded to this increment. Minimum: `0.1`, Maximum: `1`, Must be a multiple of `0.1`.                         | `0.5`            | `0.1`, `0.2`, `0.5`, `1`                                                                                                                       |
| `task-time-tracker.excelOutputPath`   | Output directory path for exported spreadsheet files. If empty, files will be saved in the current workspace directory.                                               | `""`             | `/Users/username/Documents/exports`                                                                                                            |
| `task-time-tracker.excelExecutable`   | Path to the executable application to open exported files automatically. If empty, files will not be opened automatically. On macOS, you can use `.app` bundle paths. | `""`             | macOS: `/Applications/Microsoft Excel.app`<br>Linux: `/usr/bin/libreoffice`<br>Windows: `C:\Program Files\Microsoft Office\Office16\EXCEL.EXE` |
| `task-time-tracker.excelExportFormat` | Export format for monthly tracking files. Options: `"xlsx"` (Microsoft Excel), `"ods"` (OpenDocument), `"csv"` (Comma-separated values).                              | `"xlsx"`         | `"xlsx"`, `"ods"`, `"csv"`                                                                                                                     |

## 🎯 How It Works

### Ticket Detection

The extension uses regex patterns to extract ticket IDs from branch names:

- Pattern: `{PREFIX}-{NUMBER}` (case-insensitive)
- Example: `feat/GDD-750_my-feature` → `GDD-750`

### Time Calculation

Time is calculated based on:

- **Working hours**: Only time within your configured work hours counts
- **Increments**: Time is rounded to your configured increment (default: 0.5 days) for the days display
- **Precise calculation**: Detailed breakdown (days, hours, minutes, seconds) is calculated separately and shown alongside the rounded days
- **Minimum**: Minimum tracked time equals your configured time increment
- **Multiple sessions**: Overlapping periods on the same day are automatically merged to avoid double-counting
- **Real-time updates**: For active tickets, the precise time is recalculated every minute

### Data Storage

Tracking data is stored in VS Code workspace settings:

- Organized by month and year
- Each ticket contains:
  - Ticket ID and full URL
  - Branch name
  - Work periods (start/end dates)
  - Author information
  - Calculated time spent (in days, rounded to increment)
  - **Precise time spent** (days, hours, minutes, seconds) - automatically recalculated on each access

## 🛠️ Development

### Prerequisites

- Node.js 20+
- npm or yarn
- VS Code

### Setup

```bash
# Clone the repository
git clone https://github.com/MisterGoodDeal/task-time-tracker.git
cd task-time-tracker

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Run tests
npm test

# Run linter
npm run lint
```

### Building

```bash
# Build VSIX package
npm run package

# The VSIX file will be in the build/ directory
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run linter
npm run lint

# Fix linting issues automatically
npm run lint:fix
```

## 📝 License

MIT License - see [LICENSE.md](LICENSE.md) for details

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Clone the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📧 Support

If you encounter any issues or have feature requests, please open an issue on [GitHub](https://github.com/MisterGoodDeal/task-time-tracker/issues).

## 🙏 Acknowledgments

- Built with [VS Code Extension API](https://code.visualstudio.com/api)
- Icons from [Codicons](https://github.com/microsoft/vscode-codicons)

---

Made with ❤️ for developers who want to track their time efficiently
