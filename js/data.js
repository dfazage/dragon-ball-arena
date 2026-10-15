'use strict';
// Données du jeu : styles, combattants, difficultés.

const W = 960, H = 540;

// Cycle de styles : FORCE > TECH > RUSE > KI > VIT > FORCE
const STYLES = {
  force: { n: 'FORCE', c: '#ff4a3a', beats: 'tech' },
  tech:  { n: 'TECH',  c: '#3ee08a', beats: 'ruse' },
  ruse:  { n: 'RUSE',  c: '#b46bff', beats: 'ki' },
  ki:    { n: 'KI',    c: '#ffd23f', beats: 'vit' },
  vit:   { n: 'VIT',   c: '#35d0ff', beats: 'force' },
};

function styleMult(att, def) {
  if (STYLES[att].beats === def) return 1.25;
  if (STYLES[def].beats === att) return 0.8;
  return 1;
}

// hp / atk / def / spd : valeurs de base (spd = multiplicateur de vitesse)
const ROSTER = [
  { id: 'goku',    name: 'GOKU',    style: 'ki',    hp: 1000, atk: 100, def: 88, spd: 1.00, ult: 'Kamehameha',       ultColor: '#5fd0ff', scale: 4 },
  { id: 'vegeta',  name: 'VEGETA',  style: 'force', hp: 980,  atk: 106, def: 86, spd: 0.97, ult: 'Final Flash',      ultColor: '#ffe45f', scale: 4 },
  { id: 'gohan',   name: 'GOHAN',   style: 'tech',  hp: 960,  atk: 98,  def: 86, spd: 1.00, ult: 'Masenko',          ultColor: '#ffd84a', scale: 4 },
  { id: 'piccolo', name: 'PICCOLO', style: 'vit',   hp: 1000, atk: 92,  def: 92, spd: 0.95, ult: 'Makankosappo',     ultColor: '#d77bff', scale: 4 },
  { id: 'freezer', name: 'FREEZER', style: 'ruse',  hp: 980,  atk: 106, def: 86, spd: 0.98, ult: 'Death Ball',       ultColor: '#ff5a7a', scale: 4 },
  { id: 'cell',    name: 'CELL',    style: 'tech',  hp: 1040, atk: 102, def: 94, spd: 0.94, ult: 'Solar Kamehameha', ultColor: '#7dffa0', scale: 4 },
  { id: 'boo',     name: 'MAJIN BOO', style: 'force', hp: 1100, atk: 96, def: 82, spd: 0.90, ult: 'Planet Burst',    ultColor: '#ff7fc8', scale: 4 },
  { id: 'trunks',  name: 'TRUNKS',  style: 'vit',   hp: 940,  atk: 100, def: 80, spd: 1.08, ult: 'Burning Attack',   ultColor: '#ffb02e', scale: 4 },
];

const ROSTER_BY_ID = Object.fromEntries(ROSTER.map(r => [r.id, r]));

const DIFFICULTIES = [
  { name: 'FACILE', react: 0.50, atk: 0.35, blast: 0.15, ult: 0.10, dodge: 0.15, sw: 0.0 },
  { name: 'NORMAL', react: 0.30, atk: 0.55, blast: 0.30, ult: 0.25, dodge: 0.40, sw: 0.5 },
  { name: 'DIFFICILE', react: 0.15, atk: 0.75, blast: 0.40, ult: 0.40, dodge: 0.70, sw: 1.0 },
];

const CREDITS = [
  ['GOKU', 'ULTIMATE LSW', 'QSAB101 (DEVIANTART)'],
  ['VEGETA', 'ULTIMATE LSW', 'QSAB101 (DEVIANTART)'],
  ['GOHAN', 'JUMPSUIT SHEET', 'ANGRYBOY (BASE : SON GOHAROTTO)'],
  ['PICCOLO', 'LEGENDARY SUPER WARRIORS', 'SON GOHAROTTO'],
  ['FREEZER', 'LEGENDARY SUPER WARRIORS', 'SON GOHAROTTO'],
  ['CELL', 'LEGENDARY SUPER WARRIORS', 'SON GOHAROTTO'],
  ['BOO', 'LEGENDARY SUPER WARRIORS', 'SON GOHAROTTO'],
  ['TRUNKS', 'SSJ JACKET AND SWORD', 'LUKASAHL1, QSAB101, MESTREPIXELADO, YOLOKING777'],
];
