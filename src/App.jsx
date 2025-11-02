import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const VITE_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const VITE_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if(!VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY) { 
  console.warn("Supabase env vars not set. Copy .env.example to .env and fill values.");
}

const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);

const PLAYER_MAP = {
  "jessy.leroux28469@gmail.com": "Jesjedo",
  "sulyvan.boulenger27@gmail.com": "Susu",
  "nathanfoul57@gmail.com": "Natdemon"
};

export default function App(){
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [demandes, setDemandes] = useState([]);
  const [doubles, setDoubles] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(()=>{
    supabase.auth.getSession().then(r=>{ if(r.data?.session) setUser(r.data.session.user) });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return ()=>{ listener.subscription.unsubscribe(); }
  },[]);

  useEffect(()=>{
    if(!user) return;
    const email = user.email;
    if(!PLAYER_MAP[email]){
      supabase.auth.signOut();
      setError("Accès refusé. Adresse non autorisée.");
      return;
    }
    setProfile({email, pseudo: PLAYER_MAP[email]});
  },[user]);

  useEffect(()=>{
    if(!profile) return;
    setLoading(true);
    Promise.all([
      supabase.from('demandes').select('*').order('created_at',{ascending:false}),
      supabase.from('doubles').select('*').order('created_at',{ascending:false})
    ]).then(([dRes, dblRes])=>{
      if(dRes.error) console.error(dRes.error);
      if(dblRes.error) console.error(dblRes.error);
      setDemandes(dRes.data || []);
      setDoubles(dblRes.data || []);
      setLoading(false);
    }).catch(err=>{ console.error(err); setLoading(false); });

    const demandesSub = supabase.channel('public:demandes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'demandes' }, payload => {
        supabase.from('demandes').select('*').order('created_at',{ascending:false}).then(r=> setDemandes(r.data || []));
      })
      .subscribe();
    const doublesSub = supabase.channel('public:doubles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'doubles' }, payload => {
        supabase.from('doubles').select('*').order('created_at',{ascending:false}).then(r=> setDoubles(r.data || []));
      })
      .subscribe();

    // fetch metaforge preview items
    fetch("https://metaforge.app/api/arc-raiders/items").then(r=>r.json()).then(data=> setItems(Array.isArray(data)?data:(data.items||[]))).catch(()=>{});

    return ()=>{ 
      supabase.removeChannel(demandesSub);
      supabase.removeChannel(doublesSub);
    };
  },[profile]);

  async function signIn(){
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  }
  async function signOut(){
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  async function createDemande(objet, quantite){
    if(!profile) return alert('Connectez-vous');
    const payload = { joueur: profile.pseudo, objet, quantite, statut: 'En attente' };
    const { data, error } = await supabase.from('demandes').insert([payload]).select().single();
    if(error) return alert('Erreur: '+error.message);
    setDemandes(d=>[data, ...d]);
  }
  async function validateDemande(id){
    const { data, error } = await supabase.from('demandes').update({ statut: 'Validée', valide_par: profile.pseudo }).eq('id', id).select().single();
    if(error) return alert('Erreur: '+error.message);
    setDemandes(d=> d.map(x=> x.id===id?data:x));
  }
  async function confirmRemoveDemande(id){
    const req = demandes.find(r=>r.id===id);
    if(!req) return;
    if(req.joueur !== profile.pseudo) return alert('Seul le demandeur peut supprimer.');
    if(req.statut !== 'Validée') return alert('La demande doit être validée avant suppression.');
    const { error } = await supabase.from('demandes').delete().eq('id', id);
    if(error) return alert('Erreur: '+error.message);
    setDemandes(d=> d.filter(x=> x.id!==id));
  }

  async function createDouble(objet, quantite){
    if(!profile) return alert('Connectez-vous');
    const payload = { joueur: profile.pseudo, objet, quantite_total: quantite, restant: quantite };
    const { data, error } = await supabase.from('doubles').insert([payload]).select().single();
    if(error) return alert('Erreur: '+error.message);
    setDoubles(d=>[data, ...d]);
  }
  async function reserveDouble(id){
    const dbl = doubles.find(d=>d.id===id);
    if(!dbl) return;
    if(dbl.restant <= 0) return alert('Plus en stock');
    const { data, error } = await supabase.from('doubles').update({ restant: dbl.restant - 1, reserved_by: profile.pseudo }).eq('id', id).select().single();
    if(error) return alert('Erreur: '+error.message);
    setDoubles(d=> d.map(x=> x.id===id?data:x));
  }
  async function updateDoubleQty(id, qty){
    const { data, error } = await supabase.from('doubles').update({ quantite_total: qty, restant: qty }).eq('id', id).select().single();
    if(error) return alert('Erreur: '+error.message);
    setDoubles(d=> d.map(x=> x.id===id?data:x));
  }

  if(error) return <div className="p-6 text-red-400">{error}</div>;

  return (
    <div className="min-h-screen bg-[#0b0b0c] text-white p-6">
      <header className="max-w-6xl mx-auto mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Pigeon Raiders</h1>
        <div>
          {user ? (
            <div className="flex items-center gap-3">
              <div className="text-sm">{profile?.pseudo} ({profile?.email})</div>
              <button onClick={signOut} className="px-3 py-1 bg-gray-700 rounded">Se déconnecter</button>
            </div>
          ) : (
            <button onClick={signIn} className="px-3 py-1 bg-green-600 rounded">Se connecter avec Google</button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        <section className="md:col-span-2 space-y-4">
          <div className="bg-neutral-900 rounded p-4">
            <h2 className="font-semibold mb-3">Demandes d'objet</h2>
            {loading ? <div>Chargement...</div> : (
              <div className="space-y-2">
                {demandes.length===0 && <div className="text-neutral-400">Aucune demande</div>}
                {demandes.map(r=> (
                  <div key={r.id} className="p-2 bg-neutral-800 rounded flex items-center justify-between">
                    <div>
                      <div className="font-medium">{r.objet} <span className="text-xs text-neutral-400">x{r.quantite}</span></div>
                      <div className="text-xs text-neutral-400">Par {r.joueur} — {new Date(r.created_at).toLocaleString()}</div>
                    <div className="text-xs">Statut: <strong>{r.statut}</strong> {r.valide_par? `• Validé par ${r.valide_par}`:""}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {r.statut==="En attente" && r.joueur!==profile?.pseudo && <button onClick={()=>validateDemande(r.id)} className="px-2 py-1 bg-yellow-600 rounded text-sm">Valider</button>}
                      {r.statut==="Validée" && r.joueur===profile?.pseudo && <button onClick={()=>confirmRemoveDemande(r.id)} className="px-2 py-1 bg-red-600 rounded text-sm">Supprimer</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4">
              <input id="new_obj" placeholder="Nom de l'objet" className="px-2 py-1 rounded bg-neutral-800 mr-2" />
              <input id="new_q" type="number" defaultValue={1} min={1} className="w-20 px-2 py-1 rounded bg-neutral-800 mr-2" />
              <button onClick={()=>{ const name=document.getElementById('new_obj').value; const q=Number(document.getElementById('new_q').value||1); if(!name) return alert('Entrez un nom'); createDemande(name,q); document.getElementById('new_obj').value=''; }} className="px-3 py-1 bg-green-600 rounded">Créer demande</button>
            </div>
          </div>

          <div className="bg-neutral-900 rounded p-4">
            <h2 className="font-semibold mb-3">Objets (MetaForge)</h2>
            <p className="text-sm text-neutral-400 mb-3">Suggestions d'objets depuis MetaForge (lecture seule)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* lightweight listing - no create here */}
              {loading ? <div>Chargement...</div> : itemsPreview(items) }
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="bg-neutral-900 rounded p-4">
            <h3 className="font-semibold mb-2">Objets en double</h3>
            <div className="space-y-2">
              {doubles.length===0 && <div className="text-neutral-400">Pas d'objets en double.</div>}
              {doubles.map(d=> (
                <div key={d.id} className="p-2 bg-neutral-800 rounded">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{d.objet} <span className="text-xs text-neutral-400">({d.restant}/{d.quantite_total})</span></div>
                      <div className="text-xs text-neutral-400">Par {d.joueur}</div>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      {d.joueur===profile?.pseudo ? (
                        <input type="number" defaultValue={d.quantite_total} onBlur={(e)=>updateDoubleQty(d.id, Number(e.target.value||0))} className="w-20 text-black rounded px-1" />
                      ) : (
                        <button onClick={()=>reserveDouble(d.id)} className="px-2 py-1 bg-indigo-600 rounded text-sm">Réserver</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3">
              <input id="new_double" placeholder="Objet en double" className="px-2 py-1 rounded bg-neutral-800 mr-2" />
              <input id="new_double_q" type="number" defaultValue={1} min={1} className="w-20 px-2 py-1 rounded bg-neutral-800 mr-2" />
              <button onClick={()=>{ const name=document.getElementById('new_double').value; const q=Number(document.getElementById('new_double_q').value||1); if(!name) return alert('Entrez un nom'); createDouble(name,q); document.getElementById('new_double').value=''; }} className="px-3 py-2 bg-blue-600 rounded">Ajouter un doublon</button>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}}

function itemsPreview(items){
  return items.slice(0,12).map(it=> (
    <div key={it.id} className="bg-neutral-800 rounded p-3">
      <div className="font-semibold">{it.name}</div>
      <div className="text-xs text-neutral-400">{it.description}</div>
    </div>
  ))
}}
