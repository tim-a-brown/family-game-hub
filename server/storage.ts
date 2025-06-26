import { users, gameStates, gameScores, type User, type InsertUser, type GameState, type InsertGameState, type GameScore, type InsertGameScore } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getGameState(gameType: string, userId?: number): Promise<GameState | undefined>;
  saveGameState(gameState: InsertGameState): Promise<GameState>;
  updateGameState(id: number, gameData: any): Promise<GameState | undefined>;
  deleteGameState(id: number): Promise<boolean>;
  getActiveGameStates(userId?: number): Promise<GameState[]>;
  
  getHighScores(gameType: string, limit?: number): Promise<GameScore[]>;
  saveGameScore(score: InsertGameScore): Promise<GameScore>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private gameStates: Map<number, GameState>;
  private gameScores: Map<number, GameScore>;
  private currentUserId: number;
  private currentGameStateId: number;
  private currentGameScoreId: number;

  constructor() {
    this.users = new Map();
    this.gameStates = new Map();
    this.gameScores = new Map();
    this.currentUserId = 1;
    this.currentGameStateId = 1;
    this.currentGameScoreId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getGameState(gameType: string, userId?: number): Promise<GameState | undefined> {
    return Array.from(this.gameStates.values()).find(
      (state) => state.gameType === gameType && (!userId || state.userId === userId) && state.isActive
    );
  }

  async saveGameState(insertGameState: InsertGameState): Promise<GameState> {
    const id = this.currentGameStateId++;
    const gameState: GameState = {
      ...insertGameState,
      id,
      lastPlayed: new Date(),
      isActive: true,
    };
    this.gameStates.set(id, gameState);
    return gameState;
  }

  async updateGameState(id: number, gameData: any): Promise<GameState | undefined> {
    const existing = this.gameStates.get(id);
    if (!existing) return undefined;
    
    const updated: GameState = {
      ...existing,
      gameData,
      lastPlayed: new Date(),
    };
    this.gameStates.set(id, updated);
    return updated;
  }

  async deleteGameState(id: number): Promise<boolean> {
    return this.gameStates.delete(id);
  }

  async getActiveGameStates(userId?: number): Promise<GameState[]> {
    return Array.from(this.gameStates.values()).filter(
      (state) => state.isActive && (!userId || state.userId === userId)
    );
  }

  async getHighScores(gameType: string, limit = 10): Promise<GameScore[]> {
    return Array.from(this.gameScores.values())
      .filter((score) => score.gameType === gameType)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async saveGameScore(insertGameScore: InsertGameScore): Promise<GameScore> {
    const id = this.currentGameScoreId++;
    const gameScore: GameScore = {
      ...insertGameScore,
      id,
      completedAt: new Date(),
    };
    this.gameScores.set(id, gameScore);
    return gameScore;
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getGameState(gameType: string, userId?: number): Promise<GameState | undefined> {
    const conditions = [eq(gameStates.gameType, gameType)];
    
    if (userId) {
      conditions.push(eq(gameStates.userId, userId));
    }
    
    const [gameState] = await db
      .select()
      .from(gameStates)
      .where(and(...conditions))
      .orderBy(desc(gameStates.lastPlayed));
    return gameState || undefined;
  }

  async saveGameState(insertGameState: InsertGameState): Promise<GameState> {
    const [gameState] = await db
      .insert(gameStates)
      .values({
        ...insertGameState,
        lastPlayed: new Date(),
        isActive: true,
      })
      .returning();
    return gameState;
  }

  async updateGameState(id: number, gameData: any): Promise<GameState | undefined> {
    const [gameState] = await db
      .update(gameStates)
      .set({ 
        gameData,
        lastPlayed: new Date()
      })
      .where(eq(gameStates.id, id))
      .returning();
    return gameState || undefined;
  }

  async deleteGameState(id: number): Promise<boolean> {
    const result = await db
      .update(gameStates)
      .set({ isActive: false })
      .where(eq(gameStates.id, id));
    return result.rowCount > 0;
  }

  async getActiveGameStates(userId?: number): Promise<GameState[]> {
    let query = db.select().from(gameStates).where(eq(gameStates.isActive, true));
    
    if (userId) {
      query = query.where(eq(gameStates.userId, userId));
    }
    
    return await query.orderBy(desc(gameStates.lastPlayed));
  }

  async getHighScores(gameType: string, limit = 10): Promise<GameScore[]> {
    return await db
      .select()
      .from(gameScores)
      .where(eq(gameScores.gameType, gameType))
      .orderBy(desc(gameScores.score))
      .limit(limit);
  }

  async saveGameScore(insertGameScore: InsertGameScore): Promise<GameScore> {
    const [gameScore] = await db
      .insert(gameScores)
      .values({
        ...insertGameScore,
        completedAt: new Date(),
      })
      .returning();
    return gameScore;
  }
}

export const storage = new DatabaseStorage();
