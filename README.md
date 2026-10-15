# Dragon Ball Arena

Fan game gratuit, **non officiel** : combat d'arène 3 contre 3 en pixel art, jouable dans le navigateur (HTML5 Canvas, JavaScript natif, aucune dépendance).

Tu composes une équipe de 3 parmi 8 combattants, un seul est actif à la fois, tu changes de combattant en plein combat, et la partie se termine quand l'équipe adverse (IA) est K.O.

## Jouer

Ouvre `index.html` via un petit serveur local (`python3 -m http.server`) ou la version GitHub Pages du dépôt.

## Commandes

| Touche | Action |
|---|---|
| Flèches / ZQSD / WASD | Se déplacer |
| J | Attaque (combo en 3 coups) |
| K | Boule de ki (10 ki) |
| L | Attaque ultime (60 ki) |
| Espace | Esquive éclair (8 ki) |
| Maj | Garde |
| C | Charger le ki |
| 1 / 2 / 3 | Changer de combattant |
| F / M / Échap | Plein écran / son / pause |

Cycle de styles : FORCE > TECH > RUSE > KI > VIT > FORCE (×1,25 en avantage, ×0,8 en désavantage).

## Roster

Goku, Vegeta, Gohan, Piccolo, Freezer, Cell, Majin Boo, Trunks du futur.

## Crédits et mentions légales

Dragon Ball © Bird Studio / Shueisha / Toei Animation. Ce projet est un hommage de fan, sans but lucratif, non affilié à Toei, Shueisha ou Bandai Namco. Les sprites proviennent de la communauté fan (The Spriters Resource et auteurs ci-dessous) et **ne sont pas couverts par la licence du code**. Sur demande des ayants droit, ils seront retirés.

**Sons** : voix des combattants issues de *Dragon Ball Z: Supersonic Warriors* (GBA) et effets sonores de *Supersonic Warriors 2* (DS), extraits par la communauté et récupérés sur The Sounds Resource. Ils ne sont pas couverts par la licence du code et seront retirés sur demande. La page `sfx-test.html` permet d'écouter la banque et d'ajuster la correspondance (`js/sfxmap.js`).

| Perso | Source | Auteur |
|---|---|---|
| Goku, Vegeta | Ultimate LSW | qsab101 |
| Gohan | Jumpsuit sheet | AngryBoy (base : Son Goharotto) |
| Piccolo, Freezer, Cell, Boo | Legendary Super Warriors | Son Goharotto |
| Trunks | SSJ jacket and sword | lukasahl1, qsab101, mestrepixelado, yoloking777 |

Le code (`index.html`, `style.css`, `js/`) est sous licence MIT.
