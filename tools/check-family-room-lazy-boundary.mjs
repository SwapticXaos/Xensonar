#!/usr/bin/env node
import fs from 'node:fs';

const MAIN_ROOM = 'src/features/xensonar/rooms/MainRoom.tsx';
const XENPOLAR_ROOM = 'src/features/xensonar/rooms/XenpolarRoom.tsx';
const MANIFEST = 'src/features/xensonar/rooms/familyRoomManifest.ts';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function assertContains(path, source, needle, message) {
  if (!source.includes(needle)) {
    console.error(`[family-room-lazy-boundary] ${path}: missing ${message || needle}`);
    process.exit(1);
  }
}

function assertNotContains(path, source, needle, message) {
  if (source.includes(needle)) {
    console.error(`[family-room-lazy-boundary] ${path}: forbidden ${message || needle}`);
    process.exit(1);
  }
}

const mainRoom = read(MAIN_ROOM);
const xenpolarRoom = read(XENPOLAR_ROOM);
const manifest = read(MANIFEST);

assertContains(MANIFEST, manifest, 'export const FAMILY_CARDS', 'shared family card manifest');
assertContains(MANIFEST, manifest, "export type { FamilyApp, FamilyCard } from './familyRoomManifestTypes';", 'family manifest re-exports shared type contract');
assertContains(MAIN_ROOM, mainRoom, "import { FAMILY_CARDS } from './familyRoomManifest';", 'MainRoom imports shared family manifest');
assertContains(MAIN_ROOM, mainRoom, "import type { FamilyApp } from './familyRoomManifestTypes';", 'MainRoom imports FamilyApp from type-only contract');
assertContains(XENPOLAR_ROOM, xenpolarRoom, 'import { FAMILY_CARDS } from "./familyRoomManifest";', 'XenpolarRoom imports shared family manifest');
assertContains(XENPOLAR_ROOM, xenpolarRoom, 'import type { FamilyApp } from "./familyRoomManifestTypes";', 'XenpolarRoom imports FamilyApp from type-only contract');

assertNotContains(MAIN_ROOM, mainRoom, "import XensonarRefactorRoom from '../family/refactor/XensonarRefactorRoom'", 'static Refucktor room import');
assertContains(MAIN_ROOM, mainRoom, "const XensonarRefactorRoomLazy = lazy(() =>", 'lazy Refucktor room boundary');
assertContains(MAIN_ROOM, mainRoom, "<XensonarRefactorRoomLazy embedded", 'lazy Refucktor render surface');

assertNotContains(XENPOLAR_ROOM, xenpolarRoom, 'MainRoom, type FamilyApp', 'static MainRoom import from XenpolarRoom');
assertNotContains(XENPOLAR_ROOM, xenpolarRoom, 'from "./MainRoom";', 'static MainRoom import from XenpolarRoom');
assertContains(XENPOLAR_ROOM, xenpolarRoom, 'const MainRoomLazy = lazy(() => import("./MainRoom")', 'lazy MainRoom boundary for family requests');
assertContains(XENPOLAR_ROOM, xenpolarRoom, '<MainRoomLazy', 'lazy MainRoom render surface');

console.log('[family-room-lazy-boundary] OK: family launcher manifest is shared; Refucktor/MainRoom heavy surfaces are lazy-loaded.');
