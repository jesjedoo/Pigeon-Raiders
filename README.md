
# Pigeon Raiders (Supabase)

Version Supabase du prototype Pigeon Raiders.
Authentification Google + stockage persistant des demandes et doublons.

## Setup

1. Copier `.env.example` en `.env` et remplir :
   - VITE_SUPABASE_URL=https://your-project.supabase.co
   - VITE_SUPABASE_ANON_KEY=your-anon-key

2. Installer dépendances :
```bash
npm install
```

3. Lancer en local :
```bash
npm run dev
```

4. Déployer sur Vercel :
- Push le repo sur GitHub
- Importer sur Vercel (Build: `npm run build`, Output dir: `dist`)

## Comptes autorisés (par défaut)
- jessy.leroux28469@gmail.com -> Jesjedo
- sulyvan.boulenger27@gmail.com -> Susu
- nathanfoul57@gmail.com -> Natdemon

Tu peux modifier la map des emails dans `src/App.jsx` (const PLAYER_MAP).
