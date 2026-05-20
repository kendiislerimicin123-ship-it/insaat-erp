import {
  Injectable,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly BCRYPT_ROUNDS = 12;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ────────────────────────────────────
  // REGISTER
  // ────────────────────────────────────
  async register(dto: RegisterDto) {
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.companySlug },
    });
    if (existingTenant) {
      throw new ConflictException('Bu firma slug zaten kullanılıyor');
    }

    if (dto.taxNumber) {
      const existingTax = await this.prisma.tenant.findUnique({
        where: { taxNumber: dto.taxNumber },
      });
      if (existingTax) {
        throw new ConflictException('Bu vergi numarası zaten kayıtlı');
      }
    }

    const hashedPassword = await bcrypt.hash(dto.password, this.BCRYPT_ROUNDS);

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: {
            name: dto.companyName,
            slug: dto.companySlug,
            taxNumber: dto.taxNumber,
            email: dto.email,
            status: 'TRIAL',
          },
        });

        const user = await tx.user.create({
          data: {
            tenantId: tenant.id,
            email: dto.email,
            password: hashedPassword,
            firstName: dto.firstName,
            lastName: dto.lastName,
            phone: dto.phone,
            status: 'ACTIVE',
          },
        });

        return { tenant, user };
      });

      this.logger.log(
        `✅ Yeni firma kaydı: ${result.tenant.name} (${result.tenant.slug}) | User: ${result.user.email}`,
      );

      const { password: _, ...userWithoutPassword } = result.user;

      return {
        message: 'Kayıt başarılı',
        tenant: {
          id: result.tenant.id,
          name: result.tenant.name,
          slug: result.tenant.slug,
          status: result.tenant.status,
        },
        user: userWithoutPassword,
      };
    } catch (error) {
      this.logger.error('Register hatası', error);
      throw new BadRequestException('Kayıt sırasında bir hata oluştu');
    }
  }

  // ────────────────────────────────────
  // LOGIN
  // ────────────────────────────────────
  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.companySlug },
    });

    if (!tenant || tenant.deletedAt) {
      throw new UnauthorizedException('Geçersiz firma veya kullanıcı bilgileri');
    }

    if (tenant.status === 'SUSPENDED' || tenant.status === 'EXPIRED') {
      throw new UnauthorizedException(
        `Firma hesabınız ${tenant.status === 'SUSPENDED' ? 'askıya alınmış' : 'süresi dolmuş'}.`,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email: dto.email,
        },
      },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Geçersiz firma veya kullanıcı bilgileri');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Hesabınız aktif değil');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Geçersiz firma veya kullanıcı bilgileri');
    }

    return this.generateTokensAndPersist(user, tenant, ipAddress, userAgent);
  }

  // ────────────────────────────────────
  // REFRESH TOKEN
  // ────────────────────────────────────
  async refresh(refreshToken: string, ipAddress?: string, userAgent?: string) {
    // 1. Token'ı doğrula (signature + expiry)
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Geçersiz veya süresi dolmuş refresh token');
    }

    // 2. DB'de bu token var mı? Revoke edilmiş mi?
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Refresh token bulunamadı');
    }

    if (storedToken.revokedAt) {
      this.logger.warn(`⚠️ Revoke edilmiş token kullanım denemesi: user ${storedToken.userId}`);
      throw new UnauthorizedException('Bu refresh token iptal edilmiş');
    }

    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token süresi dolmuş');
    }

    // 3. Kullanıcıyı DB'den çek (durumu hala geçerli mi?)
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || user.deletedAt || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Kullanıcı aktif değil');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
    });

    if (!tenant || tenant.deletedAt) {
      throw new UnauthorizedException('Firma bulunamadı');
    }

    // 4. Eski refresh token'ı iptal et (token rotation)
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    this.logger.log(`🔄 Token yenileme: ${user.email} (${tenant.slug})`);

    // 5. Yeni access + refresh token üret
    return this.generateTokensAndPersist(user, tenant, ipAddress, userAgent);
  }

  // ────────────────────────────────────
  // LOGOUT
  // ────────────────────────────────────
  async logout(userId: string, refreshToken?: string) {
    // Eğer refresh token verildiyse sadece onu revoke et
    if (refreshToken) {
      const token = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
      });

      if (token && token.userId === userId && !token.revokedAt) {
        await this.prisma.refreshToken.update({
          where: { id: token.id },
          data: { revokedAt: new Date() },
        });
      }
    } else {
      // Refresh token yoksa kullanıcının TÜM aktif token'larını revoke et
      await this.prisma.refreshToken.updateMany({
        where: {
          userId,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    }

    this.logger.log(`🚪 Logout: user ${userId}`);

    return { message: 'Çıkış başarılı' };
  }

  // ────────────────────────────────────
  // YARDIMCI: Token üret + DB'ye kaydet + last login güncelle
  // ────────────────────────────────────
  private async generateTokensAndPersist(
    user: { id: string; tenantId: string; email: string; password: string; [k: string]: unknown },
    tenant: { id: string; name: string; slug: string },
    ipAddress?: string,
    userAgent?: string,
  ) {
    const payload: JwtPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      email: user.email,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        userAgent,
        ipAddress,
        expiresAt,
      },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
      },
    });

    const { password: _, ...userWithoutPassword } = user;

    return {
      message: 'Giriş başarılı',
      accessToken,
      refreshToken,
      user: userWithoutPassword,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      },
    };
  }
}