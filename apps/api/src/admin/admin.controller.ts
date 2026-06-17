import { Controller, Get } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('admin')
export class AdminController {
  @Get('users')
  @Roles(Role.Admin)
  getUsers() {
    return [];
  }
}
