# Maestro UI Tests

## Prerequisites

1. **Install Maestro CLI**: https://maestro.mobile.dev/getting-started/installing-maestro
2. **Android Emulator**: Must be running with the app installed
3. **Get Test Credentials**: Open Prisma Studio to find user credentials:
   ```bash
   cd ../backend
   npx prisma studio
   ```
   Prisma Studio opens at http://localhost:5555 — browse the `User` table to get email, phone, and password for different roles.

4. **Backend Running**: The NestJS backend must be running on the emulator-accessible address:
   ```bash
   cd ../backend
   npm run start:dev
   ```

## Running Tests

```bash
# Run the bulk notice send test
maestro test .maestro/bulk-notice-send.yaml

# Run login test only
maestro test .maestro/login-seba-officer.yaml

# Run all tests
maestro test .maestro/
```

## Environment Variables

Set credentials before running:
```bash
# Get these from Prisma Studio (User table)
export MAESTRO_EMAIL="officer@example.com"
export MAESTRO_PASSWORD="password123"
export MAESTRO_PHONE="9876543210"
```

Or create a `.maestro/.env` file:
```
MAESTRO_EMAIL=officer@example.com
MAESTRO_PASSWORD=password123
MAESTRO_PHONE=9876543210
```
