export default function CategoryIcon({slug}:{slug:string}) {
 let shape;
 if(slug==='todo')shape=<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>;
 else if(/coleccion|collection|new/.test(slug))shape=<><path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z"/><path d="M20 2v4m-2-2h4"/></>;
 else if(/pantalones|jeans|shorts/.test(slug))shape=<><path d="M6 3h12l2 18h-6l-2-12-2 12H4Z"/><path d="M6 6h12M12 3v6"/></>;
 else if(/vestidos|faldas|enterizos/.test(slug))shape=<><path d="m9 3-2 5 3 3-6 10h16l-6-10 3-3-2-5-3 2Z"/><path d="M10 11h4"/></>;
 else if(slug==='accesorios')shape=<><rect x="4" y="9" width="16" height="12" rx="2"/><path d="M8 9V7a4 4 0 0 1 8 0v2m-7 6h6"/></>;
 else if(slug==='promociones')shape=<><path d="M3 3h9l9 9-9 9-9-9Z"/><circle cx="7.5" cy="7.5" r="1"/><path d="m11 10 5 5m-1-5-4 5"/></>;
 else shape=<><path d="m8 3-6 4 3 5 3-2v11h8V10l3 2 3-5-6-4a4 4 0 0 1-8 0Z"/><path d="M12 8v13"/></>;
 return <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shape}</svg>;
}
