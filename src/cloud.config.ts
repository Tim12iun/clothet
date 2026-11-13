/**
 * Zugang zum Cloud-Speicher (Supabase). Beide Werte sind öffentlich und dürfen im Repo stehen: Geschützt wird über
 * die Regeln aus `supabase/setup.sql` (jede Zeile gehört genau einem Konto). Leer heißt: kein Cloud-Speicher.
 */
export const CLOUD = { url: '', key: '' }
