# Electrical Shop Billing Project

## Overview
This project is a web application for managing billing in an electrical shop. It features a login page and a home page that can be accessed after successful authentication.

## Project Structure
```
electrical-shop-billing
├── public
│   └── index.html          # Main HTML file for the application
├── src
│   ├── components
│   │   ├── Login.tsx      # Login component with form for username and password
│   │   └── App.tsx        # Main application component with routing logic
│   ├── pages
│   │   └── Home.tsx       # Home page component displayed after login
│   ├── styles
│   │   └── index.css       # CSS styles for the application
│   └── main.tsx           # Entry point of the React application
├── package.json            # npm configuration file
├── vite.config.ts         # Vite configuration file
└── README.md               # Project documentation
```

## Setup Instructions
1. **Clone the repository**:
   ```
   git clone <repository-url>
   cd electrical-shop-billing
   ```

2. **Install dependencies**:
   ```
   npm install
   ```

3. **Run the application**:
   ```
   npm run dev
   ```

4. **Open your browser**:
   Navigate to `http://localhost:3000` (or the port specified in your Vite configuration).

## Usage
- Navigate to the login page to enter your credentials.
- Upon successful login, you will be redirected to the home page.

## Contributing
Feel free to submit issues or pull requests for any improvements or features you would like to see in the project.