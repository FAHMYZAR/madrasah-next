import { AuthUser } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { Enrollment } from "@/lib/models/Enrollment";
import { Material } from "@/lib/models/Material";
import { Module } from "@/lib/models/Module";
import { Phase } from "@/lib/models/Phase";
import { Question } from "@/lib/models/Question";
import { Quiz } from "@/lib/models/Quiz";

export async function ensureModuleAccess(moduleId: string, user: AuthUser) {
  await connectDb();
  const mod = await Module.findById(moduleId);
  if (!mod) throw new Error("NOT_FOUND");
  if (user.role === "admin") return mod;
  if (user.role === "guru" && String(mod.assignedTeacherId || "") === user.sub) return mod;
  throw new Error("FORBIDDEN");
}

export async function ensureQuizAccess(quizId: string, user: AuthUser) {
  await connectDb();
  const quiz = await Quiz.findById(quizId);
  if (!quiz) throw new Error("NOT_FOUND");
  await ensureModuleAccess(String(quiz.module_id), user);
  return quiz;
}

export async function ensureQuestionAccess(questionId: string, user: AuthUser) {
  await connectDb();
  const question = await Question.findById(questionId);
  if (!question) throw new Error("NOT_FOUND");
  const quiz = await ensureQuizAccess(String(question.quiz_id), user);
  return { question, quiz };
}

export async function ensurePhaseAccess(phaseId: string, user: AuthUser) {
  await connectDb();
  const phase = await Phase.findById(phaseId);
  if (!phase) throw new Error("NOT_FOUND");
  const mod = await ensureModuleAccess(String(phase.moduleId), user);
  return { phase, mod };
}

export async function ensureMaterialAccess(materialId: string, user: AuthUser) {
  await connectDb();
  const material = await Material.findById(materialId);
  if (!material) throw new Error("NOT_FOUND");
  const { phase, mod } = await ensurePhaseAccess(String(material.phaseId), user);
  return { material, phase, mod };
}

export async function ensureModuleLearningAccess(moduleId: string, user: AuthUser) {
  await connectDb();
  const mod = await Module.findById(moduleId);
  if (!mod || !mod.isActive) throw new Error("NOT_FOUND");

  if (user.role === "admin") return mod;
  if (user.role === "guru" && String(mod.assignedTeacherId || "") === user.sub) return mod;

  const visibility = String(mod.visibility || "private");
  if (visibility === "public") return mod;

  const enrollment = await Enrollment.findOne({
    moduleId: mod._id,
    userId: user.sub,
    status: "active",
  }).lean();

  if (!enrollment) throw new Error("ENROLLMENT_REQUIRED");
  return mod;
}
