{ pkgs }:
  pkgs.mkShell {
    packages = with pkgs; [
      # Add NodeJS Dependencies
      node2nix
      nodejs_24

      # Add Build & DevEnv Dependencies
      docker # Ensure that docker.service is running on your OS
      docker-compose
      docker-buildx
      cowsay
      lolcat

    ];
    GREETING = "CS5610 Environment Activated!";

    shellHook = ''
      echo "Installing NPM Dependencies" | cowsay | lolcat && sleep 1 && npm install .
      echo "Starting the Dev Server" | cowsay | lolcat && sleep 1 && npm run start
    '';
  }
