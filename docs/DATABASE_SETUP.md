# Database Setup Guide

## Quick Setup Commands

### 1. Install MySQL
```bash
# Windows: Download from https://dev.mysql.com/downloads/mysql/
# Or use Chocolatey:
choco install mysql

# Mac:
brew install mysql

# Linux:
sudo apt-get install mysql-server
```

### 2. Start MySQL Server
```bash
# Windows (as Administrator):
net start MySQL80

# Mac:
brew services start mysql

# Linux:
sudo systemctl start mysql
```

### 3. Create Database
```bash
# Login to MySQL
mysql -u root -p

# Run these commands in MySQL:
CREATE DATABASE cue_club;
CREATE USER 'cueclub_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON cue_club.* TO 'cueclub_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 4. Update .env File
Create or update `.env` file in project root:
```env
DATABASE_URL="mysql://cueclub_user:your_password@localhost:3306/cue_club"
```

### 5. Install Prisma & Generate Client
```bash
npm install prisma @prisma/client
npx prisma generate
```

### 6. Run Migrations
```bash
npx prisma migrate dev --name init
```

### 7. Seed Database
```bash
npx prisma db seed
```

---

## Seed Script

Create `prisma/seed.js`:
```javascript
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Start seeding...')

  // Create tables
  const tables = await Promise.all([
    prisma.table.create({
      data: {
        tableNumber: '01',
        name: 'Pool Table 1',
        type: 'POOL',
        status: 'AVAILABLE',
        isActive: true,
        sequence: 1,
        hourlyRate: 200,
      },
    }),
    prisma.table.create({
      data: {
        tableNumber: '02',
        name: 'Pool Table 2',
        type: 'POOL',
        status: 'AVAILABLE',
        isActive: true,
        sequence: 2,
        hourlyRate: 200,
      },
    }),
    prisma.table.create({
      data: {
        tableNumber: '03',
        name: 'Snooker Table 1',
        type: 'SNOOKER',
        status: 'AVAILABLE',
        isActive: true,
        sequence: 3,
        hourlyRate: 300,
      },
    }),
    prisma.table.create({
      data: {
        tableNumber: '04',
        name: 'Pool Table 3',
        type: 'POOL',
        status: 'AVAILABLE',
        isActive: true,
        sequence: 4,
        hourlyRate: 200,
      },
    }),
    prisma.table.create({
      data: {
        tableNumber: '05',
        name: 'VIP Snooker',
        type: 'SNOOKER',
        status: 'AVAILABLE',
        isActive: true,
        sequence: 5,
        hourlyRate: 500,
      },
    }),
    prisma.table.create({
      data: {
        tableNumber: '06',
        name: 'Pool Table 4',
        type: 'POOL',
        status: 'AVAILABLE',
        isActive: true,
        sequence: 6,
        hourlyRate: 200,
      },
    }),
  ])

  // Create business settings
  await prisma.businessSettings.create({
    data: {
      businessName: 'CUE CLUB',
      logoUrl: null,
      phone: '+91 98765 43210',
      email: 'info@cueclub.com',
      address: '123 Main Street, Ahmedabad',
      openingHours: '6:00 PM - 1:00 AM',
      advanceAmount: 100,
      googleMapsUrl: null,
      instagramUrl: null,
      whatsappNumber: null,
    },
  })

  console.log('Seeding finished.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
```

Update `package.json` to add seed script:
```json
{
  "prisma": {
    "seed": "node prisma/seed.js"
  }
}
```

---

## One-Line Setup (If MySQL is already installed)

```bash
# Create database and user
mysql -u root -p -e "CREATE DATABASE cue_club; CREATE USER 'cueclub_user'@'localhost' IDENTIFIED BY 'cueclub123'; GRANT ALL PRIVILEGES ON cue_club.* TO 'cueclub_user'@'localhost'; FLUSH PRIVILEGES;"

# Update .env with: DATABASE_URL="mysql://cueclub_user:cueclub123@localhost:3306/cue_club"

# Run migrations and seed
npx prisma migrate dev --name init && npx prisma db seed
```

---

## Troubleshooting

### MySQL Not Running
```bash
# Check if MySQL is running
# Windows:
sc query MySQL80

# Mac/Linux:
sudo systemctl status mysql

# Start MySQL
# Windows:
net start MySQL80

# Mac:
brew services start mysql

# Linux:
sudo systemctl start mysql
```

### Connection Error
```bash
# Test connection
mysql -u cueclub_user -p cue_club

# If fails, recreate user
mysql -u root -p
DROP USER 'cueclub_user'@'localhost';
CREATE USER 'cueclub_user'@'localhost' IDENTIFIED BY 'cueclub123';
GRANT ALL PRIVILEGES ON cue_club.* TO 'cueclub_user'@'localhost';
FLUSH PRIVILEGES;
```

### Migration Error
```bash
# Reset database (WARNING: Deletes all data)
npx prisma migrate reset

# Or manually drop and recreate
mysql -u root -p -e "DROP DATABASE cue_club; CREATE DATABASE cue_club;"
npx prisma migrate dev --name init
```

---

## Verify Setup

```bash
# Check if tables exist
mysql -u cueclub_user -p cue_club -e "SHOW TABLES;"

# Check table data
mysql -u cueclub_user -p cue_club -e "SELECT * FROM Table;"

# Test API
curl http://localhost:3000/api/tables
```

---

## Production Setup

For production, use a managed database service:
- PlanetScale (MySQL)
- AWS RDS (MySQL)
- Google Cloud SQL (MySQL)
- DigitalOcean Managed Database

Update `.env` with production database URL.
