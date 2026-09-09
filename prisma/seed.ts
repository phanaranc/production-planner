import { PrismaClient, Section } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Deterministic PRNG so re-running the seed always produces the same demo
// data (mirrors .Genco's seed.ts convention).
function hashString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(hashString("ppwm-seed-v1"));
function randInt(min: number, max: number) {
  return Math.floor(rand() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

const SECTIONS: Section[] = ["TF", "SP", "AR", "FC", "SRF"];

// §1 — Type Waste -> Section mapping. SRF is deliberately unconfirmed: no
// source data has ever shown a real code for it. Never guess this value.
const MAPPINGS: { typeWasteValue: string; section: Section; confirmed: boolean; note?: string }[] = [
  { typeWasteValue: "น้ำ(W)", section: "TF", confirmed: true },
  {
    typeWasteValue: "สลัด(S)",
    section: "SP",
    confirmed: true,
    note: 'ตัวอย่างที่พบ: "กากตะกอนจากการลอกรางระบายน้ำ"'
  },
  {
    typeWasteValue: "AR",
    section: "AR",
    confirmed: true,
    note: 'ครอบคลุมทั้ง "สารเคมีเสื่อมสภาพ" และ "WWT Sludge" — เกณฑ์จัดหมวดจริงต้องให้ทีมยืนยัน (§1)'
  },
  { typeWasteValue: "เศษผ้า(F)", section: "FC", confirmed: true },
  {
    typeWasteValue: "(ยังไม่ระบุ - รอยืนยันจากทีม)",
    section: "SRF",
    confirmed: false,
    note: 'ยังไม่พบรหัสที่ตรงกับ SRF ในตัวอย่างข้อมูลที่แนบ — ห้ามเดา ให้ทีมยืนยันก่อนใช้งานจริง (§1/§7)'
  }
];

const DESTINATIONS: { section: Section; name: string; standingNote?: string }[] = [
  { section: "TF", name: "โรงงาน 1" },
  { section: "TF", name: "โรงงาน 2", standingNote: "ใช้รถ Tanker 15Q เท่านั้น" },
  { section: "TF", name: "โรงงาน 3" },
  { section: "SP", name: "S1" },
  { section: "SP", name: "S2" },
  { section: "SP", name: "IN1" },
  { section: "AR", name: "S1" },
  { section: "AR", name: "IN1" },
  { section: "AR", name: "T1" },
  { section: "FC", name: "S2" },
  { section: "FC", name: "S1" },
  { section: "FC", name: "T1" }
  // SRF: no destinations seeded (empty state) — no source data to fabricate one from.
];

const TRANSPORT_COMPANIES = ["GL", "MKC", "KMW", "ศิวัช", "PN PRO"];

const CUSTOMERS = Array.from({ length: 16 }, (_, i) => ({
  code: `CW${String(100000 + i).slice(1)}`,
  name: `บริษัท ตัวอย่างลูกค้า ${i + 1} จำกัด (ข้อมูลสาธิต)`
}));

async function main() {
  console.log("Seeding WasteTypeMapping...");
  for (const m of MAPPINGS) {
    await prisma.wasteTypeMapping.upsert({ where: { typeWasteValue: m.typeWasteValue }, update: m, create: m });
  }

  console.log("Seeding Destinations...");
  const destinationRecords: Record<string, string> = {};
  for (const d of DESTINATIONS) {
    const rec = await prisma.destination.upsert({
      where: { section_name: { section: d.section, name: d.name } },
      update: { standingNote: d.standingNote },
      create: d
    });
    destinationRecords[`${d.section}:${d.name}`] = rec.id;
  }

  console.log("Seeding TransportCompanies...");
  const companyIds: string[] = [];
  for (const name of TRANSPORT_COMPANIES) {
    const rec = await prisma.transportCompany.upsert({ where: { name }, update: {}, create: { name } });
    companyIds.push(rec.id);
  }

  console.log("Seeding demo users (password: Control321)...");
  const passwordHash = await bcrypt.hash("Control321", 10);
  const users = [
    { name: "แอดมิน สาธิต", email: "admin@ppwm-demo.local", role: "ADMIN" as const },
    { name: "แพลนเนอร์ สาธิต", email: "planner@ppwm-demo.local", role: "PLANNER" as const },
    { name: "หัวหน้าฝ่ายปฏิบัติการ สาธิต", email: "hoo@ppwm-demo.local", role: "HEAD_OF_OPERATION" as const },
    { name: "ผู้กรอกข้อมูล สาธิต", email: "entry@ppwm-demo.local", role: "DATA_ENTRY" as const },
    { name: "ผู้เยี่ยมชม สาธิต", email: "viewer@ppwm-demo.local", role: "VIEWER" as const }
  ];
  const userIds: Record<string, string> = {};
  for (const u of users) {
    const rec = await prisma.user.upsert({ where: { email: u.email }, update: {}, create: { ...u, passwordHash } });
    userIds[u.role] = rec.id;
  }

  console.log("Seeding WasteTrip rows...");
  const existingTrips = await prisma.wasteTrip.count();
  if (existingTrips === 0) {
    const today = new Date();
    const sectionWeights: [Section, number][] = [
      ["TF", 30],
      ["SP", 20],
      ["AR", 20],
      ["FC", 20],
      ["SRF", 10]
    ];
    function weightedSection() {
      const total = sectionWeights.reduce((s, [, w]) => s + w, 0);
      let r = rand() * total;
      for (const [s, w] of sectionWeights) {
        if (r < w) return s;
        r -= w;
      }
      return "TF" as Section;
    }
    const mappingBySection = new Map(MAPPINGS.map((m) => [m.section, m.typeWasteValue]));

    const trips = [];
    const daysBack = 60;
    for (let d = daysBack; d >= 0; d--) {
      const receivedDate = new Date(today);
      receivedDate.setDate(receivedDate.getDate() - d);
      const tripsToday = randInt(8, 16);
      for (let t = 0; t < tripsToday; t++) {
        const section = weightedSection();
        const customer = pick(CUSTOMERS);
        const weightRange: Record<Section, [number, number]> = {
          TF: [5, 25],
          SP: [3, 15],
          AR: [2, 12],
          FC: [1, 8],
          SRF: [4, 20]
        };
        const [minW, maxW] = weightRange[section];
        const receivedWeight = Number((minW + rand() * (maxW - minW)).toFixed(3));
        const isOld = d > 5; // older rows are mostly fully processed
        const transportConfirmed = isOld ? true : rand() > 0.3;
        const willTreat = transportConfirmed && (isOld ? rand() > 0.05 : rand() > 0.5);
        const treatedDate = willTreat ? new Date(receivedDate.getTime() + randInt(0, 4) * 86400000) : null;
        const treatedWeight = willTreat ? Number((receivedWeight * (0.9 + rand() * 0.08)).toFixed(3)) : null;
        const offSpec = rand() < 0.04;

        trips.push({
          receivedDate,
          transportDocumentNo: `DOC-${receivedDate.getFullYear()}${String(receivedDate.getMonth() + 1).padStart(2, "0")}-${String(d * 100 + t).padStart(4, "0")}`,
          customerCode: customer.code,
          customerName: customer.name,
          saleOrder: `SO-${randInt(100000, 999999)}`,
          wasteCode: `W${String(randInt(1, 99)).padStart(6, "0")}-${randInt(10, 99)}`,
          wasteName: `Waste ${section} ตัวอย่าง ${randInt(1, 20)} (ข้อมูลสาธิต)`,
          saleName: pick(["สมชาย ใจดี", "สมหญิง รักงาน", "วิชัย มั่นคง"]),
          saleSupport: pick(["ฝ่ายขาย A", "ฝ่ายขาย B", null]),
          receivedWeightTon: receivedWeight,
          transportConfirmed,
          treatedWeightTon: treatedWeight,
          treatedDate,
          typeWasteRaw: mappingBySection.get(section)!,
          offSpec,
          offSpecNote: offSpec ? "ตรวจพบค่าไม่ตรงสเปกที่รับได้ (ข้อมูลสาธิต)" : null,
          remark: null,
          recordedById: userIds["DATA_ENTRY"]
        });
      }
    }
    await prisma.wasteTrip.createMany({ data: trips });
    console.log(`  created ${trips.length} WasteTrip rows`);
  } else {
    console.log("  WasteTrip already has data, skipping.");
  }

  console.log("Seeding Export Plan months...");
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;
  const prevMonthDate = new Date(curYear, curMonth - 2, 1);
  const prevYear = prevMonthDate.getFullYear();
  const prevMonth = prevMonthDate.getMonth() + 1;

  // Prior month: fully signed & closed, using the spec's own §3.2/§3.3
  // illustrative example numbers as the seeded targets (documented judgment
  // call — see plan doc: this is seed data, not application logic, so it
  // doesn't conflict with "don't hard-code these numbers in the code").
  const prevMonthRecord = await prisma.exportPlanMonth.upsert({
    where: { year_month: { year: prevYear, month: prevMonth } },
    update: {},
    create: {
      year: prevYear,
      month: prevMonth,
      preparedByUserId: userIds["PLANNER"],
      preparedByName: "แพลนเนอร์ สาธิต",
      preparedAt: new Date(prevYear, prevMonth - 1, 28),
      receivedByUserId: userIds["HEAD_OF_OPERATION"],
      receivedByName: "หัวหน้าฝ่ายปฏิบัติการ สาธิต",
      receivedAt: new Date(prevYear, prevMonth - 1, 29),
      trackedByUserId: userIds["PLANNER"],
      trackedByName: "แพลนเนอร์ สาธิต",
      trackedAt: new Date(prevYear, prevMonth - 1, 30)
    }
  });

  const exampleTargets: Record<string, number> = {
    "TF:โรงงาน 1": 400,
    "SP:IN1": 180,
    "AR:S1": 100,
    "AR:IN1": 101,
    "FC:S2": 280,
    "FC:S1": 281
  };

  const prevDays = new Date(prevYear, prevMonth, 0).getDate();
  for (const d of DESTINATIONS) {
    const destId = destinationRecords[`${d.section}:${d.name}`];
    const target = exampleTargets[`${d.section}:${d.name}`] ?? null;
    const plannedDays = target
      ? Array.from({ length: prevDays }, (_, i) => i + 1).filter((day) => day % 3 === 0)
      : [];
    const block = await prisma.exportPlanBlock.upsert({
      where: { monthId_section_destinationId: { monthId: prevMonthRecord.id, section: d.section, destinationId: destId } },
      update: { targetPlanTon: target, plannedDays },
      create: { monthId: prevMonthRecord.id, section: d.section, destinationId: destId, targetPlanTon: target, plannedDays }
    });
    if (target && (await prisma.exportActualEntry.count({ where: { blockId: block.id } })) === 0) {
      // Closed month: fully matched (green) — actual on every planned day.
      for (const day of plannedDays) {
        await prisma.exportActualEntry.create({
          data: {
            blockId: block.id,
            shipmentDate: new Date(prevYear, prevMonth - 1, day),
            weightTon: Number((target / plannedDays.length).toFixed(3)),
            transportCompanyId: pick(companyIds),
            recordedById: userIds["PLANNER"]
          }
        });
      }
    }
  }

  // Current month: in progress, unsigned — a mix of matched/pending/missed/
  // unplanned so all 4 calendar states are demonstrable.
  const curMonthRecord = await prisma.exportPlanMonth.upsert({
    where: { year_month: { year: curYear, month: curMonth } },
    update: {},
    create: { year: curYear, month: curMonth }
  });
  const todayDay = now.getDate();
  const curDays = new Date(curYear, curMonth, 0).getDate();

  for (const d of DESTINATIONS) {
    const destId = destinationRecords[`${d.section}:${d.name}`];
    const target = randInt(80, 300);
    const plannedDays = Array.from({ length: curDays }, (_, i) => i + 1).filter((day) => day % 4 === 0);
    const block = await prisma.exportPlanBlock.upsert({
      where: { monthId_section_destinationId: { monthId: curMonthRecord.id, section: d.section, destinationId: destId } },
      update: { targetPlanTon: target, plannedDays },
      create: { monthId: curMonthRecord.id, section: d.section, destinationId: destId, targetPlanTon: target, plannedDays }
    });
    if ((await prisma.exportActualEntry.count({ where: { blockId: block.id } })) === 0) {
      for (const day of plannedDays) {
        if (day >= todayDay) continue; // future planned day -> "pending" (yellow), no actual yet
        if (rand() < 0.75) {
          // matched (green)
          await prisma.exportActualEntry.create({
            data: {
              blockId: block.id,
              shipmentDate: new Date(curYear, curMonth - 1, day),
              weightTon: Number((target / plannedDays.length).toFixed(3)),
              transportCompanyId: pick(companyIds),
              recordedById: userIds["PLANNER"]
            }
          });
        }
        // else: past planned day with no actual -> "missed" (red)
      }
      // One unplanned-but-shipped day (blue), if there's room before today.
      if (todayDay > 2) {
        const unplannedDay = Math.max(1, todayDay - 1);
        if (!plannedDays.includes(unplannedDay)) {
          await prisma.exportActualEntry.create({
            data: {
              blockId: block.id,
              shipmentDate: new Date(curYear, curMonth - 1, unplannedDay),
              weightTon: Number((target * 0.05).toFixed(3)),
              transportCompanyId: pick(companyIds),
              note: "ส่งจริงแบบไม่มีแผน (ข้อมูลสาธิต)",
              recordedById: userIds["PLANNER"]
            }
          });
        }
      }
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
