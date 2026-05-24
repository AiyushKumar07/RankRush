import {
  Trophy, StickyNote, Video, MessagesSquare,
  Users, Medal, BarChart3, Globe, BookOpen, PenLine, Tag, Cloud,
  Play, Library, Sparkles, Mic, Hash, Brain,
} from 'lucide-react';
import ComingSoonPanel from '../../components/student/ComingSoonPanel';

export function StudentLeaderboardPage() {
  return (
    <ComingSoonPanel
      icon={Trophy}
      title="Leaderboard"
      tagline="Stack-rank against every student preparing for the same exam as you — globally, school-wise, and class-wise."
      description="Live, exam-specific leaderboards updated after every quiz attempt. Friends list, rivalry mode, weekly tournaments with XP boosts, and seasonal trophies. Filter by class, subject, or target exam."
      features={[
        { icon: Globe, title: 'Global ranks', desc: 'See how you compare across every student on RankRush.' },
        { icon: Users, title: 'Friends & rivals', desc: 'Add friends, set rivals, race to the top.' },
        { icon: Medal, title: 'Weekly tournaments', desc: 'Time-boxed contests with bonus XP and badges.' },
        { icon: BarChart3, title: 'Percentile graphs', desc: 'Track your percentile shift week-over-week.' },
      ]}
    />
  );
}

export function StudentNotesPage() {
  return (
    <ComingSoonPanel
      icon={StickyNote}
      title="Notes"
      tagline="A clean, fast notebook that lives inside your study flow — auto-organized by subject, chapter, and quiz."
      description="Markdown + LaTeX support, smart tags, and instant linking from any quiz question to your private notes. Sync across devices, share with study groups, export to PDF. Powered by AI summaries for revision day."
      features={[
        { icon: PenLine, title: 'Markdown + LaTeX', desc: 'Write equations and rich text natively.' },
        { icon: Tag, title: 'Smart tags', desc: 'Auto-organized by subject, chapter, and topic.' },
        { icon: Cloud, title: 'Cloud sync', desc: 'Pick up exactly where you left off, anywhere.' },
        { icon: Brain, title: 'AI revision', desc: 'Generate a one-page recap before any exam.' },
      ]}
    />
  );
}

export function StudentVideoLecturesPage() {
  return (
    <ComingSoonPanel
      icon={Video}
      title="Video Lectures"
      tagline="High-quality lectures from top educators — perfectly paired with the quizzes you struggle on."
      description="Curated playlists by subject, chapter, and difficulty. Watch-then-quiz flow with auto-timestamps to weak topics. Adaptive recommendations based on your accuracy patterns."
      features={[
        { icon: Play, title: 'Watch-then-quiz', desc: 'Auto-trigger a 5-Q quiz right after a lecture.' },
        { icon: Library, title: 'Curated playlists', desc: 'By subject, chapter, and exam target.' },
        { icon: Sparkles, title: 'Adaptive picks', desc: 'Lectures recommended where you scored lowest.' },
        { icon: BookOpen, title: 'Lecture notes', desc: 'Auto-generated notes synced to the timeline.' },
      ]}
    />
  );
}

export function StudentChatPage() {
  return (
    <ComingSoonPanel
      icon={MessagesSquare}
      title="Live Chat Groups"
      tagline="Study with your tribe. Live rooms by exam, by subject, by school — moderated and distraction-free."
      description="Real-time group rooms for every major exam. Doubt-clearing channels, peer study circles, and weekly Ask-Me-Anything sessions with toppers and mentors. Quiet hours and focus mode included."
      features={[
        { icon: Hash, title: 'Topic channels', desc: 'A room per chapter, no noise.' },
        { icon: Users, title: 'Study circles', desc: 'Small groups, accountability buddies.' },
        { icon: Mic, title: 'Toppers AMAs', desc: 'Weekly live sessions with rank holders.' },
        { icon: Brain, title: 'Smart doubt-solver', desc: 'Tag a question, get a peer answer in minutes.' },
      ]}
    />
  );
}
