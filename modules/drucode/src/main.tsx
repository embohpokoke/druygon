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
  Map,
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

type PlayerProfile = {
  level?: number;
  coins?: number;
  xp?: number;
};

type PlayerResponse = {
  name?: string;
  profile?: PlayerProfile;
};

type LessonState = 'completed' | 'current' | 'locked';

type OutputState =
  | { kind: 'initial' | 'saved' | 'reset' | 'empty' | 'sentence' | 'wrongSteps' | 'unknown' | 'success' }
  | { kind: 'raw'; value: string };

const lessonStates: LessonState[] = ['current', 'locked', 'locked', 'locked', 'locked', 'locked'];

const COPY = {
  en: {
    moduleSubtitle: 'Druygon module', backHub: 'Back to the Druygon hub', otherModules: 'Other Druygon modules',
    days: '0 days', activePlayer: 'Active player', loading: 'loading', language: 'Language', english: 'English', indonesian: 'Indonesian',
    roboAlt: 'Robo, the DruCode robot tutor', ready: 'READY TO LEARN', hello: (name: string) => `Hi, ${name}!`,
    intro: 'Robo has prepared your first coding mission.', level: (value: number) => `Druygon Level ${value}`, track: 'Track 1',
    progress: 'Visual Blocks Track progress, 0 percent', minutes: '0 / 45 min', safeMode: 'Safe mode', parentPanel: 'Parent panel', switchModules: 'Switch module',
    trackEyebrow: 'TRACK 1 · VISUAL BLOCKS', worldTitle: 'World 1 · Nara’s Commands', mapSubtitle: 'Help Nara explore by arranging commands in the right order.',
    learningTracks: 'Learning tracks', visualBlocks: 'Visual Blocks', mission: 'Mission', available: 'available', completed: 'completed', locked: 'locked',
    lessons: ['First Command', 'The Right Order', 'Repeat Steps', 'Helpful Loop', 'Smart Condition', 'Boss: Move Nara'],
    startHere: 'Start here!', startHereBody: 'One small mission, one new skill.',
    backMap: 'Back to the learning map', missionOne: 'MISSION 1', firstCommand: 'First Command', checkerReady: 'Mission checker ready',
    storyLabel: 'MISSION STORY', storyTitle: 'Teach Nara her first command', story: 'Nara sees a star one step ahead. Computers cannot guess what we mean, so we must give Nara one exact instruction.',
    learnLabel: 'LEARN FIRST', learnTitle: 'Commands tell a computer what to do',
    learnBody: 'Nara understands the pattern move(number). The number tells her how many steps to walk forward.',
    actionWord: 'move', actionMeaning: 'the action Nara will do', numberWord: '2', numberMeaning: 'how many steps she will take',
    exampleLabel: 'EXAMPLE', exampleCode: 'move(2)', exampleResult: 'Nara moves forward 2 steps',
    lessonSteps: ['1. Learn', '2. Type', '3. Run'],
    yourTask: 'Your task', task: 'Move Nara forward exactly one step.', target: 'TARGET', targetValue: 'Nara moves forward 1 step ✨',
    roboHint: 'Robo hint', tryFirst: 'Give it a try. Robo will help if you get stuck.', allHints: 'All hints unlocked', askHint: 'Ask for a Hint',
    hints: ['Remember the pattern: move(number). Replace number with the steps Nara needs.', 'Nara needs one step, so put 1 between the parentheses.', 'Type exactly: move(1)'],
    codeArea: 'Code area', draftSafe: 'Draft saved automatically', codeLabel: 'Mission code', run: 'Run', reset: 'Reset', save: 'Save',
    starterCode: '# Type Nara\'s command below\n', codePlaceholder: 'move(number)',
    initialOutput: 'Read Learn first, then type one command and press Run.', savedOutput: 'Draft saved on this device.', resetOutput: 'Code reset. Read the example, then write Nara\'s command.',
    emptyOutput: 'Your code area is empty. Type one command below the comment.',
    sentenceOutput: 'That is a sentence. Code uses the pattern move(number). Remove the sentence and try one command.',
    wrongStepsOutput: 'Great command shape! Check the target: Nara needs exactly 1 step.',
    unknownOutput: 'Robo does not recognize that command yet. Look at the move(number) example and try again.',
    successOutput: 'Great job! Nara moves forward 1 step ✨',
    errorTitle: 'DruCode needs a quick pause', errorBody: 'Your draft is still safe. Reload to continue your adventure.', retry: 'Try again', backDruygon: 'Back to Druygon',
  },
  id: {
    moduleSubtitle: 'modul Druygon', backHub: 'Kembali ke hub Druygon', otherModules: 'Modul Druygon lainnya',
    days: '0 hari', activePlayer: 'Pemain aktif', loading: 'memuat', language: 'Bahasa', english: 'Inggris', indonesian: 'Indonesia',
    roboAlt: 'Robo, robot tutor DruCode', ready: 'SIAP BELAJAR', hello: (name: string) => `Halo, ${name}!`,
    intro: 'Robo sudah menyiapkan misi coding pertamamu.', level: (value: number) => `Level Druygon ${value}`, track: 'Track 1',
    progress: 'Progress Track Blok Visual, 0 persen', minutes: '0 / 45 mnt', safeMode: 'Mode aman', parentPanel: 'Panel orang tua', switchModules: 'Pindah modul',
    trackEyebrow: 'TRACK 1 · BLOK VISUAL', worldTitle: 'Dunia 1 · Perintah Nara', mapSubtitle: 'Bantu Nara menjelajah dengan urutan perintah yang tepat.',
    learningTracks: 'Track belajar', visualBlocks: 'Blok Visual', mission: 'Misi', available: 'tersedia', completed: 'selesai', locked: 'terkunci',
    lessons: ['Perintah Pertama', 'Urutan yang Tepat', 'Langkah Berulang', 'Loop Penolong', 'Kondisi Cerdas', 'Boss: Nara Bergerak'],
    startHere: 'Mulai dari sini!', startHereBody: 'Satu misi kecil, satu skill baru.',
    backMap: 'Kembali ke peta', missionOne: 'MISI 1', firstCommand: 'Perintah Pertama', checkerReady: 'Pemeriksa misi siap',
    storyLabel: 'CERITA MISI', storyTitle: 'Ajari Nara perintah pertamanya', story: 'Nara melihat bintang satu langkah di depannya. Komputer tidak bisa menebak maksud kita, jadi Nara perlu satu instruksi yang tepat.',
    learnLabel: 'PELAJARI DULU', learnTitle: 'Perintah memberi tahu komputer apa yang harus dilakukan',
    learnBody: 'Nara memahami pola move(angka). Angka memberi tahu berapa langkah ia harus maju.',
    actionWord: 'move', actionMeaning: 'aksi yang akan dilakukan Nara', numberWord: '2', numberMeaning: 'berapa langkah yang akan ditempuh',
    exampleLabel: 'CONTOH', exampleCode: 'move(2)', exampleResult: 'Nara maju 2 langkah',
    lessonSteps: ['1. Belajar', '2. Ketik', '3. Jalankan'],
    yourTask: 'Tugasmu', task: 'Buat Nara bergerak maju tepat satu langkah.', target: 'TARGET', targetValue: 'Nara maju 1 langkah ✨',
    roboHint: 'Petunjuk Robo', tryFirst: 'Coba dulu. Robo akan membantu kalau kamu stuck.', allHints: 'Semua hint terbuka', askHint: 'Minta Hint',
    hints: ['Ingat polanya: move(angka). Ganti angka dengan jumlah langkah yang dibutuhkan Nara.', 'Nara perlu satu langkah, jadi tulis 1 di antara tanda kurung.', 'Ketik persis: move(1)'],
    codeArea: 'Area kode', draftSafe: 'Draft otomatis aman', codeLabel: 'Kode misi', run: 'Jalankan', reset: 'Reset', save: 'Simpan',
    starterCode: '# Ketik perintah Nara di bawah\n', codePlaceholder: 'move(angka)',
    initialOutput: 'Baca bagian Pelajari Dulu, lalu ketik satu perintah dan tekan Jalankan.', savedOutput: 'Draft tersimpan di perangkat ini.', resetOutput: 'Kode di-reset. Baca contoh, lalu tulis perintah Nara.',
    emptyOutput: 'Area kode masih kosong. Ketik satu perintah di bawah komentar.',
    sentenceOutput: 'Itu masih berupa kalimat. Kode memakai pola move(angka). Hapus kalimatnya dan coba satu perintah.',
    wrongStepsOutput: 'Bentuk perintahmu sudah benar! Periksa target: Nara harus maju tepat 1 langkah.',
    unknownOutput: 'Robo belum mengenali perintah itu. Lihat contoh move(angka), lalu coba lagi.',
    successOutput: 'Hebat! Nara maju 1 langkah ✨',
    errorTitle: 'DruCode berhenti sebentar', errorBody: 'Draft-mu tetap aman. Muat ulang untuk melanjutkan petualangan.', retry: 'Coba lagi', backDruygon: 'Kembali ke Druygon',
  },
} as const;

function preferredLanguage(): Language {
  return safeLocalGet('drucode-language') === 'id' ? 'id' : 'en';
}

function outputText(language: Language, output: OutputState) {
  if (output.kind === 'raw') return output.value;
  const t = COPY[language];
  const messages = {
    initial: t.initialOutput, saved: t.savedOutput, reset: t.resetOutput, empty: t.emptyOutput,
    sentence: t.sentenceOutput, wrongSteps: t.wrongStepsOutput, unknown: t.unknownOutput, success: t.successOutput,
  };
  return messages[output.kind];
}

function checkFirstMission(code: string): OutputState {
  const commands = code
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));

  if (commands.length === 0) return { kind: 'empty' };
  if (commands.some((line) => /\bmove\s+forward\b|\bmaju\s+(satu|1)\s+langkah\b/i.test(line))) {
    return { kind: 'sentence' };
  }
  if (commands.length !== 1) return { kind: 'unknown' };

  const match = commands[0].match(/^move\s*\(\s*(\d+)\s*\)\s*;?$/i);
  if (!match) return { kind: 'unknown' };
  return Number(match[1]) === 1 ? { kind: 'success' } : { kind: 'wrongSteps' };
}

function safeLocalGet(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private browsing and storage-disabled environments still keep the app usable.
  }
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
      .catch((error: Error) => {
        if (error.name !== 'AbortError') setPlayer({ name: 'Dru', profile: { level: 1, coins: 0 } });
      });
    return () => controller.abort();
  }, [slot]);

  return player;
}

function App() {
  const slot = React.useMemo(activeSlot, []);
  const player = usePlayer(slot);
  const [language, setLanguage] = React.useState<Language>(preferredLanguage);
  const t = COPY[language];
  const [screen, setScreen] = React.useState<Screen>('map');
  const draftKey = `drucode-draft-${slot}-lesson-1-v2`;
  const [code, setCode] = React.useState(() => safeLocalGet(draftKey) ?? t.starterCode);
  const [hintLevel, setHintLevel] = React.useState(0);
  const [output, setOutput] = React.useState<OutputState>({ kind: 'initial' });

  React.useEffect(() => {
    document.documentElement.lang = language;
    safeLocalSet('drucode-language', language);
  }, [language]);

  React.useEffect(() => {
    safeLocalSet(draftKey, code);
  }, [code, draftKey]);

  const saveDraft = React.useCallback(() => {
    safeLocalSet(draftKey, code);
    setOutput({ kind: 'saved' });
  }, [code, draftKey]);

  const runCode = React.useCallback(() => {
    const result = checkFirstMission(code);
    setOutput(result);
    safeLocalSet(draftKey, code);
  }, [code, draftKey]);

  const updateCode = React.useCallback((value: string) => {
    setCode(value);
    setOutput({ kind: 'initial' });
  }, []);

  const resetCode = React.useCallback(() => {
    setCode(t.starterCode);
    setOutput({ kind: 'reset' });
  }, [t.starterCode]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="icon-button" href="https://druygon.my.id/" aria-label={t.backHub}>
          <ArrowLeft size={20} aria-hidden="true" />
        </a>
        <div className="brand-lockup">
          <span className="brand-mark"><Code2 size={20} aria-hidden="true" /></span>
          <span><strong>DruCode</strong><small>{t.moduleSubtitle}</small></span>
        </div>
        <nav className="suite-nav" aria-label={t.otherModules}>
          <a href="https://study.druygon.my.id/">Study</a>
          <a href="https://draco.druygon.my.id/">Draco</a>
        </nav>
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
          <LearningMap language={language} playerName={player?.name ?? 'Dru'} level={player?.profile?.level ?? 1} onStart={() => setScreen('workspace')} />
        ) : (
          <Workspace
            code={code}
            language={language}
            hintLevel={hintLevel}
            output={outputText(language, output)}
            onBack={() => setScreen('map')}
            onCodeChange={updateCode}
            onHint={() => setHintLevel((level) => Math.min(3, level + 1))}
            onReset={resetCode}
            onRun={runCode}
            onSave={saveDraft}
          />
        )}
      </main>
    </div>
  );
}

function LearningMap({ language, playerName, level, onStart }: { language: Language; playerName: string; level: number; onStart: () => void }) {
  const t = COPY[language];
  return (
    <div className="map-layout">
      <aside className="profile-rail">
        <div className="robo-orbit"><img src="robo.png" alt={t.roboAlt} /></div>
        <p className="eyebrow">{t.ready}</p>
        <h1>{t.hello(playerName)}</h1>
        <p>{t.intro}</p>
        <div className="level-line"><span>{t.level(level)}</span><strong>{t.track}</strong></div>
        <div className="progress-track" aria-label={t.progress}><i style={{ width: '4%' }} /></div>
        <div className="profile-facts">
          <span><Clock3 size={17} /> {t.minutes}</span>
          <span><ShieldCheck size={17} /> {t.safeMode}</span>
        </div>
        <a className="parent-link" href="https://study.druygon.my.id/parent"><UserRound size={17} /> {t.parentPanel} <ChevronRight size={16} /></a>
        <div className="suite-shortcuts" aria-label={t.switchModules}>
          <a href="https://study.druygon.my.id/">Study</a>
          <a href="https://draco.druygon.my.id/">Draco</a>
        </div>
      </aside>

      <section className="map-stage" aria-labelledby="map-title">
        <div className="map-heading">
          <div>
            <p className="eyebrow">{t.trackEyebrow}</p>
            <h2 id="map-title">{t.worldTitle}</h2>
            <p>{t.mapSubtitle}</p>
          </div>
          <div className="track-tabs" aria-label={t.learningTracks}>
            <button className="active">{t.visualBlocks}</button>
            <button disabled><LockKeyhole size={13} /> Python</button>
            <button disabled><LockKeyhole size={13} /> Web</button>
          </div>
        </div>

        <div className="mission-path">
          <div className="path-line" aria-hidden="true" />
          {t.lessons.map((title, index) => {
            const state = lessonStates[index];
            const id = index + 1;
            return (
            <button
              key={id}
              type="button"
              className={`lesson-node ${state}`}
              style={{ left: `${9 + index * 14.5}%`, top: `${74 - index * 10.5 + (index % 2) * 8}%` }}
              disabled={state === 'locked'}
              onClick={state === 'current' ? onStart : undefined}
              aria-label={`${t.mission} ${id}: ${title}, ${state === 'current' ? t.available : state === 'completed' ? t.completed : t.locked}`}
            >
              <span className="node-circle">
                {state === 'completed' ? <Check /> : state === 'current' ? <Play /> : <LockKeyhole />}
              </span>
              <span className="node-copy"><small>{t.mission} {id}</small><strong>{title}</strong></span>
            </button>
            );
          })}
          <div className="robo-note">
            <Sparkles size={18} aria-hidden="true" />
            <span><strong>{t.startHere}</strong> {t.startHereBody}</span>
          </div>
        </div>
      </section>
    </div>
  );
}

type WorkspaceProps = {
  code: string;
  language: Language;
  hintLevel: number;
  output: string;
  onBack: () => void;
  onCodeChange: (value: string) => void;
  onHint: () => void;
  onReset: () => void;
  onRun: () => void;
  onSave: () => void;
};

function Workspace({ code, language, hintLevel, output, onBack, onCodeChange, onHint, onReset, onRun, onSave }: WorkspaceProps) {
  const t = COPY[language];
  return (
    <div className="workspace">
      <div className="workspace-heading">
        <button className="icon-button light" onClick={onBack} aria-label={t.backMap}><ArrowLeft size={20} /></button>
        <div><p className="eyebrow">{t.missionOne}</p><h1>{t.firstCommand}</h1></div>
        <span className="runner-chip ready">
          <i /> {t.checkerReady}
        </span>
      </div>

      <div className="workspace-grid">
        <section className="mission-brief" aria-labelledby="brief-title">
          <ol className="lesson-steps" aria-label={t.lessonSteps.join(', ')}>
            {t.lessonSteps.map((step, index) => <li key={step} className={index === 0 ? 'active' : ''}>{step}</li>)}
          </ol>
          <p className="eyebrow">{t.storyLabel}</p>
          <h2 id="brief-title">{t.storyTitle}</h2>
          <p>{t.story}</p>
          <div className="lesson-theory">
            <div className="theory-heading">
              <BookOpen size={18} aria-hidden="true" />
              <div><small>{t.learnLabel}</small><strong>{t.learnTitle}</strong></div>
            </div>
            <p>{t.learnBody}</p>
            <div className="syntax-example" aria-label={`${t.exampleCode}: ${t.exampleResult}`}>
              <code><b>{t.actionWord}</b>(<b>{t.numberWord}</b>)</code>
              <dl>
                <div><dt>{t.actionWord}</dt><dd>{t.actionMeaning}</dd></div>
                <div><dt>{t.numberWord}</dt><dd>{t.numberMeaning}</dd></div>
              </dl>
            </div>
            <p className="worked-example"><small>{t.exampleLabel}</small><code>{t.exampleCode}</code><span>→ {t.exampleResult}</span></p>
          </div>
          <div className="task-box"><strong>{t.yourTask}</strong><p>{t.task}</p></div>
          <div className="target-output"><small>{t.target}</small><strong>{t.targetValue}</strong></div>
          <div className="hint-panel">
            <img src="robo.png" alt="" />
            <div><strong>{t.roboHint} {hintLevel}/3</strong><p>{hintLevel === 0 ? t.tryFirst : t.hints[hintLevel - 1]}</p></div>
          </div>
          <button className="hint-button" onClick={onHint} disabled={hintLevel >= 3}><Lightbulb size={17} /> {hintLevel >= 3 ? t.allHints : t.askHint}</button>
        </section>

        <section className="code-zone" aria-label={t.codeArea}>
          <div className="editor-toolbar"><span><i className="dot red" /><i className="dot amber" /><i className="dot green" />main.block</span><small>{t.draftSafe}</small></div>
          <label className="sr-only" htmlFor="code-editor">{t.codeLabel}</label>
          <textarea id="code-editor" value={code} placeholder={t.codePlaceholder} onChange={(event) => onCodeChange(event.target.value)} spellCheck={false} />
          <div className="output-panel" aria-live="polite"><small>OUTPUT</small><pre>{output}</pre></div>
          <div className="workspace-actions">
            <button className="run-button" onClick={onRun}><Play size={18} fill="currentColor" /> {t.run}</button>
            <button className="secondary-button" onClick={onReset}><RotateCcw size={17} /> {t.reset}</button>
            <button className="secondary-button" onClick={onSave}><Save size={17} /> {t.save}</button>
          </div>
        </section>
      </div>
    </div>
  );
}

class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      const t = COPY[preferredLanguage()];
      return (
        <div className="fatal-recovery" role="alert">
          <img src="robo.png" alt="Robo" />
          <h1>{t.errorTitle}</h1>
          <p>{t.errorBody}</p>
          <button onClick={() => window.location.reload()}>{t.retry}</button>
          <a href="https://druygon.my.id/">{t.backDruygon}</a>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary><App /></AppErrorBoundary>
  </React.StrictMode>,
);
