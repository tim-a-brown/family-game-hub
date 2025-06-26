import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const gameStates = pgTable("game_states", {
  id: serial("id").primaryKey(),
  gameType: text("game_type").notNull(),
  gameData: jsonb("game_data").notNull(),
  userId: integer("user_id"),
  lastPlayed: timestamp("last_played").defaultNow(),
  isActive: boolean("is_active").default(true),
});

export const gameScores = pgTable("game_scores", {
  id: serial("id").primaryKey(),
  gameType: text("game_type").notNull(),
  playerName: text("player_name").notNull(),
  score: integer("score").notNull(),
  completedAt: timestamp("completed_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertGameStateSchema = createInsertSchema(gameStates).pick({
  gameType: true,
  gameData: true,
  userId: true,
});

export const insertGameScoreSchema = createInsertSchema(gameScores).pick({
  gameType: true,
  playerName: true,
  score: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type GameState = typeof gameStates.$inferSelect;
export type InsertGameState = z.infer<typeof insertGameStateSchema>;
export type GameScore = typeof gameScores.$inferSelect;
export type InsertGameScore = z.infer<typeof insertGameScoreSchema>;
