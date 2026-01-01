import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import type { User } from "@shared/schema";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

export interface AuthenticatedRequest extends Request {
  user?: User;
}

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function setupAuth(app: Express) {
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    })
  );

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email e senha são obrigatórios" });
      }

      if (!EMAIL_REGEX.test(email)) {
        return res.status(400).json({ message: "Formato de email inválido" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "A senha deve ter pelo menos 6 caracteres" });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Este email já está cadastrado" });
      }

      const hashedPassword = await hashPassword(password);
      
      // Automatically set platform_admin role for designated admin email
      const PLATFORM_ADMIN_EMAIL = "agclickon@gmail.com";
      const role = email.toLowerCase() === PLATFORM_ADMIN_EMAIL.toLowerCase() ? "platform_admin" : "user";
      
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role,
      });

      req.session.userId = user.id;
      
      res.status(201).json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Erro ao registrar usuário" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email e senha são obrigatórios" });
      }

      if (!EMAIL_REGEX.test(email)) {
        return res.status(400).json({ message: "Formato de email inválido" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Email ou senha incorretos" });
      }

      const isValid = await verifyPassword(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Email ou senha incorretos" });
      }

      req.session.userId = user.id;
      
      // Return all user fields except password
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Erro ao fazer login" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Erro ao fazer logout" });
      }
      res.json({ message: "Logout realizado com sucesso" });
    });
  });

  app.get("/api/auth/user", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(401).json({ message: "Usuário não encontrado" });
      }

      // Return all user fields except password
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Erro ao buscar usuário" });
    }
  });
}

export function isAuthenticated(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Não autenticado" });
  }
  
  storage.getUser(req.session.userId).then((user) => {
    if (!user) {
      return res.status(401).json({ message: "Usuário não encontrado" });
    }
    req.user = user;
    next();
  }).catch((error) => {
    console.error("Auth middleware error:", error);
    res.status(500).json({ message: "Erro de autenticação" });
  });
}
