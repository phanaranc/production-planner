# GENCO Production Waste Management Planner

[![CI](https://github.com/phanaranc/production-planner/actions/workflows/ci.yml/badge.svg)](https://github.com/phanaranc/production-planner/actions/workflows/ci.yml)

Web app วางแผนการผลิต แผนก Production Waste Management (สาย TF/SP/AR/FC/SRF) — ตาม
`master_prompt_waste_management_webapp_v2.md`. เว็บแอปนี้เป็นโปรเจกต์ใหม่ แยกอิสระจาก
`.Genco` และ `Waste Management Production Dashboard` โดยเจตนา — มีฐานข้อมูล Postgres
ของตัวเองใน Docker container แยกต่างหาก ไม่ใช้ร่วมกับโปรเจกต์อื่น

## Stack

Next.js 14 (App Router, TypeScript) + Prisma + PostgreSQL 16 + Tailwind CSS.
Auth แบบ custom (bcryptjs + jose JWT, httpOnly cookie) — ไม่ใช้ NextAuth/Supabase.
`@tanstack/react-table` สำหรับตารางเที่ยวรับ-บำบัด, `exceljs`/`@react-pdf/renderer`
สำหรับ export, `papaparse` สำหรับนำเข้า CSV.

## Ports & containers (แยกจากโปรเจกต์อื่นในเครื่องนี้)

| อะไร | ค่า |
|---|---|
| Postgres (Docker) | host port **5440** → container `production-planner-db` |
| แอป (Docker, production build) | host port **3300** → container `production-planner-app` |
| แอป (`npm run dev`, บนเครื่อง) | port **3100** |

ไม่ชนกับ `genco-db` (5433) หรือ Supabase stack ของ `Waste Management Production Dashboard`
(54321-54327) ที่รันอยู่แล้วในเครื่องเดียวกัน

## เริ่มต้นใช้งาน (dev)

```bash
docker compose up -d db          # เปิดเฉพาะ Postgres
cp .env.example .env             # (ทำครั้งแรกครั้งเดียว)
npm install
npm run prisma:migrate           # สร้างตารางตาม prisma/schema.prisma
npm run prisma:seed              # ข้อมูลสาธิต (ดูหัวข้อ "ข้อมูลสาธิต" ด้านล่าง)
npm run dev                      # http://localhost:3100
```

## รันแบบเต็ม ผ่าน Docker ทั้งหมด (app + db)

```bash
docker compose up --build -d
# http://localhost:3300
```

`migrate` service จะรัน `prisma migrate deploy` ให้อัตโนมัติก่อน `app` container เริ่มทำงาน

## บัญชีสาธิต (รหัสผ่านเดียวกันหมด: `Control321`)

| อีเมล | บทบาท |
|---|---|
| admin@ppwm-demo.local | ผู้ดูแลระบบ |
| planner@ppwm-demo.local | Planner (กรอก/แก้ไขข้อมูล + แผนส่งออก) |
| hoo@ppwm-demo.local | Head of Operation (อนุมัติ/เซ็นแผนเท่านั้น) |
| entry@ppwm-demo.local | ผู้กรอกข้อมูล |
| viewer@ppwm-demo.local | ผู้เยี่ยมชม (อ่านอย่างเดียว) |

⚠️ **หมุนรหัสผ่านนี้ก่อนใช้งานจริง** — ตั้งไว้เหมือนกันหมดเพื่อความสะดวกตอนสาธิตเท่านั้น

## ข้อมูลสาธิต (Seed data)

`prisma/seed.ts` สร้างข้อมูลตัวอย่างที่ **ระบุชัดเจนว่าเป็นข้อมูลสาธิต** ทั้งหมด — ไม่ใช่
ข้อมูลจริงของ GENCO เพราะไฟล์ `Book1.csv`/`Book2.csv` ที่ spec อ้างถึงไม่มีอยู่จริงในเครื่องนี้
(ค้นหาแล้วทั่วทั้งเครื่อง รวมไดรฟ์ D:) เมื่อมีไฟล์จริง ใช้หน้า **Settings → นำเข้าข้อมูล**
เพื่ออัปโหลด CSV รูปแบบเดียวกับ Book1.csv ได้ทันที (คอลัมน์ตรงกับ §2/§7 ของ spec เป๊ะ)

- Mapping Type Waste → สาย: ตรงตาม §1 ของ spec ทั้ง 4 รายการที่ยืนยันได้ + **SRF ถูกปล่อยเป็น
  "ยังไม่ยืนยัน" โดยตั้งใจ** (ไม่มีรหัสจริงให้เดา)
- WasteTrip: ~600-900 รายการ ย้อนหลัง 60 วัน กระจาย 5 สาย
- แผนส่งออก: เดือนก่อนหน้า (สิงหาคม 2569 ถ้ารันตอนกันยายน 2569) ปิดรอบและเซ็นครบ 3 ตำแหน่งแล้ว
  ใช้ตัวเลข Target plan ตัวอย่างจาก spec §3.2/§3.3 เอง (TF/โรงงาน1=400, SP/IN1=180, AR รวม=201,
  FC รวม=281 — รวม 1,342 ตันตรงกับ §3.3); เดือนปัจจุบันยังไม่ปิดรอบ มีทั้งวันที่ "ตรงแผน/รอ/พลาด/
  ไม่มีแผน" ให้เห็นสีครบตาม Legend

## ข้อควรระวังที่ยังไม่แก้ (ตรงตาม §7 ของ spec)

- **SRF ยังไม่มี mapping ที่ยืนยันแล้ว** — ไปยืนยันที่ Settings → Mapping ก่อนใช้งานจริง
- ตัวนำเข้า Book2.csv (`src/lib/csv-import/export-plan-mapping.ts`) เขียนตามโครงสร้างที่ spec
  อธิบายไว้ แต่ **ไม่เคยทดสอบกับไฟล์จริง** (ไม่มีไฟล์ตัวอย่างในเครื่องนี้เลย) — ต่างจากตัวนำเข้า
  Book1.csv ที่คอลัมน์ตรงกับสคีมาที่ผ่านการตรวจสอบแล้วจากโปรเจกต์พี่น้อง
- รหัสผ่านสาธิตทั้ง 5 บัญชีใช้ค่าเดียวกัน — หมุนก่อนใช้งานจริง
