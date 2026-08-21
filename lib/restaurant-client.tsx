'use client';
import {createContext,useContext,useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import type {PermissionAction,Restaurant} from './schema';
type User={name:string;permissions:string[];company:string;department:string;costCenter:string};
type Value={user:User|null;restaurants:Restaurant[];activeRestaurant:Restaurant|null;loading:boolean;selectRestaurant:(slug:string)=>Promise<void>};
const Context=createContext<Value>({user:null,restaurants:[],activeRestaurant:null,loading:true,selectRestaurant:async()=>{}});
export function RestaurantProvider({children}:{children:React.ReactNode}){const router=useRouter();const[user,setUser]=useState<User|null>(null),[restaurants,setRestaurants]=useState<Restaurant[]>([]),[activeRestaurant,setActive]=useState<Restaurant|null>(null),[loading,setLoading]=useState(true);useEffect(()=>{fetch('/api/restaurants',{cache:'no-store'}).then(async r=>r.ok?r.json():Promise.reject()).then(data=>{setUser(data.user);setRestaurants(data.restaurants);setActive(data.activeRestaurant)}).finally(()=>setLoading(false))},[]);async function selectRestaurant(slug:string){const response=await fetch('/api/restaurants/active',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({slug})});if(!response.ok)throw new Error('Akses restoran ditolak.');const data=await response.json();setActive(data.activeRestaurant);router.refresh()}return <Context.Provider value={{user,restaurants,activeRestaurant,loading,selectRestaurant}}>{children}</Context.Provider>}
export const useRestaurant=()=>useContext(Context);
