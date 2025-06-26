import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertGameStateSchema, insertGameScoreSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Game state routes
  app.get("/api/game-states", async (req, res) => {
    try {
      const gameStates = await storage.getActiveGameStates();
      res.json(gameStates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch game states" });
    }
  });

  app.get("/api/game-states/:gameType", async (req, res) => {
    try {
      const { gameType } = req.params;
      const gameState = await storage.getGameState(gameType);
      if (!gameState) {
        return res.status(404).json({ message: "Game state not found" });
      }
      res.json(gameState);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch game state" });
    }
  });

  app.post("/api/game-states", async (req, res) => {
    try {
      const gameState = insertGameStateSchema.parse(req.body);
      const created = await storage.saveGameState(gameState);
      res.json(created);
    } catch (error) {
      res.status(400).json({ message: "Invalid game state data" });
    }
  });

  app.put("/api/game-states/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { gameData } = req.body;
      const updated = await storage.updateGameState(parseInt(id), gameData);
      if (!updated) {
        return res.status(404).json({ message: "Game state not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update game state" });
    }
  });

  app.delete("/api/game-states/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteGameState(parseInt(id));
      if (!deleted) {
        return res.status(404).json({ message: "Game state not found" });
      }
      res.json({ message: "Game state deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete game state" });
    }
  });

  // High scores routes
  app.get("/api/scores/:gameType", async (req, res) => {
    try {
      const { gameType } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const scores = await storage.getHighScores(gameType, limit);
      res.json(scores);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch scores" });
    }
  });

  app.post("/api/scores", async (req, res) => {
    try {
      const score = insertGameScoreSchema.parse(req.body);
      const created = await storage.saveGameScore(score);
      res.json(created);
    } catch (error) {
      res.status(400).json({ message: "Invalid score data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
