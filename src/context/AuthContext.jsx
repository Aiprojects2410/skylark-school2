import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { hasSupabase, supabase } from '../lib/supabase'
const AuthContext = createContext(null)
const DEMO_PROFILE={id:'demo-admin',full_name:'Admin User',role:'admin',login_code:'SKY-ADM-2026-0001',email:'admin@skylarkschool.edu'}
export function AuthProvider({children}){
 const [session,setSession]=useState(undefined); const [profile,setProfile]=useState(undefined); const [profileError,setProfileError]=useState('')
 useEffect(()=>{if(!hasSupabase){setSession(null);setProfile(DEMO_PROFILE);return}supabase.auth.getSession().then(({data})=>setSession(data.session));const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>setSession(next));return()=>subscription.unsubscribe()},[])
 useEffect(()=>{if(!hasSupabase||session===undefined)return;if(!session){setProfile(null);return}let cancelled=false;supabase.from('profiles').select('id, full_name, role, phone, avatar_url, email, login_code').eq('id',session.user.id).single().then(({data,error})=>{if(cancelled)return;if(error){setProfileError(error.message);setProfile(null)}else setProfile(data)});return()=>{cancelled=true}},[session])
 useEffect(()=>{if(!hasSupabase||!session?.user?.id)return;supabase.from('erp_security_events').insert({user_id:session.user.id,event_type:'login_or_session_started',user_agent:navigator.userAgent,metadata:{session_id:session.access_token? 'active':'unknown'}})},[session?.user?.id])
 async function signOut(){if(hasSupabase)await supabase.auth.signOut();setSession(null);setProfile(null)}
 const value=useMemo(()=>({session,profile,profileError,signOut,loading:session===undefined||(session&&profile===undefined),isAuthenticated:hasSupabase?Boolean(session):true,role:profile?.role||null}),[session,profile,profileError])
 return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
export function useAuth(){const ctx=useContext(AuthContext);if(!ctx)throw new Error('useAuth must be used within AuthProvider');return ctx}
