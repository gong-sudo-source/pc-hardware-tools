'use client';
import {useEffect,useId,useState,type ReactNode} from 'react';

export default function RecordArchive({title,count,storageKey,children}:{title:string;count:number;storageKey:string;children:ReactNode}){
 const [expanded,setExpanded]=useState(false);
 const regionId=useId();
 useEffect(()=>{try{setExpanded(localStorage.getItem(storageKey)==='expanded')}catch{setExpanded(false)}},[storageKey]);
 function toggle(){const next=!expanded;setExpanded(next);try{localStorage.setItem(storageKey,next?'expanded':'collapsed')}catch{/* Folding works even if browser storage is unavailable. */}}
 return <section className={`record-archive ${expanded?'archive-open':''}`}><button className="archive-toggle" aria-expanded={expanded} aria-controls={regionId} onClick={toggle}><span className="archive-symbol" aria-hidden="true">✓</span><span className="archive-heading"><strong>{title}<span className="section-count">{count}</span></strong><small>마무리한 기록을 한곳에</small></span><span className="archive-action">{expanded?'접어두기':'펼쳐보기'}<span className="archive-chevron" aria-hidden="true">⌄</span></span></button><div id={regionId} hidden={!expanded} className="archive-content">{expanded&&children}</div></section>;
}
