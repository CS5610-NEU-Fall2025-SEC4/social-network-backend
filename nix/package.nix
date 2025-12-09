{
  lib,
  stdenv,
  buildNpmPackage,
  fetchFromGitHub,
  makeWrapper,
  nodejs_22,
}:

buildNpmPackage (finalAttrs: {
  pname = "social-network-backend";
  version = "1.0.0";

  src = fetchFromGitHub {
    owner = "CS5610-NEU-Fall2025-SEC4";
    repo = "social-network-backend";
    rev = "d6f1bd9a6e8f536658b648a06dc72c9f3ea188d6";
    hash = "sha256-zvYNj/mLC3Y20wHRRBTnS1CqpkHg0ydK/qc7PxQCiLo=";
  };

  nodejs = nodejs_22;

  npmDepsHash = "sha256-UuI4QfYA7u2P/FCkppFhuZsv08Gz8Ykv+anLd8uRFsA="; # first build: copy the real hash from the error

  nativeBuildInputs = [ makeWrapper ];

  NEXT_TELEMETRY_DISABLED = "1";

  installPhase = ''
    runHook preInstall

    mkdir -p $out/bin $out/share/${finalAttrs.pname}

    cp -r dist node_modules $out/share/${finalAttrs.pname}/
    cp package.json package-lock.json $out/share/${finalAttrs.pname}/

    makeWrapper ${nodejs_22}/bin/node $out/bin/${finalAttrs.pname} \
      --add-flags "$out/share/${finalAttrs.pname}/dist/main.js" \
      --set NODE_ENV production

    runHook postInstall
  '';

  meta = {
    description = "CS5610 social network backend (NestJS) packaged with Nix";
    homepage = "https://github.com/CS5610-NEU-Fall2025-SEC4/social-network-backend";
    license = lib.licenses.mit;
    platforms = lib.platforms.all;
    mainProgram = finalAttrs.pname;
  };
})
