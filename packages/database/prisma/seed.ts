import { PrismaClient } from '@prisma/client';

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
    permissions: '*', // Tüm izinler
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

  // ─── 3. Sistem rollerini yükle (İDEMPOTENT FIX) ───
  console.log('👥 Sistem rolleri yükleniyor...');
  for (const role of SYSTEM_ROLES) {
    // ✅ FIX: NULL tenantId için upsert kullanılamaz (composite unique işe yaramaz).
    // findFirst → update OR create pattern'i ile gerçek idempotency sağlıyoruz.
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
            // deletedAt'i null'a çek — yanlışlıkla soft-delete olmuşsa düzelt
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

    // Eski izinleri temizle (her seed'de yenilemek için)
    await prisma.rolePermission.deleteMany({
      where: { roleId: createdRole.id },
    });

    // Yeni izinleri ekle
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

  console.log('\n🎉 Seed tamamlandı!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed başarısız:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });