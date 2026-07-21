import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

/**
 * ════════════════════════════════════════════════════════════
 * DEMO / TEST VERİSİ
 * ════════════════════════════════════════════════════════════
 * Sadece SEED_DEMO=true iken çalışır.
 *
 * Kullanım:
 *   $env:SEED_DEMO="true"; npm run db:seed --workspace=packages/database
 *
 * İdempotent: aynı slug/kod varsa yeniden oluşturmaz.
 * ════════════════════════════════════════════════════════════
 */

const TEST_PASSWORD = 'Test1234!';
const BCRYPT_ROUNDS = 12;

export async function seedDemo(prisma: PrismaClient) {
  console.log('🎭 Demo verisi yükleniyor...\n');

  const passwordHash = await bcrypt.hash(TEST_PASSWORD, BCRYPT_ROUNDS);

  // ══════════════════════════════════════
  // 1. TENANT
  // ══════════════════════════════════════
  let tenant = await prisma.tenant.findUnique({
    where: { slug: 'acme-insaat' },
  });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: 'Acme İnşaat A.Ş.',
        slug: 'acme-insaat',
        taxNumber: '1234567890',
        email: 'info@acme.com',
        phone: '02121234567',
        city: 'İstanbul',
        status: 'ACTIVE',
      },
    });
    console.log(`   ✅ Tenant oluşturuldu: ${tenant.name} (${tenant.id})`);
  } else {
    console.log(`   ℹ️  Tenant zaten var: ${tenant.name}`);
  }

  const tenantId = tenant.id;

  // ══════════════════════════════════════
  // 2. KULLANICILAR
  // ══════════════════════════════════════
  const roles = await prisma.role.findMany({
    where: { tenantId: null, isSystem: true },
  });
  const roleMap = new Map(roles.map((r) => [r.slug, r.id]));

  const USERS = [
    { email: 'ahmet@acme.com', firstName: 'Ahmet', lastName: 'Yılmaz', roles: ['COMPANY_ADMIN'] },
    { email: 'mehmet@acme.com', firstName: 'Mehmet', lastName: 'Demir', roles: ['PROJECT_MANAGER'] },
    { email: 'ali@acme.com', firstName: 'Ali', lastName: 'Kaya', roles: ['PROJECT_MANAGER', 'VIEWER'] },
  ];

  for (const u of USERS) {
    const existing = await prisma.user.findFirst({
      where: { tenantId, email: u.email },
    });

    if (existing) {
      console.log(`   ℹ️  Kullanıcı zaten var: ${u.email}`);
      continue;
    }

    const user = await prisma.user.create({
      data: {
        tenantId,
        email: u.email,
        password: passwordHash,
        firstName: u.firstName,
        lastName: u.lastName,
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
      },
    });

    for (const roleSlug of u.roles) {
      const roleId = roleMap.get(roleSlug);
      if (roleId) {
        await prisma.userRole.create({
          data: { userId: user.id, roleId },
        });
      }
    }

    console.log(`   ✅ Kullanıcı: ${u.email} → ${u.roles.join(', ')}`);
  }

  // ══════════════════════════════════════
  // 3. PROJELER
  // ══════════════════════════════════════
  const PROJECTS = [
    {
      code: 'PRJ-2026-001',
      name: 'Çamlıca Konutları İnşaatı',
      city: 'İstanbul',
      district: 'Üsküdar',
      clientName: 'ABC Gayrimenkul A.Ş.',
      contractAmount: 45000000,
      status: 'ACTIVE' as const,
    },
    {
      code: 'PRJ-2026-002',
      name: 'Maslak Ofis Kompleksi',
      city: 'İstanbul',
      district: 'Sarıyer',
      clientName: 'XYZ Yatırım Ltd.',
      contractAmount: 78000000,
      status: 'ACTIVE' as const,
    },
    {
      code: 'PRJ-2026-003',
      name: 'Ankara Lojistik Deposu',
      city: 'Ankara',
      district: 'Sincan',
      clientName: 'Hızlı Lojistik A.Ş.',
      contractAmount: 12500000,
      status: 'PLANNING' as const,
    },
  ];

  for (const p of PROJECTS) {
    const existing = await prisma.project.findFirst({
      where: { tenantId, code: p.code },
    });
    if (existing) {
      console.log(`   ℹ️  Proje zaten var: ${p.code}`);
      continue;
    }

    await prisma.project.create({
      data: {
        tenantId,
        code: p.code,
        name: p.name,
        city: p.city,
        district: p.district,
        clientName: p.clientName,
        contractAmount: p.contractAmount,
        status: p.status,
        startDate: new Date('2026-01-15'),
        endDate: new Date('2027-06-30'),
        createdBy: 'SEED',
        updatedBy: 'SEED',
      },
    });
    console.log(`   ✅ Proje: ${p.code} — ${p.name}`);
  }

  // ══════════════════════════════════════
  // 4. TAŞERONLAR
  // ══════════════════════════════════════
  const SUBCONTRACTORS = [
    {
      code: 'BET-001',
      name: 'Anadolu Beton Sanayi A.Ş.',
      category: 'CONCRETE' as const,
      contactPerson: 'Mehmet Demir',
      phone: '05551234567',
      taxNumber: '9876543210',
    },
    {
      code: 'DEM-001',
      name: 'Yıldız Demir Çelik Ltd.',
      category: 'REBAR' as const,
      contactPerson: 'Hasan Çelik',
      phone: '05559876543',
      taxNumber: '5556667770',
    },
    {
      code: 'ELK-001',
      name: 'Volt Elektrik Taahhüt',
      category: 'ELECTRICAL' as const,
      contactPerson: 'Kemal Aydın',
      phone: '05553334455',
      taxNumber: '1112223330',
    },
  ];

  for (const s of SUBCONTRACTORS) {
    const existing = await prisma.subcontractor.findFirst({
      where: { tenantId, code: s.code },
    });
    if (existing) {
      console.log(`   ℹ️  Taşeron zaten var: ${s.code}`);
      continue;
    }

    await prisma.subcontractor.create({
      data: {
        tenantId,
        code: s.code,
        name: s.name,
        category: s.category,
        contactPerson: s.contactPerson,
        phone: s.phone,
        taxNumber: s.taxNumber,
        city: 'İstanbul',
        status: 'ACTIVE',
        createdBy: 'SEED',
        updatedBy: 'SEED',
      },
    });
    console.log(`   ✅ Taşeron: ${s.code} — ${s.name}`);
  }

  // ══════════════════════════════════════
  // 5. TAŞERON İŞÇİLERİ (BET-001 ekibi)
  // ══════════════════════════════════════
  const betoncu = await prisma.subcontractor.findFirst({
    where: { tenantId, code: 'BET-001' },
  });

  if (betoncu) {
    const EMPLOYEES = [
      { name: 'Ahmet Yılmaz', specialty: 'MASTER' as const, role: 'Demirci', dailyWage: 2000 },
      { name: 'Hasan Çelik', specialty: 'OPERATOR' as const, role: 'Vinç Operatörü', dailyWage: 1000 },
      { name: 'Mustafa Kara', specialty: 'FOREMAN' as const, role: 'Ustabaşı', dailyWage: 1500 },
      { name: 'İbrahim Şahin', specialty: 'LABORER' as const, role: 'Düz İşçi', dailyWage: 800 },
    ];

    for (const e of EMPLOYEES) {
      const existing = await prisma.subcontractorEmployee.findFirst({
        where: { tenantId, subcontractorId: betoncu.id, name: e.name },
      });
      if (existing) continue;

      await prisma.subcontractorEmployee.create({
        data: {
          tenantId,
          subcontractorId: betoncu.id,
          name: e.name,
          specialty: e.specialty,
          role: e.role,
          dailyWage: e.dailyWage,
          status: 'ACTIVE',
          startDate: new Date('2026-01-01'),
          createdBy: 'SEED',
          updatedBy: 'SEED',
        },
      });
      console.log(`   ✅ İşçi: ${e.name} (${e.role}) — ₺${e.dailyWage}/gün`);
    }
  }

  // ══════════════════════════════════════
  // 6. CARİ HESAPLAR
  // ══════════════════════════════════════
  const CONTACTS = [
    {
      code: 'CR-001',
      name: 'ABC Çimento Sanayi A.Ş.',
      type: 'SUPPLIER' as const,
      contactPerson: 'Mehmet Yıldız',
      phone: '05322555555',
      taxNumber: '1234567890',
      taxOffice: 'Beşiktaş',
      paymentTerms: 30,
      creditLimit: 500000,
    },
    {
      code: 'CR-002',
      name: 'ABC Gayrimenkul A.Ş.',
      type: 'CUSTOMER' as const,
      contactPerson: 'Ayşe Kara',
      phone: '05324445566',
      taxNumber: '2345678901',
      taxOffice: 'Kadıköy',
      paymentTerms: 45,
      creditLimit: 2000000,
    },
    {
      code: 'CR-003',
      name: 'Demir Nakliyat Ltd.',
      type: 'SUPPLIER' as const,
      contactPerson: 'Ali Demir',
      phone: '05327778899',
      taxNumber: '3456789012',
      taxOffice: 'Ümraniye',
      paymentTerms: 15,
      creditLimit: 150000,
    },
    {
      code: 'CR-004',
      name: 'XYZ Yatırım Ltd.',
      type: 'CUSTOMER' as const,
      contactPerson: 'Zeynep Ak',
      phone: '05321112233',
      taxNumber: '4567890123',
      taxOffice: 'Şişli',
      paymentTerms: 60,
      creditLimit: 3000000,
    },
  ];

  for (const c of CONTACTS) {
    const existing = await prisma.contact.findFirst({
      where: { tenantId, code: c.code },
    });
    if (existing) {
      console.log(`   ℹ️  Cari zaten var: ${c.code}`);
      continue;
    }

    await prisma.contact.create({
      data: {
        tenantId,
        code: c.code,
        name: c.name,
        type: c.type,
        contactPerson: c.contactPerson,
        phone: c.phone,
        taxNumber: c.taxNumber,
        taxOffice: c.taxOffice,
        paymentTerms: c.paymentTerms,
        creditLimit: c.creditLimit,
        city: 'İstanbul',
        status: 'ACTIVE',
        createdBy: 'SEED',
        updatedBy: 'SEED',
      },
    });
    console.log(`   ✅ Cari: ${c.code} — ${c.name} (${c.type})`);
  }

  // ══════════════════════════════════════
  // 7. MALZEMELER
  // ══════════════════════════════════════
  const MATERIALS = [
    {
      code: 'MAT-001',
      name: 'Çimento CEM I 42.5',
      category: 'CEMENT' as const,
      unit: 'TON' as const,
      minStock: 10,
    },
    {
      code: 'MAT-002',
      name: 'İnşaat Demiri Ø12',
      category: 'STEEL' as const,
      unit: 'TON' as const,
      minStock: 5,
    },
    {
      code: 'MAT-003',
      name: 'Hazır Beton C30/37',
      category: 'CEMENT' as const,
      unit: 'M3' as const,
      minStock: 0,
    },
    {
      code: 'MAT-004',
      name: 'Tuğla 19x19x13',
      category: 'BRICK_BLOCK' as const,
      unit: 'PIECE' as const,
      minStock: 1000,
    },
    {
      code: 'MAT-005',
      name: 'Kum (Yıkanmış)',
      category: 'AGGREGATE' as const,
      unit: 'M3' as const,
      minStock: 20,
    },
  ];

  for (const m of MATERIALS) {
    const existing = await prisma.material.findFirst({
      where: { tenantId, code: m.code },
    });
    if (existing) {
      console.log(`   ℹ️  Malzeme zaten var: ${m.code}`);
      continue;
    }

    await prisma.material.create({
      data: {
        tenantId,
        code: m.code,
        name: m.name,
        category: m.category,
        unit: m.unit,
        minStock: m.minStock,
        currency: 'TRY',
        createdBy: 'SEED',
        updatedBy: 'SEED',
      },
    });
    console.log(`   ✅ Malzeme: ${m.code} — ${m.name}`);
  }

  // ══════════════════════════════════════
  // ÖZET
  // ══════════════════════════════════════
  console.log('\n   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   🔑 Test hesapları (şifre: Test1234!)');
  console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   Firma kodu : acme-insaat');
  console.log('   ahmet@acme.com    → COMPANY_ADMIN');
  console.log('   mehmet@acme.com   → PROJECT_MANAGER');
  console.log('   ali@acme.com      → PROJECT_MANAGER + VIEWER');
  console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}