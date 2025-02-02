
Here's a concise README for your project:

#FAQ Backend
This is a backend API for managing FAQs (Frequently Asked Questions) using Node.js, Express.js, MongoDB, Redis, and Google Translate API. It supports multilingual FAQs and features JWT-based authentication.

#Features:
1.Create, read, and manage FAQs.
2.Multilingual support with automatic translations (Hindi and Bengali).
3.Caching with Redis to improve performance.
4.JWT-based user authentication and admin authorization.
5.Docker support for easy deployment.

#Installation
1.Clone the repository:
  git clone https://github.com/Shruti5841/faq-backend.git
  cd faq-backend
2.Install dependencies:
  npm install
3.Create a .env file:
  Run the application:
  npm start

#API Endpoints
 1.GET /api/faqs
 Fetch FAQs. Supports language selection via ?lang=<language_code>. Default is English (en).

 2.POST /api/faqs
  Create a new FAQ. Requires JWT authentication (admin only).

 3.POST /api/login
  Generate a JWT token for login.

#Docker
 1.Build and run using Docker:
   docker-compose up --build
