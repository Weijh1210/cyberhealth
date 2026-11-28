import { useLanguage } from "../i18n/language";
import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";

type SpeechResult = ArrayLike<{ transcript: string }> & { isFinal: boolean };
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult:
    | ((e: { results: ArrayLike<SpeechResult>; resultIndex: number }) => void)
    | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};

export function VoiceInput({
  onText,
  disabled,
}: {
  onText: (update: (text: string) => string) => void;
  disabled: boolean;
}) {
  const { locale, t } = useLanguage();
  const speech = useRef<Recognition | null>(null);
  const restart = useRef<number | undefined>(undefined);
  const active = useRef(false);
  const [listening, setListening] = useState(false);
  const [languageChoice, setLanguage] = useState<string>();
  const language = languageChoice ?? (locale === "en" ? "en-US" : "zh-CN");
  const [status, setStatus] = useState<
    | ""
    | "listening"
    | "permission"
    | "disconnected"
    | "silence"
    | "reconnecting"
    | "startFailed"
    | "stopped"
  >("");
  const statusText = {
    listening: t(
      "正在听。可以停顿，讲完再点「结束语音」。",
      "Listening. Pause as needed and select Stop dictation when you’re done.",
    ),
    permission: t(
      "浏览器没有允许麦克风。可以修改权限或继续打字。",
      "Microphone access is blocked. Check browser permissions or continue typing.",
    ),
    disconnected: t(
      "语音服务已断开。已识别的文字还在，可以重新开启语音。",
      "Dictation ended. Your text is saved in the field. You can start again.",
    ),
    silence: t(
      "一段时间没有听到声音，已暂停。点「语音转文字」可以接着说。",
      "Dictation paused after a period of silence. Select Dictate to continue.",
    ),
    reconnecting: t(
      "正在接续语音，已识别的文字会保留。",
      "Reconnecting dictation. Your text stays in the field.",
    ),
    startFailed: t(
      "无法启动语音。已识别的文字还在，可以继续打字。",
      "Could not start dictation. Your text is still in the field.",
    ),
    stopped: t(
      "已结束语音。检查文字后再发送。",
      "Dictation stopped. Review the text before sending.",
    ),
  };
  const Constructor =
    (window as SpeechWindow).SpeechRecognition ??
    (window as SpeechWindow).webkitSpeechRecognition;

  const abort = useCallback(() => {
    active.current = false;
    window.clearTimeout(restart.current);
    const recognition = speech.current;
    speech.current = null;
    recognition?.abort();
  }, []);
  useEffect(() => abort, [abort]);
  useEffect(() => {
    if (disabled && (active.current || speech.current)) {
      abort();
      setListening(false);
      setStatus("");
    }
  }, [abort, disabled]);

  function start() {
    if (!Constructor || active.current) return;
    const Speech = Constructor;
    active.current = true;
    setListening(true);
    let emptyEnds = 0;
    function connect() {
      if (!active.current) return;
      const recognition = new Speech();
      speech.current = recognition;
      recognition.lang = language;
      recognition.interimResults = false;
      recognition.continuous = true;
      let delivered = 0;
      recognition.onresult = (event) => {
        if (speech.current !== recognition) return;
        const segments: string[] = [];
        for (
          let i = Math.max(delivered, event.resultIndex);
          i < event.results.length;
          i++
        ) {
          const result = event.results[i];
          if (!result.isFinal) break;
          delivered = i + 1;
          const words = result[0]?.transcript.trim();
          if (words) segments.push(words);
        }
        if (!segments.length) return;
        emptyEnds = 0;
        onText((text) =>
          `${text}${text && !/\s$/.test(text) ? "\n" : ""}${segments.join("\n")}`.slice(
            0,
            4000,
          ),
        );
        if (active.current) setStatus("listening");
      };
      recognition.onerror = ({ error }) => {
        if (speech.current !== recognition || error === "no-speech") return;
        active.current = false;
        speech.current = null;
        setListening(false);
        setStatus(
          error === "not-allowed" || error === "service-not-allowed"
            ? "permission"
            : "disconnected",
        );
      };
      recognition.onend = () => {
        if (speech.current !== recognition) return;
        speech.current = null;
        if (!active.current) return;
        if (++emptyEnds > 3) {
          active.current = false;
          setListening(false);
          setStatus("silence");
          return;
        }
        setStatus("reconnecting");
        restart.current = window.setTimeout(connect, 350);
      };
      try {
        recognition.start();
      } catch {
        active.current = false;
        speech.current = null;
        setListening(false);
        setStatus("startFailed");
      }
    }
    setStatus("listening");
    connect();
  }

  function stop() {
    active.current = false;
    window.clearTimeout(restart.current);
    speech.current?.stop();
    setListening(false);
    setStatus("stopped");
  }

  return (
    <div className="voice-input">
      <div className="action-row">
        <select
          aria-label={t("语音识别语言", "Dictation language")}
          value={language}
          disabled={listening}
          onChange={(e) => setLanguage(e.target.value)}
        >
          <option value="zh-CN">{t("普通话", "Mandarin")}</option>
          <option value="en-US">{t("英语", "English")}</option>
        </select>
        <button
          className="button"
          disabled={disabled || !Constructor}
          onClick={listening ? stop : start}
        >
          {listening ? <Square size={16} /> : <Mic size={16} />}{" "}
          {listening
            ? t("结束语音", "Stop dictation")
            : t("语音转文字", "Dictate")}
        </button>
      </div>
      <p className="fineprint">
        {Constructor
          ? t(
              "浏览器负责转写，应用不保存录音。",
              "Your browser transcribes. MoveQuest does not store audio.",
            )
          : t(
              "当前浏览器不支持语音识别，请直接输入文字。",
              "This browser does not support dictation. You can still type.",
            )}
      </p>
      {status && <p role="status">{statusText[status]}</p>}
    </div>
  );
}
