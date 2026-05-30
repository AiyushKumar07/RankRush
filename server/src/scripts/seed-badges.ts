// Seeds the default catalogue of 50 badges across six categories.
// Idempotent: upserts on `code`, so re-running just refreshes copy /
// rules without orphaning existing UserBadge rows.
//
// Run:  npm run seed:badges
//
// Note: tsx works for this script because it uses PrismaClient directly
// (no Nest DI / @Injectable decorators). Same pattern as seed-codes /
// seed-plans — the seed-ranking-scopes one needs `nest build && node`
// because it boots the full Nest container.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface BadgeSeed {
  code: string;
  name: string;
  description: string;
  icon: string;            // lucide icon name (resolved client-side)
  tone: string;            // violet | amber | emerald | cyan | lime | coral
  category: string;        // milestone | volume | streak | accuracy | rank | mastery
  tier: string;            // bronze | silver | gold | platinum
  sortOrder: number;
  ruleType: string;
  ruleConfig: Record<string, any>;
  reward?: Record<string, any> | null;
}

// All badges below intentionally start with `reward: null`. The product
// spec says: no rewards on day one, but the column is there so admins can
// later toggle `{ tokens: 5 }` on any badge via the editor.
const BADGES: BadgeSeed[] = [
  // ─── Milestone (onboarding) ─────────────────────────────────────
  { code: 'first-quiz',      name: 'First Steps',        description: 'Complete your very first quiz',                 icon: 'Sparkles',  tone: 'violet',  category: 'milestone', tier: 'bronze',   sortOrder: 1,  ruleType: 'quiz-count',  ruleConfig: { count: 1 },   reward: null },
  { code: 'first-correct',   name: 'On the Board',       description: 'Answer your first question correctly',          icon: 'CircleCheck', tone: 'emerald', category: 'milestone', tier: 'bronze',   sortOrder: 2,  ruleType: 'questions-answered', ruleConfig: { count: 1 }, reward: null },
  { code: 'first-perfect',   name: 'Untouchable',        description: 'Finish a quiz with 100% accuracy',              icon: 'Crown',     tone: 'amber',   category: 'milestone', tier: 'silver',   sortOrder: 3,  ruleType: 'perfect-quiz', ruleConfig: { count: 1 },   reward: null },
  { code: 'login-streak-3',  name: 'Showing Up',         description: 'Log in three days in a row',                    icon: 'Flame',     tone: 'amber',   category: 'milestone', tier: 'bronze',   sortOrder: 4,  ruleType: 'streak',       ruleConfig: { days: 3 },    reward: null },

  // ─── Volume (quiz count) ────────────────────────────────────────
  { code: 'volume-q-5',      name: 'Getting Going',      description: 'Complete 5 quizzes',                            icon: 'BookOpen',  tone: 'violet',  category: 'volume', tier: 'bronze',   sortOrder: 10, ruleType: 'quiz-count', ruleConfig: { count: 5 },   reward: null },
  { code: 'volume-q-10',     name: 'Quiz Enthusiast',    description: 'Complete 10 quizzes',                           icon: 'BookOpen',  tone: 'violet',  category: 'volume', tier: 'silver',   sortOrder: 11, ruleType: 'quiz-count', ruleConfig: { count: 10 },  reward: null },
  { code: 'volume-q-25',     name: 'Quiz Veteran',       description: 'Complete 25 quizzes',                           icon: 'BookOpen',  tone: 'violet',  category: 'volume', tier: 'silver',   sortOrder: 12, ruleType: 'quiz-count', ruleConfig: { count: 25 },  reward: null },
  { code: 'volume-q-50',     name: 'Half-Century',       description: 'Complete 50 quizzes',                           icon: 'Library',   tone: 'cyan',    category: 'volume', tier: 'gold',     sortOrder: 13, ruleType: 'quiz-count', ruleConfig: { count: 50 },  reward: null },
  { code: 'volume-q-100',    name: 'Quiz Centurion',     description: 'Complete 100 quizzes',                          icon: 'Library',   tone: 'cyan',    category: 'volume', tier: 'gold',     sortOrder: 14, ruleType: 'quiz-count', ruleConfig: { count: 100 }, reward: null },
  { code: 'volume-q-250',    name: 'Quiz Connoisseur',   description: 'Complete 250 quizzes',                          icon: 'Library',   tone: 'lime',    category: 'volume', tier: 'platinum', sortOrder: 15, ruleType: 'quiz-count', ruleConfig: { count: 250 }, reward: null },

  // ─── Volume (questions answered) ────────────────────────────────
  { code: 'volume-Q-100',    name: 'Century Club',       description: 'Answer 100 questions',                          icon: 'Award',     tone: 'violet',  category: 'volume', tier: 'bronze',   sortOrder: 20, ruleType: 'questions-answered', ruleConfig: { count: 100 },   reward: null },
  { code: 'volume-Q-500',    name: 'Question Marathoner',description: 'Answer 500 questions',                          icon: 'Award',     tone: 'cyan',    category: 'volume', tier: 'silver',   sortOrder: 21, ruleType: 'questions-answered', ruleConfig: { count: 500 },   reward: null },
  { code: 'volume-Q-1000',   name: 'Knowledge Engine',   description: 'Answer 1,000 questions',                        icon: 'Rocket',    tone: 'lime',    category: 'volume', tier: 'gold',     sortOrder: 22, ruleType: 'questions-answered', ruleConfig: { count: 1000 },  reward: null },
  { code: 'volume-Q-2500',   name: 'Steel Mind',         description: 'Answer 2,500 questions',                        icon: 'Rocket',    tone: 'lime',    category: 'volume', tier: 'gold',     sortOrder: 23, ruleType: 'questions-answered', ruleConfig: { count: 2500 },  reward: null },
  { code: 'volume-Q-5000',   name: 'Iron Mind',          description: 'Answer 5,000 questions',                        icon: 'Crown',     tone: 'amber',   category: 'volume', tier: 'platinum', sortOrder: 24, ruleType: 'questions-answered', ruleConfig: { count: 5000 },  reward: null },

  // ─── Streak (login consistency) ────────────────────────────────
  { code: 'streak-7',        name: 'Week Warrior',       description: 'Maintain a 7-day login streak',                 icon: 'Flame',     tone: 'amber',   category: 'streak', tier: 'silver',   sortOrder: 30, ruleType: 'streak', ruleConfig: { days: 7 },    reward: null },
  { code: 'streak-14',       name: 'Fortnight Fire',     description: 'Maintain a 14-day login streak',                icon: 'Flame',     tone: 'amber',   category: 'streak', tier: 'silver',   sortOrder: 31, ruleType: 'streak', ruleConfig: { days: 14 },   reward: null },
  { code: 'streak-30',       name: 'Unstoppable',        description: 'Maintain a 30-day login streak',                icon: 'Flame',     tone: 'coral',   category: 'streak', tier: 'gold',     sortOrder: 32, ruleType: 'streak', ruleConfig: { days: 30 },   reward: null },
  { code: 'streak-60',       name: 'Two-Month Tempo',    description: 'Maintain a 60-day login streak',                icon: 'Flame',     tone: 'coral',   category: 'streak', tier: 'gold',     sortOrder: 33, ruleType: 'streak', ruleConfig: { days: 60 },   reward: null },
  { code: 'streak-100',      name: 'Century Streak',     description: 'Maintain a 100-day login streak',               icon: 'Flame',     tone: 'lime',    category: 'streak', tier: 'platinum', sortOrder: 34, ruleType: 'streak', ruleConfig: { days: 100 },  reward: null },
  { code: 'streak-180',      name: 'Six-Month Sage',     description: 'Maintain a 180-day login streak',               icon: 'Crown',     tone: 'lime',    category: 'streak', tier: 'platinum', sortOrder: 35, ruleType: 'streak', ruleConfig: { days: 180 },  reward: null },
  { code: 'streak-365',      name: 'Year of the Quiz',   description: 'Maintain a 365-day login streak',               icon: 'Crown',     tone: 'lime',    category: 'streak', tier: 'platinum', sortOrder: 36, ruleType: 'streak', ruleConfig: { days: 365 },  reward: null },

  // ─── Accuracy (overall) ─────────────────────────────────────────
  { code: 'accuracy-70-10',  name: 'Steady Hand',        description: '70% accuracy across 10 quizzes',                icon: 'Target',    tone: 'cyan',    category: 'accuracy', tier: 'bronze',   sortOrder: 40, ruleType: 'accuracy-overall', ruleConfig: { minQuizzes: 10, minAccuracy: 70 }, reward: null },
  { code: 'accuracy-80-15',  name: 'Sharpshooter',       description: '80% accuracy across 15 quizzes',                icon: 'Target',    tone: 'cyan',    category: 'accuracy', tier: 'silver',   sortOrder: 41, ruleType: 'accuracy-overall', ruleConfig: { minQuizzes: 15, minAccuracy: 80 }, reward: null },
  { code: 'accuracy-90-20',  name: 'Precision Mind',     description: '90% accuracy across 20 quizzes',                icon: 'Target',    tone: 'emerald', category: 'accuracy', tier: 'gold',     sortOrder: 42, ruleType: 'accuracy-overall', ruleConfig: { minQuizzes: 20, minAccuracy: 90 }, reward: null },
  { code: 'accuracy-95-30',  name: 'Surgical',           description: '95% accuracy across 30 quizzes',                icon: 'Target',    tone: 'emerald', category: 'accuracy', tier: 'platinum', sortOrder: 43, ruleType: 'accuracy-overall', ruleConfig: { minQuizzes: 30, minAccuracy: 95 }, reward: null },

  // ─── Perfect runs ───────────────────────────────────────────────
  { code: 'perfect-3',       name: 'Triple Crown',       description: 'Score 100% on three quizzes',                   icon: 'Crown',     tone: 'amber',   category: 'accuracy', tier: 'silver',   sortOrder: 44, ruleType: 'perfect-quiz', ruleConfig: { count: 3 },  reward: null },
  { code: 'perfect-10',      name: 'Perfectionist',      description: 'Score 100% on ten quizzes',                     icon: 'Crown',     tone: 'amber',   category: 'accuracy', tier: 'gold',     sortOrder: 45, ruleType: 'perfect-quiz', ruleConfig: { count: 10 }, reward: null },
  { code: 'perfect-25',      name: 'Flawless',           description: 'Score 100% on twenty-five quizzes',             icon: 'Crown',     tone: 'lime',    category: 'accuracy', tier: 'platinum', sortOrder: 46, ruleType: 'perfect-quiz', ruleConfig: { count: 25 }, reward: null },

  // ─── Rank (class cohort) ────────────────────────────────────────
  { code: 'rank-top-1000',   name: 'Climber',            description: 'Reach the top 1,000 in your class cohort',      icon: 'TrendingUp', tone: 'violet',  category: 'rank', tier: 'bronze',   sortOrder: 50, ruleType: 'rank-milestone', ruleConfig: { topN: 1000 }, reward: null },
  { code: 'rank-top-500',    name: 'Riser',              description: 'Reach the top 500 in your class cohort',        icon: 'TrendingUp', tone: 'violet',  category: 'rank', tier: 'silver',   sortOrder: 51, ruleType: 'rank-milestone', ruleConfig: { topN: 500 },  reward: null },
  { code: 'rank-top-100',    name: 'Top 100',            description: 'Reach the top 100 in your class cohort',        icon: 'Trophy',     tone: 'amber',   category: 'rank', tier: 'gold',     sortOrder: 52, ruleType: 'rank-milestone', ruleConfig: { topN: 100 },  reward: null },
  { code: 'rank-top-50',     name: 'Top 50',             description: 'Reach the top 50 in your class cohort',         icon: 'Trophy',     tone: 'amber',   category: 'rank', tier: 'gold',     sortOrder: 53, ruleType: 'rank-milestone', ruleConfig: { topN: 50 },   reward: null },
  { code: 'rank-top-10',     name: 'Top 10',             description: 'Reach the top 10 in your class cohort',         icon: 'Trophy',     tone: 'lime',    category: 'rank', tier: 'platinum', sortOrder: 54, ruleType: 'rank-milestone', ruleConfig: { topN: 10 },   reward: null },
  { code: 'rank-top-3',      name: 'Podium',             description: 'Reach the top 3 in your class cohort',          icon: 'Medal',      tone: 'lime',    category: 'rank', tier: 'platinum', sortOrder: 55, ruleType: 'rank-milestone', ruleConfig: { topN: 3 },    reward: null },
  { code: 'rank-1',          name: 'Number One',         description: 'Reach rank #1 in your class cohort',            icon: 'Crown',      tone: 'lime',    category: 'rank', tier: 'platinum', sortOrder: 56, ruleType: 'rank-milestone', ruleConfig: { topN: 1 },    reward: null },

  // ─── Mastery — Mathematics ──────────────────────────────────────
  { code: 'mastery-math-80', name: 'Math Adept',         description: '80% accuracy in Mathematics (50+ questions)',   icon: 'Sigma',     tone: 'violet',  category: 'mastery', tier: 'silver',   sortOrder: 60, ruleType: 'subject-accuracy', ruleConfig: { subjectMatch: 'math',    minQuestions: 50,  minAccuracy: 80 }, reward: null },
  { code: 'mastery-math-90', name: 'Math Master',        description: '90% accuracy in Mathematics (100+ questions)',  icon: 'Sigma',     tone: 'violet',  category: 'mastery', tier: 'gold',     sortOrder: 61, ruleType: 'subject-accuracy', ruleConfig: { subjectMatch: 'math',    minQuestions: 100, minAccuracy: 90 }, reward: null },

  // ─── Mastery — Physics ──────────────────────────────────────────
  { code: 'mastery-phys-80', name: 'Physics Adept',      description: '80% accuracy in Physics (50+ questions)',       icon: 'Atom',      tone: 'cyan',    category: 'mastery', tier: 'silver',   sortOrder: 62, ruleType: 'subject-accuracy', ruleConfig: { subjectMatch: 'physics', minQuestions: 50,  minAccuracy: 80 }, reward: null },
  { code: 'mastery-phys-90', name: 'Physics Master',     description: '90% accuracy in Physics (100+ questions)',      icon: 'Atom',      tone: 'cyan',    category: 'mastery', tier: 'gold',     sortOrder: 63, ruleType: 'subject-accuracy', ruleConfig: { subjectMatch: 'physics', minQuestions: 100, minAccuracy: 90 }, reward: null },

  // ─── Mastery — Chemistry ────────────────────────────────────────
  { code: 'mastery-chem-80', name: 'Chem Adept',         description: '80% accuracy in Chemistry (50+ questions)',     icon: 'FlaskConical', tone: 'amber',category: 'mastery', tier: 'silver',   sortOrder: 64, ruleType: 'subject-accuracy', ruleConfig: { subjectMatch: 'chem',    minQuestions: 50,  minAccuracy: 80 }, reward: null },
  { code: 'mastery-chem-90', name: 'Chem Master',        description: '90% accuracy in Chemistry (100+ questions)',    icon: 'FlaskConical', tone: 'amber',category: 'mastery', tier: 'gold',     sortOrder: 65, ruleType: 'subject-accuracy', ruleConfig: { subjectMatch: 'chem',    minQuestions: 100, minAccuracy: 90 }, reward: null },

  // ─── Mastery — Biology ──────────────────────────────────────────
  { code: 'mastery-bio-80',  name: 'Bio Adept',          description: '80% accuracy in Biology (50+ questions)',       icon: 'Leaf',      tone: 'emerald', category: 'mastery', tier: 'silver',   sortOrder: 66, ruleType: 'subject-accuracy', ruleConfig: { subjectMatch: 'bio',     minQuestions: 50,  minAccuracy: 80 }, reward: null },
  { code: 'mastery-bio-90',  name: 'Bio Master',         description: '90% accuracy in Biology (100+ questions)',      icon: 'Leaf',      tone: 'emerald', category: 'mastery', tier: 'gold',     sortOrder: 67, ruleType: 'subject-accuracy', ruleConfig: { subjectMatch: 'bio',     minQuestions: 100, minAccuracy: 90 }, reward: null },

  // ─── Tokens / Economy ──────────────────────────────────────────
  { code: 'tokens-earn-5',   name: 'First Tokens',       description: 'Earn your first 5 tokens',                      icon: 'Zap',       tone: 'violet',  category: 'milestone', tier: 'bronze',   sortOrder: 70, ruleType: 'tokens-earned', ruleConfig: { count: 5 },    reward: null },
  { code: 'tokens-earn-50',  name: 'Token Stacker',      description: 'Earn 50 tokens total',                          icon: 'Coins',     tone: 'amber',   category: 'volume',    tier: 'silver',   sortOrder: 71, ruleType: 'tokens-earned', ruleConfig: { count: 50 },   reward: null },
  { code: 'tokens-earn-250', name: 'Token Tycoon',       description: 'Earn 250 tokens total',                         icon: 'Coins',     tone: 'amber',   category: 'volume',    tier: 'gold',     sortOrder: 72, ruleType: 'tokens-earned', ruleConfig: { count: 250 },  reward: null },

  // ─── Padding badges to round out to 50 ──────────────────────────
  { code: 'volume-q-500',    name: 'Quiz Devotee',       description: 'Complete 500 quizzes',                          icon: 'Crown',     tone: 'lime',    category: 'volume', tier: 'platinum', sortOrder: 16, ruleType: 'quiz-count', ruleConfig: { count: 500 }, reward: null },
  { code: 'volume-Q-10000',  name: 'Mind of Marble',     description: 'Answer 10,000 questions',                       icon: 'Crown',     tone: 'lime',    category: 'volume', tier: 'platinum', sortOrder: 25, ruleType: 'questions-answered', ruleConfig: { count: 10000 }, reward: null },
];

async function main() {
  console.log(`Seeding ${BADGES.length} badges…`);
  let created = 0;
  let updated = 0;

  for (const b of BADGES) {
    const existing = await prisma.badge.findUnique({ where: { code: b.code }, select: { id: true } });
    await prisma.badge.upsert({
      where: { code: b.code },
      create: { ...b, reward: b.reward ?? undefined } as any,
      update: {
        name: b.name,
        description: b.description,
        icon: b.icon,
        tone: b.tone,
        category: b.category,
        tier: b.tier,
        sortOrder: b.sortOrder,
        ruleType: b.ruleType,
        ruleConfig: b.ruleConfig,
        reward: b.reward ?? null,
        isActive: true,
      } as any,
    });
    existing ? updated++ : created++;
  }

  const total = await prisma.badge.count({ where: { isActive: true } });
  console.log(`  ✓ ${created} created · ${updated} updated · ${total} active total`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
