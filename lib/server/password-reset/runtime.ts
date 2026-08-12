import 'server-only';
import {MicrosoftGraphMailer} from '../mail/microsoft-graph';
import {PostgresPasswordResetRepository} from './postgres';
import {PasswordResetService} from './service';
export const passwordResetService=()=>new PasswordResetService(new PostgresPasswordResetRepository(),new MicrosoftGraphMailer(),process.env.APP_URL||'http://localhost:3000');
