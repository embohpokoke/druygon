import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  Clock3,
  Code2,
  Flame,
  Lightbulb,
  LockKeyhole,
  Play,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
} from 'lucide-react';
import './styles.css';

type Screen = 'map' | 'workspace';
type Language = 'en' | 'id';
type LessonState = 'completed' | 'current' | 'locked';
type FeedbackKind = 'initial' | 'saved' | 'reset' | 'empty' | 'sentence' | 'wrong' | 'unknown' | 'success';

type PlayerProfile = { level?: number; coins?: number; xp?: number };
type PlayerResponse = { name?: string; profile?: PlayerProfile };
type OutputState = { kind: FeedbackKind };

type LearnFirstContent = {
  title: string;
  explanation: string;
  syntax: { code: string; parts: Array<{ token: string; meaning: string }> };
  workedExample: { code: string; result: string };
};

type LessonCopy = {
  title: string;
  storyTitle: string;
  story: string;
  learnFirst: LearnFirstContent;
  task: string;
  target: string;
  hints: [string, string, string];
  starterCode: string;
  placeholder: string;
  skill: string;
  feedback: Record<Exclude<FeedbackKind, 'saved'>, string>;
};

type MissionDefinition = {
  id: number;
  copy: Record<Language, LessonCopy>;
  validate: (code: string) => Exclude<FeedbackKind, 'initial' | 'saved' | 'reset'>;
};

const COPY = {
  en: {
    moduleSubtitle: 'Druygon module', backHub: 'Back to the Druygon hub', otherModules: 'Other Druygon modules',
    days: '0 days', activePlayer: 'Active player', loading: 'loading', language: 'Language', english: 'English', indonesian: 'Indonesian',
    roboAlt: 'Robo, the DruCode robot tutor', ready: 'READY TO LEARN', hello: (name: string) => `Hi, ${name}!`,
    intro: 'Robo has your next coding mission ready.', level: (value: number) => `Druygon Level ${value}`, track: 'Track 1',
    progress: (completed: number, total: number) => `Visual Blocks progress, ${completed} of ${total} missions completed`,
    minutes: '0 / 45 min', safeMode: 'Safe mode', parentPanel: 'Parent panel', switchModules: 'Switch module',
    trackEyebrow: 'TRACK 1 · VISUAL BLOCKS', worldTitle: 'World 1 · Nara’s Commands', mapSubtitle: 'Every mission starts with a short lesson, then a guided challenge.',
    learningTracks: 'Learning tracks', visualBlocks: 'Visual Blocks', mission: 'Mission', available: 'available', completed: 'completed', locked: 'locked',
    startHere: 'Next mission:', startHereBody: 'Learn one skill, solve the challenge, then unlock the next step.',
    worldComplete: 'World complete!', worldCompleteBody: 'You finished Nara’s command journey.',
    backMap: 'Back to the learning map', checkerReady: 'Mission checker ready', storyLabel: 'MISSION STORY',
    learnLabel: 'LEARN FIRST', exampleLabel: 'EXAMPLE', lessonSteps: ['1. Learn', '2. Type', '3. Run'],
    yourTask: 'Your task', target: 'TARGET', roboHint: 'Robo hint', tryFirst: 'Give it a try. Robo will help if you get stuck.',
    allHints: 'All hints unlocked', askHint: 'Ask for a Hint', codeArea: 'Code area', draftSafe: 'Draft saved automatically',
    codeLabel: 'Mission code', run: 'Run', reset: 'Reset', save: 'Save', savedOutput: 'Draft saved. Press Run when you are ready to check the mission.',
    missionNumber: (id: number) => `MISSION ${id}`,
    completeLabel: 'MISSION COMPLETE', completeTitle: 'You did it!', skillLearned: 'Skill learned',
    nextUnlocked: (title: string) => `${title} is now unlocked.`, completeWorldBody: 'Every mission in this world is complete. Your progress is saved.',
    continueTo: (title: string) => `Continue to ${title}`, viewJourney: 'View completed journey',
    errorTitle: 'DruCode needs a quick pause', errorBody: 'Your draft is still safe. Reload to continue your adventure.', retry: 'Try again', backDruygon: 'Back to Druygon',
  },
  id: {
    moduleSubtitle: 'modul Druygon', backHub: 'Kembali ke hub Druygon', otherModules: 'Modul Druygon lainnya',
    days: '0 hari', activePlayer: 'Pemain aktif', loading: 'memuat', language: 'Bahasa', english: 'Inggris', indonesian: 'Indonesia',
    roboAlt: 'Robo, robot tutor DruCode', ready: 'SIAP BELAJAR', hello: (name: string) => `Halo, ${name}!`,
    intro: 'Robo sudah menyiapkan misi coding berikutnya.', level: (value: number) => `Level Druygon ${value}`, track: 'Track 1',
    progress: (completed: number, total: number) => `Progress Blok Visual, ${completed} dari ${total} misi selesai`,
    minutes: '0 / 45 mnt', safeMode: 'Mode aman', parentPanel: 'Panel orang tua', switchModules: 'Pindah modul',
    trackEyebrow: 'TRACK 1 · BLOK VISUAL', worldTitle: 'Dunia 1 · Perintah Nara', mapSubtitle: 'Setiap misi dimulai dengan pelajaran singkat, lalu tantangan terpandu.',
    learningTracks: 'Track belajar', visualBlocks: 'Blok Visual', mission: 'Misi', available: 'tersedia', completed: 'selesai', locked: 'terkunci',
    startHere: 'Misi berikutnya:', startHereBody: 'Pelajari satu skill, selesaikan tantangan, lalu buka langkah berikutnya.',
    worldComplete: 'Dunia selesai!', worldCompleteBody: 'Kamu menuntaskan perjalanan perintah Nara.',
    backMap: 'Kembali ke peta', checkerReady: 'Pemeriksa misi siap', storyLabel: 'CERITA MISI',
    learnLabel: 'PELAJARI DULU', exampleLabel: 'CONTOH', lessonSteps: ['1. Belajar', '2. Ketik', '3. Jalankan'],
    yourTask: 'Tugasmu', target: 'TARGET', roboHint: 'Petunjuk Robo', tryFirst: 'Coba dulu. Robo akan membantu kalau kamu stuck.',
    allHints: 'Semua hint terbuka', askHint: 'Minta Hint', codeArea: 'Area kode', draftSafe: 'Draft otomatis aman',
    codeLabel: 'Kode misi', run: 'Jalankan', reset: 'Reset', save: 'Simpan', savedOutput: 'Draft tersimpan. Tekan Jalankan saat kamu siap memeriksa misi.',
    missionNumber: (id: number) => `MISI ${id}`,
    completeLabel: 'MISI SELESAI', completeTitle: 'Kamu berhasil!', skillLearned: 'Skill dipelajari',
    nextUnlocked: (title: string) => `${title} sekarang terbuka.`, completeWorldBody: 'Semua misi di dunia ini selesai. Progress-mu sudah tersimpan.',
    continueTo: (title: string) => `Lanjut ke ${title}`, viewJourney: 'Lihat perjalanan selesai',
    errorTitle: 'DruCode berhenti sebentar', errorBody: 'Draft-mu tetap aman. Muat ulang untuk melanjutkan petualangan.', retry: 'Coba lagi', backDruygon: 'Kembali ke Druygon',
  },
} as const;

function codeWithoutComments(code: string) {
  return code.split('\n').map((line) => line.replace(/#.*$/, '').trim()).filter(Boolean).join('\n');
}

function normalizeProgram(code: string) {
  return codeWithoutComments(code).replace(/\s+/g, '').replace(/;/g, '').toLowerCase();
}

function fixedProgram(expected: string, recognizableWords: string[]) {
  const normalizedExpected = normalizeProgram(expected);
  return (code: string): Exclude<FeedbackKind, 'initial' | 'saved' | 'reset'> => {
    const visibleCode = codeWithoutComments(code);
    if (!visibleCode) return 'empty';
    const normalized = normalizeProgram(code);
    if (normalized === normalizedExpected) return 'success';
    if (!/[(){}]/.test(visibleCode) && /\s/.test(visibleCode)) return 'sentence';
    if (recognizableWords.some((word) => normalized.includes(word.toLowerCase()))) return 'wrong';
    return 'unknown';
  };
}

const MISSIONS: MissionDefinition[] = [
  {
    id: 1,
    validate: fixedProgram('move(1)', ['move']),
    copy: {
      en: {
        title: 'First Command', storyTitle: 'Teach Nara her first command',
        story: 'Nara sees a star one step ahead. Computers cannot guess what we mean, so we must give Nara one exact instruction.',
        learnFirst: {
          title: 'Commands tell a computer what to do', explanation: 'Nara understands the pattern move(number). The number tells her how many steps to walk forward.',
          syntax: { code: 'move(number)', parts: [{ token: 'move', meaning: 'the action Nara will do' }, { token: 'number', meaning: 'how many steps she will take' }] },
          workedExample: { code: 'move(2)', result: 'Nara moves forward 2 steps' },
        },
        task: 'Move Nara forward exactly one step.', target: 'Nara moves forward 1 step ✨',
        hints: ['Remember the pattern: move(number). Replace number with the steps Nara needs.', 'Nara needs one step, so put 1 between the parentheses.', 'Type exactly: move(1)'],
        starterCode: '# Type Nara\'s command below\n', placeholder: 'move(number)', skill: 'Giving one exact command',
        feedback: {
          initial: 'Read Learn First, type one command, then press Run.', reset: 'Code reset. Read the example, then write Nara’s command.',
          empty: 'Your code area is empty. Type one command below the comment.', sentence: 'That is a sentence. Code uses the pattern move(number).',
          wrong: 'Great command shape! Check the target: Nara needs exactly 1 step.', unknown: 'Robo does not recognize that command yet. Look at the move(number) example.',
          success: 'Great job! Nara moves forward 1 step ✨',
        },
      },
      id: {
        title: 'Perintah Pertama', storyTitle: 'Ajari Nara perintah pertamanya',
        story: 'Nara melihat bintang satu langkah di depannya. Komputer tidak bisa menebak maksud kita, jadi Nara perlu satu instruksi yang tepat.',
        learnFirst: {
          title: 'Perintah memberi tahu komputer apa yang harus dilakukan', explanation: 'Nara memahami pola move(angka). Angka memberi tahu berapa langkah ia harus maju.',
          syntax: { code: 'move(angka)', parts: [{ token: 'move', meaning: 'aksi yang akan dilakukan Nara' }, { token: 'angka', meaning: 'berapa langkah yang akan ditempuh' }] },
          workedExample: { code: 'move(2)', result: 'Nara maju 2 langkah' },
        },
        task: 'Buat Nara bergerak maju tepat satu langkah.', target: 'Nara maju 1 langkah ✨',
        hints: ['Ingat polanya: move(angka). Ganti angka dengan jumlah langkah yang dibutuhkan Nara.', 'Nara perlu satu langkah, jadi tulis 1 di antara tanda kurung.', 'Ketik persis: move(1)'],
        starterCode: '# Ketik perintah Nara di bawah\n', placeholder: 'move(angka)', skill: 'Memberi satu perintah yang tepat',
        feedback: {
          initial: 'Baca Pelajari Dulu, ketik satu perintah, lalu tekan Jalankan.', reset: 'Kode di-reset. Baca contoh, lalu tulis perintah Nara.',
          empty: 'Area kode masih kosong. Ketik satu perintah di bawah komentar.', sentence: 'Itu masih berupa kalimat. Kode memakai pola move(angka).',
          wrong: 'Bentuk perintahmu sudah benar! Periksa target: Nara harus maju tepat 1 langkah.', unknown: 'Robo belum mengenali perintah itu. Lihat contoh move(angka).',
          success: 'Hebat! Nara maju 1 langkah ✨',
        },
      },
    },
  },
  {
    id: 2,
    validate: fixedProgram('move(1)\nturnRight()\nmove(1)', ['move', 'turnright']),
    copy: {
      en: {
        title: 'The Right Order', storyTitle: 'Guide Nara around the corner',
        story: 'The next star is around a corner. Nara follows code from the first line to the last line, so the order matters.',
        learnFirst: {
          title: 'The computer follows commands from top to bottom', explanation: 'Each line finishes before the next line starts. turnRight() changes Nara’s direction before her next move.',
          syntax: { code: 'turnRight()', parts: [{ token: 'turnRight', meaning: 'turn Nara to her right' }, { token: '()', meaning: 'do this action now' }] },
          workedExample: { code: 'turnRight()\nmove(2)', result: 'Nara turns, then moves 2 steps' },
        },
        task: 'Move 1 step, turn right, then move 1 step.', target: 'Nara reaches the star around the corner ✨',
        hints: ['Read the goal from left to right, then put one command on each line.', 'The turn belongs between the two move commands.', 'Type: move(1), then turnRight(), then move(1), each on its own line.'],
        starterCode: '# Put the three commands in the right order\n', placeholder: 'move(1)\nturnRight()\nmove(1)', skill: 'Putting commands in the right order',
        feedback: {
          initial: 'Learn why order matters, then write three commands and press Run.', reset: 'Code reset. Build the route from the first action to the last.',
          empty: 'The route is empty. Add the first command below the comment.', sentence: 'Describe the route with code commands, not a sentence.',
          wrong: 'You are using route commands. Check their order against the three actions in the task.', unknown: 'Robo sees a command it has not learned in this mission.',
          success: 'Perfect order! Nara reaches the star around the corner ✨',
        },
      },
      id: {
        title: 'Urutan yang Tepat', storyTitle: 'Arahkan Nara melewati tikungan',
        story: 'Bintang berikutnya ada di balik tikungan. Nara menjalankan kode dari baris pertama sampai terakhir, jadi urutannya penting.',
        learnFirst: {
          title: 'Komputer mengikuti perintah dari atas ke bawah', explanation: 'Setiap baris selesai sebelum baris berikutnya dimulai. turnRight() mengubah arah Nara sebelum ia maju lagi.',
          syntax: { code: 'turnRight()', parts: [{ token: 'turnRight', meaning: 'belokkan Nara ke kanan' }, { token: '()', meaning: 'lakukan aksi ini sekarang' }] },
          workedExample: { code: 'turnRight()\nmove(2)', result: 'Nara berbelok, lalu maju 2 langkah' },
        },
        task: 'Maju 1 langkah, belok kanan, lalu maju 1 langkah.', target: 'Nara mencapai bintang di balik tikungan ✨',
        hints: ['Baca tujuan dari kiri ke kanan, lalu taruh satu perintah di setiap baris.', 'Perintah belok berada di antara dua perintah move.', 'Ketik move(1), lalu turnRight(), lalu move(1), masing-masing di baris terpisah.'],
        starterCode: '# Susun tiga perintah dengan urutan yang tepat\n', placeholder: 'move(1)\nturnRight()\nmove(1)', skill: 'Menyusun perintah dengan urutan yang tepat',
        feedback: {
          initial: 'Pelajari mengapa urutan penting, lalu tulis tiga perintah dan tekan Jalankan.', reset: 'Kode di-reset. Susun rute dari aksi pertama sampai terakhir.',
          empty: 'Rute masih kosong. Tambahkan perintah pertama di bawah komentar.', sentence: 'Jelaskan rute dengan perintah kode, bukan kalimat.',
          wrong: 'Kamu sudah memakai perintah rute. Periksa urutannya sesuai tiga aksi pada tugas.', unknown: 'Robo melihat perintah yang belum dipelajari di misi ini.',
          success: 'Urutannya tepat! Nara mencapai bintang di balik tikungan ✨',
        },
      },
    },
  },
  {
    id: 3,
    validate: fixedProgram('move(1)\nmove(1)\nmove(1)', ['move']),
    copy: {
      en: {
        title: 'Repeat Steps', storyTitle: 'Cross the three stepping stones',
        story: 'Three stepping stones lead straight to the star. Before learning a shortcut, Nara can repeat the same command on new lines.',
        learnFirst: {
          title: 'A command can be used more than once', explanation: 'Repeating move(1) on separate lines makes Nara take one step for each line. The computer still reads from top to bottom.',
          syntax: { code: 'move(1)\nmove(1)', parts: [{ token: 'each line', meaning: 'one command for the computer' }, { token: 'two lines', meaning: 'the action happens twice' }] },
          workedExample: { code: 'move(1)\nmove(1)', result: 'Nara moves 2 steps' },
        },
        task: 'Repeat move(1) on three lines.', target: 'Nara crosses 3 stepping stones ✨',
        hints: ['One move(1) crosses one stone. Repeat the command for every stone.', 'You need three identical command lines.', 'Type move(1) three times, each on a new line.'],
        starterCode: '# Repeat one command for each stepping stone\n', placeholder: 'move(1)\nmove(1)\nmove(1)', skill: 'Repeating a command to match a goal',
        feedback: {
          initial: 'Count the stones, repeat the command, then press Run.', reset: 'Code reset. Add one move command for each stone.',
          empty: 'No steps yet. Start with one move(1).', sentence: 'Use repeated code lines instead of describing the steps.',
          wrong: 'Your move commands work, but the number of lines must match the three stones.', unknown: 'Robo only expects move(1) commands in this mission.',
          success: 'Nice repetition! Nara crosses all 3 stepping stones ✨',
        },
      },
      id: {
        title: 'Langkah Berulang', storyTitle: 'Seberangi tiga batu pijakan',
        story: 'Tiga batu pijakan mengarah lurus ke bintang. Sebelum belajar jalan pintas, Nara dapat mengulang perintah yang sama di baris baru.',
        learnFirst: {
          title: 'Satu perintah dapat dipakai lebih dari sekali', explanation: 'Mengulang move(1) di baris terpisah membuat Nara maju satu langkah untuk setiap baris. Komputer tetap membaca dari atas ke bawah.',
          syntax: { code: 'move(1)\nmove(1)', parts: [{ token: 'setiap baris', meaning: 'satu perintah untuk komputer' }, { token: 'dua baris', meaning: 'aksi dilakukan dua kali' }] },
          workedExample: { code: 'move(1)\nmove(1)', result: 'Nara maju 2 langkah' },
        },
        task: 'Ulangi move(1) di tiga baris.', target: 'Nara melewati 3 batu pijakan ✨',
        hints: ['Satu move(1) melewati satu batu. Ulangi perintah untuk setiap batu.', 'Kamu membutuhkan tiga baris perintah yang sama.', 'Ketik move(1) tiga kali, masing-masing di baris baru.'],
        starterCode: '# Ulangi satu perintah untuk setiap batu\n', placeholder: 'move(1)\nmove(1)\nmove(1)', skill: 'Mengulang perintah sesuai tujuan',
        feedback: {
          initial: 'Hitung batunya, ulangi perintah, lalu tekan Jalankan.', reset: 'Kode di-reset. Tambahkan satu perintah move untuk setiap batu.',
          empty: 'Belum ada langkah. Mulai dengan satu move(1).', sentence: 'Gunakan baris kode berulang, bukan kalimat.',
          wrong: 'Perintah move-mu bisa dipakai, tetapi jumlah baris harus sama dengan tiga batu.', unknown: 'Robo hanya menunggu perintah move(1) di misi ini.',
          success: 'Pengulangan yang bagus! Nara melewati semua 3 batu ✨',
        },
      },
    },
  },
  {
    id: 4,
    validate: fixedProgram('repeat(4) { move(1) }', ['repeat', 'move']),
    copy: {
      en: {
        title: 'Helpful Loop', storyTitle: 'Take the long straight path',
        story: 'The next path has four spaces. Writing the same line four times works, but a loop can express the repeated idea more clearly.',
        learnFirst: {
          title: 'A loop repeats code for us', explanation: 'repeat(number) runs the command inside the braces that many times. Braces { } show which command belongs to the loop.',
          syntax: { code: 'repeat(number) {\n  command\n}', parts: [{ token: 'number', meaning: 'how many times to repeat' }, { token: '{ }', meaning: 'the command that repeats' }] },
          workedExample: { code: 'repeat(2) { move(1) }', result: 'Nara moves 2 steps' },
        },
        task: 'Use one loop to move Nara four steps.', target: 'Nara travels 4 steps with one helpful loop ✨',
        hints: ['Use repeat(number) and place move(1) inside its braces.', 'The path has four spaces, so the loop number is 4.', 'Type: repeat(4) { move(1) }'],
        starterCode: '# Use a loop instead of four move lines\n', placeholder: 'repeat(4) {\n  move(1)\n}', skill: 'Using a loop to repeat code',
        feedback: {
          initial: 'Learn the loop pattern, then make one loop and press Run.', reset: 'Code reset. Put move(1) inside a repeat loop.',
          empty: 'The loop area is empty. Start with repeat(number).', sentence: 'Use the repeat pattern instead of a sentence.',
          wrong: 'Your loop idea is close. Check the repeat number and the command inside the braces.', unknown: 'Robo expects a repeat loop containing move(1).',
          success: 'Loop complete! Nara travels 4 steps with compact code ✨',
        },
      },
      id: {
        title: 'Loop Penolong', storyTitle: 'Lewati jalur lurus yang panjang',
        story: 'Jalur berikutnya memiliki empat petak. Menulis baris yang sama empat kali bisa dilakukan, tetapi loop menyatakan pengulangan dengan lebih jelas.',
        learnFirst: {
          title: 'Loop mengulang kode untuk kita', explanation: 'repeat(angka) menjalankan perintah di dalam kurung kurawal sebanyak angka itu. Kurung { } menunjukkan perintah yang termasuk dalam loop.',
          syntax: { code: 'repeat(angka) {\n  perintah\n}', parts: [{ token: 'angka', meaning: 'berapa kali perintah diulang' }, { token: '{ }', meaning: 'perintah yang akan diulang' }] },
          workedExample: { code: 'repeat(2) { move(1) }', result: 'Nara maju 2 langkah' },
        },
        task: 'Gunakan satu loop untuk membuat Nara maju empat langkah.', target: 'Nara maju 4 langkah dengan satu loop ✨',
        hints: ['Gunakan repeat(angka), lalu taruh move(1) di dalam kurungnya.', 'Jalurnya empat petak, jadi angka loop adalah 4.', 'Ketik: repeat(4) { move(1) }'],
        starterCode: '# Gunakan loop, bukan empat baris move\n', placeholder: 'repeat(4) {\n  move(1)\n}', skill: 'Menggunakan loop untuk mengulang kode',
        feedback: {
          initial: 'Pelajari pola loop, lalu buat satu loop dan tekan Jalankan.', reset: 'Kode di-reset. Taruh move(1) di dalam loop repeat.',
          empty: 'Area loop masih kosong. Mulai dengan repeat(angka).', sentence: 'Gunakan pola repeat, bukan kalimat.',
          wrong: 'Ide loop-mu hampir tepat. Periksa angka repeat dan perintah di dalam kurung.', unknown: 'Robo menunggu loop repeat yang berisi move(1).',
          success: 'Loop selesai! Nara maju 4 langkah dengan kode ringkas ✨',
        },
      },
    },
  },
  {
    id: 5,
    validate: fixedProgram('ifStar() { collect() }', ['ifstar', 'collect']),
    copy: {
      en: {
        title: 'Smart Condition', storyTitle: 'Collect only when a star appears',
        story: 'Sometimes a star appears and sometimes the space is empty. Nara needs a condition so she acts only when the test is true.',
        learnFirst: {
          title: 'A condition lets code make a choice', explanation: 'An if command checks something first. The command inside its braces runs only when that condition is true.',
          syntax: { code: 'ifCondition() {\n  action()\n}', parts: [{ token: 'ifCondition', meaning: 'the test the computer checks' }, { token: '{ action }', meaning: 'what happens when the test is true' }] },
          workedExample: { code: 'ifPathClear() { move(1) }', result: 'Nara moves only when the path is clear' },
        },
        task: 'Collect the star only if a star is present.', target: 'Nara safely collects the star ✨',
        hints: ['Use an ifStar() check and put the action inside its braces.', 'The action for taking a star is collect().', 'Type: ifStar() { collect() }'],
        starterCode: '# Check first, then collect\n', placeholder: 'ifStar() {\n  collect()\n}', skill: 'Using a condition to make a safe choice',
        feedback: {
          initial: 'Learn how a condition works, then write the check and press Run.', reset: 'Code reset. Check for the star before collecting it.',
          empty: 'No condition yet. Start with ifStar().', sentence: 'Use an if command instead of describing the choice.',
          wrong: 'Your condition is close. Check what is tested and which action belongs inside the braces.', unknown: 'Robo expects an ifStar condition with a collect action.',
          success: 'Smart choice! Nara checks first and safely collects the star ✨',
        },
      },
      id: {
        title: 'Kondisi Cerdas', storyTitle: 'Ambil hanya saat bintang muncul',
        story: 'Kadang bintang muncul dan kadang petaknya kosong. Nara membutuhkan kondisi agar ia bertindak hanya saat pemeriksaannya benar.',
        learnFirst: {
          title: 'Kondisi membuat kode dapat memilih', explanation: 'Perintah if memeriksa sesuatu terlebih dahulu. Perintah di dalam kurungnya hanya berjalan jika kondisi itu benar.',
          syntax: { code: 'ifKondisi() {\n  aksi()\n}', parts: [{ token: 'ifKondisi', meaning: 'hal yang diperiksa komputer' }, { token: '{ aksi }', meaning: 'yang terjadi jika pemeriksaan benar' }] },
          workedExample: { code: 'ifPathClear() { move(1) }', result: 'Nara maju hanya jika jalurnya aman' },
        },
        task: 'Ambil bintang hanya jika ada bintang.', target: 'Nara mengambil bintang dengan aman ✨',
        hints: ['Gunakan pemeriksaan ifStar(), lalu taruh aksi di dalam kurungnya.', 'Aksi untuk mengambil bintang adalah collect().', 'Ketik: ifStar() { collect() }'],
        starterCode: '# Periksa dahulu, lalu ambil bintangnya\n', placeholder: 'ifStar() {\n  collect()\n}', skill: 'Menggunakan kondisi untuk memilih dengan aman',
        feedback: {
          initial: 'Pelajari cara kerja kondisi, lalu tulis pemeriksaannya dan tekan Jalankan.', reset: 'Kode di-reset. Periksa bintang sebelum mengambilnya.',
          empty: 'Belum ada kondisi. Mulai dengan ifStar().', sentence: 'Gunakan perintah if, bukan kalimat pilihan.',
          wrong: 'Kondisimu hampir tepat. Periksa apa yang diuji dan aksi di dalam kurung.', unknown: 'Robo menunggu kondisi ifStar dengan aksi collect.',
          success: 'Pilihan cerdas! Nara memeriksa dahulu lalu mengambil bintang ✨',
        },
      },
    },
  },
  {
    id: 6,
    validate: fixedProgram('move(1)\nturnRight()\nrepeat(2) { move(1) }\nifStar() { collect() }', ['move', 'turnright', 'repeat', 'ifstar', 'collect']),
    copy: {
      en: {
        title: 'Boss: Move Nara', storyTitle: 'Combine your command skills',
        story: 'The final star is beyond a turn and a short path. This mission combines sequence, a loop, and a condition from the earlier missions.',
        learnFirst: {
          title: 'Plan a bigger solution in small parts', explanation: 'Read the route in order. Choose a command for each part, use a loop for repeated steps, then check before collecting.',
          syntax: { code: 'sequence → loop → condition', parts: [{ token: 'sequence', meaning: 'put actions in route order' }, { token: 'loop + condition', meaning: 'repeat steps, then make a safe choice' }] },
          workedExample: { code: 'move(1)\nrepeat(2) { move(1) }', result: 'Nara moves 3 straight steps' },
        },
        task: 'Move 1, turn right, loop 2 moves, then collect if a star is present.', target: 'Nara completes the final route and collects the star ✨',
        hints: ['Build the route in four parts: move, turn, loop, then condition.', 'The loop repeats move(1) twice; the condition checks ifStar before collect.', 'Use move(1), turnRight(), repeat(2) { move(1) }, then ifStar() { collect() }.'],
        starterCode: '# Combine the skills from this world\n', placeholder: 'move(1)\nturnRight()\nrepeat(2) { move(1) }\nifStar() { collect() }', skill: 'Combining sequence, loops, and conditions',
        feedback: {
          initial: 'Review the four route parts, build them in order, then press Run.', reset: 'Code reset. Rebuild the route one part at a time.',
          empty: 'The final route is empty. Start with its first move.', sentence: 'Build the route with the commands from earlier missions.',
          wrong: 'Your route uses familiar commands. Check all four parts and their order.', unknown: 'Robo sees something outside the commands learned in this world.',
          success: 'Boss mission complete! Nara reaches and collects the final star ✨',
        },
      },
      id: {
        title: 'Boss: Nara Bergerak', storyTitle: 'Gabungkan skill perintahmu',
        story: 'Bintang terakhir ada di balik tikungan dan jalur pendek. Misi ini menggabungkan urutan, loop, dan kondisi dari misi sebelumnya.',
        learnFirst: {
          title: 'Rencanakan solusi besar dalam bagian kecil', explanation: 'Baca rute secara berurutan. Pilih perintah untuk setiap bagian, gunakan loop untuk langkah berulang, lalu periksa sebelum mengambil.',
          syntax: { code: 'urutan → loop → kondisi', parts: [{ token: 'urutan', meaning: 'susun aksi sesuai rute' }, { token: 'loop + kondisi', meaning: 'ulangi langkah, lalu pilih dengan aman' }] },
          workedExample: { code: 'move(1)\nrepeat(2) { move(1) }', result: 'Nara maju 3 langkah lurus' },
        },
        task: 'Maju 1, belok kanan, ulangi 2 langkah, lalu ambil jika ada bintang.', target: 'Nara menuntaskan rute terakhir dan mengambil bintang ✨',
        hints: ['Bangun rute dalam empat bagian: maju, belok, loop, lalu kondisi.', 'Loop mengulang move(1) dua kali; kondisi memeriksa ifStar sebelum collect.', 'Gunakan move(1), turnRight(), repeat(2) { move(1) }, lalu ifStar() { collect() }.'],
        starterCode: '# Gabungkan skill dari dunia ini\n', placeholder: 'move(1)\nturnRight()\nrepeat(2) { move(1) }\nifStar() { collect() }', skill: 'Menggabungkan urutan, loop, dan kondisi',
        feedback: {
          initial: 'Tinjau empat bagian rute, susun berurutan, lalu tekan Jalankan.', reset: 'Kode di-reset. Bangun kembali rute satu bagian demi satu.',
          empty: 'Rute terakhir masih kosong. Mulai dengan langkah pertamanya.', sentence: 'Bangun rute dengan perintah dari misi sebelumnya.',
          wrong: 'Rutemu memakai perintah yang dikenal. Periksa keempat bagian dan urutannya.', unknown: 'Robo melihat sesuatu di luar perintah yang dipelajari di dunia ini.',
          success: 'Misi boss selesai! Nara mencapai dan mengambil bintang terakhir ✨',
        },
      },
    },
  },
];

const TOTAL_MISSIONS = MISSIONS.length;

function preferredLanguage(): Language {
  return safeLocalGet('drucode-language') === 'id' ? 'id' : 'en';
}

function safeLocalGet(key: string) {
  try { return window.localStorage.getItem(key); } catch { return null; }
}

function safeLocalSet(key: string, value: string) {
  try { window.localStorage.setItem(key, value); } catch { /* Storage-disabled browsers remain usable. */ }
}

function readCompletedLessons(key: string) {
  try {
    const stored = JSON.parse(safeLocalGet(key) ?? '[]');
    if (!Array.isArray(stored)) return [];
    const completed: number[] = [];
    for (let id = 1; id <= TOTAL_MISSIONS && stored.includes(id); id += 1) completed.push(id);
    return completed;
  } catch { return []; }
}

function draftKeyFor(slot: number, lessonId: number) {
  return lessonId === 1 ? `drucode-draft-${slot}-lesson-1-v2` : `drucode-draft-${slot}-lesson-${lessonId}-v1`;
}

function activeSlot() {
  const fromQuery = Number(new URLSearchParams(window.location.search).get('slot'));
  if ([1, 2, 3, 4].includes(fromQuery)) return fromQuery;
  const fromDruygon = Number(safeLocalGet('druygon-slot-v1'));
  return [1, 2, 3, 4].includes(fromDruygon) ? fromDruygon : 1;
}

function usePlayer(slot: number) {
  const [player, setPlayer] = React.useState<PlayerResponse | null>(null);
  React.useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/player/${slot}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('player unavailable'))))
      .then((data: PlayerResponse) => setPlayer(data))
      .catch((error: Error) => { if (error.name !== 'AbortError') setPlayer({ name: 'Dru', profile: { level: 1, coins: 0 } }); });
    return () => controller.abort();
  }, [slot]);
  return player;
}

function App() {
  const slot = React.useMemo(activeSlot, []);
  const player = usePlayer(slot);
  const [language, setLanguage] = React.useState<Language>(preferredLanguage);
  const t = COPY[language];
  const progressKey = `drucode-progress-${slot}-visual-blocks-v1`;
  const initialCompleted = React.useMemo(() => readCompletedLessons(progressKey), [progressKey]);
  const [completedLessons, setCompletedLessons] = React.useState<number[]>(initialCompleted);
  const [screen, setScreen] = React.useState<Screen>('map');
  const [activeLessonId, setActiveLessonId] = React.useState(Math.min(initialCompleted.length + 1, TOTAL_MISSIONS));
  const activeMission = MISSIONS[activeLessonId - 1];
  const lesson = activeMission.copy[language];
  const draftKey = draftKeyFor(slot, activeLessonId);
  const [code, setCode] = React.useState(() => safeLocalGet(draftKey) ?? lesson.starterCode);
  const [hintLevel, setHintLevel] = React.useState(0);
  const [output, setOutput] = React.useState<OutputState>({ kind: 'initial' });

  React.useEffect(() => { document.documentElement.lang = language; safeLocalSet('drucode-language', language); }, [language]);
  React.useEffect(() => { safeLocalSet(progressKey, JSON.stringify(completedLessons)); }, [completedLessons, progressKey]);
  React.useEffect(() => { safeLocalSet(draftKey, code); }, [code, draftKey]);

  const openLesson = React.useCallback((lessonId: number) => {
    const selected = MISSIONS[lessonId - 1];
    if (!selected) return;
    setActiveLessonId(lessonId);
    setCode(safeLocalGet(draftKeyFor(slot, lessonId)) ?? selected.copy[language].starterCode);
    setHintLevel(0);
    setOutput({ kind: 'initial' });
    setScreen('workspace');
  }, [language, slot]);

  const saveDraft = React.useCallback(() => { safeLocalSet(draftKey, code); setOutput({ kind: 'saved' }); }, [code, draftKey]);
  const runCode = React.useCallback(() => {
    const result = activeMission.validate(code);
    setOutput({ kind: result });
    safeLocalSet(draftKey, code);
    if (result === 'success') {
      setCompletedLessons((current) => current.includes(activeLessonId) || activeLessonId !== current.length + 1 ? current : [...current, activeLessonId]);
    }
  }, [activeLessonId, activeMission, code, draftKey]);
  const updateCode = React.useCallback((value: string) => { setCode(value); setOutput({ kind: 'initial' }); }, []);
  const resetCode = React.useCallback(() => { setCode(lesson.starterCode); setOutput({ kind: 'reset' }); }, [lesson.starterCode]);

  const outputText = output.kind === 'saved' ? t.savedOutput : lesson.feedback[output.kind];
  const nextMission = MISSIONS[activeLessonId];

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="icon-button" href="https://druygon.my.id/" aria-label={t.backHub}><ArrowLeft size={20} aria-hidden="true" /></a>
        <div className="brand-lockup"><span className="brand-mark"><Code2 size={20} aria-hidden="true" /></span><span><strong>DruCode</strong><small>{t.moduleSubtitle}</small></span></div>
        <nav className="suite-nav" aria-label={t.otherModules}><a href="https://study.druygon.my.id/">Study</a><a href="https://draco.druygon.my.id/">Draco</a></nav>
        <div className="topbar-spacer" />
        <div className="language-switch" role="group" aria-label={t.language}>
          <button type="button" className={language === 'en' ? 'active' : ''} aria-pressed={language === 'en'} title={t.english} onClick={() => setLanguage('en')}>EN</button>
          <button type="button" className={language === 'id' ? 'active' : ''} aria-pressed={language === 'id'} title={t.indonesian} onClick={() => setLanguage('id')}>ID</button>
        </div>
        <span className="status-chip"><Flame size={15} aria-hidden="true" /> {t.days}</span>
        <span className="xp-chip"><Star size={15} aria-hidden="true" /> {player?.profile?.xp ?? 0} XP</span>
        <span className="avatar" aria-label={`${t.activePlayer}: ${player?.name ?? t.loading}`}><UserRound size={18} /></span>
      </header>

      <main>
        {screen === 'map' ? (
          <LearningMap language={language} playerName={player?.name ?? 'Dru'} level={player?.profile?.level ?? 1} completedLessons={completedLessons} onOpenLesson={openLesson} />
        ) : (
          <Workspace
            code={code} language={language} lessonId={activeLessonId} lesson={lesson} hintLevel={hintLevel} output={outputText}
            isSuccess={output.kind === 'success'} nextLessonTitle={nextMission?.copy[language].title}
            onBack={() => setScreen('map')} onCodeChange={updateCode} onContinue={() => nextMission ? openLesson(nextMission.id) : setScreen('map')}
            onHint={() => setHintLevel((level) => Math.min(3, level + 1))} onReset={resetCode} onRun={runCode} onSave={saveDraft}
          />
        )}
      </main>
    </div>
  );
}

function LearningMap({ language, playerName, level, completedLessons, onOpenLesson }: {
  language: Language; playerName: string; level: number; completedLessons: number[]; onOpenLesson: (lessonId: number) => void;
}) {
  const t = COPY[language];
  const currentId = completedLessons.length < TOTAL_MISSIONS ? completedLessons.length + 1 : null;
  const progressPercent = Math.round((completedLessons.length / TOTAL_MISSIONS) * 100);
  return (
    <div className="map-layout">
      <aside className="profile-rail">
        <div className="robo-orbit"><img src="robo.png" alt={t.roboAlt} /></div>
        <p className="eyebrow">{t.ready}</p><h1>{t.hello(playerName)}</h1><p>{t.intro}</p>
        <div className="level-line"><span>{t.level(level)}</span><strong>{t.track}</strong></div>
        <div className="progress-track" aria-label={t.progress(completedLessons.length, TOTAL_MISSIONS)}><i style={{ width: `${progressPercent}%` }} /></div>
        <div className="profile-facts"><span><Clock3 size={17} /> {t.minutes}</span><span><ShieldCheck size={17} /> {t.safeMode}</span></div>
        <a className="parent-link" href="https://study.druygon.my.id/parent"><UserRound size={17} /> {t.parentPanel} <ChevronRight size={16} /></a>
        <div className="suite-shortcuts" aria-label={t.switchModules}><a href="https://study.druygon.my.id/">Study</a><a href="https://draco.druygon.my.id/">Draco</a></div>
      </aside>

      <section className="map-stage" aria-labelledby="map-title">
        <div className="map-heading">
          <div><p className="eyebrow">{t.trackEyebrow}</p><h2 id="map-title">{t.worldTitle}</h2><p>{t.mapSubtitle}</p></div>
          <div className="track-tabs" aria-label={t.learningTracks}><button className="active">{t.visualBlocks}</button><button disabled><LockKeyhole size={13} /> Python</button><button disabled><LockKeyhole size={13} /> Web</button></div>
        </div>

        <div className="mission-path">
          <div className="path-line" aria-hidden="true" />
          {MISSIONS.map((mission, index) => {
            const title = mission.copy[language].title;
            const state: LessonState = completedLessons.includes(mission.id) ? 'completed' : mission.id === currentId ? 'current' : 'locked';
            return (
              <button key={mission.id} type="button" className={`lesson-node ${state}`}
                style={{ left: `${9 + index * 14.5}%`, top: `${74 - index * 10.5 + (index % 2) * 8}%` }}
                disabled={state === 'locked'} onClick={state === 'locked' ? undefined : () => onOpenLesson(mission.id)}
                aria-label={`${t.mission} ${mission.id}: ${title}, ${state === 'current' ? t.available : state === 'completed' ? t.completed : t.locked}`}>
                <span className="node-circle">{state === 'completed' ? <Check /> : state === 'current' ? <Play /> : <LockKeyhole />}</span>
                <span className="node-copy"><small>{t.mission} {mission.id}</small><strong>{title}</strong></span>
              </button>
            );
          })}
          <div className={`robo-note ${currentId === null ? 'complete' : ''}`}>
            {currentId === null ? <Check size={18} aria-hidden="true" /> : <Sparkles size={18} aria-hidden="true" />}
            <span><strong>{currentId === null ? t.worldComplete : t.startHere}</strong>{currentId === null ? t.worldCompleteBody : `${MISSIONS[currentId - 1].copy[language].title}. ${t.startHereBody}`}</span>
          </div>
        </div>
      </section>
    </div>
  );
}

type WorkspaceProps = {
  code: string; language: Language; lessonId: number; lesson: LessonCopy; hintLevel: number; output: string; isSuccess: boolean;
  nextLessonTitle?: string; onBack: () => void; onCodeChange: (value: string) => void; onContinue: () => void; onHint: () => void;
  onReset: () => void; onRun: () => void; onSave: () => void;
};

function LearnFirst({ content, language }: { content: LearnFirstContent; language: Language }) {
  const t = COPY[language];
  return (
    <div className="lesson-theory">
      <div className="theory-heading"><BookOpen size={18} aria-hidden="true" /><div><small>{t.learnLabel}</small><strong>{content.title}</strong></div></div>
      <p>{content.explanation}</p>
      <div className="syntax-example" aria-label={content.syntax.code}>
        <code>{content.syntax.code}</code>
        <dl>{content.syntax.parts.map((part) => <div key={part.token}><dt>{part.token}</dt><dd>{part.meaning}</dd></div>)}</dl>
      </div>
      <p className="worked-example"><small>{t.exampleLabel}</small><code>{content.workedExample.code}</code><span>→ {content.workedExample.result}</span></p>
    </div>
  );
}

function Workspace({ code, language, lessonId, lesson, hintLevel, output, isSuccess, nextLessonTitle, onBack, onCodeChange, onContinue, onHint, onReset, onRun, onSave }: WorkspaceProps) {
  const t = COPY[language];
  return (
    <div className="workspace">
      <div className="workspace-heading">
        <button className="icon-button light" onClick={onBack} aria-label={t.backMap}><ArrowLeft size={20} /></button>
        <div><p className="eyebrow">{t.missionNumber(lessonId)}</p><h1>{lesson.title}</h1></div>
        <span className="runner-chip ready"><i /> {t.checkerReady}</span>
      </div>

      <div className="workspace-grid">
        <section className="mission-brief" aria-labelledby="brief-title">
          <ol className="lesson-steps" aria-label={t.lessonSteps.join(', ')}>{t.lessonSteps.map((step, index) => <li key={step} className={index === 0 ? 'active' : ''}>{step}</li>)}</ol>
          <p className="eyebrow">{t.storyLabel}</p><h2 id="brief-title">{lesson.storyTitle}</h2><p>{lesson.story}</p>
          <LearnFirst content={lesson.learnFirst} language={language} />
          <div className="task-box"><strong>{t.yourTask}</strong><p>{lesson.task}</p></div>
          <div className="target-output"><small>{t.target}</small><strong>{lesson.target}</strong></div>
          <div className="hint-panel"><img src="robo.png" alt="" /><div><strong>{t.roboHint} {hintLevel}/3</strong><p>{hintLevel === 0 ? t.tryFirst : lesson.hints[hintLevel - 1]}</p></div></div>
          <button className="hint-button" onClick={onHint} disabled={hintLevel >= 3}><Lightbulb size={17} /> {hintLevel >= 3 ? t.allHints : t.askHint}</button>
        </section>

        <section className="code-zone" aria-label={t.codeArea}>
          <div className="editor-toolbar"><span><i className="dot red" /><i className="dot amber" /><i className="dot green" />main.block</span><small>{t.draftSafe}</small></div>
          <label className="sr-only" htmlFor="code-editor">{t.codeLabel}</label>
          <textarea id="code-editor" value={code} placeholder={lesson.placeholder} onChange={(event) => onCodeChange(event.target.value)} spellCheck={false} />
          <div className="output-panel" aria-live="polite"><small>OUTPUT</small><pre>{output}</pre></div>
          {isSuccess && (
            <div className="mission-complete" role="status" aria-live="polite">
              <span className="complete-mark"><Check size={26} strokeWidth={3} aria-hidden="true" /></span>
              <div className="complete-copy"><small>{t.completeLabel}</small><h2>{t.completeTitle}</h2><p>{nextLessonTitle ? t.nextUnlocked(nextLessonTitle) : t.completeWorldBody}</p><span><Star size={15} fill="currentColor" aria-hidden="true" /><span>{t.skillLearned}: <strong>{lesson.skill}</strong></span></span></div>
              <Sparkles className="complete-sparkle" size={28} aria-hidden="true" />
            </div>
          )}
          <div className={`workspace-actions ${isSuccess ? 'completed' : ''}`}>
            {isSuccess ? (
              <button className="continue-button" onClick={onContinue}>{nextLessonTitle ? t.continueTo(nextLessonTitle) : t.viewJourney} <ChevronRight size={18} /></button>
            ) : (
              <><button className="run-button" onClick={onRun}><Play size={18} fill="currentColor" /> {t.run}</button><button className="secondary-button" onClick={onReset}><RotateCcw size={17} /> {t.reset}</button><button className="secondary-button" onClick={onSave}><Save size={17} /> {t.save}</button></>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) {
      const t = COPY[preferredLanguage()];
      return <div className="fatal-recovery" role="alert"><img src="robo.png" alt="Robo" /><h1>{t.errorTitle}</h1><p>{t.errorBody}</p><button onClick={() => window.location.reload()}>{t.retry}</button><a href="https://druygon.my.id/">{t.backDruygon}</a></div>;
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><AppErrorBoundary><App /></AppErrorBoundary></React.StrictMode>);
