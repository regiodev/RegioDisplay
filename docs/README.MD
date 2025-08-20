# 📺 RegioDisplay - Platformă Digitală Signage Completă

<div align="center">

![RegioDisplay Logo](./signage-frontend/logo.png)

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Frontend](https://img.shields.io/badge/Frontend-React%2019-61dafb.svg)](./signage-frontend)
[![Backend](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](./backend)
[![Mobile](https://img.shields.io/badge/Android-Kotlin%20Compose-3ddc84.svg)](./RegioPlayerV2)

*O soluție completa și modernă de digital signage pentru gestionarea și distribuirea conținutului multimedia*

</div>

---

## 🌟 Prezentare Generală

**RegioDisplay** este o platformă avansată de digital signage dezvoltată pentru a oferi o experiență completă de management și distribuție a conținutului multimedia. Sistemul permite organizațiilor să gestioneze eficient multiple ecrane digitale dintr-o singură interfață centralizată.

### 🎯 Viziunea Proiectului

RegioDisplay transformă modul în care organizațiile comunică prin intermediul ecranelor digitale, oferind:
- **Gestionare centralizată** a întregii rețele de ecrane
- **Distribuție automată** a conținutului multimedia
- **Monitorizare în timp real** a tuturor dispozitivelor
- **Analiză detaliată** a performanței și utilizării

---

## 🏗️ Arhitectura Sistemului

Platforma RegioDisplay este construită pe o arhitectură modernă **multi-tier** cu următoarele componente principale:

```mermaid
graph TB
    A[Management Dashboard<br/>React 19 + Vite] --> B[Backend API<br/>FastAPI + SQLAlchemy]
    B --> C[PostgreSQL Database]
    B --> D[WebSocket Manager]
    D --> E[Android Player<br/>Kotlin Compose]
    B --> F[Media Storage]
    B --> G[Reports & Analytics]
```

### 📁 Structura Proiectului

```
RegioDisplay/
├── 🌐 signage-frontend/     # Interfața web de administrare
├── ⚡ backend/              # API server și logică business
├── 📱 RegioPlayerV2/        # Aplicația Android player
└── 📚 documentație/         # Documentație și resurse
```

---

## 🚀 Funcționalități Principale

### 🎛️ **Dashboard de Management**
- **Monitorizare în timp real** a stării tuturor ecranelor
- **Statistici detaliate** privind utilizarea și performanța
- **Alerte proactive** pentru probleme și actualizări
- **Sumar sistem** pentru administratori

### 📺 **Gestionare Ecrane**
- **Înregistrare automată** prin coduri de împerechere unice
- **Configurare rotație** ecran (0°, 90°, 180°, 270°)
- **Atribuire playlist-uri** cu sincronizare automată
- **Monitorizare status** online/offline cu timestamp-uri
- **Gestionare locații** și informații descriptive

### 🎵 **Management Playlist-uri**
- **Editor vizual** pentru crearea și editarea playlist-urilor
- **Suport multimedia complet** (imagini, video, audio)
- **Programare temporală** pentru conținut
- **Preview în timp real** al playlist-urilor
- **Versionare automată** pentru sincronizare

### 📁 **Biblioteca Media**
- **Upload bulk** cu progress tracking
- **Procesare automată** a thumbnail-urilor
- **Organizare prin tag-uri** și categorii
- **Gestionare cote** de stocare per utilizator
- **Previzualizare** integrată pentru toate formatele

### 📊 **Rapoarte și Analytics**
- **Proof of Play** - tracking complet al redărilor
- **Statistici detaliate** de utilizare
- **Rapoarte performanță** ecrane
- **Analiză timp de funcționare**
- **Export date** în multiple formate

### 👥 **Sistem Utilizatori**
- **Autentificare securizată** cu JWT
- **Roluri și permisiuni** granulare
- **Management administrativ** complet
- **Verificare email** pentru securitate
- **Reset parolă** automatizat

---

## 🛠️ Stack Tehnologic

### 🌐 **Frontend (Management Dashboard)**
- **React 19** cu JSX
- **Vite** pentru build și development
- **Tailwind CSS** + **Radix UI** pentru styling modern
- **Axios** pentru comunicarea API
- **React Router** pentru navigație
- **Recharts** pentru vizualizări de date

### ⚡ **Backend (API Server)**
- **FastAPI** cu Python 3.9+
- **SQLAlchemy** ORM cu PostgreSQL
- **WebSocket** pentru comunicare real-time
- **JWT** pentru autentificare securizată
- **Pydantic** pentru validarea datelor
- **Email automation** pentru notificări

### 📱 **Android Player**
- **Kotlin** cu **Jetpack Compose**
- **Architecture Components** (ViewModel, LiveData)
- **WorkManager** pentru sincronizare automată
- **Retrofit** pentru comunicația API
- **ExoPlayer** pentru redarea multimedia
- **Room Database** pentru cache local

### 🗄️ **Infrastructură**
- **PostgreSQL** pentru persistența datelor
- **File Storage** pentru media assets
- **WebSocket Manager** pentru real-time updates
- **Email Service** pentru notificări

---

## 🎮 Experiența Utilizatorului

### 📱 **Pentru Administratori**
1. **Dashboard Centralizat** - vizibilitate completă asupra rețelei
2. **Management Intuitiv** - interfață drag-and-drop pentru playlist-uri
3. **Monitorizare Proactivă** - alerte automate pentru probleme
4. **Analiză Avansată** - rapoarte detaliate și insights

### 📺 **Pentru Operatori Ecrane**
1. **Setup Rapid** - împerechere prin cod QR sau PIN
2. **Funcționare Autonomă** - sincronizare automată
3. **Recuperare Inteligentă** - reconectare automată
4. **Updates Seamless** - actualizări transparente

---

## ⚙️ Instalare și Configurare

### 📋 **Prerequisite**
- **Node.js** 18+ și npm/yarn
- **Python** 3.9+ și pip
- **PostgreSQL** 12+
- **Android Studio** (pentru player development)

### 🖥️ **Setup Frontend**
```bash
cd signage-frontend
npm install
npm run dev  # Development server pe port 5173
npm run build  # Build pentru producție
```

### ⚡ **Setup Backend**
```bash
cd backend
pip install -r app/requirements.txt
uvicorn app.main:app --reload  # Development server
```

### 📱 **Build Android Player**
```bash
cd RegioPlayerV2
./gradlew assembleRelease  # Build APK pentru distribuție
```

### 🗄️ **Configurare Database**
```sql
-- Creați baza de date PostgreSQL
CREATE DATABASE regiodisplay;
-- Migrațiile vor fi aplicate automat la primul start
```

---

## 🔧 Configurare Avansată

### 🌐 **Variabile de Mediu**
```env
# Backend Configuration
DATABASE_URL=postgresql://user:password@localhost/regiodisplay
SECRET_KEY=your-secret-key-here
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587

# Frontend Configuration
VITE_API_BASE_URL=http://localhost:8000/api
```

### 🔐 **Securitate**
- **HTTPS** obligatoriu în producție
- **CORS** configurat pentru domenii specifice
- **Rate Limiting** pentru API endpoints
- **Input Validation** completă pe toate nivelurile

---

## 📈 Funcționalități Avansate

### 🔄 **Sincronizare Inteligentă**
- **Delta Updates** - doar modificările sunt transferate
- **Offline Capability** - funcționare autonomă temporară
- **Bandwidth Optimization** - compresie și cache inteligent

### 📊 **Analytics și Monitoring**
- **Real-time Metrics** - performanță sistem în timp real
- **Custom Dashboards** - metrici personalizabile
- **Alerting System** - notificări proactive

### 🌍 **Suport Internațional**
- **Multi-language** - română și engleză
- **Timezone Support** - programare în fusuri orare locale
- **Localization** - formatare data/oră regională

---

## 🤝 Contribuții și Dezvoltare

### 📝 **Guidelines pentru Contribuții**
1. **Fork** repository-ul
2. **Creați** o ramură pentru feature-ul nou
3. **Implementați** modificările cu teste
4. **Creați** un Pull Request detaliat

### 🧪 **Testing**
```bash
# Frontend Tests
cd signage-frontend
npm run test

# Backend Tests  
cd backend
pytest

# Android Tests
cd RegioPlayerV2
./gradlew test
```

### 📚 **Documentația API**
API-ul este complet documentat și disponibil la `/api/docs` după pornirea backend-ului.

---

## 📞 Suport și Comunitate

### 🆘 **Suport Tehnic**
- **Issues GitHub** pentru bug reports și feature requests
- **Documentație Wiki** pentru ghiduri detaliate
- **Email Support** pentru întrebări urgente

### 📅 **Roadmap**
- [ ] **Mobile Management App** - aplicație mobilă pentru administratori
- [ ] **AI-Powered Analytics** - insights automatizate prin ML
- [ ] **Cloud Deployment** - soluție SaaS completă
- [ ] **Advanced Scheduling** - programare condiționată și complexă

---

## 📄 Licența

Acest proiect este licențiat sub **MIT License** - vedeți fișierul [LICENSE](LICENSE) pentru detalii complete.

---

## 🙏 Mulțumiri

Mulțumiri speciale echipei de dezvoltare și comunității open-source pentru librăriile și framework-urile utilizate în construirea acestei platforme.

---

<div align="center">

**Dezvoltat cu ❤️ pentru viitorul comunicării digitale**

[🌐 Website](https://display.regio-cloud.ro) • [📧 Contact](mailto:support@regio-cloud.ro) • [📱 Demo](https://demo.regio-cloud.ro)

</div>