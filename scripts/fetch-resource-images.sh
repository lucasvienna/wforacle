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
dl() { curl -sL -A "$U" -o "/tmp/res-$1" "$B/$2" && convert "/tmp/res-$1" -resize 64x64 -strip "static/resources/$1" && echo "ok $1"; }

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
dl tellurium.webp Tellurium.png
dl mutagensample.webp InfestedFragment.png
