import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

type SafeUser = Omit<User, 'password'>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<SafeUser> {
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingEmail) {
      throw new ConflictException('El email ya está registrado');
    }

    const existingRut = await this.prisma.user.findUnique({
      where: { rut: dto.rut },
    });
    if (existingRut) {
      throw new ConflictException('El RUT ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        rut: dto.rut,
        nombres: dto.nombres,
        apellidos: dto.apellidos,
        email: dto.email,
        telefono: dto.telefono,
        password: hashedPassword,
        rol: dto.rol,
        carreraId: dto.carreraId,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...safeUser } = user;
    return safeUser;
  }

  async login(dto: LoginDto): Promise<{
    access_token: string;
    user: Pick<
      User,
      'id' | 'rut' | 'nombres' | 'apellidos' | 'email' | 'rol' | 'estado' | 'carreraId'
    >;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.estado) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = { sub: user.id, email: user.email, rol: user.rol };
    const access_token = await this.jwtService.signAsync(payload);

    return {
      access_token,
      user: {
        id: user.id,
        rut: user.rut,
        nombres: user.nombres,
        apellidos: user.apellidos,
        email: user.email,
        rol: user.rol,
        estado: user.estado,
        carreraId: user.carreraId,
      },
    };
  }
}
