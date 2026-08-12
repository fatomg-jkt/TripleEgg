import 'server-only';
import {promises as fs} from 'fs';
import path from 'path';
import type {AppUser,SafeUser} from '@/lib/schema';
import {hashPassword} from './password';

const file=process.env.AUTH_USERS_FILE||path.join(process.cwd(),'data','users.json');
const seeds=()=>[
 ['Raisa Admin','raisa@tripleegg.co.id','Super Admin'],['Uma Haposari','uma@tripleegg.co.id','Finance Manager'],['Ayu Accounting','ayu@tripleegg.co.id','Accounting'],['Dimas Staff','dimas@tripleegg.co.id','Staff'],['Vina Viewer','vina@tripleegg.co.id','Viewer']
].map(([name,email,role],i)=>({id:`seed-${i+1}`,name,email,passwordHash:hashPassword(process.env.DEV_SEED_PASSWORD||'TripleEgg123!'),role,company:'PT Triple Egg',department:i===0?'All':'Finance',costCenter:i===0?'All':'CC-001',status:'Active',lastLogin:null,requirePasswordChange:true})) as AppUser[];
async function ensure(){try{await fs.access(file)}catch{await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,JSON.stringify(seeds(),null,2),{flag:'wx'}).catch(()=>{})}}
async function read(){await ensure();return JSON.parse(await fs.readFile(file,'utf8')) as AppUser[]}
async function write(users:AppUser[]){await fs.writeFile(file,JSON.stringify(users,null,2))}
export const sanitize=({passwordHash,...user}:AppUser):SafeUser=>user;
export const userRepository={
 async list(){return (await read()).map(sanitize)},
 async findByEmail(email:string){return (await read()).find(u=>u.email.toLowerCase()===email.trim().toLowerCase())},
 async findById(id:string){return (await read()).find(u=>u.id===id)},
 async create(input:Omit<AppUser,'id'|'lastLogin'|'passwordHash'> & {password:string}){const users=await read();if(users.some(u=>u.email.toLowerCase()===input.email.toLowerCase()))throw new Error('Email sudah digunakan.');const {password,...rest}=input;const user:AppUser={...rest,id:crypto.randomUUID(),lastLogin:null,passwordHash:hashPassword(password)};users.push(user);await write(users);return sanitize(user)},
 async update(id:string,patch:Partial<Pick<AppUser,'name'|'email'|'role'|'company'|'department'|'costCenter'|'status'|'lastLogin'>>){const users=await read(),index=users.findIndex(u=>u.id===id);if(index<0)throw new Error('User tidak ditemukan.');users[index]={...users[index],...patch};await write(users);return sanitize(users[index])},
 async password(id:string,password:string,required:boolean){const users=await read(),user=users.find(u=>u.id===id);if(!user)throw new Error('User tidak ditemukan.');user.passwordHash=hashPassword(password);user.requirePasswordChange=required;await write(users);return sanitize(user)}
};
