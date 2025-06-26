import { users, gameStates, gameScores, type User, type InsertUser, type GameState, type InsertGameState, type GameScore, type InsertGameScore } from "@shared/schema";

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

export const storage = new MemStorage();
