// Primitives cryptographiques (node:crypto) — module feuille, sans dépendance
// à la base ni à Next : peut être importé partout côté serveur sans cycle.
// NE PAS importer côté client (hachage = serveur uniquement).
//
// Choix « zéro dépendance » : scrypt natif pour les mots de passe, tokens
// opaques via randomBytes, empreinte sha256 pour les tokens de reset stockés.

import { scryptSync, randomBytes, timingSafeEqual, createHash } from "node:crypto";

const SCRYPT_KEYLEN = 64;
const SALT_BYTES = 16;

/** Hache un mot de passe. Encodage auto-descriptif `scrypt$<selHex>$<hashHex>`
 * (l'algo est versionné → une future migration argon/bcrypt = un préfixe). */
export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_BYTES);
  const derived = scryptSync(password, salt, SCRYPT_KEYLEN);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

/** Vérifie un mot de passe en temps constant. `false` si l'encodage est inconnu. */
export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = Buffer.from(parts[1], "hex");
  const expected = Buffer.from(parts[2], "hex");
  const derived = scryptSync(password, salt, expected.length);
  // timingSafeEqual lève si les longueurs diffèrent → garde explicite.
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

/** Token de session opaque, 256 bits. */
export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Empreinte sha256 (hex) d'un token — pour stocker les tokens de reset sans
 * conserver leur valeur brute en base. */
export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
