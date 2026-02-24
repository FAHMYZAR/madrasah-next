// @ts-nocheck
/**
 * Seed script to populate database with realistic dummy data
 * Run with: bun run seed
 */

import { connectDb } from "./src/lib/db";
import { User } from "./src/lib/models/User";
import { Module } from "./src/lib/models/Module";
import { Quiz } from "./src/lib/models/Quiz";
import { Question } from "./src/lib/models/Question";
import { AnswerOption } from "./src/lib/models/AnswerOption";
import { QuizAttempt } from "./src/lib/models/QuizAttempt";
import { UserAnswer } from "./src/lib/models/UserAnswer";
import bcrypt from "bcryptjs";

const SAMPLE_NAMES = [
  "Ahmad Hidayat", "Fatimah Zahra", "Muhammad Rizki", "Nurul Aini", "Ibrahim Fachri",
  "Aisyah Putri", "Umar Bakri", "Khadijah Siti", "Ali Imran", "Maryam Hasanah",
  "Yusuf Kamal", "Zainab Nur", "Ismail Hadi", "Rukayah Sari", "Harun Ar-Rasyid",
  "Salma Diana", "Fikri Abdullah", "Hafizah Maya", "Ridwan Azis", "Aminah Lestari",
];

const SAMPLE_EMAILS = SAMPLE_NAMES.map((name) => 
  name.toLowerCase().replace(/\s+/g, ".") + "@madrasah.com"
);

const MODULE_TITLES = [
  "Pengantar Ilmu Tajwid", "Sejarah Nabi Muhammad SAW", "Fiqh Shalat", "Aqidah Islam",
  "Bahasa Arab Dasar", "Hafalan Juz 30", "Adab Muslim", "Sirah Nabawiyah",
  "Ilmu Fara'id", "Ulumul Quran", "Hadits Arbain", "Fiqh Puasa",
  "Tafsir Jalalain", "Nahwu Shorof", "Manasik Haji", "Akhlak Mulia",
];

const MODULE_DESCRIPTIONS = [
  "Pelajaran dasar membaca Al-Quran dengan benar",
  "Mengenal kehidupan Nabi Muhammad SAW dari lahir hingga wafat",
  "Panduan lengkap tata cara shalat sesuai sunnah",
  "Dasar-dasar keyakinan dalam Islam",
  "Memahami bahasa Arab untuk membaca kitab kuning",
  "Program menghafal juz 30 dengan metode mudah",
  "Etika dan adab seorang muslim dalam kehidupan sehari-hari",
  "Perjalanan hidup Rasulullah SAW dan pelajaran yang bisa diambil",
  "Ilmu waris dalam Islam",
  "Memahami ilmu-ilmu Al-Quran",
  "40 hadits pilihan Nabi Muhammad SAW",
  "Tata cara puasa dan hukum-hukumnya",
  "Tafsir Al-Quran menurut Imam Jalalain",
  "Dasar-dasar tata bahasa Arab",
  "Panduan lengkap ibadah haji dan umrah",
  "Membentuk karakter muslim yang berakhlak mulia",
];

const QUIZ_TITLES = [
  "Quiz Tajwid Dasar", "Quiz Sejarah Nabi", "Quiz Fiqh Shalat", "Quiz Aqidah",
  "Quiz Bahasa Arab", "Quiz Hafalan", "Quiz Adab", "Quiz Sirah",
  "Quiz Fara'id", "Quiz Ulumul Quran", "Quiz Hadits", "Quiz Puasa",
];

const QUESTION_TEMPLATES = [
  { q: "Apa hukum bacaan nun mati bertemu dengan huruf ba?", options: ["Ikhfa", "Idgham", "Iqlab", "Izhar"], correct: 2 },
  { q: "Nabi Muhammad SAW lahir pada tahun?", options: ["571 M", "632 M", "580 M", "600 M"], correct: 0 },
  { q: "Berapa rakaat shalat subuh?", options: ["1", "2", "3", "4"], correct: 1 },
  { q: "Rukun Islam yang ketiga adalah?", options: ["Shalat", "Puasa", "Zakat", "Haji"], correct: 2 },
  { q: "Huruf hijaiyah ada berapa?", options: ["26", "28", "29", "30"], correct: 2 },
  { q: "Surat Al-Fatihah terdiri dari berapa ayat?", options: ["5", "6", "7", "8"], correct: 2 },
  { q: "Malaikat yang menyampaikan wahyu adalah?", options: ["Mikail", "Israfil", "Jibril", "Izrail"], correct: 2 },
  { q: "Shalat wajib dalam sehari semalam ada?", options: ["3 waktu", "4 waktu", "5 waktu", "6 waktu"], correct: 2 },
  { q: "Kitab suci umat Islam adalah?", options: ["Taurat", "Injil", "Zabur", "Al-Quran"], correct: 3 },
  { q: "Nabi terakhir dalam Islam adalah?", options: ["Nabi Isa", "Nabi Musa", "Nabi Muhammad", "Nabi Ibrahim"], correct: 2 },
];

async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

async function seed() {
  console.log("🌱 Starting database seed...");
  await connectDb();
  console.log("✅ Connected to database");

  // Clear existing data
  console.log("🗑️  Clearing existing data...");
  await UserAnswer.deleteMany({});
  await QuizAttempt.deleteMany({});
  await AnswerOption.deleteMany({});
  await Question.deleteMany({});
  await Quiz.deleteMany({});
  await Module.deleteMany({});
  await User.deleteMany({});
  console.log("✅ Data cleared");

  // Create admin user
  console.log("👤 Creating admin user...");
  const adminPassword = await hashPassword("admin123");
  const admin = await User.create({
    name: "Administrator",
    email: "admin@madrasah.com",
    password: adminPassword,
    role: "admin",
  });
  console.log(`✅ Admin created: ${admin.email}`);

  // Create regular users
  console.log("👥 Creating users...");
  const userPassword = await hashPassword("user123");
  const users = await User.create(
    SAMPLE_NAMES.slice(0, 20).map((name, i) => ({
      name,
      email: SAMPLE_EMAILS[i],
      password: userPassword,
      role: i === 0 ? "admin" : (i <= 4 ? "guru" : "user"),
    }))
  );
  console.log(`✅ Created ${users.length} users`);

  // Create modules
  console.log("📚 Creating modules...");
  const guruUsers = users.filter((u) => u.role === "guru");
  const modules = await Module.create(
    MODULE_TITLES.map((title, i) => ({
      title,
      description: MODULE_DESCRIPTIONS[i] || "Materi pembelajaran untuk madrasah",
      content: "",
      created_by: (guruUsers[i % guruUsers.length]?._id || admin._id).toString(),
    }))
  );
  console.log(`✅ Created ${modules.length} modules`);

  // Create quizzes with questions and options
  console.log("📝 Creating quizzes...");
  let totalQuestions = 0;
  let totalOptions = 0;

  for (let i = 0; i < Math.min(15, modules.length); i++) {
    const moduleOwner = modules[i].created_by;
    const quiz = await Quiz.create({
      title: QUIZ_TITLES[i % QUIZ_TITLES.length] + ` ${i + 1}`,
      description: `Quiz untuk modul ${MODULE_TITLES[i]}`,
      module_id: modules[i]._id.toString(),
      created_by: String(moduleOwner),
      status: i % 3 === 0 ? "active" : "published",
      duration_minutes: 20 + (i % 5) * 5,
      pass_score: 70,
    });

    // Create 5-10 questions per quiz
    const numQuestions = 5 + Math.floor(Math.random() * 6);
    for (let j = 0; j < numQuestions; j++) {
      const template = QUESTION_TEMPLATES[(i * numQuestions + j) % QUESTION_TEMPLATES.length];
      const question = await Question.create({
        quiz_id: quiz._id.toString(),
        question_text: template.q,
        points: 10,
      });

      // Create 4 options per question
      for (let k = 0; k < 4; k++) {
        await AnswerOption.create({
          question_id: question._id.toString(),
          option_text: template.options[k],
          is_correct: k === template.correct,
        });
        totalOptions++;
      }
      totalQuestions++;
    }
  }
  console.log(`✅ Created quizzes with ${totalQuestions} questions and ${totalOptions} options`);

  // Create some quiz attempts
  console.log("📊 Creating quiz attempts...");
  const regularUsers = users.filter((u) => u.role === "user");
  const quizzes = await Quiz.find();
  
  let attemptsCreated = 0;
  for (const user of regularUsers.slice(0, 10)) {
    const numAttempts = Math.floor(Math.random() * 3) + 1;
    for (let a = 0; a < numAttempts; a++) {
      const quiz = quizzes[Math.floor(Math.random() * quizzes.length)];
      const questions = await Question.find({ quiz_id: quiz._id.toString() }).limit(5);
      
      const attempt = await QuizAttempt.create({
        user_id: user._id.toString(),
        quiz_id: quiz._id.toString(),
        started_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      });

      // Create answers
      const answers = [];
      let correctCount = 0;
      for (const q of questions) {
        const options = await AnswerOption.find({ question_id: q._id.toString() });
        const correctOption = options.find((o) => o.is_correct);
        const selectedOption = options[Math.floor(Math.random() * options.length)];
        
        if (selectedOption._id.toString() === correctOption?._id.toString()) {
          correctCount++;
        }

        answers.push({
          attempt_id: attempt._id.toString(),
          question_id: q._id.toString(),
          selected_option_id: selectedOption._id.toString(),
          is_correct: selectedOption._id.toString() === correctOption?._id.toString(),
        });
      }

      await UserAnswer.insertMany(answers);
      
      const score = Math.round((correctCount / questions.length) * 100);
      await QuizAttempt.findByIdAndUpdate(attempt._id, {
        score,
        submitted_at: new Date(),
      });
      
      attemptsCreated++;
    }
  }
  console.log(`✅ Created ${attemptsCreated} quiz attempts`);

  console.log("\n🎉 Seed completed successfully!");
  console.log("\n📊 Summary:");
  console.log(`   - Users: ${users.length}`);
  console.log(`   - Modules: ${modules.length}`);
  console.log(`   - Quizzes: ${quizzes.length}`);
  console.log(`   - Questions: ${totalQuestions}`);
  console.log(`   - Options: ${totalOptions}`);
  console.log(`   - Attempts: ${attemptsCreated}`);
  console.log("\n🔐 Login credentials:");
  console.log(`   - Admin: admin@madrasah.com / admin123`);
  console.log(`   - User: ahmad.hidayat@madrasah.com / user123`);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
