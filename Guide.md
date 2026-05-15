  Résumé

  Firebase

- src/lib/firebase.ts - Service Firebase (Firestore + Storage)
- .env.example - Variables d'environnement à configurer

  Admin (/gestion-evenement)

- Drag & drop de la zone photo sur le template
- Masque personnalisé - Upload un PNG blanc/transparent pour formes bizarres
- Sauvegarde Firebase - Clique "Publier" et c'est en ligne immédiatement

  Utilisateurs (/)

- Charge la config depuis Firebase automatiquement
- Voit le template + zone définis par l'admin
- Aucun accès admin

  Pour configurer Firebase

1. Crée un projet sur https://console.firebase.google.com
2. Active Firestore et Storage
3. Copie .env.example en .env et remplis les valeurs :

  VITE_FIREBASE_API_KEY=xxx  VITE_FIREBASE_AUTH_DOMAIN=xxx.firebaseapp.com  VITE_FIREBASE_PROJECT_ID=xxx  VITE_FIREBASE_STORAGE_BUCKET=xxx.appspot.com  VITE_FIREBASE_MESSAGING_SENDER_ID=xxx  VITE_FIREBASE_APP_ID=xxx

4. Configure les règles Firestore/Storage (je peux t'aider si besoin)

  Tu veux que je t'aide à configurer les règles de sécurité Firebase ?
