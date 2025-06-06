# i18n Manager

A web application for managing internationalization (i18n) translation files using i18next.

## Features

- Open and edit i18next JSON translation files
- Easily navigate and search through translation keys
- Edit translation values (strings, numbers, objects, arrays)
- Track recently opened files
- Save changes to translation files
- Compare translation files to identify missing keys and inconsistencies
- Load sample translations to test the application
- AI-powered auto-translation capabilities for missing keys

## Development

### Prerequisites

- Node.js (v14 or later)
- npm

### Getting Started

1. Clone this repository
2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

This will start the React development server with Vite.

### Building the Application

To build the application for production:

```bash
npm run build
```

## Usage

### Editing Translations
1. Open translation files using the "Open Folder" button
2. Browse through translation keys in the sidebar
3. Edit values for individual translation keys
4. Save changes using the "Save All Files" button

### Comparing Translation Files
1. Go to the "Compare Files" tab
2. Select two translation files to compare
3. View differences including missing keys and type mismatches
4. Filter to show only issues

### Auto-Translation
1. Navigate to the "Auto-Translation" tab
2. Use the AI-powered translation services to translate missing keys
3. Configure translation settings for your preferred translation service

### Loading Sample Files
The application includes built-in sample translations that can be loaded directly through the UI for testing purposes.

## Technologies Used

- React 19
- TypeScript
- Bootstrap 5 / React-Bootstrap
- i18next / react-i18next
- Vite

## Similar Projects

This project was inspired by [i18n-manager by gilmarsquinelato](https://github.com/gilmarsquinelato/i18n-manager).