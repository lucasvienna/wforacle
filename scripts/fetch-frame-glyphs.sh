#!/usr/bin/env bash
# Downloads + optimizes the Dark frame glyphs from the wiki into
# static/frames/<frameId>.webp, which FrameCard references at runtime
# (`asset('/frames/${frame.id}.webp')`).
#
# Wiki filename is the capitalized frame id for every tracked frame —
# including hildryn/xaku, whose dataset `image` fields differ.
#
# Deliberately NOT a for/while loop: this shell loses $PATH resolution for
# curl/convert inside loop constructs (see fetch-resource-images.sh), so each
# frame gets its own flat `dl` call instead.
set -e
mkdir -p static/frames
U="wforacle"
B="https://wiki.warframe.com/images"
T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT
dl() { curl -fsSL -A "$U" -o "$T/$1" "$B/$2" && convert "$T/$1" -resize 96x96 -strip "static/frames/$1" && echo "ok $1"; }

dl atlas.webp AtlasGlyph-Dark.png
dl ember.webp EmberGlyph-Dark.png
dl equinox.webp EquinoxGlyph-Dark.png
dl excalibur.webp ExcaliburGlyph-Dark.png
dl frost.webp FrostGlyph-Dark.png
dl hydroid.webp HydroidGlyph-Dark.png
dl loki.webp LokiGlyph-Dark.png
dl mag.webp MagGlyph-Dark.png
dl mesa.webp MesaGlyph-Dark.png
dl nekros.webp NekrosGlyph-Dark.png
dl nova.webp NovaGlyph-Dark.png
dl rhino.webp RhinoGlyph-Dark.png
dl saryn.webp SarynGlyph-Dark.png
dl trinity.webp TrinityGlyph-Dark.png
dl valkyr.webp ValkyrGlyph-Dark.png
dl wisp.webp WispGlyph-Dark.png
dl gara.webp GaraGlyph-Dark.png
dl revenant.webp RevenantGlyph-Dark.png
dl caliban.webp CalibanGlyph-Dark.png
dl garuda.webp GarudaGlyph-Dark.png
dl hildryn.webp HildrynGlyph-Dark.png
dl xaku.webp XakuGlyph-Dark.png
dl qorvex.webp QorvexGlyph-Dark.png
dl protea.webp ProteaGlyph-Dark.png
dl koumei.webp KoumeiGlyph-Dark.png
