import 'server-only';
import type Database from 'better-sqlite3';
import type { Persona, Car } from './types';
import personas from '@/data/personas.json';
import cars from '@/data/cars.json';

export function seed(db: Database.Database): void {
  // INSERT OR IGNORE makes the seeder idempotent — if another worker races us,
  // we don't error, we just skip duplicates. (Important for Next.js build, which
  // can spawn multiple workers that each try to seed.)
  const insertPersona = db.prepare(
    `INSERT OR IGNORE INTO personas (id, title, tagline, emoji, description, data)
     VALUES (@id, @title, @tagline, @emoji, @description, @data)`,
  );

  const insertCar = db.prepare(
    `INSERT OR IGNORE INTO cars (id, brand, model, variant, body, fuel, transmission, seats,
       price_lakh, fe_kmpl, safety, boot_l, length_mm, ground_mm, image_url,
       one_liner, data)
     VALUES (@id, @brand, @model, @variant, @body, @fuel, @transmission, @seats,
       @price_lakh, @fe_kmpl, @safety, @boot_l, @length_mm, @ground_mm, @image_url,
       @one_liner, @data)`,
  );

  const txn = db.transaction(() => {
    for (const p of personas as Persona[]) {
      insertPersona.run({
        id: p.id,
        title: p.title,
        tagline: p.tagline,
        emoji: p.emoji,
        description: p.description,
        data: JSON.stringify({ preferences: p.preferences, highlights: p.highlights }),
      });
    }
    for (const c of cars as Car[]) {
      insertCar.run({
        id: c.id,
        brand: c.brand,
        model: c.model,
        variant: c.variant,
        body: c.body,
        fuel: c.fuel,
        transmission: c.transmission,
        seats: c.seats,
        price_lakh: c.priceLakh,
        fe_kmpl: c.fuelEfficiencyKmpl,
        safety: c.safetyStars,
        boot_l: c.bootLitres,
        length_mm: c.lengthMm,
        ground_mm: c.groundClearanceMm,
        image_url: c.imageUrl,
        one_liner: c.oneLiner,
        data: JSON.stringify({ prosCons: c.prosCons, media: c.media }),
      });
    }
  });

  txn();
}

// Hydrators used by repositories: rebuild a Car/Persona object from a DB row.
export function rowToPersona(row: any): Persona {
  const data = JSON.parse(row.data);
  return {
    id: row.id,
    title: row.title,
    tagline: row.tagline,
    emoji: row.emoji,
    description: row.description,
    preferences: data.preferences,
    highlights: data.highlights,
  };
}

export function rowToCar(row: any): Car {
  const data = JSON.parse(row.data);
  return {
    id: row.id,
    brand: row.brand,
    model: row.model,
    variant: row.variant,
    body: row.body,
    fuel: row.fuel,
    transmission: row.transmission,
    seats: row.seats,
    priceLakh: row.price_lakh,
    fuelEfficiencyKmpl: row.fe_kmpl,
    safetyStars: row.safety,
    bootLitres: row.boot_l,
    lengthMm: row.length_mm,
    groundClearanceMm: row.ground_mm,
    imageUrl: row.image_url,
    oneLiner: row.one_liner,
    prosCons: data.prosCons,
    media: data.media,
  };
}
