# Radiator Card (FR)

Carte Home Assistant pour **radiateur / sèche-serviette connecté** : dessin animé qui chauffe (vapeur, barres incandescentes, rouge en mode Boost) ou photo de l'appareil, température ambiante, consigne réglable, Boost et interrupteurs (Programme, Absence, Présence...), modes et préréglages. Style verre, thème clair/sombre automatique, éditeur visuel, textes en français.

## Installation (HACS)
HACS → ⋮ → Dépôts personnalisés → `https://github.com/Johan854/radiator-card`, catégorie **Tableau de bord**. Puis recharger le navigateur.

## Exemple
```yaml
type: custom:radiator-card
entity: climate.unknown_product_1561_chauffage
name: Sèche-serviette
temperature_entity: sensor.unknown_product_1561_temperature_thermostat_z1
target_entity: number.unknown_product_1561_temperature_consigne
boost_entity: switch.unknown_product_1561_mode_boost
switches:
  - switch.unknown_product_1561_mode_prog
image: https://exemple.fr/mon-appareil.jpg
```

## Options
| Option | Défaut | Description |
|---|---|---|
| `entity` | obligatoire | Entité `climate` |
| `name` | nom du `climate` | Titre |
| `appliance` | `towel` | `towel` (sèche-serviette) ou `radiator` |
| `temperature_entity` | | Température ambiante (sinon `current_temperature`) |
| `target_entity` | | `number` / `input_number` de consigne (sinon la consigne du `climate`) |
| `boost_entity` | | Interrupteur du Boost, mis en avant (la carte passe au rouge) |
| `switches` | `[]` | Autres interrupteurs ; liste de noms d'entités ou d'objets `{entity, name, icon}`. Clic : bascule, appui long : détails |
| `info_entities` | `[]` | Capteurs en tuiles (`entity`, `name`, `icon`) |
| `image` | | Photo de l'appareil |
| `image_mode` | `background` | `background` : photo estompée en fond, dessin animé conservé ; `replace` : la photo remplace le dessin |
| `image_opacity` | `0.35` | Opacité de la photo de fond |
| `temp_step` | `0` | Pas de la consigne (0 = automatique) |
| `show_controls`, `show_modes`, `show_presets` | `true` | Afficher les commandes, les modes, les préréglages |
| `theme` | `auto` | `auto`, `light`, `dark` |

Le bloc « Nuance de couleur » est identique à celui des autres cartes.
