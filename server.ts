import express, { Request, Response, NextFunction } from "express";
import { createServer as createViteServer, ViteDevServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { getDB, DatabaseInterface } from "./src/lib/db";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import * as XLSX from "xlsx";
import nodemailer from "nodemailer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.on('uncaughtException', (err: Error) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

interface AuthRequest extends Request {
  user?: any;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[RAW REQUEST] ${req.method} ${req.url} - Accept: ${req.headers.accept}`);
    next();
  });

  // 1. Start Server IMMEDIATELY
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server listening on http://0.0.0.0:${PORT}`);
  });

  // 2. Health Check for platform
  app.get("/api/health", (req: Request, res: Response) => res.json({ status: "ok" }));

  // 3. Setup Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // 4. Initialize Database (after port binding)
  const db: DatabaseInterface = getDB();
  let dbReady = false;
  const JWT_SECRET = process.env.JWT_SECRET || "spas-secret-key";
  const upload = multer({ storage: multer.memoryStorage() });

  // Middleware to wait for DB
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!dbReady && req.url.startsWith('/api/') && req.url !== '/api/health') {
      return res.status(503).json({ error: "Database initializing... Please try again in a few seconds." });
    }
    next();
  });

  // Email Transporter Setup
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_PORT === '465',
    auth: {
      user: process.env.EMAIL_USER || 'mock-user',
      pass: process.env.EMAIL_PASS || 'mock-pass',
    },
  });

  const sendPlacementEmail = async (student: any, company: any) => {
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Placement Cell" <placement@spas.com>',
      to: student.email,
      subject: `Invitation to Placement Drive: ${company.name}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #f0f0f0; border-radius: 16px; color: #333; line-height: 1.6;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #10b981; margin: 0; font-size: 24px;">Placement Opportunity</h1>
            <p style="color: #666; font-size: 14px; margin-top: 5px;">Smart Placement Analytics System (SPAS)</p>
          </div>
          <p>Dear <strong>${student.name}</strong>,</p>
          <p>We are pleased to inform you that based on your academic performance and skill profile, you have been identified as an eligible candidate for the upcoming recruitment drive by <strong>${company.name}</strong>.</p>
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #10b981;">
            <h3 style="margin-top: 0; color: #111827; font-size: 16px;">Drive Details</h3>
            <ul style="list-style: none; padding: 0; margin: 0; font-size: 14px;">
              <li style="margin-bottom: 8px;"><strong>Company:</strong> ${company.name}</li>
              <li style="margin-bottom: 8px;"><strong>Salary Package:</strong> ${company.salary_package} LPA</li>
              ${company.description ? `<li style="margin-bottom: 8px;"><strong>Description:</strong> ${company.description}</li>` : ''}
            </ul>
          </div>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${process.env.APP_URL || '#'}" style="background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">View Details & Apply</a>
          </div>
          <p>Please log in to the SPAS dashboard to review the full job description and complete your application process.</p>
          <p>We wish you the very best in your preparation.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="margin: 0; color: #666; font-size: 14px;">Best Regards,</p>
          <p style="margin: 5px 0 0 0; font-weight: bold; color: #111827;">Placement & Training Cell</p>
          <p style="margin: 0; color: #10b981; font-size: 13px; font-weight: 600;">Smart Placement Analytics System (SPAS)</p>
        </div>
      `
    };
    try {
      if (process.env.EMAIL_USER && process.env.EMAIL_USER !== 'mock-user') {
        await transporter.sendMail(mailOptions);
      } else {
        console.log(`[MOCK EMAIL] To: ${student.email} | Subject: ${mailOptions.subject}`);
      }
    } catch (error) {
      console.error(`Failed to send email to ${student.email}:`, error);
    }
  };

  // 2. API Routes
  app.get("/api/test-connection", async (req: Request, res: Response) => {
    try {
      await db.execute("SELECT 1");
      res.json({ status: "ok", message: "SQLite connection successful", dbReady });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
      req.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch (e) { res.status(401).json({ error: "Invalid token" }); }
  };

  app.post(["/api/auth/register", "/api/auth/register/"], async (req: Request, res: Response) => {
    const { name, email, password, role, branch } = req.body;
    console.log(`[REGISTER] Attempt for ${email}`);
    const hashedPassword = bcrypt.hashSync(password, 10);
    try {
      await db.execute("INSERT INTO users (name, email, password, role, branch) VALUES (?, ?, ?, ?, ?)", [name, email, hashedPassword, role, branch]);
      console.log(`[REGISTER] Success for ${email}`);
      res.json({ success: true });
    } catch (e: any) { 
      console.error(`[REGISTER] Error for ${email}:`, e);
      res.status(400).json({ error: "Email already exists or database error" }); 
    }
  });

  app.post(["/api/auth/login", "/api/auth/login/"], async (req: Request, res: Response) => {
    console.log(`[DEBUG] Login endpoint hit: ${req.method} ${req.url}`);
    try {
      const { email, password } = req.body;
      console.log(`[LOGIN] Attempt for ${email}`);
      const user = await db.get("SELECT * FROM users WHERE email = ?", [email]);
      if (user && bcrypt.compareSync(password, user.password)) {
        const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET);
        const { password: _, ...userWithoutPassword } = user;
        res.json({ token, user: userWithoutPassword });
      } else { 
        console.log(`[LOGIN] Failed for ${email}. User found: ${!!user}`);
        if (user) {
          console.log(`[LOGIN] Password match failed for ${email}`);
        }
        res.status(401).json({ error: "Invalid credentials" }); 
      }
    } catch (err: any) {
      console.error("[LOGIN] Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/students", authenticate, async (req: AuthRequest, res: Response) => res.json(await db.all("SELECT * FROM users WHERE role = 'student'")));
  app.get("/api/students/:id", authenticate, async (req: AuthRequest, res: Response) => {
    const student = await db.get("SELECT * FROM users WHERE id = ?", [req.params.id]);
    if (!student) return res.status(404).json({ error: "Student not found" });
    res.json(student);
  });

  app.put("/api/students/:id", authenticate, async (req: AuthRequest, res: Response) => {
    const { cgpa, backlogs, placement_status, skills, attendance, coding_score, aptitude_score, register_number, phone, company_name, package: pkg } = req.body;
    await db.execute(`
      UPDATE users SET cgpa = ?, backlogs = ?, placement_status = ?, skills = ?, attendance = ?, coding_score = ?, aptitude_score = ?, register_number = ?, phone = ?, company_name = ?, package = ?
      WHERE id = ?
    `, [cgpa, backlogs, placement_status, typeof skills === 'string' ? skills : JSON.stringify(skills || []), attendance, coding_score || 0, aptitude_score || 0, register_number, phone, company_name, pkg, req.params.id]);
    res.json({ success: true });
  });

  app.delete("/api/students/:id", authenticate, async (req: AuthRequest, res: Response) => {
    if (req.user.role !== 'admin' && req.user.role !== 'faculty') return res.status(403).json({ error: "Forbidden" });
    await db.execute("DELETE FROM users WHERE id = ? AND role = 'student'", [req.params.id]);
    res.json({ success: true });
  });

  app.delete("/api/students", authenticate, async (req: AuthRequest, res: Response) => {
    if (req.user.role !== 'admin' && req.user.role !== 'faculty') return res.status(403).json({ error: "Forbidden" });
    await db.execute("DELETE FROM users WHERE role = 'student'");
    res.json({ success: true });
  });

  app.post("/api/bulk-upload/students", authenticate, upload.single('file'), async (req: AuthRequest, res: Response) => {
    if (req.user.role !== 'admin' && req.user.role !== 'faculty') return res.status(403).json({ error: "Forbidden" });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    
    try {
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data: any[] = XLSX.utils.sheet_to_json(sheet);
      
      const studentPass = bcrypt.hashSync("student123", 10);
      
      await db.transaction(async (tx) => {
        for (const s of data) {
          await tx.execute(`
            INSERT INTO users (name, email, password, role, branch, cgpa, backlogs, attendance, skills, register_number, phone)
            VALUES (?, ?, ?, 'student', ?, ?, ?, ?, ?, ?, ?)
          `, [
            s.name, 
            s.email, 
            studentPass, 
            s.branch || 'CSE', 
            s.cgpa || 0, 
            s.backlogs || 0, 
            s.attendance || 0, 
            typeof s.skills === 'string' ? s.skills : JSON.stringify(s.skills || []),
            s.register_number || '',
            s.phone || ''
          ]);
        }
      });
      
      res.json({ success: true, count: data.length });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/companies", authenticate, async (req: AuthRequest, res: Response) => res.json(await db.all("SELECT * FROM companies")));
  
  app.get("/api/companies/:id/eligible", authenticate, async (req: AuthRequest, res: Response) => {
    const company = await db.get("SELECT * FROM companies WHERE id = ?", [req.params.id]);
    if (!company) return res.status(404).json({ error: "Company not found" });
    
    const students = await db.all("SELECT * FROM users WHERE role = 'student' AND placement_status = 'unplaced'");
    const allowedBranchesRaw = JSON.parse(company.allowed_branches || '[]');
    const requiredSkillsRaw = JSON.parse(company.required_skills || '[]');
    const allowedBranches = Array.isArray(allowedBranchesRaw) ? allowedBranchesRaw : [];
    const requiredSkills = Array.isArray(requiredSkillsRaw) ? requiredSkillsRaw : [];
    
    const eligible = students.filter((s) => {
      const studentSkillsRaw = JSON.parse(s.skills || '[]');
      const studentSkills = Array.isArray(studentSkillsRaw) ? studentSkillsRaw : [];
      const meetsCgpa = s.cgpa >= company.min_cgpa;
      const meetsBacklogs = s.backlogs <= company.max_backlogs;
      const meetsBranch = allowedBranches.length === 0 || allowedBranches.includes(s.branch);
      const meetsSkills = requiredSkills.length === 0 || requiredSkills.every((sk: string) => studentSkills.includes(sk));
      return meetsCgpa && meetsBacklogs && meetsBranch && meetsSkills;
    });
    
    res.json(eligible);
  });

  app.post("/api/companies/:id/notify", authenticate, async (req: AuthRequest, res: Response) => {
    const company = await db.get("SELECT * FROM companies WHERE id = ?", [req.params.id]);
    if (!company) return res.status(404).json({ error: "Company not found" });
    
    const students = await db.all("SELECT * FROM users WHERE role = 'student' AND placement_status = 'unplaced'");
    const allowedBranchesRaw = JSON.parse(company.allowed_branches || '[]');
    const requiredSkillsRaw = JSON.parse(company.required_skills || '[]');
    const allowedBranches = Array.isArray(allowedBranchesRaw) ? allowedBranchesRaw : [];
    const requiredSkills = Array.isArray(requiredSkillsRaw) ? requiredSkillsRaw : [];
    
    const eligible = students.filter((s) => {
      const studentSkillsRaw = JSON.parse(s.skills || '[]');
      const studentSkills = Array.isArray(studentSkillsRaw) ? studentSkillsRaw : [];
      const meetsCgpa = s.cgpa >= company.min_cgpa;
      const meetsBacklogs = s.backlogs <= company.max_backlogs;
      const meetsBranch = allowedBranches.length === 0 || allowedBranches.includes(s.branch);
      const meetsSkills = requiredSkills.length === 0 || requiredSkills.every((sk: string) => studentSkills.includes(sk));
      return meetsCgpa && meetsBacklogs && meetsBranch && meetsSkills;
    });

    for (const student of eligible) {
      await sendPlacementEmail(student, company);
    }
    
    res.json({ success: true, notifiedCount: eligible.length });
  });

  app.delete("/api/companies/:id", authenticate, async (req: AuthRequest, res: Response) => {
    if (req.user.role !== 'admin' && req.user.role !== 'faculty') return res.status(403).json({ error: "Forbidden" });
    await db.execute("DELETE FROM companies WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  });

  app.delete("/api/companies", authenticate, async (req: AuthRequest, res: Response) => {
    if (req.user.role !== 'admin' && req.user.role !== 'faculty') return res.status(403).json({ error: "Forbidden" });
    await db.execute("DELETE FROM companies");
    res.json({ success: true });
  });
  app.post("/api/companies", authenticate, async (req: AuthRequest, res: Response) => {
    if (req.user.role !== 'admin' && req.user.role !== 'faculty') return res.status(403).json({ error: "Forbidden" });
    const { name, min_cgpa, max_backlogs, allowed_branches, required_skills, salary_package, drive_year, description } = req.body;
    try {
      const result = await db.execute(`
        INSERT INTO companies (name, min_cgpa, max_backlogs, allowed_branches, required_skills, salary_package, drive_year, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [name, min_cgpa, max_backlogs, JSON.stringify(allowed_branches || []), JSON.stringify(required_skills || []), salary_package, drive_year, description]);
      const companyId = result.insertId;
      const company = { id: companyId, name, min_cgpa, max_backlogs, allowed_branches, required_skills, salary_package, description };
      setTimeout(async () => {
        const students = await db.all("SELECT * FROM users WHERE role = 'student' AND placement_status = 'unplaced'");
        const allowedBranchesArr = Array.isArray(allowed_branches) ? allowed_branches : [];
        const requiredSkillsArr = Array.isArray(required_skills) ? required_skills : [];
        const eligibleStudents = students.filter((student) => {
          const studentSkillsRaw = JSON.parse(student.skills || '[]');
          const studentSkills = Array.isArray(studentSkillsRaw) ? studentSkillsRaw : [];
          const meetsCgpa = student.cgpa >= min_cgpa;
          const meetsBacklogs = student.backlogs <= max_backlogs;
          const meetsBranch = allowedBranchesArr.length === 0 || allowedBranchesArr.includes(student.branch);
          const meetsSkills = requiredSkillsArr.length === 0 || requiredSkillsArr.every((skill: string) => studentSkills.includes(skill));
          return meetsCgpa && meetsBacklogs && meetsBranch && meetsSkills;
        });
        for (const student of eligibleStudents) await sendPlacementEmail(student, company);
      }, 0);
      res.json({ success: true, companyId });
    } catch (e: any) { res.status(500).json({ error: e.message || "Failed to create company" }); }
  });

  app.get("/api/ai/context/:studentId", authenticate, async (req: AuthRequest, res: Response) => {
    try {
      const { studentId } = req.params;
      const student = await db.get("SELECT * FROM users WHERE id = ?", [studentId]);
      if (!student) return res.status(404).json({ error: "Student not found" });
      
      const companies = await db.all("SELECT name, min_cgpa, max_backlogs, required_skills, salary_package FROM companies");
      const historicalStats = await db.all(`SELECT AVG(cgpa) as avg_cgpa, AVG(coding_score) as avg_coding, placement_status FROM users WHERE role = 'student' GROUP BY placement_status`);
      
      res.json({
        student: {
          name: student.name,
          branch: student.branch,
          cgpa: student.cgpa,
          backlogs: student.backlogs,
          attendance: student.attendance,
          skills: JSON.parse(student.skills || '[]'),
          coding_score: student.coding_score,
          aptitude_score: student.aptitude_score
        },
        companies,
        historicalStats
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/ai/save-prediction", authenticate, async (req: AuthRequest, res: Response) => {
    try {
      const { studentId, prediction } = req.body;
      await db.execute("UPDATE users SET ai_prediction = ? WHERE id = ?", [JSON.stringify(prediction), studentId]);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/analytics/overview", authenticate, async (req: AuthRequest, res: Response) => {
    const totalStudents = await db.get("SELECT COUNT(*) as count FROM users WHERE role = 'student'");
    const placedStudents = await db.get("SELECT COUNT(*) as count FROM users WHERE role = 'student' AND placement_status = 'placed'");
    const totalCompanies = await db.get("SELECT COUNT(*) as count FROM companies");
    const branchStats = await db.all(`SELECT branch, COUNT(*) as total, SUM(CASE WHEN placement_status = 'placed' THEN 1 ELSE 0 END) as placed FROM users WHERE role = 'student' GROUP BY branch`);
    res.json({ totalStudents: totalStudents.count || 0, placedStudents: placedStudents.count || 0, totalCompanies: totalCompanies.count || 0, branchStats: branchStats.map((s: any) => ({ ...s, total: s.total || 0, placed: s.placed || 0 })) });
  });

  app.get("/api/admin/branch/:branch/:status", authenticate, async (req: AuthRequest, res: Response) => {
    const { branch, status } = req.params;
    const students = await db.all("SELECT * FROM users WHERE role = 'student' AND branch = ? AND placement_status = ?", [branch, status]);
    res.json(students);
  });

  app.get("/api/admin/branch/:branch/export/:status", authenticate, async (req: AuthRequest, res: Response) => {
    const { branch, status } = req.params;
    const students = await db.all("SELECT * FROM users WHERE role = 'student' AND branch = ? AND placement_status = ?", [branch, status]);
    const ws = XLSX.utils.json_to_sheet(students);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${branch}_${status}_students.xlsx`);
    res.send(buffer);
  });

  // 3. Initialize Vite in Background (Non-blocking)
  let vite: ViteDevServer | null = null;
  createViteServer({
    server: { middlewareMode: true, hmr: false },
    appType: "spa",
  }).then(v => {
    vite = v;
    console.log("✅ Vite initialized");
  }).catch(err => {
    console.error("❌ Vite initialization failed:", err);
  });

  // 3.5 API 404 Handler (prevent fall-through to Vite)
  app.use("/api", (req: Request, res: Response) => {
    console.log(`[API 404] ${req.method} ${req.url}`);
    res.status(404).json({ 
      error: "API route not found", 
      method: req.method, 
      url: req.originalUrl 
    });
  });

  // 4. Attach Vite Middleware (with ready check)
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (vite) {
      vite.middlewares(req, res, next);
    } else {
      if (req.url === "/" || req.url === "/index.html") {
        res.send(`
          <html>
            <head>
              <title>Starting SPAS...</title>
              <style>
                body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #f9fafb; color: #666; }
                .loader { border: 4px solid #f3f3f3; border-top: 4px solid #10b981; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin-right: 15px; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
              </style>
              <meta http-equiv="refresh" content="3">
            </head>
            <body>
              <div class="loader"></div>
              <p>Initializing Smart Placement Analytics System... Please wait.</p>
            </body>
          </html>
        `);
      } else {
        next();
      }
    }
  });

  // 5. Global Error Handler
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error("GLOBAL ERROR:", err);
    res.status(500).json({ 
      error: "Internal Server Error", 
      message: err.message,
      path: req.url
    });
  });

  // 6. Background DB Init
  const init = async () => {
    console.log("🔄 Starting database initialization...");
    try {
      await initializeDatabase(db, () => {
        dbReady = true;
        console.log("✅ Database initialized and ready");
      });
    } catch (err) {
      console.error("❌ Database initialization failed:", err);
    }
  };
  init();
}

async function initializeDatabase(db: DatabaseInterface, onReady: () => void) {
  console.log("📂 Creating tables if they don't exist...");
  const autoIncrement = "AUTOINCREMENT";

  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY ${autoIncrement}, 
      name TEXT, 
      email VARCHAR(255) UNIQUE, 
      password TEXT, 
      role TEXT, 
      branch TEXT, 
      cgpa REAL DEFAULT 0, 
      backlogs INTEGER DEFAULT 0, 
      attendance REAL DEFAULT 0, 
      skills TEXT, 
      placement_status TEXT DEFAULT 'unplaced', 
      coding_score INTEGER DEFAULT 0, 
      aptitude_score INTEGER DEFAULT 0, 
      ai_prediction TEXT, 
      register_number TEXT, 
      phone TEXT, 
      company_name TEXT, 
      package REAL
    );
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY ${autoIncrement}, 
      name TEXT, 
      min_cgpa REAL, 
      max_backlogs INTEGER, 
      allowed_branches TEXT, 
      required_skills TEXT, 
      salary_package REAL, 
      drive_year INTEGER, 
      description TEXT
    );
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY ${autoIncrement}, 
      student_id INTEGER, 
      company_id INTEGER, 
      status TEXT DEFAULT 'applied', 
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const adminExists = await db.get("SELECT * FROM users WHERE email = ?", ["admin@spas.com"]);
  if (!adminExists) {
    const hashedPassword = bcrypt.hashSync("admin123", 10);
    await db.execute("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)", ["Admin User", "admin@spas.com", hashedPassword, "admin"]);
    console.log("✅ Admin user created: admin@spas.com / admin123");
  }

  const studentExists = await db.get("SELECT * FROM users WHERE role = 'student' LIMIT 1");
  if (!studentExists) {
    const studentPass = bcrypt.hashSync("student123", 10);
    const students = [
      { name: "Rahul Sharma", email: "rahul@example.com", branch: "CSE", cgpa: 8.5, skills: ["React", "Node.js", "Python"] },
      { name: "Priya Patel", email: "priya@example.com", branch: "ECE", cgpa: 7.8, skills: ["C++", "Embedded Systems"] },
      { name: "Anish Kumar", email: "anish@example.com", branch: "CSE", cgpa: 9.2, skills: ["Java", "Spring Boot", "AWS"] },
      { name: "Sneha Reddy", email: "sneha@example.com", branch: "IT", cgpa: 8.1, skills: ["JavaScript", "React Native"] },
      { name: "Vikram Singh", email: "vikram@example.com", branch: "MECH", cgpa: 7.5, skills: ["AutoCAD", "SolidWorks"] }
    ];

    for (const s of students) {
      await db.execute(`
        INSERT INTO users (name, email, password, role, branch, cgpa, skills, attendance, coding_score, aptitude_score)
        VALUES (?, ?, ?, 'student', ?, ?, ?, ?, ?, ?)
      `, [s.name, s.email, studentPass, s.branch, s.cgpa, JSON.stringify(s.skills), 85, Math.floor(Math.random() * 100), Math.floor(Math.random() * 100)]);
    }
    console.log("✅ Sample student data added");
  }

  const studentCount = await db.get("SELECT COUNT(*) as count FROM users WHERE role = 'student'");
  if (studentCount.count < 10) {
    console.log("📊 Generating 100 more students...");
    const studentPass = bcrypt.hashSync("student123", 10);
    const branches = ["CSE", "IT", "ECE", "EEE", "MECH", "CIVIL"];
    const skillPool = ["React", "Node.js", "Python", "Java", "C++", "AWS", "Docker", "SQL", "JavaScript", "TypeScript", "Machine Learning"];
    const firstNames = ["Amit", "Suresh", "Meena", "Kiran", "Rajesh", "Sunita", "Vijay", "Anita", "Rohan", "Pooja", "Arjun", "Deepa", "Karthik", "Lakshmi", "Manish", "Neha", "Prabhu", "Rani", "Sanjay", "Vidya"];
    const lastNames = ["Kumar", "Sharma", "Patel", "Singh", "Reddy", "Nair", "Iyer", "Gupta", "Verma", "Joshi"];

    for (let i = 1; i <= 100; i++) {
      const fName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const name = `${fName} ${lName} ${i}`;
      const email = `student${i}@spas.com`;
      const branch = branches[Math.floor(Math.random() * branches.length)];
      const cgpa = (Math.random() * (10 - 6) + 6).toFixed(2);
      const backlogs = Math.random() > 0.8 ? Math.floor(Math.random() * 3) : 0;
      const attendance = (Math.random() * (100 - 60) + 60).toFixed(2);
      const skills: string[] = [];
      const numSkills = Math.floor(Math.random() * 4) + 2;
      for (let j = 0; j < numSkills; j++) {
        const skill = skillPool[Math.floor(Math.random() * skillPool.length)];
        if (!skills.includes(skill)) skills.push(skill);
      }
      
      const isPlaced = Math.random() > 0.6;
      const placementStatus = isPlaced ? 'placed' : 'unplaced';
      const companyName = isPlaced ? ["Google", "Microsoft", "Amazon", "TCS", "Infosys", "Wipro"][Math.floor(Math.random() * 6)] : null;
      const pkg = isPlaced ? (Math.random() * (25 - 4) + 4).toFixed(2) : null;

      await db.execute(`
        INSERT INTO users (name, email, password, role, branch, cgpa, backlogs, attendance, skills, placement_status, company_name, package, coding_score, aptitude_score)
        VALUES (?, ?, ?, 'student', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        name, email, studentPass, branch, cgpa, backlogs, attendance, 
        JSON.stringify(skills), placementStatus, companyName, pkg,
        Math.floor(Math.random() * 100), Math.floor(Math.random() * 100)
      ]);
    }
    console.log("✅ 100 more students added");
  }

  const companyExists = await db.get("SELECT * FROM companies LIMIT 1");
  if (!companyExists) {
    const companies = [
      { name: "TechCorp Solutions", min_cgpa: 8.0, max_backlogs: 0, allowed_branches: ["CSE", "IT"], required_skills: ["React", "Node.js"], salary_package: 12.5, drive_year: 2026, description: "Leading software solutions provider looking for full-stack developers." },
      { name: "Global Systems Inc", min_cgpa: 7.5, max_backlogs: 1, allowed_branches: ["CSE", "ECE", "IT"], required_skills: ["Java", "Spring Boot"], salary_package: 8.0, drive_year: 2026, description: "MNC focusing on enterprise applications." },
      { name: "Innovate Hardware", min_cgpa: 7.0, max_backlogs: 2, allowed_branches: ["ECE", "MECH"], required_skills: ["C++", "Embedded Systems"], salary_package: 6.5, drive_year: 2026, description: "Hardware innovation lab looking for systems engineers." }
    ];

    for (const c of companies) {
      await db.execute(`
        INSERT INTO companies (name, min_cgpa, max_backlogs, allowed_branches, required_skills, salary_package, drive_year, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [c.name, c.min_cgpa, c.max_backlogs, JSON.stringify(c.allowed_branches), JSON.stringify(c.required_skills), c.salary_package, c.drive_year, c.description]);
    }
    console.log("✅ Sample company data added");
  }
  
  onReady();
}

startServer().catch(console.error);
