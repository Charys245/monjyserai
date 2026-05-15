#!/bin/bash

nvm use 22

# 1. Création du projet Vite dans le dossier courant
pnpm create vite@latest ./ --template react-ts
# pnpm create ./ vite@latest

# 2. Installation des dépendances
pnpm install

# 3. Installation de Tailwind CSS v4 et types Node
pnpm add tailwindcss @tailwindcss/vite
pnpm add -D @types/node

# 4. Configuration de index.css pour Tailwind v4
cat > src/index.css <<EOF
@import "tailwindcss";
EOF

# 5. Configuration de vite.config.ts (Plugin Tailwind + Alias)
cat > vite.config.ts <<EOF
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
EOF

# 6. Configuration de tsconfig.json (Chef d'orchestre)
cat > tsconfig.json <<EOF
{
  "files": [],
  "references": [
    {
      "path": "./tsconfig.app.json"
    },
    {
      "path": "./tsconfig.node.json"
    }
  ],
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
EOF

# 7. Configuration de tsconfig.app.json
cat > tsconfig.app.json <<EOF
{
  "compilerOptions": {
    "composite": true,
    "tsBuildInfoFile": "./node_modules/.dottsbuildinfo",
    "target": "ESNext",
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
EOF

# 8. Configuration de tsconfig.node.json (Ta version spécifique)
cat > tsconfig.node.json <<EOF
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023"],
    "module": "esnext",
    "types": ["node"],
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,

    /* Linting */
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "ignoreDeprecations": "6.0",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["vite.config.ts"]
}
EOF

# 9. Initialisation de Shadcn UI
# pnpm dlx shadcn-ui@latest init -d

# 9. Add a shadcn component
pnpm dlx shadcn@latest add button

echo "----------------------------------------------------"
echo "✅ Configuration terminée avec succès !"
echo "Tous les fichiers tsconfig sont synchronisés."
echo "Exécutez 'pnpm dev' pour démarrer."
echo "----------------------------------------------------"