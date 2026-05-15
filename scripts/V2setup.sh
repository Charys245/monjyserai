#!/bin/bash

# Demander le nom du projet
# read -p "Nom du projet : " PROJECT_NAME

# 1. Création du projet Vite avec React et TypeScript via pnpm
# pnpm create vite "$PROJECT_NAME" --template react-ts
nvm use 22
pnpm create vite ./ --template react-ts

# Entrer dans le dossier
# cd "$PROJECT_NAME"

# 2. Installation des dépendances initiales
pnpm install

# 3. Installation de Tailwind CSS et ses dépendances
pnpm add -D tailwindcss postcss autoprefixer
pnpm dlx tailwindcss init -p

# 4. Installation des types pour Node (pour les alias de chemin)
pnpm add -D @types/node

# 5. Configuration de vite.config.ts pour les alias "@"
cat > vite.config.ts <<EOF
import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
EOF

# 6. Configuration de tsconfig.json pour les alias
cat > tsconfig.json <<EOF
{
  "compilerOptions": {
    "target": "ESNext",
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "module": "ESNext",
    "skipLibCheck": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
EOF

# 7. Initialisation de Shadcn UI (Automatisé avec pnpm dlx)
# On lance l'init en mode automatique (répond "yes" aux questions par défaut)
pnpm dlx shadcn-ui@latest init -d

echo "----------------------------------------------------"
echo "Installation terminée !"
echo "Utilisez 'cd $PROJECT_NAME' puis 'pnpm dev' pour lancer le projet."
echo "----------------------------------------------------"