
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const st={get(k,d){try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const BASE=[
{n:"Mantenimiento preventivo",c:"Mantenimiento",p:"Desde $50.000",d:"Limpieza interna, pasta térmica y revisión completa para que rinda como el primer día."},
{n:"Reparación y formateo",c:"Mantenimiento",p:"Desde $60.000",d:"Instalación de sistema, programas y respaldo de tu información."},
{n:"Redes y WiFi",c:"Mantenimiento",p:"Desde $80.000",d:"Cobertura estable en casa u oficina, configuración y seguridad."},
{n:"Recuperación de datos",c:"Mantenimiento",p:"Cotización",d:"Rescatamos archivos de discos y memorias dañadas."},
{n:"Páginas web",c:"Desarrollo",p:"Desde $600.000",d:"Sitios rápidos, responsive y con tu identidad de marca."},
{n:"Aplicaciones a la medida",c:"Desarrollo",p:"Cotización",d:"Sistemas de inventario, reservas o gestión hechos para tu negocio."},
{n:"Tiendas en línea",c:"Desarrollo",p:"Desde $1.200.000",d:"Catálogo, carrito y panel para administrar tus productos."},
{n:"Automatización con IA",c:"Desarrollo",p:"Cotización",d:"Chatbots y flujos que atienden a tus clientes por ti."}];
let S=st.get("svc",BASE),cat="Todos",msgs=st.get("msgs",[]);

/* Terminal animada del hero */
const L=["$ zynalix --diagnostico","<span class=d>Revisando disco…</span> <span class=ok>OK</span>","<span class=d>Temperatura CPU…</span> <span class=ok>OK</span>","<span class=d>Memoria RAM…</span> <span class=ok>OK</span>","<span class=d>Compilando tu idea…</span>","<span class=ok>✓ Todo listo. ¿Empezamos?</span>"];
(async()=>{const t=$("#tm");let h="";for(const l of L){h+=l+"\n";t.innerHTML=h+"▍";await new Promise(r=>setTimeout(r,650))}})();

/* Catálogo con filtros */
function drawSvc(){
 const cats=["Todos",...new Set(S.map(x=>x.c))];
 $("#tb").innerHTML=cats.map(c=>`<button class="tab ${c==cat?"on":""}" data-c="${esc(c)}">${esc(c)}</button>`).join("");
 $("#gr").innerHTML=S.filter(x=>cat=="Todos"||x.c==cat).map((x,i)=>`<article class="card" style="animation-delay:${i*60}ms"><span class="n">0${i+1}</span><span class="t">${esc(x.c)}</span><h3>${esc(x.n)}</h3><p>${esc(x.d)}</p><div class="f"><span>${esc(x.p)}</span><button data-q="${esc(x.n)}">Cotizar →</button></div></article>`).join("");
 $("#fs").innerHTML=S.map(x=>`<option>${esc(x.n)}</option>`).join("");drawQ();
}
$("#tb").onclick=e=>{if(e.target.dataset.c){cat=e.target.dataset.c;drawSvc()}};
$("#gr").onclick=e=>{const q=e.target.dataset.q;if(q){$("#fs").value=q;location.hash="contacto"}};
drawSvc();

/* Contador, revelado al hacer scroll */
const io=new IntersectionObserver(es=>es.forEach(e=>{e.target.classList.toggle("in",e.isIntersecting);if(!e.isIntersecting)return;
 e.target.querySelectorAll("[data-n]").forEach(b=>{if(b.dataset.counted)return;b.dataset.counted="true";const m=+b.dataset.n;let i=0;const t=setInterval(()=>{i+=Math.ceil(m/40);if(i>=m){i=m;clearInterval(t)}b.textContent=i},30)})}),{threshold:.15});
$$(".rv").forEach(x=>io.observe(x));

/* Menú y tema */
$("#burger").onclick=()=>$("#lk").classList.toggle("on");$("#lk").onclick=()=>$("#lk").classList.remove("on");
$("#th").onclick=()=>{const r=document.documentElement,d=r.dataset.theme?r.dataset.theme=="dark":matchMedia("(prefers-color-scheme:dark)").matches;r.dataset.theme=d?"light":"dark"};

/* Formulario con validación y estado de carga */
$("#cf2").onsubmit=e=>{e.preventDefault();
 const f=[["#fn",v=>v.trim().length>=3,"Escribe tu nombre completo."],["#fe",v=>/^\S+@\S+\.\S+$/.test(v),"Ingresa un correo válido."],["#fm",v=>v.trim().length>=10,"Cuéntanos un poco más (mínimo 10 letras)."]];let ok=true;
 f.forEach(([s,fn,m])=>{const i=$(s),er=i.nextElementSibling,g=fn(i.value);i.classList.toggle("bad",!g);er.textContent=g?"":m;if(!g)ok=false});
 if(!ok)return;const b=e.target.querySelector(".btn");b.classList.add("ld");b.disabled=true;$("#bt").textContent="Enviando…";
 setTimeout(()=>{msgs.unshift({n:$("#fn").value,e:$("#fe").value,s:$("#fs").value,m:$("#fm").value,d:new Date().toLocaleString("es-CO")});st.set("msgs",msgs);
  e.target.reset();b.classList.remove("ld");b.disabled=false;$("#bt").textContent="Enviar mensaje";const o=$("#ok");o.style.display="block";o.textContent="¡Gracias! Recibimos tu mensaje y te escribiremos pronto.";setTimeout(()=>o.style.display="none",6000)},1100)};

/* Admin: login y panel */
const open=(i,v)=>$(i).classList.toggle("on",v);
$("#ad").onclick=()=>open("#lg",true);
$$("[data-x]").forEach(b=>b.onclick=()=>{open("#lg",false);open("#pa",false)});
$$(".ov").forEach(o=>o.onclick=e=>{if(e.target==o)o.classList.remove("on")});
$("#lf").onsubmit=e=>{e.preventDefault();
 if($("#lu").value=="admin"&&$("#lp").value=="olivo2026"){$("#le").textContent="";open("#lg",false);open("#pa",true);$("#lp").value="";drawAd()}
 else $("#le").textContent="Usuario o contraseña incorrectos."};
$$("[data-p]").forEach(b=>b.onclick=()=>{$$("[data-p]").forEach(x=>x.classList.toggle("on",x==b));$("#pm").style.display=b.dataset.p=="m"?"":"none";$("#ps").style.display=b.dataset.p=="s"?"":"none"});
function drawAd(){
 $("#pm").innerHTML=msgs.length?msgs.map((m,i)=>`<div class="row"><div><b>${esc(m.n)}</b> · ${esc(m.e)}<small>${esc(m.s)} — ${esc(m.d)}</small>${esc(m.m)}</div><button data-dm="${i}">Borrar</button></div>`).join(""):"<p style='color:var(--mut);padding:16px 0'>Aún no hay mensajes.</p>";
 $("#pl").innerHTML=S.map((s,i)=>`<div class="row"><div><b>${esc(s.n)}</b><small>${esc(s.c)} · ${esc(s.p)}</small></div><button data-ds="${i}">Eliminar</button></div>`).join("")}
$("#pa").onclick=e=>{const a=e.target.dataset;if(a.dm!==undefined){msgs.splice(a.dm,1);st.set("msgs",msgs)}if(a.ds!==undefined){S.splice(a.ds,1);st.set("svc",S);drawSvc()}drawAd()};
$("#sf").onsubmit=e=>{e.preventDefault();if(!$("#sn").value.trim())return;
 S.push({n:$("#sn").value,c:$("#sc").value,p:$("#sp").value||"Cotización",d:$("#sd").value||"Servicio de ZYNALIX."});st.set("svc",S);e.target.reset();drawSvc();drawAd()};

/* Cotizador: suma servicios x cantidad, aplica modalidad y prioridad */
function num(s){const m=String(s).replace(/\./g,"").match(/\d+/);return m?+m[0]:0}
function cop(n){return "$"+Math.round(n).toLocaleString("es-CO")}
function drawQ(){$("#ql").innerHTML=S.map((s,i)=>`<label class="qi"><input type="checkbox" data-i="${i}"><span><b>${esc(s.n)}</b><small>${esc(s.p)}</small></span><input class="qq" type="number" min="1" max="20" value="1" data-i="${i}" aria-label="Cantidad"></label>`).join("");calcQ()}
function calcQ(){let b=0,pend=0,det=[];
 $$("#ql input[type=checkbox]:checked").forEach(c=>{const i=c.dataset.i,q=Math.min(20,Math.max(1,+$(`.qq[data-i="${i}"]`).value||1)),v=num(S[i].p);b+=v*q;if(!v)pend++;det.push(S[i].n+" ×"+q+(v?" · "+cop(v*q):" · por cotizar"))});
 const t=det.length?b*(+$("#qu").value)+(+$("#qm").value):0;
 $("#qd").innerHTML=det.length?det.map(x=>esc(x)).join("<br>"):"Selecciona uno o más servicios.";
 $("#qt").innerHTML=cop(t)+(pend?`<small style="font:500 .8rem Schibsted Grotesk;color:var(--mut)"> + ${pend} por cotizar</small>`:"");
 return{t,det,pend}}
$("#ql").oninput=e=>{if(e.target.classList.contains("qq"))e.target.closest(".qi").querySelector("[type=checkbox]").checked=true;calcQ()};
$("#qm").onchange=$("#qu").onchange=calcQ;
$("#qb").onclick=()=>{const r=calcQ(),n=$("#qn").value.trim(),e=$("#qe").value.trim(),er=$("#qr2");
 if(!r.det.length){er.textContent="Elige al menos un servicio.";return}
 if(n.length<3){er.textContent="Escribe tu nombre.";return}
 if(!/^\S+@\S+\.\S+$/.test(e)){er.textContent="Ingresa un correo válido.";return}
 er.textContent="";const b=$("#qb");b.classList.add("ld");b.disabled=true;$("#qbt").textContent="Enviando…";
 setTimeout(()=>{msgs.unshift({n,e,s:"Cotización",m:r.det.join("; ")+". Modalidad: "+$("#qm").selectedOptions[0].text+". Prioridad: "+$("#qu").selectedOptions[0].text+". Estimado: "+cop(r.t)+(r.pend?" + "+r.pend+" por cotizar":""),d:new Date().toLocaleString("es-CO")});st.set("msgs",msgs);
  b.classList.remove("ld");b.disabled=false;$("#qbt").textContent="Solicitar cotización";const o=$("#qk");o.style.display="block";o.textContent="¡Listo! Recibimos tu solicitud y te confirmaremos el valor final en menos de 24 horas.";setTimeout(()=>o.style.display="none",7000)},1100)};

/* Galería con visor ampliado (flechas del teclado y Escape) */
const IC={chip:'<rect x="7" y="7" width="10" height="10" rx="2"/><path d="M9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4"/>',tools:'<path d="M14.5 6.5a4 4 0 00-5 5L4 17l3 3 5.5-5.5a4 4 0 005-5l-2.5 2.5-2-2z"/>',code:'<path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 6l-3 12"/>',app:'<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>',wifi:'<path d="M3 9a13 13 0 0118 0M6 12.5a8.5 8.5 0 0112 0M9 16a4 4 0 016 0"/><circle cx="12" cy="19" r=".8"/>',laptop:'<rect x="5" y="5" width="14" height="10" rx="1.5"/><path d="M3 19h18"/>'};
const G=[{t:"Limpieza interna",k:"Mantenimiento",d:"Retiramos el polvo y revisamos cada componente para que el equipo respire de nuevo.",i:"chip",s:"tall"},
{t:"Soporte en sitio",k:"Mantenimiento",d:"Vamos hasta tu casa u oficina y resolvemos en el lugar.",i:"tools"},
{t:"Páginas web",k:"Desarrollo",d:"Sitios rápidos y responsive con la identidad de tu marca.",i:"code",s:"wide"},
{t:"Apps a la medida",k:"Desarrollo",d:"Sistemas de inventario, reservas y gestión hechos para tu negocio.",i:"app",s:"tall"},
{t:"Redes y WiFi",k:"Mantenimiento",d:"Cobertura estable y segura en cada rincón.",i:"wifi"},
{t:"Equipos como nuevos",k:"Mantenimiento",d:"Formateo, repotenciación y optimización de portátiles y de escritorio.",i:"laptop"}];
let gi=0;const ico=i=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width=".9" stroke-linecap="round" stroke-linejoin="round">${IC[i]}</svg>`;
$("#gg").innerHTML=G.map((g,i)=>`<button class="gt g${i%4} ${g.s||""}" data-g="${i}">${ico(g.i)}<span><b>${g.t}</b>${g.k}</span></button>`).join("");
function showG(i){gi=(i+G.length)%G.length;const g=G[gi];$("#lbx").className="lbx g"+(gi%4);$("#lbx").innerHTML=ico(g.i);$("#lbt").textContent=g.t;$("#lbd").textContent=g.d;open("#lb",true)}
$("#gg").onclick=e=>{const b=e.target.closest("[data-g]");if(b)showG(+b.dataset.g)};
$("#lbp").onclick=()=>showG(gi-1);$("#lbs").onclick=()=>showG(gi+1);$("#lbc").onclick=()=>open("#lb",false);
addEventListener("keydown",e=>{if(e.key=="Escape")$$(".ov").forEach(o=>o.classList.remove("on"));if($("#lb").classList.contains("on")){if(e.key=="ArrowRight")showG(gi+1);if(e.key=="ArrowLeft")showG(gi-1)}});

/* Asistente: conoce servicios, precios y tono de la marca */
const KB=[[/hola|buenas|hey/,"¡Hola! Soy Zyna, de ZYNALIX. Cuéntame qué le pasa a tu equipo o qué te gustaría construir."],
[/precio|cuesta|valor|cotiz|cuanto/,()=>"Estos son algunos de nuestros valores de referencia:\n"+S.slice(0,5).map(s=>"• "+s.n+": "+s.p).join("\n")+"\nEl diagnóstico inicial es gratis."],
[/lent|demor|tard|calient|ruido|ventilador/,"Eso suele resolverse con mantenimiento preventivo: limpieza interna y cambio de pasta térmica. Muchas veces el equipo vuelve a rendir como nuevo."],
[/format|virus|windows|sistema|programa/,"Hacemos formateo e instalación de sistema y programas, con respaldo de tu información antes de empezar."],
[/dato|archivo|disco|recuper/,"Podemos intentar rescatar tus archivos. Apaga el equipo y no lo uses más: así aumentan las posibilidades."],
[/wifi|red|internet|router/,"Configuramos redes y WiFi para casa u oficina, con buena cobertura y seguridad."],
[/web|pagina|sitio|tienda|app|aplicacion|software|program|bot|ia\b/,"Desarrollamos páginas web, tiendas en línea, aplicaciones a la medida y automatizaciones con IA. Cuéntame de tu idea y te orientamos."],
[/horario|cuando|donde|ubic|bucaramanga|remoto/,"Atendemos en Bucaramanga y de forma remota. Respondemos en menos de 24 horas."],
[/contact|agendar|cita|whatsapp|correo/,"Déjanos tus datos en el formulario de contacto y te escribimos pronto."],
[/gracias|chao|adios/,"¡Con gusto! Aquí estaremos cuando tu tecnología nos necesite."]];
const ms=$("#ms");
function say(t,w){const d=document.createElement("div");d.className="b "+w;d.textContent=t;ms.append(d);ms.scrollTop=ms.scrollHeight;return d}
function ask(q){say(q,"me");const t=say("","bot");t.innerHTML="<span class=dots><span></span><span></span><span></span></span>";
 const n=q.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");const k=KB.find(x=>x[0].test(n));
 setTimeout(()=>{const r=k?(typeof k[1]=="function"?k[1]():k[1]):"Buena pregunta. Para darte una respuesta exacta, déjanos tus datos en el formulario de contacto y un técnico te escribe.";t.textContent=r;ms.scrollTop=ms.scrollHeight},800)}
$("#cbt").onclick=()=>{$("#pn").classList.toggle("on");if(!ms.children.length){say("¡Hola! Soy Zyna. Puedo contarte sobre servicios, precios y tiempos.","bot");$("#qr").innerHTML=["¿Cuánto cuesta?","Mi PC está lento","Quiero una página web"].map(x=>`<button>${x}</button>`).join("")}};
$("#qr").onclick=e=>{if(e.target.tagName=="BUTTON")ask(e.target.textContent)};
$("#cf").onsubmit=e=>{e.preventDefault();const v=$("#ci").value.trim();if(v){$("#ci").value="";ask(v)}};
