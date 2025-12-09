{
  description = "CS5610 Next/Nest dev + package flake";

  inputs.nixpkgs.url = "https://flakehub.com/f/NixOS/nixpkgs/0.2505.809711";

  outputs =
    inputs:
    let
      supportedSystems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];

      forEachSupportedSystem =
        f:
        inputs.nixpkgs.lib.genAttrs supportedSystems (
          system:
          f {
            pkgs = import inputs.nixpkgs { inherit system; };
          }
        );
    in
    {
      packages = forEachSupportedSystem (
        { pkgs }:
        {
          default = pkgs.callPackage ./nix/package.nix { };
        }
      );

      devShells = forEachSupportedSystem (
        { pkgs }:
        {
          default = pkgs.callPackage ./nix/devshell.nix { };
        }
      );
    };
}
