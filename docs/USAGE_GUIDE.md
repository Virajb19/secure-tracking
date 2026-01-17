# 🔐 Secure Tracking System - Complete Usage Guide

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURE TRACKING SYSTEM                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│   │   Backend    │    │  Admin CMS   │    │  Mobile App  │     │
│   │   (NestJS)   │◄───│  (Next.js)   │    │   (Expo)     │     │
│   │   Port 3001  │    │  Port 3000   │    │  Expo Go     │     │
│   └──────────────┘    └──────────────┘    └──────────────┘     │
│          │                   │                   │              │
│          │     PostgreSQL    │                   │              │
│          └───────────────────┘                   │              │
│                                                  │              │
│   ADMIN creates users & tasks ─────────────────►│              │
│   DELIVERY agent executes tasks ◄───────────────┘              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Step 1: Start the Backend

### Terminal 1: Start PostgreSQL (if using Docker)
```powershell
# Navigate to backend
cd "d:\Secure Tracking\backend"

# Start PostgreSQL (Docker)
docker-compose up -d
```

### Terminal 2: Start NestJS Backend
```powershell
cd "d:\Secure Tracking\backend"

# Install dependencies (first time only)
npm install

# Run in development mode
npm run start:dev
```

**Backend runs on:** `http://localhost:3001`

---

## 🖥️ Step 2: Start the Admin CMS

### Terminal 3: Start Admin CMS
```powershell
cd "d:\Secure Tracking\admin-cms"

# Install dependencies (first time only)
npm install

# Run development server
npm run dev
```

**Admin CMS runs on:** `http://localhost:3000`

---

## 📱 Step 3: Start the Mobile App

### Terminal 4: Start Expo Mobile App
```powershell
cd "d:\Secure Tracking\mobile-app"

# Install dependencies (first time only)
npm install

# Start Expo
npx expo start
```

**Options to run:**
- Press `a` → Android Emulator
- Press `i` → iOS Simulator
- Scan QR code → Expo Go app on real device

---

## 👤 How to Use: ADMIN Workflow

### 1. Login to Admin CMS
```
URL: http://localhost:3000/login
Phone: (Your admin phone number)
```

### 2. Create Delivery Users
```
Navigate: Dashboard → Users → Add User

Fill:
- Name: "Raju Sharma"
- Phone: "+919876543210"
- Role: DELIVERY
```

### 3. Create Delivery Tasks
```
Navigate: Dashboard → Tasks → Create Task

Fill:
- Sealed Pack Code: "EXAM-2026-PHYSICS-001"
- Source Location: "District Education Office, Lucknow"
- Destination: "Government School #42, Kanpur"
- Assigned User: Select delivery person
- Start Time: When delivery can begin
- End Time: Deadline for completion
```

### 4. Monitor Tasks
```
Navigate: Dashboard → Tasks

View:
- PENDING: Not started yet
- IN_PROGRESS: Delivery ongoing
- COMPLETED: Successfully finished
- SUSPICIOUS: Time window violated ⚠️
```

### 5. View Audit Logs
```
Navigate: Dashboard → Audit Logs

Track all:
- User logins
- Task creations
- Event submissions
```

---

## 📱 How to Use: DELIVERY Agent Workflow

### 1. Login to Mobile App

```
┌─────────────────────────────┐
│     🔒 Secure Delivery      │
│  Government Tracking System │
│                             │
│  Phone Number               │
│  ┌───────────────────────┐  │
│  │ +919876543210         │  │
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │        Login          │  │
│  └───────────────────────┘  │
│                             │
│  This app is for authorized │
│  delivery personnel only.   │
│  Device Info                │
└─────────────────────────────┘
```

**Important:**
- First login → Device gets bound to account
- Future logins must be from SAME device
- Admin users CANNOT login (blocked)

### 2. View Assigned Tasks

```
┌─────────────────────────────┐
│ 👋 Welcome, Raju Sharma!    │
│ 2 tasks assigned            │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ EXAM-2026-PHYSICS-001   │ │
│ │ ┌─────────┐             │ │
│ │ │ PENDING │             │ │
│ │ └─────────┘             │ │
│ │ 📍 From: Lucknow        │ │
│ │ 🎯 To: Kanpur           │ │
│ │ ⏰ 09:00 - 17:00        │ │
│ └─────────────────────────┘ │
│                             │
│ ┌─────────────────────────┐ │
│ │ EXAM-2026-CHEMISTRY-002 │ │
│ │ ┌─────────────┐         │ │
│ │ │ IN_PROGRESS │         │ │
│ │ └─────────────┘         │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

### 3. Execute Task - Step by Step

Tap on task → See detail screen:

```
┌─────────────────────────────┐
│     ┌───────────┐           │
│     │  PENDING  │           │
│     └───────────┘           │
│ Complete PICKUP to begin    │
│                             │
│ ═══════════════════════════ │
│ SEALED PACK CODE            │
│ EXAM-2026-PHYSICS-001       │
│ ═══════════════════════════ │
│                             │
│ DELIVERY STEPS              │
│ ┌─────────────────────────┐ │
│ │ 📦 Pickup    [📷Capture]│ │ ← ACTIVE
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ 🚚 Transit     (Locked) │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ ✅ Delivery    (Locked) │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

### 4. Capture Evidence (Each Step)

#### Step A: PICKUP Event
```
1. Tap "📷 Capture" on Pickup step
2. Grant camera permission (first time)
3. Grant location permission (first time)
4. Take photo of sealed pack at pickup location
5. Review photo + GPS coordinates
6. Tap "✓ Submit"
```

#### Step B: TRANSIT Event
```
After PICKUP is complete:
1. Tap "📷 Capture" on Transit step
2. Take photo showing pack in transit
3. Submit
```

#### Step C: FINAL Event (Delivery)
```
After TRANSIT is complete:
1. Tap "📷 Capture" on Delivery step
2. ⚠️ WARNING DIALOG APPEARS:
   "This will PERMANENTLY LOCK the task"
3. Confirm → Take final photo at destination
4. Submit → Task marked COMPLETED
```

---

## 🔒 Security Features

### Device Binding
```
┌────────────────────────────────────────┐
│ First Login:                           │
│ Phone: +919876543210                   │
│ Device ID: abc-123-xyz (auto-generated)│
│ → Backend BINDS device to account      │
│                                        │
│ Future Logins:                         │
│ Same phone + SAME device = ✅ Success  │
│ Same phone + NEW device = ❌ 403 Error │
│                                        │
│ To reset: Admin must clear device_id   │
└────────────────────────────────────────┘
```

### Event Validation
```
┌────────────────────────────────────────┐
│ Server Validates:                      │
│                                        │
│ ✓ Event order (PICKUP → TRANSIT → FINAL)│
│ ✓ No duplicate events                  │
│ ✓ Time window (start_time to end_time) │
│ ✓ User is assigned to task             │
│ ✓ Image SHA-256 hash for integrity     │
│ ✓ Server timestamp (client time ignored)│
│                                        │
│ Violations → Task marked SUSPICIOUS    │
└────────────────────────────────────────┘
```

---

## 📊 Task Status Flow

```
     ┌──────────┐
     │ PENDING  │  ← Task created by Admin
     └────┬─────┘
          │ PICKUP event submitted
          ▼
    ┌─────────────┐
    │ IN_PROGRESS │  ← Delivery ongoing
    └──────┬──────┘
           │ TRANSIT + FINAL events submitted
           ▼
     ┌───────────┐
     │ COMPLETED │  ← Task locked permanently
     └───────────┘


     At ANY point, if time window violated:
     
     ┌────────────┐
     │ SUSPICIOUS │  ← Flagged for review
     └────────────┘
```

---

## 🧪 Testing Checklist

### Backend
- [ ] PostgreSQL running
- [ ] `npm run start:dev` runs without errors
- [ ] API accessible at `http://localhost:3001/api`

### Admin CMS
- [ ] Login works
- [ ] Can create DELIVERY users
- [ ] Can create tasks
- [ ] Can view task list
- [ ] Audit logs visible

### Mobile App
- [ ] Expo starts without errors
- [ ] Login works (DELIVERY user only)
- [ ] Task list shows assigned tasks
- [ ] Camera opens with permissions
- [ ] GPS coordinates captured
- [ ] Events submit successfully
- [ ] Task status updates after events

---

## 🛠️ Troubleshooting

### "Network Error" on Mobile
```
Cause: Backend not accessible from phone
Fix: 
1. Get your PC's local IP: ipconfig
2. Update mobile-app/src/constants/config.ts:
   BASE_URL: 'http://192.168.x.x:3001/api'
3. Restart Expo
```

### "Device binding failed" (403)
```
Cause: User trying to login from different device
Fix: Admin must reset device_id in database:
UPDATE users SET device_id = NULL WHERE phone = '+91xxxx';
```

### "Permission denied" on Camera
```
Cause: Permanent denial of permissions
Fix: 
1. Open phone Settings
2. Apps → Expo Go → Permissions
3. Enable Camera and Location
```

---

## 📞 Support Contacts

| Issue | Action |
|-------|--------|
| Device reset needed | Contact Admin |
| Task flagged SUSPICIOUS | Contact Supervisor |
| App crashes | Restart and retry |
| Network issues | Check WiFi/Mobile data |

---

**System Ready for Production! 🚀**
