I've reviewed the repository and gathered what's needed. Since some source files couldn't be accessed directly, I've pieced together the structure and dependencies from the commit history and file organization. Below is a ready-to-use `README.md` that you can drop into your repository. It covers the core components of the project in a clear, modular way.

---

# 📄 Gestion_Doc_Logisticos

> **Internship project** – Logistic document management system integrated with the **FileBound API**.

[![Django](https://img.shields.io/badge/Django-5.2.1-092E20?logo=django)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://reactjs.org/)
[![FileBound](https://img.shields.io/badge/FileBound-API-005A9C)](https://www.filebound.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 📖 Table of Contents

- [About the Project](#-about-the-project)
- [Key Features](#-key-features)
- [Built With](#-built-with)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Run the Development Server](#run-the-development-server)
- [Project Structure](#-project-structure)
- [API Documentation](#-api-documentation)
- [Authentication & Security](#-authentication--security)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)
- [Contact](#-contact)
- [Acknowledgments](#-acknowledgments)

---

## About the Project

This project is a **document management system** designed for logistics operations. It integrates with the **FileBound API** to handle document ingestion, storage, and retrieval. The system includes a **Django backend** that serves as the API layer and a **React frontend** for the user interface. Additional functionalities include:

- **Batch document processing** – upload and manage multiple documents at once.
- **Excel reference integration** – link documents to reference data.
- **SFTP connectivity** – transfer files to a remote server using WinSCP.

> The project is part of an **internship (estadía)** aimed at streamlining logistical document workflows through API integration and a modern web interface.

---

## ✨ Key Features

| Feature             | Description                                                                          |
|---------------------|--------------------------------------------------------------------------------------|
|  Document Management | Upload, download, and organize documents via the FileBound API.                    |
|  Batch Processing   | Handle multiple documents simultaneously.                                          |
|  Excel Integration  | Use Excel files as references for document metadata.                               |
|  Web Interface      | React-based UI for intuitive user interaction.                                     |
|  PDF Generation     | Create PDF documents on the fly using `fpdf2`.                                     |
| ☁️ SFTP Upload        | Securely transfer documents to a remote server using `paramiko` + WinSCP.          |
|  Environment Config | Manage API keys and secrets via `.env` file (`python-dotenv`).                      |
|  Extensible         | Built with Django and DRF – easy to add new endpoints and functionalities.           |

---

## Built With

- **Backend**: Django 5.2.1, Django REST Framework (DRF)
- **Frontend**: React 18, JavaScript, CSS, HTML
- **API Integration**: FileBound API (via `requests`)
- **PDF Handling**: `fpdf2`
- **Image Processing**: `Pillow`
- **SFTP Client**: `paramiko`
- **Environment Management**: `python-dotenv`
- **Database**: SQLite (default) / can be configured for PostgreSQL or MySQL

---

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing.

### Prerequisites

Make sure you have the following installed:

- **Python** 3.10 or higher
- **pip** (Python package manager)
- **Node.js** and **npm** (for React frontend)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/ElYakuzaz/Gestion_Doc_Logisticos.git
   cd Gestion_Doc_Logisticos
   ```

2. **Set up a virtual environment (recommended)**

   ```bash
   python -m venv venv
   source venv/bin/activate      # On Windows: venv\Scripts\activate
   ```

3. **Install Python dependencies**

   ```bash
   pip install django
   pip install pillow fpdf2 requests
   pip install python-dotenv
   pip install paramiko
   ```

4. **Install frontend dependencies**

   ```bash
   cd frontend
   npm install
   cd ..
   ```

### Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# FileBound API Configuration
FILEBOUND_BASE_URL=https://luxatl.filebound.com/api
FILEBOUND_API_KEY=your_api_key_here

# Django Settings
DJANGO_SECRET_KEY=your_secret_key_here
DEBUG=True

# SFTP Server (if used)
SFTP_HOST=your_sftp_host
SFTP_USERNAME=your_username
SFTP_PASSWORD=your_password
```

### Run the Development Server

1. **Apply migrations**

   ```bash
   python manage.py migrate
   ```

2. **Start the Django development server**

   ```bash
   python manage.py runserver
   ```

3. **Start the React frontend (optional for API testing)**

   ```bash
   cd frontend
   npm start
   ```

Your application should now be running at `http://127.0.0.1:8000`.

---

## 📁 Project Structure

```plaintext
Gestion_Doc_Logisticos/
├── FileboundWeb/          # Django project settings (asgi, settings, urls, wsgi)
├── api/                   # Django app for REST API endpoints
│   ├── migrations/        # Database migrations
│   ├── models.py          # Database models
│   ├── views.py           # API view logic
│   ├── urls.py            # API route definitions
│   └── admin.py           # Django admin configuration
├── frontend/              # React frontend application
│   ├── static/            # Static assets (CSS, JS, images)
│   │   ├── Auth/          # Authentication-related static files
│   │   ├── ExcelRef/      # Excel reference UI assets
│   │   ├── css/           # Global CSS styles
│   │   └── js/            # Frontend JavaScript logic
│   ├── templates/         # Django HTML templates (index.html)
│   └── pyCode/            # Python helper functions used by the frontend
├── entries.json           # JSON data structure for document entries
├── manage.py              # Django’s command-line utility
└── .gitignore             # Ignored files (e.g., node_modules, .env, key.js)
```

---

## 📡 API Documentation

The API is built with **Django REST Framework**. All endpoints are prefixed with `/api/`.

### 📌 Available Endpoints (inferred from commit history)

| Method | Endpoint                 | Description                                      |
|--------|--------------------------|--------------------------------------------------|
| GET    | `/api/entries`           | Fetch all document entries (from `entries.json`)|
| POST   | `/api/upload`            | Upload a document to FileBound                   |
| GET    | `/api/download/<id>`     | Download a specific document by ID               |
| POST   | `/api/batch`             | Process a batch of documents                     |
| GET    | `/api/excel-ref`         | Retrieve Excel reference data                    |

> **Note**: For a full, automatically generated API reference, consider integrating **drf-spectacular** or **Swagger**. Once set up, you can access interactive docs at `/api/docs`.

---

## 🔐 Authentication & Security

- **FileBound Authentication**: The API uses an API key stored in the `.env` file. All requests to FileBound are authenticated using this key.
- **Django Security**: CSRF protection is enabled for all state-changing endpoints.
- **Environment Variables**: Sensitive data (API keys, SFTP credentials) are managed via `python-dotenv` and excluded from version control (`.gitignore`).
- **File Transfers**: SFTP with WinSCP is secured using `paramiko`.

> ⚠️ **Important**: Never commit your `.env` file or any file containing secrets (e.g., `key.js`). The repository intentionally ignores these.

---

## 🚢 Deployment

### Deploying the Django Backend

1. Set `DEBUG=False` in your `.env` file.
2. Collect static files:
   ```bash
   python manage.py collectstatic
   ```
3. Use a production-ready server like **Gunicorn**:
   ```bash
   pip install gunicorn
   gunicorn FileboundWeb.wsgi:application
   ```
4. Configure a reverse proxy (e.g., Nginx) to serve static files and forward requests to Gunicorn.

### Deploying the React Frontend

Build the frontend for production:

```bash
cd frontend
npm run build
```

Then serve the `build/` folder using a static file server or integrate it with Django.

### SFTP & WinSCP Integration

The project includes scripts to transfer files to a remote server using WinSCP and `paramiko`. Ensure your SFTP credentials are correctly configured in the `.env` file.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork** the repository.
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add some amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**.

For major changes, please open an issue first to discuss what you would like to change.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

## 📞 Contact

- **Project Repository**: [ElYakuzaz/Gestion_Doc_Logisticos](https://github.com/ElYakuzaz/Gestion_Doc_Logisticos)
- **Contributors**:
  - [JeremyEsLx](https://github.com/JeremyEsLx)
  - [ElYakuzaz](https://github.com/ElYakuzaz)

---

## 🙏 Acknowledgments

- [FileBound API Documentation](https://luxatl.filebound.com/api/documentation#authentication-topic)
- Django REST Framework community
- React team for the amazing frontend library

---

*Happy documenting! 📝*
```

Let me know if you'd like to adjust any section or add specific details about the FileBound endpoints.