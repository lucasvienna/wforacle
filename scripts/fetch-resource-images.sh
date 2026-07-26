#!/usr/bin/env bash
# Downloads + optimizes the starter-set resource icons referenced by
# static/data/dataset.json's resources[].image (imageName from @wfcd/items)
# into static/resources/<resourceId>.webp, matching what ResourceCard/etc.
# reference at runtime (`/resources/${resource.id}.webp`).
#
# Deliberately NOT a for/while loop: this shell loses $PATH resolution for
# curl/convert inside loop constructs (see task-4-brief.md), so each
# resource gets its own flat `dl` call instead.
set -e
mkdir -p static/resources
U="wforacle"
B="https://cdn.warframestat.us/img"
T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT
# 128px, not 64: these icons render at up to 48 CSS px (the guide page header),
# and Lighthouse's image-size-responsive audit wants ~1.5x that for high-DPI
# screens. Every upstream source is >=310px, so this is a genuine downscale
# rather than an upscale that would only fool the audit.
dl() { curl -fsSL -A "$U" -o "$T/$1" "$B/$2" && convert "$T/$1" -resize 128x128 -strip "static/resources/$1" && echo "ok $1"; }

# As dl(), but pads a non-square source to a square canvas instead of
# stretching it. Lighthouse's image-aspect-ratio audit fires when a natural
# ratio differs from the rendered one, and these icons are always rendered
# square.
dlsq() { curl -fsSL -A "$U" -o "$T/$1" "$2" && convert "$T/$1" -resize 128x128 -background none -gravity center -extent 128x128 -strip "static/resources/$1" && echo "ok $1"; }

dl orokincell.webp ComponentCell.png
dl neurodes.webp ComponentNeurode.png
dl neuralsensors.webp NeuralSensor.png
dl nanospores.webp ComponentNanospores.png
dl alloyplate.webp AlloyPlate.png
dl plastids.webp ComponentPlastids.png
dl polymerbundle.webp PolymerBundle.png
dl oxium.webp ComponentOxium.png
dl argoncrystal.webp ArgonCrystal.png
dl gallium.webp ComponentGallium.png
dl controlmodule.webp ControlModule.png
dl rubedo.webp ComponentRubedo.png
dl ferrite.webp ComponentFerrite.png
dl morphics.webp ComponentMorphic.png
dl detoniteampule.webp GrineerFragment.png
dl circuits.webp ComponentCircuits.png
dl fieldronsample.webp CorpusFragment.png
dl salvage.webp ComponentSalvage.png
dl carbides.webp RailjackComponentCarbides.png
dl hexenon.webp ComponentConcentratedGas.png
dl cubicdiodes.webp RailjackComponentCubics.png
dl cryotic.webp ComponentCryotic.png
dl tellurium.webp Tellurium.png
dl mutagensample.webp InfestedFragment.png
dl somaticfibers.webp MemoryCryptoFragment.png
dl kuva.webp Kuva.png
dl voidgelorb.webp ZarimanMiscItemA.png
dl entratilanthorn.webp ZarimanMiscItemB.png

# Credits and Affinity have no @wfcd/items entry — icons come from the official
# wiki instead. Credits.png is the 512px original; Credits64.png (used before)
# is a 64px derivative too small for the 128px target.
#
# Affinity was previously hand-made and unreproducible by this script, so a
# re-run silently dropped it (audit finding D2). It is now built here like
# everything else, padded from its 310x333 source to a square canvas.
dlsq credits.webp "https://wiki.warframe.com/images/Credits.png"
dlsq affinity.webp "https://wiki.warframe.com/images/AffinityOrb.png"
