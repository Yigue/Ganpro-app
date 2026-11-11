'use client';
import {useEffect,useState} from 'react';
import type {ActionState} from '@/lib/commands/result';
import {ActionMessage} from './action-state';
/** Inline actions also surface validation failures; no technical payloads are accepted. */
export function CommandNotifications(){
 const [state,setState]=useState<ActionState|null>(null);
 useEffect(()=>{const listen=(event:Event)=>{if(event instanceof CustomEvent)setState(event.detail as ActionState);};window.addEventListener('ganpro:action-error',listen);return()=>window.removeEventListener('ganpro:action-error',listen);},[]);
 return state?<div className="fixed bottom-4 right-4 z-[80] max-w-[calc(100vw-2rem)] rounded-lg border bg-card p-4 shadow-lg"><button type="button" onClick={()=>setState(null)} className="float-right ml-3" aria-label="Cerrar aviso">✕</button><ActionMessage state={state}/></div>:null;
}
