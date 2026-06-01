#!/bin/bash
set -e

# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"

if ! command -v node &>/dev/null; then
  echo "Node.js non trouvé. Installez via : curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash"
  echo "Puis : source ~/.zshrc && nvm install 20"
  exit 1
fi

echo "Node $(node --version) — npm $(npm --version)"
cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  echo "Installation des dépendances..."
  npm install
fi

echo "Ouverture dans le navigateur : http://localhost:5173"
npm run dev
