// Type du dictionnaire, dérivé de la version anglaise (source de vérité de la
// structure). Import de valeur utilisé uniquement en position de type (`typeof`)
// : il est effacé à la compilation, donc en.json n'alourdit PAS le bundle client.
// Ce module (sans "server-only") est importable côté serveur ET client, pour
// partager le type via le contexte React.
import en from "./dictionaries/en.json";

export type Dictionary = typeof en;
