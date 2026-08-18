'use strict';

/**
 * USER.md — Dru's Learner Profile
 * This is the single source of truth for who Dru is.
 * Update this file as Dru grows and changes.
 */
const DRU_PROFILE = {
  name:       "Dru",
  fullName:   "Dru",
  age:        11,
  grade:      "Kelas 5 SD",
  school:     "SD Tara Salvia",
  birthday:   "Juli 2015",

  // What Dru loves
  interests:  ["sains", "puzzle", "petualangan", "buku Why", "TED-Ed anak", "Pokémon", "coding (Cody/DruCode)"],
  favoriteSubjects: ["matematika", "sains"],

  // Learning preferences
  learnsBestWith: [
    "dialog singkat tanya-jawab",
    "tantangan langkah demi langkah",
    "cerita atau konteks nyata",
    "hint daripada langsung dikasih jawaban",
  ],

  // Frustration triggers — DRACO MUST AVOID THESE
  frustrationTriggers: [
    "terlalu banyak teks sekaligus",
    "soal susah di awal sebelum ada penjelasan",
    "instruksi yang tidak jelas",
    "topik yang belum pernah dipelajari tanpa pengantar",
  ],

  // Signs Dru is enjoying the session
  engagementSigns: ["mau coba terus", "ketawa / excited", "mau ngulang", "nanya balik"],

  // Signs Dru is frustrated — DRACO should detect and respond
  frustrationSigns: ["diam", "asal jawab", "jawab singkat terus", "skip"],

  // Session preferences
  maxSessionMinutes: 15,
  preferredResponseLength: "1-3 kalimat max per pesan Draco",

  // Draco's relationship with Dru
  relationship: "teman petualangan yang kebetulan tau banyak hal",
};

module.exports = { DRU_PROFILE };
