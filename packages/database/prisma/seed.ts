import { PrismaClient } from '@prisma/client';
import { seedDemo } from './seed-demo';

const prisma = new PrismaClient();

// ────────────────────────────────────
// İZİN LİSTESİ (Resource + Action)
// ────────────────────────────────────
const PERMISSIONS = [
  // Tenant yönetimi
  { resource: 'tenant', action: 'read', description: 'Firma bilgisi görüntüleme' },
  { resource: 'tenant', action: 'update', description: 'Firma bilgisi düzenleme' },

  // Kullanıcı yönetimi
  { resource: 'user', action: 'create', description: 'Yeni kullanıcı oluşturma' },
  { resource: 'user', action: 'read', description: 'Kullanıcı görüntüleme' },
  { resource: 'user', action: 'update', description: 'Kullanıcı düzenleme' },
  { resource: 'user', action: 'delete', description: 'Kullanıcı silme' },

  // Rol yönetimi
  { resource: 'role', action: 'create', description: 'Yeni rol oluşturma' },
  { resource: 'role', action: 'read', description: 'Rol görüntüleme' },
  { resource: 'role', action: 'update', description: 'Rol düzenleme' },
  { resource: 'role', action: 'delete', description: 'Rol silme' },
  { resource: 'role', action: 'assign', description: 'Kullanıcıya rol atama' },

  // İzin yönetimi
  { resource: 'permission', action: 'read', description: 'İzinleri görüntüleme' },
  { resource: 'permission', action: 'grant', description: 'Role izin verme' },

  // Proje yönetimi
  { resource: 'project', action: 'create', description: 'Yeni proje oluşturma' },
  { resource: 'project', action: 'read', description: 'Proje görüntüleme' },
  { resource: 'project', action: 'update', description: 'Proje düzenleme' },
  { resource: 'project', action: 'delete', description: 'Proje silme' },

  // Taşeron yönetimi
  { resource: 'subcontractor', action: 'create', description: 'Yeni taşeron oluşturma' },
  { resource: 'subcontractor', action: 'read', description: 'Taşeron görüntüleme' },
  { resource: 'subcontractor', action: 'update', description: 'Taşeron düzenleme' },
  { resource: 'subcontractor', action: 'delete', description: 'Taşeron silme' },

  // Hakediş yönetimi
  { resource: 'progress-payment', action: 'create', description: 'Yeni hakediş oluşturma' },
  { resource: 'progress-payment', action: 'read', description: 'Hakediş görüntüleme' },
  { resource: 'progress-payment', action: 'update', description: 'Hakediş düzenleme' },
  { resource: 'progress-payment', action: 'delete', description: 'Hakediş silme' },
  { resource: 'progress-payment', action: 'approve', description: 'Hakediş onaylama' },
  { resource: 'progress-payment', action: 'pay', description: 'Hakediş ödeme' },

  // Malzeme yönetimi
  { resource: 'material', action: 'create', description: 'Yeni malzeme oluşturma' },
  { resource: 'material', action: 'read', description: 'Malzeme görüntüleme' },
  { resource: 'material', action: 'update', description: 'Malzeme düzenleme' },
  { resource: 'material', action: 'delete', description: 'Malzeme silme' },
  { resource: 'material', action: 'movement', description: 'Stok hareketi yapma (giriş/çıkış)' },

  // Cari hesap yönetimi
  { resource: 'contact', action: 'create', description: 'Yeni cari hesap oluşturma' },
  { resource: 'contact', action: 'read', description: 'Cari hesap görüntüleme' },
  { resource: 'contact', action: 'update', description: 'Cari hesap düzenleme' },
  { resource: 'contact', action: 'delete', description: 'Cari hesap silme' },

  // Cari hareket yönetimi
  { resource: 'contact-transaction', action: 'create', description: 'Cari hareket girişi' },
  { resource: 'contact-transaction', action: 'read', description: 'Cari hareket görüntüleme' },
  { resource: 'contact-transaction', action: 'delete', description: 'Cari hareket silme' },

  // Çek/Senet yönetimi
  { resource: 'cheque', action: 'create', description: 'Yeni çek/senet kaydı' },
  { resource: 'cheque', action: 'read', description: 'Çek/senet görüntüleme' },
  { resource: 'cheque', action: 'update', description: 'Çek/senet durum değişimi' },
  { resource: 'cheque', action: 'delete', description: 'Çek/senet silme' },

  // İşçi / Ekip yönetimi
  { resource: 'employee', action: 'create', description: 'Yeni işçi/ekip üyesi ekleme' },
  { resource: 'employee', action: 'read', description: 'İşçi/ekip görüntüleme' },
  { resource: 'employee', action: 'update', description: 'İşçi/ekip düzenleme' },
  { resource: 'employee', action: 'delete', description: 'İşçi/ekip silme' },

  // Puantaj yönetimi
  { resource: 'timesheet', action: 'create', description: 'Yeni puantaj girişi' },
  { resource: 'timesheet', action: 'read', description: 'Puantaj görüntüleme' },
  { resource: 'timesheet', action: 'update', description: 'Puantaj düzenleme' },
  { resource: 'timesheet', action: 'delete', description: 'Puantaj silme' },
  { resource: 'timesheet', action: 'approve', description: 'Puantaj onaylama' },

  // Expense (Genel Gider)
  { resource: 'expense', action: 'create', description: 'Genel gider kaydı oluşturma' },
  { resource: 'expense', action: 'read', description: 'Genel giderleri görüntüleme' },
  { resource: 'expense', action: 'update', description: 'Genel gider güncelleme' },
  { resource: 'expense', action: 'delete', description: 'Genel gider silme' },

  // Invoice (Fatura)
  { resource: 'invoice', action: 'create', description: 'Yeni fatura oluşturma' },
  { resource: 'invoice', action: 'read', description: 'Fatura görüntüleme' },
  { resource: 'invoice', action: 'update', description: 'Fatura düzenleme (sadece taslak)' },
  { resource: 'invoice', action: 'delete', description: 'Fatura silme (sadece taslak)' },
  { resource: 'invoice', action: 'confirm', description: 'Fatura onaylama (cari/stok/gider oluşturur)' },
  { resource: 'invoice', action: 'pay', description: 'Fatura ödeme işaretleme' },
  { resource: 'invoice', action: 'cancel', description: 'Fatura iptal (otomatik kayıtları geri çeker)' },

  // Audit log
  { resource: 'audit', action: 'read', description: 'Audit log görüntüleme' },
];

// ────────────────────────────────────
// SİSTEM ROLLERİ
// ────────────────────────────────────
const SYSTEM_ROLES = [
  {
    slug: 'SUPER_ADMIN',
    name: 'Süper Admin',
    description: 'Sistem geneli yönetici, tüm tenantlara erişebilir',
    permissions: '*',
  },
  {
    slug: 'COMPANY_ADMIN',
    name: 'Firma Yöneticisi',
    description: 'Firma içinde tüm yetkilere sahip',
    permissions: [
      'tenant.read',
      'tenant.update',
      'user.create',
      'user.read',
      'user.update',
      'user.delete',
      'role.read',
      'role.assign',
      'permission.read',
      'project.create',
      'project.read',
      'project.update',
      'project.delete',
      'subcontractor.create',
      'subcontractor.read',
      'subcontractor.update',
      'subcontractor.delete',
      'progress-payment.create',
      'progress-payment.read',
      'progress-payment.update',
      'progress-payment.delete',
      'progress-payment.approve',
      'progress-payment.pay',
      'material.create',
      'material.read',
      'material.update',
      'material.delete',
      'material.movement',
      'contact.create',
      'contact.read',
      'contact.update',
      'contact.delete',
      'contact-transaction.create',
      'contact-transaction.read',
      'contact-transaction.delete',
      'cheque.create',
      'cheque.read',
      'cheque.update',
      'cheque.delete',
      'employee.create',
      'employee.read',
      'employee.update',
      'employee.delete',
      'timesheet.create',
      'timesheet.read',
      'timesheet.update',
      'timesheet.delete',
      'timesheet.approve',
      'expense.create',
      'expense.read',
      'expense.update',
      'expense.delete',
      'invoice.create',
      'invoice.read',
      'invoice.update',
      'invoice.delete',
      'invoice.confirm',
      'invoice.pay',
      'invoice.cancel',
      'audit.read',
    ],
  },
  {
    slug: 'PROJECT_MANAGER',
    name: 'Proje Yöneticisi',
    description: 'Projeleri yönetir, kullanıcıları görüntüler',
    permissions: [
      'tenant.read',
      'user.read',
      'project.create',
      'project.read',
      'project.update',
      'subcontractor.read',
      'subcontractor.update',
      'progress-payment.create',
      'progress-payment.read',
      'progress-payment.update',
      'material.read',
      'material.update',
      'material.movement',
      'contact.read',
      'contact.update',
      'contact-transaction.create',
      'contact-transaction.read',
      'cheque.read',
      'cheque.update',
      'employee.create',
      'employee.read',
      'employee.update',
      'timesheet.create',
      'timesheet.read',
      'timesheet.update',
      'timesheet.approve',
      'expense.create',
      'expense.read',
      'invoice.create',
      'invoice.read',
      'invoice.update',
    ],
  },
  {
    slug: 'VIEWER',
    name: 'Görüntüleyici',
    description: 'Sadece okuma yetkisi',
    permissions: [
      'tenant.read',
      'user.read',
      'project.read',
      'subcontractor.read',
      'progress-payment.read',
      'material.read',
      'contact.read',
      'contact-transaction.read',
      'cheque.read',
      'employee.read',
      'timesheet.read',
      'expense.read',
      'invoice.read',
    ],
  },
];

async function main() {
  console.log('🌱 Seed başlıyor...\n');

  // ─── 1. İzinleri yükle (upsert) ───
  console.log('📋 İzinler yükleniyor...');
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: {
        resource_action: {
          resource: perm.resource,
          action: perm.action,
        },
      },
      update: { description: perm.description },
      create: perm,
    });
  }
  console.log(`   ✅ ${PERMISSIONS.length} izin yüklendi\n`);

  // ─── 2. Tüm izinleri al ───
  const allPermissions = await prisma.permission.findMany();
  const permissionMap = new Map(
    allPermissions.map((p) => [`${p.resource}.${p.action}`, p.id]),
  );

  // ─── 3. Sistem rollerini yükle (İDEMPOTENT) ───
  console.log('👥 Sistem rolleri yükleniyor...');
  for (const role of SYSTEM_ROLES) {
    const existing = await prisma.role.findFirst({
      where: {
        slug: role.slug,
        tenantId: null,
        isSystem: true,
      },
    });

    const createdRole = existing
      ? await prisma.role.update({
          where: { id: existing.id },
          data: {
            name: role.name,
            description: role.description,
            deletedAt: null,
          },
        })
      : await prisma.role.create({
          data: {
            slug: role.slug,
            name: role.name,
            description: role.description,
            isSystem: true,
            tenantId: null,
          },
        });

    // ─── 4. Role izinleri ata ───
    const permissionsToGrant =
      role.permissions === '*'
        ? allPermissions.map((p) => p.id)
        : (role.permissions as string[])
            .map((key) => permissionMap.get(key))
            .filter((id): id is string => Boolean(id));

    await prisma.rolePermission.deleteMany({
      where: { roleId: createdRole.id },
    });

    if (permissionsToGrant.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionsToGrant.map((permissionId) => ({
          roleId: createdRole.id,
          permissionId,
        })),
        skipDuplicates: true,
      });
    }

    const action = existing ? 'güncellendi' : 'oluşturuldu';
    console.log(
      `   ✅ ${role.slug.padEnd(20)} → ${permissionsToGrant.length} izin (${action})`,
    );
  }

  console.log('\n🎉 Temel seed tamamlandı!\n');

  // ─── 5. DEMO VERİSİ (sadece SEED_DEMO=true ise) ───
  if (process.env.SEED_DEMO === 'true') {
    await seedDemo(prisma);
    console.log('🎉 Demo verisi tamamlandı!\n');
  } else {
    console.log('ℹ️  Demo verisi atlandı (SEED_DEMO=true ile çalıştırın)\n');
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed başarısız:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });