// @ts-nocheck
/**
 * Full seed rebuild for final LMS architecture.
 * Run: bun run seed
 */

import bcrypt from "bcryptjs";
import { connectDb } from "./src/lib/db";
import { User } from "./src/lib/models/User";
import { Module } from "./src/lib/models/Module";
import { Phase } from "./src/lib/models/Phase";
import { Material } from "./src/lib/models/Material";
import { Quiz } from "./src/lib/models/Quiz";
import { Question } from "./src/lib/models/Question";
import { AnswerOption } from "./src/lib/models/AnswerOption";
import { Enrollment } from "./src/lib/models/Enrollment";
import { QuizAttempt } from "./src/lib/models/QuizAttempt";
import { UserAnswer } from "./src/lib/models/UserAnswer";

const classes = ["4A", "4B", "5A", "5B", "6A", "6B"];

const studentNames = [
  "Ahmad Rizqi", "Alya Nabila", "Budi Santoso", "Citra Azzahra", "Dimas Ramadhan",
  "Eka Putri", "Farhan Maulana", "Gina Salsabila", "Hafiz Nugraha", "Intan Maharani",
  "Joko Pratama", "Kirana Dewi", "Luthfi Hakim", "Mira Anjani", "Naufal Zaky",
  "Ovi Larasati", "Putra Mahendra", "Qonita Safira", "Rafi Akbar", "Siti Rahma",
];

const guruNames = ["Guru Fiqih", "Guru Aqidah", "Guru Bahasa Arab"];

const moduleDefs = [
  { name: "Fiqih Dasar", code: "FIQ-001", description: "Materi fiqih dasar MI" },
  { name: "Aqidah Akhlak", code: "AQD-001", description: "Aqidah dan akhlak untuk MI" },
  { name: "Bahasa Arab Dasar", code: "BAR-001", description: "Dasar kosakata dan tata bahasa Arab" },
];

const phaseDefs = ["Pengenalan", "Pendalaman", "Evaluasi"];

const materialPack = [
  { type: "pdf", title: "Ringkasan Materi", url: "https://example.org/materi.pdf" },
  { type: "video", title: "Video Pembelajaran", url: "https://example.org/video.mp4" },
  { type: "link", title: "Referensi Tambahan", url: "https://example.org/referensi" },
];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

function toSnake(input: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(input)) {
    const sk = k.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
    out[sk] = v;
  }
  return out;
}

async function seed() {
  console.log("🌱 FULL SEED REBUILD START");
  await connectDb();

  // PHASE 2: reset collections (idempotent)
  await Promise.all([
    User.deleteMany({}),
    Module.deleteMany({}),
    Phase.deleteMany({}),
    Material.deleteMany({}),
    Quiz.deleteMany({}),
    Question.deleteMany({}),
    AnswerOption.deleteMany({}),
    Enrollment.deleteMany({}),
    QuizAttempt.deleteMany({}),
    UserAnswer.deleteMany({}),
  ]);

  const adminPassword = await bcrypt.hash("admin123", 12);
  const userPassword = await bcrypt.hash("user123", 12);

  // users
  const admin = await User.create({
    nim: "ADM0001",
    name: "Admin Utama",
    email: "admin@madrasah.com",
    role: "admin",
    className: "",
    isActive: true,
    password: adminPassword,
  });

  const gurus = await User.insertMany(
    guruNames.map((name, idx) => ({
      nim: `GRU${String(idx + 1).padStart(4, "0")}`,
      name,
      email: `guru${idx + 1}@madrasah.local`,
      role: "guru",
      className: "",
      isActive: true,
      password: userPassword,
    }))
  );

  const students = await User.insertMany(
    studentNames.map((name, idx) => ({
      nim: `SIS${String(idx + 1).padStart(4, "0")}`,
      name,
      email: `siswa${idx + 1}@madrasah.local`,
      role: "user",
      className: classes[idx % classes.length],
      isActive: true,
      password: userPassword,
    }))
  );

  // modules
  const modules = await Module.insertMany(
    moduleDefs.map((m, idx) => ({
      name: m.name,
      code: m.code,
      description: m.description,
      createdBy: admin._id,
      assignedTeacherId: gurus[idx % gurus.length]._id,
      isActive: true,
      visibility: "public",
      enrollmentType: "open",
      enrollKey: null,
      startDate: null,
      endDate: null,
    }))
  );

  // phases
  const phases: any[] = [];
  for (const mod of modules) {
    for (let i = 0; i < phaseDefs.length; i++) {
      const ph = await Phase.create({
        moduleId: mod._id,
        title: phaseDefs[i],
        description: `${phaseDefs[i]} - ${mod.name}`,
        order: i,
        isPublished: true,
        createdBy: mod.assignedTeacherId,
      });
      phases.push(ph);
    }
  }

  // materials
  let materialCount = 0;
  for (const ph of phases) {
    for (let i = 0; i < materialPack.length; i++) {
      await Material.create({
        phaseId: ph._id,
        type: materialPack[i].type,
        title: `${materialPack[i].title} ${ph.title}`,
        url: materialPack[i].url,
        description: `Materi ${materialPack[i].type} untuk ${ph.title}`,
        order: i,
        isVisible: true,
        createdBy: ph.createdBy,
      });
      materialCount++;
    }
  }

  // quizzes + questions + options
  const quizzes: any[] = [];
  let questionCount = 0;
  let optionCount = 0;

  for (const mod of modules) {
    for (let i = 0; i < 2; i++) {
      const quizPayload = {
        title: `${mod.name} Quiz ${i + 1}`,
        description: `Evaluasi ${mod.name} bagian ${i + 1}`,
        moduleId: String(mod._id),
        createdBy: String(mod.assignedTeacherId),
        status: "active",
        durationMinutes: i % 2 === 0 ? 30 : 45,
        passScore: 70,
        startAt: null,
        endAt: null,
      };
      const quiz = await Quiz.create(toSnake(quizPayload));
      quizzes.push(quiz);

      // 3 multiple choice
      for (let q = 0; q < 3; q++) {
        const questionPayload = {
          quizId: String(quiz._id),
          questionText: `Soal pilihan ganda ${q + 1} untuk ${quiz.title}`,
          type: "multiple_choice",
          points: 10,
          order: q,
          answerKeyText: "",
          manualGradingRequired: false,
        };
        const question = await Question.create(toSnake(questionPayload));
        questionCount++;

        const correctIndex = randomInt(0, 3);
        for (let o = 0; o < 4; o++) {
          await AnswerOption.create(toSnake({
            questionId: String(question._id),
            optionText: `Opsi ${o + 1}`,
            isCorrect: o === correctIndex,
          }));
          optionCount++;
        }
      }

      // 2 essay
      for (let q = 0; q < 2; q++) {
        await Question.create(toSnake({
          quizId: String(quiz._id),
          questionText: `Soal essay ${q + 1} untuk ${quiz.title}`,
          type: "essay",
          points: 20,
          order: q + 3,
          // half with key, half without key
          answerKeyText: q % 2 === 0 ? "jawaban contoh" : "",
          manualGradingRequired: q % 2 !== 0,
        }));
        questionCount++;
      }
    }
  }

  // enrollments: each student at least 1 module
  let enrollmentCount = 0;
  for (const st of students) {
    const modulePool = [...modules].sort(() => Math.random() - 0.5);
    const take = randomInt(1, modules.length);
    for (let i = 0; i < take; i++) {
      await Enrollment.updateOne(
        { moduleId: modulePool[i]._id, userId: st._id },
        {
          $set: {
            moduleId: modulePool[i]._id,
            userId: st._id,
            enrolledBy: admin._id,
            status: "active",
            enrolledAt: new Date(),
          },
        },
        { upsert: true }
      );
      enrollmentCount++;
    }
  }

  // attempts + answers (10-15)
  const attemptsTarget = randomInt(10, 15);
  let attemptCount = 0;
  let answerCount = 0;

  for (let i = 0; i < attemptsTarget; i++) {
    const st = pick(students);
    const qz = pick(quizzes);
    const statusCycle = i % 3; // 0 inProgress, 1 submitted, 2 graded

    const startedAt = new Date(Date.now() - randomInt(1, 14) * 86400000);
    const submittedAt = statusCycle === 0 ? null : new Date(startedAt.getTime() + randomInt(15, 45) * 60000);

    const attempt = await QuizAttempt.create(toSnake({
      userId: String(st._id),
      quizId: String(qz._id),
      startedAt,
      submittedAt,
      totalScore: submittedAt ? randomInt(45, 98) : null,
      status: statusCycle === 0 ? "in_progress" : statusCycle === 1 ? "submitted" : "graded",
    }));
    attemptCount++;

    const quizQuestions = await Question.find(toSnake({ quizId: String(qz._id) })).lean();
    for (const qq of quizQuestions) {
      const isEssay = String((qq as any).type || (qq as any).question_type || "multiple_choice") === "essay";
      let selectedOptionId = "";
      let isCorrect = false;
      let awardedPoints = 0;
      let reviewStatus: "pending" | "auto_graded" | "manual_graded" = "auto_graded";
      let answerText = "";

      if (isEssay) {
        answerText = "jawaban siswa";
        const key = String((qq as any).answer_key_text || "").trim().toLowerCase();
        if (!key) {
          reviewStatus = "pending";
          awardedPoints = 0;
        } else {
          isCorrect = Math.random() > 0.4;
          awardedPoints = isCorrect ? Number((qq as any).points || 10) : 0;
          if (statusCycle === 2) reviewStatus = "manual_graded";
        }
      } else {
        const options = await AnswerOption.find(toSnake({ questionId: String((qq as any)._id) })).lean();
        const chosen = pick(options);
        selectedOptionId = String((chosen as any)._id);
        const isCorrectKey = Object.keys(toSnake({ isCorrect: true }))[0];
        isCorrect = !!(chosen as any)[isCorrectKey];
        awardedPoints = isCorrect ? Number((qq as any).points || 10) : 0;
      }

      await UserAnswer.create(toSnake({
        attemptId: String(attempt._id),
        questionId: String((qq as any)._id),
        selectedOptionId: selectedOptionId || "essay-answer",
        answerText,
        isCorrect,
        awardedPoints,
        reviewStatus,
        gradedBy: statusCycle === 2 ? String(admin._id) : undefined,
        gradedAt: statusCycle === 2 ? new Date() : undefined,
      }));
      answerCount++;
    }
  }

  // relation consistency check
  const moduleIdKey = Object.keys(toSnake({ moduleId: "x" }))[0];
  const quizModuleInvalid = await Quiz.countDocuments({ [moduleIdKey]: { $nin: modules.map((m) => String(m._id)) } });
  const phaseModuleInvalid = await Phase.countDocuments({ moduleId: { $nin: modules.map((m) => m._id) } });
  const materialPhaseIds = phases.map((p) => p._id);
  const materialPhaseInvalid = await Material.countDocuments({ phaseId: { $nin: materialPhaseIds } });
  const quizIds = quizzes.map((q) => String(q._id));
  const quizIdKey = Object.keys(toSnake({ quizId: "x" }))[0];
  const attemptQuizInvalid = await QuizAttempt.countDocuments({ [quizIdKey]: { $nin: quizIds } });
  const enrollmentModuleInvalid = await Enrollment.countDocuments({ moduleId: { $nin: modules.map((m) => m._id) } });

  console.log("\n✅ Seed completed");
  console.log("Users:", 1 + gurus.length + students.length);
  console.log("Modules:", modules.length);
  console.log("Phases:", phases.length);
  console.log("Materials:", materialCount);
  console.log("Quizzes:", quizzes.length);
  console.log("Questions:", questionCount);
  console.log("Options:", optionCount);
  console.log("Enrollments:", enrollmentCount);
  console.log("Attempts:", attemptCount);
  console.log("Answers:", answerCount);

  console.log("\n🔎 Relation Check");
  console.log({ quizModuleInvalid, phaseModuleInvalid, materialPhaseInvalid, attemptQuizInvalid, enrollmentModuleInvalid });

  console.log("\n🔐 Login");
  console.log("Admin: admin@madrasah.com / admin123");
  console.log("Siswa: siswa1@madrasah.local / user123");
}

seed().catch((err) => {
  console.error("❌ Seed failed", err);
  process.exit(1);
});
