# MG Potdar Jewellers Management System

A full-featured Jewellery Shop Management System with desktop (Electron + ReactJS) support, using a Node.js backend with MongoDB database. The system includes offline-first functionality and seamless synchronization.

## Features

- **Authentication**: JWT-based Sign In / Sign Up with secure session management
- **Daily Gold & Silver Pricing**: Track and manage daily rates with historical data
- **Product Management**: Organize gold and silver items with search functionality
- **Purchase Entry & Receipt Generation**: Create and print customer receipts
- **Monthly Analytics**: View sales data with interactive charts
- **Money Lending Tracker**: Manage loans with interest calculation
- **Offline Mode**: Continue working without internet connection
- **Cross-Platform**: Desktop app with future mobile support

## Tech Stack

- **Frontend (Desktop)**: Electron + ReactJS
- **Backend**: Node.js + Express
- **Database**: MongoDB (Cloud: MongoDB Atlas, Local: embedded MongoDB)
- **ORM**: Mongoose
- **Authentication**: JWT-based authentication
- **PDF Generation**: PDFKit
- **Email Service**: Nodemailer

## Setup Instructions

### Prerequisites
- Node.js v16 or higher
- npm v8 or higher
- MongoDB Atlas account (for cloud database)

### Installation

1. Clone the repository
   ```
   git clone https://github.com/your-username/mg-potdar-jewellers.git
   cd mg-potdar-jewellers
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Set up environment variables
   - Create `.env` files in both backend and frontend directories based on the provided examples

4. Start development servers
   ```
   # Backend
   npm run dev:backend
   
   # Frontend
   npm run dev:frontend
   ```

## Building for Production

To build the desktop application:
```
npm run build:frontend
```

The packaged application will be available in the `frontend/dist` directory.

## Offline-First Functionality

This application is designed with offline-first capabilities, allowing users to continue working even without an internet connection.

### How It Works

1. **Automatic Data Synchronization**
   - Data is automatically stored in a local IndexedDB database
   - When online, changes are automatically synchronized with MongoDB Atlas
   - When offline, all changes are queued for later synchronization
   - Upon reconnecting, data is automatically synchronized in the background

2. **MongoDB Atlas Configuration**
   - On first launch, you'll be prompted to configure your MongoDB Atlas connection
   - You can use the provided default or your own MongoDB Atlas cluster
   - The connection settings are stored securely on your local machine
   - You can update the database settings at any time from the user menu

3. **Conflict Resolution**
   - The application intelligently manages conflicts between local and remote data
   - Local changes take precedence when conflicts arise
   - Automatic retries for failed synchronization operations

### Network Status Indicator

The application includes a network status indicator in the top bar:
- **Green Check**: Fully synchronized, no pending changes
- **Yellow Warning**: Online but has pending changes to sync
- **Red X**: Offline mode active, changes being stored locally

### MongoDB Atlas Setup

If you're setting up your own MongoDB Atlas cluster:

1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Create a new database cluster (the free tier is sufficient)
3. Set up database security:
   - Create a database user with read/write permissions
   - Configure network access (IP whitelist or allow from anywhere)
4. Get your connection string from the Atlas dashboard
5. Enter the connection string in the application's MongoDB configuration dialog

Your connection string will look like:
```
mongodb+srv://username:password@cluster.mongodb.net/mg-potdar-jewellers?retryWrites=true&w=majority
```

## License

This project is licensed under the ISC License. 