import 'server-only';
import { getDb } from './db';
import { rowToCar, rowToPersona } from './seed';
import type { Car, Lead, Persona, ViewEvent } from './types';

export const repo = {
  // ─── reads ─────────────────────────────────────────────────────────────
  allPersonas(): Persona[] {
    const rows = getDb().prepare('SELECT * FROM personas').all();
    return rows.map(rowToPersona);
  },

  persona(id: string): Persona | null {
    const row = getDb().prepare('SELECT * FROM personas WHERE id = ?').get(id);
    return row ? rowToPersona(row) : null;
  },

  allCars(): Car[] {
    const rows = getDb().prepare('SELECT * FROM cars').all();
    return rows.map(rowToCar);
  },

  car(id: string): Car | null {
    const row = getDb().prepare('SELECT * FROM cars WHERE id = ?').get(id);
    return row ? rowToCar(row) : null;
  },

  // ─── aggregations ──────────────────────────────────────────────────────
  // "Popular cars in this persona" — used to surface social proof on the
  // shortlist page once real users start clicking through.
  popularInPersona(personaId: string, limit = 3): { carId: string; views: number }[] {
    const rows = getDb()
      .prepare(
        `SELECT car_id AS carId, COUNT(*) AS views
         FROM views WHERE persona_id = ?
         GROUP BY car_id ORDER BY views DESC LIMIT ?`,
      )
      .all(personaId, limit) as { carId: string; views: number }[];
    return rows;
  },

  totalViews(carId: string): number {
    const row = getDb()
      .prepare('SELECT COUNT(*) AS n FROM views WHERE car_id = ?')
      .get(carId) as { n: number };
    return row.n;
  },

  totalLeads(carId: string): number {
    const row = getDb()
      .prepare('SELECT COUNT(*) AS n FROM leads WHERE car_id = ?')
      .get(carId) as { n: number };
    return row.n;
  },

  // ─── writes ────────────────────────────────────────────────────────────
  recordView(ev: ViewEvent): void {
    getDb()
      .prepare('INSERT INTO views (car_id, persona_id) VALUES (?, ?)')
      .run(ev.carId, ev.personaId);
  },

  createLead(lead: Lead): number {
    const info = getDb()
      .prepare(
        `INSERT INTO leads (car_id, persona_id, intent, name, phone, city)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(lead.carId, lead.personaId, lead.intent, lead.name, lead.phone, lead.city);
    return Number(info.lastInsertRowid);
  },
};
