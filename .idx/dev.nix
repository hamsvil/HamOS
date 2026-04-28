{ pkgs, ... }: {
  channel = "stable-24.05";

  packages = [
    pkgs.nodejs_22
    pkgs.nodePackages.npm
  ];

  env = {
    NODE_OPTIONS = "--max-old-space-size=4096";
    PORT = "3000";
  };

  idx = {
    extensions = [
      "dbaeumer.vscode-eslint"
      "esbenp.prettier-vscode"
      "ms-vscode.vscode-typescript-next"
      "bradlc.vscode-tailwindcss"
    ];

    workspace = {
      onCreate = {
        npm-install = "npm install";
        create-env = ''
          if [ ! -f .env.local ]; then
            cp env.example .env.local
            echo ".env.local created from env.example — isi GEMINI_API_KEY kamu."
          fi
        '';
      };

      onStart = {
        run-server = {
          command = "npm run dev";
          manager = "web";
          env = {
            PORT = "$PORT";
          };
        };
      };
    };

    previews = {
      enable = true;
      previews = {
        web = {
          command = [ "npm" "run" "dev" ];
          manager = "web";
          env = {
            PORT = "$PORT";
          };
        };
      };
    };
  };
}
