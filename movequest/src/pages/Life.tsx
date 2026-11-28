import {
  englishCategories,
  placeName,
  englishTravel,
  englishFacts,
  englishCues,
} from "../i18n/lifeLabels";
import { englishPlan } from "../life/planEnglish";
import { productText, questTitle } from "../i18n/productContent";
import { LanguageSwitch, useLanguage } from "../i18n/language";
import { demoEnabled } from "../app/release";
import { interpretRoutine } from "../life/localRoutine";
import { QuickOpportunities } from "../components/QuickOpportunities";
import { v7Description } from "../life/v7Demo";
import { cueLabels, factLabels } from "../life/context";
import { discoveryFor, hasPlanContext } from "../life/discoveries";
import { VoiceInput } from "../components/VoiceInput";
import { demoDescription } from "../life/demo";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Plus,
  Trash2,
  Send,
  PencilLine,
  Check,
} from "lucide-react";
import { Brand, PageTitle } from "../components/UI";
import { useStore } from "../state/Store";
import { reduce, type Command } from "../domain/engine";
import { describeRoutineChanges } from "../life/routineChanges";
import {
  categories,
  categoryNames,
  activeLife,
  validateDelta,
  type Category,
  type LifeDelta,
  type LifeEvent,
} from "../life/model";
function overlayById<T extends { id: string }>(base: T[], changes: T[]): T[] {
  return [
    ...new Map([...base, ...changes].map((item) => [item.id, item])).values(),
  ];
}

export function LifeDiscovery({
  onboarding = false,
}: {
  onboarding?: boolean;
}) {
  const { locale, t } = useLanguage();
  const { state, send, busy, error: storageError } = useStore();
  const navigate = useNavigate();
  const { hash } = useLocation();
  const life = activeLife(state);
  const [turns, setTurns] = useState<
    { user: string; reply: [string, string]; question?: string }[]
  >([]);
  const [manual, setManual] = useState(false);
  const [failure, setFailure] = useState(false);
  const [draftOrigin, setDraftOrigin] = useState<"local" | "ai">();
  const log = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (hash === "#life-description") {
      composer.current?.focus();
      composer.current?.scrollIntoView({ block: "center" });
    }
  }, [hash]);
  const [replace, setReplace] = useState(false);
  const [name, setName] = useState(state.profile?.name ?? "");
  const [text, setText] = useState(
    demoEnabled && new URLSearchParams(window.location.search).has("v7")
      ? v7Description
      : demoEnabled &&
          new URLSearchParams(window.location.search).has("example")
        ? demoDescription
        : "",
  );
  const [draft, setDraft] = useState<LifeDelta>({
    locations: [],
    events: [],
    questions: [],
  });
  const [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const hasDraft = !!(
    draft.locations.length ||
    draft.events.length ||
    draft.preferences?.length ||
    draft.constraints ||
    draft.cues?.length ||
    draft.facts?.length
  );
  const question = turns.at(-1)?.question;
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [turns, pending]);
  useEffect(() => {
    if (onboarding && !storageError)
      void send({
        type: "local-events",
        events: [{ name: "onboarding_started", key: "first", at: Date.now() }],
      });
  }, [onboarding, send, storageError]);
  const [available, setAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    fetch("/api/status", { signal: AbortSignal.timeout(5000) })
      .then(async (r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((v) => setAvailable(v.ai === true))
      .catch(() => setAvailable(false));
  }, []);
  const [manualCue, setManualCue] =
    useState<keyof typeof cueLabels>("task_end");
  const [manualPlace, setManualPlace] = useState("");
  const [manualEvidence, setManualEvidence] = useState("");
  const add = () => {
    setManual(true);
    const id = `place_${crypto.randomUUID()}`;
    setDraft((d) => ({
      ...d,
      locations: [
        ...d.locations,
        { id, name: "", category: "home", source: "manual", confirmed: false },
      ],
      events: [
        ...d.events,
        {
          id: `event_${crypto.randomUUID()}`,
          locationId: id,
          title: "",
          start: null,
          end: null,
          recurrence: "weekday",
          transport: "unknown",
          busy: false,
          evidence: "用户手动录入",
        },
      ],
    }));
  };
  function useLocalRoutine(input: string) {
    const next = interpretRoutine(input, {
      locations: overlayById(life.locations, draft.locations),
    });
    if (!(next.locations.length || next.events.length || next.constraints)) {
      setError(
        t(
          "本机暂时读不出具体场景。可以写明在哪儿、做完哪件事时会停一下，或手动添加地点。",
          "Local recognition needs a place and a routine. Add those details or enter them by hand.",
        ),
      );
      return;
    }
    setDraft((previous) => ({
      ...previous,
      locations: overlayById(previous.locations, next.locations),
      events: overlayById(previous.events, next.events),
      cues: overlayById(previous.cues ?? [], next.cues ?? []),
      facts: overlayById(previous.facts ?? [], next.facts ?? []),
      constraints: next.constraints ?? previous.constraints,
    }));
    setReplace(false);
    setManual(false);
    setDraftOrigin("local");
    setMessage(
      t(
        "已在本机整理出待确认的日常和可试的活动。",
        "Your device found routines and movements for you to review.",
      ),
    );
    setError("");
    setText("");
  }

  const extract = async (local = false) => {
    const user = text.trim();
    if (!user || pending) return;
    if (local || available === false) {
      useLocalRoutine(user);
      return;
    }
    if (available !== true) return;
    const history = [...turns.map((turn) => turn.user), user].join("\n");
    if (history.length > 4000) {
      setError(
        t(
          "这轮对话已满。可以确认当前草稿，之后再补充。",
          "This conversation is full. Confirm the draft before adding more.",
        ),
      );
      return;
    }
    const previous = manual ? undefined : draft;
    setPending(true);
    setFailure(false);
    void send({
      type: "local-events",
      events: [
        {
          name: "life_description_submitted",
          key: crypto.randomUUID(),
          at: Date.now(),
        },
      ],
    });
    setError("");
    try {
      const response = await fetch("/api/life/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: history,
          replyLanguage: locale === "en" ? "en" : "zh-CN",
          latestMessage: user,
          clarifications: [
            ...turns.slice(1).map((turn, index) => ({
              question: turns[index].question,
              answer: turn.user,
            })),
            { question, answer: user },
          ]
            .filter((turn) => turn.question)
            .slice(-8),
          existing: {
            locations: overlayById(
              life.locations,
              previous?.locations ?? [],
            ).map(({ id, name, category }) => ({
              id,
              name,
              category,
            })),
            cues: overlayById(life.cues ?? [], previous?.cues ?? []).map(
              ({ id, kind, locationId, evidence }) => ({
                id,
                kind,
                locationId,
                evidence,
              }),
            ),
            events: overlayById(life.events, previous?.events ?? []).map(
              ({ id, locationId, title, start, end, recurrence }) => ({
                id,
                locationId,
                title,
                start,
                end,
                recurrence,
              }),
            ),
          },
        }),
        signal: AbortSignal.timeout(50000),
      });
      const result = await response.json();
      if (!response.ok) {
        const englishError =
          result.code === "account_limit"
            ? "The shared free limit has been reached. The daily quota resets at 00:00 UTC."
            : result.code === "account_minute_limit"
              ? "The account has reached its per-minute limit. Try again in about a minute."
              : "AI is temporarily unavailable. Try again later or add your routine by hand.";
        throw Error(
          t(result.error || "暂时无法理解描述，请手动填写。", englishError),
        );
      }
      const delta = validateDelta(result.delta);
      const next = {
        ...delta,
        locations: overlayById(previous?.locations ?? [], delta.locations),
        events: overlayById(previous?.events ?? [], delta.events),
        cues: overlayById(previous?.cues ?? [], delta.cues ?? []),
        facts: overlayById(previous?.facts ?? [], delta.facts ?? []),
        preferences: delta.preferences ?? previous?.preferences,
        constraints: delta.constraints
          ? { ...previous?.constraints, ...delta.constraints }
          : previous?.constraints,
      };
      setReplace(false);
      setManual(false);
      setDraft(next);
      setDraftOrigin("ai");
      const modelQuestion = next.questions[0];
      const asksForClock =
        !!modelQuestion &&
        /几点|时间段|几点钟|待多久|exact time|what time/i.test(modelQuestion);
      const needsFit = !next.cues.some(hasPlanContext);
      const followUp =
        state.demo || (modelQuestion && !asksForClock)
          ? modelQuestion
          : needsFit && !next.cues.length
            ? t(
                "你最想把活动放进哪件原本就会做的事里？",
                "Which activity you already do would you like to pair with movement?",
              )
            : undefined;
      const places = next.locations.slice(0, 4);
      const reply: [string, string] = places.length
        ? [
            `我记下了${places.map((place) => placeName(place, "zh-CN")).join("、")}${next.locations.length > places.length ? "等地点" : ""}。`,
            `I noted ${places.map((place) => placeName(place, "en")).join(", ")}${next.locations.length > places.length ? " and more" : ""}.`,
          ]
        : next.events.length || next.preferences?.length || next.constraints
          ? [
              "我整理了你补充的日常。",
              "I’ve put the details you shared into the draft.",
            ]
          : [
              "这次还没有可更新到城镇的资料。",
              "This reply did not find anything to add to your town.",
            ];
      setTurns((previous) => [
        ...previous,
        {
          user,
          reply,
          question: followUp?.slice(0, 300),
        },
      ]);
      setText("");
    } catch (e) {
      setFailure(true);
      setError(
        e instanceof Error
          ? e.message
          : t(
              "请求失败，请重试或手动填写。",
              "The request failed. Try again or enter your routine manually.",
            ),
      );
    } finally {
      setPending(false);
      requestAnimationFrame(() => composer.current?.focus());
    }
  };
  const updateEvent = (id: string, patch: Partial<LifeEvent>) =>
    setDraft((d) => ({
      ...d,
      events: d.events.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
  const confirm = async () => {
    setError("");
    try {
      if (draft.events.some((e) => !e.title.trim()))
        throw Error(t("请补充事件名称。", "Enter a name for each event."));
      const at = Date.now();
      const command = {
        type: "life-confirm",
        delta: draft,
        replace,
        at,
      } satisfies Command;
      const confirmed = activeLife(reduce(state, command));
      const firstTown = !life.nodes.length && confirmed.nodes.length > 0;
      const { expanded, scene, changes } = describeRoutineChanges(
        life,
        confirmed,
        at,
      );
      if (!state.profile) {
        const ok = await send({
          type: "profile",
          profile: {
            name: name.trim() || t("新朋友", "New explorer"),
            role: "worker",
            scenes: ["office", "home"],
            minutes: 2,
            reminder: 0,
            locale,
          },
        });
        if (!ok) return;
      }
      if (!(await send(command))) return;
      if (state.demo) {
        navigate(draft.cues?.some((cue) => !cue.uncertain) ? "/explore" : "/");
      } else if (firstTown || expanded || scene) {
        const query = new URLSearchParams();
        if (!firstTown && expanded) query.set("expanded", expanded);
        else if (!firstTown && scene) query.set("scene", scene);
        navigate(
          { pathname: "/world", search: query.toString() },
          {
            state: { routineChanges: changes },
          },
        );
      } else {
        setDraft({ locations: [], events: [], questions: [] });
        setDraftOrigin(undefined);
        setTurns([]);
        setManual(false);
        setReplace(false);
        setMessage(t("资料已保存。", "Your changes were saved."));
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : t("资料无法保存。", "Your routine could not be saved."),
      );
    }
  };
  const edit = () => {
    setManual(true);
    setReplace(true);
    setDraft({
      locations: life.locations.map((l) => ({ ...l })),
      events: life.events.map((e) => ({ ...e })),
      cues: life.cues,
      facts: life.facts,
      preferences: life.preferences,
      constraints: life.constraints,
      questions: [],
    });
    setMessage(
      t(
        "正在编辑已保存日常。修改后需要再次确认。",
        "Editing saved routines. Confirm when you are done.",
      ),
    );
  };
  return (
    <div className={onboarding ? "life-onboarding" : ""}>
      {onboarding && (
        <>
          <div className="onboarding-brand">
            <Brand />
            <LanguageSwitch />
          </div>
        </>
      )}
      <PageTitle
        title={
          onboarding
            ? t("从日常找运动机会", "Find movement in your day")
            : t("生活发现", "My life")
        }
        description={
          onboarding
            ? t(
                "说说你在哪里、通常在做什么。确认后就能开始适合自己的活动。",
                "Tell us where you spend time and what you usually do. Review the routine and start a movement that fits.",
              )
            : t(
                "说一句你的日常，我会从里面找一个合适的运动机会。",
                "Tell us one thing about your day to find a movement opportunity that fits.",
              )
        }
        action={
          !onboarding ? (
            <Link className="button" to={state.demo ? "/" : "/world"}>
              {t("返回城镇", "Back to my town")}
            </Link>
          ) : undefined
        }
      />
      {!onboarding && (
        <div className="life-settings-links">
          <Link to="/profile">
            {t("偏好、提醒与数据", "Preferences, reminders and data")}
          </Link>
          <Link to="/rhythm">
            {t("活动限制与反馈", "Activity limits and feedback")}
          </Link>
        </div>
      )}
      <div className="life-chat">
        {onboarding && demoEnabled && <QuickOpportunities inlineChat />}
        <section className="panel form-stack">
          {onboarding && (
            <label>
              {t("怎么称呼你", "What should we call you?")}
              <input
                value={name}
                maxLength={24}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
          )}
          <div
            className="life-chat-log"
            ref={log}
            role="log"
            aria-label={t("生活对话", "Life conversation")}
            tabIndex={0}
          >
            <p className="chat-reply">
              {t(
                "你平时哪一段特别难腾出时间活动？说说那之前和之后通常在做什么。",
                "When is it hardest to make time to move? Tell me what you usually do before and after.",
              )}
            </p>
            {turns.map((turn, index) => (
              <div className="chat-turn" key={index}>
                <p className="chat-user">{turn.user}</p>
                <p className="chat-reply">
                  {t(...turn.reply)}
                  {!turn.question && (
                    <span>
                      {t(
                        " 你可以继续补充或确认草稿。",
                        " You can add details or confirm the draft.",
                      )}
                    </span>
                  )}
                  {turn.question && (
                    <>
                      {" "}
                      {turn.question}{" "}
                      <span>{t("这条可以跳过。", "You can skip this.")}</span>
                    </>
                  )}
                </p>
              </div>
            ))}
            {pending && (
              <div className="chat-turn">
                <p className="chat-user">{text.trim()}</p>
                <p className="chat-reply">
                  {t("正在整理你的日常…", "Putting your day together…")}
                </p>
              </div>
            )}
          </div>
          <div className="chat-composer">
            <textarea
              ref={composer}
              id="life-description"
              aria-label={t("输入生活消息", "Describe your day")}
              rows={2}
              maxLength={4000}
              value={text}
              disabled={pending}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault();
                  void extract();
                }
              }}
              placeholder={
                question
                  ? t(
                      "回答这个问题，或继续补充…",
                      "Answer or add another detail…",
                    )
                  : t(
                      "例如：我平时坐地铁去学校",
                      "For example: I take the metro to school",
                    )
              }
            />
            <button
              type="button"
              className="button primary"
              disabled={available === null || pending || !text.trim()}
              onClick={() => void extract()}
            >
              <Send size={16} />{" "}
              {available === false
                ? t("在本机整理", "Find routines on this device")
                : failure
                  ? t("重试", "Retry")
                  : t("发送", "Send")}
            </button>
          </div>
          <VoiceInput onText={setText} disabled={pending} />
          <p className="fineprint">
            {available === false
              ? t(
                  "当前使用本机识别，文字留在这个设备。",
                  "Local recognition keeps the text on this device.",
                )
              : t(
                  "发送后，文字和必要的日常资料才会交给 AI。",
                  "Only when you send do we share your text and relevant routine details with the AI.",
                )}
          </p>
          <div className="action-row">
            {available !== false && text.trim() && (
              <button
                className="button"
                disabled={pending}
                onClick={() => void extract(true)}
              >
                {t("在本机整理", "Find routines on this device")}
              </button>
            )}
            <button className="button" disabled={pending} onClick={add}>
              <PencilLine size={16} />
              {t("手动添加地点与事件", "Add a place or event manually")}
            </button>
            {life.locations.length > 0 && (
              <button className="button" disabled={pending} onClick={edit}>
                {t("编辑已保存日常", "Edit saved routines")}
              </button>
            )}
          </div>
          {!onboarding && life.locations.length > 0 && (
            <button
              className="text-button"
              disabled={pending}
              onClick={() => {
                if (!hasDraft) edit();
                setManual(true);
              }}
            >
              {t("手动补充行为线索", "Add a movement cue manually")}
            </button>
          )}
          {message && <p role="status">{message}</p>}
          {error && (
            <p role="alert" className="field-error">
              {error}
            </p>
          )}
        </section>
        {hasDraft && (
          <section className="life-confirm panel form-stack">
            {draftOrigin && (
              <p className="fineprint">
                {draftOrigin === "local"
                  ? t("本机识别结果", "Found on this device")
                  : t("AI 提取结果", "Extracted with AI")}
              </p>
            )}
            <h2>
              {manual
                ? t("确认生活资料", "Review your routine")
                : t("城镇草稿", "Town preview")}
            </h2>
            {!manual && (
              <>
                <p>
                  {t(
                    "核对下面的内容。你可以直接生成，也可以继续用对话修改。",
                    "Review the draft. You can confirm it now or keep editing through the conversation.",
                  )}
                </p>
                {draft.locations.length > 0 && (
                  <p>
                    <strong>{t("地点", "Places")}</strong> ·{" "}
                    {draft.locations
                      .map((place) => placeName(place, locale))
                      .join(t("、", ", "))}
                  </p>
                )}
                {draft.events.length > 0 && (
                  <ul className="chat-summary">
                    {draft.events.map((event) => (
                      <li key={event.id}>
                        <span>{event.title}</span>
                        <small>
                          {event.recurrence === "daily"
                            ? t("每天", "Daily")
                            : event.recurrence === "weekday"
                              ? t("工作日", "Weekdays")
                              : event.recurrence === "weekend"
                                ? t("周末", "Weekends")
                                : t("随事件", "Event-triggered")}{" "}
                          · {event.approximate ? t("约 ", "Approx. ") : ""}
                          {event.start && event.end
                            ? `${event.start}–${event.end}`
                            : (event.start ??
                              (event.end
                                ? t(`${event.end} 结束`, `Ends ${event.end}`)
                                : t("时间待补充", "Time not specified")))}
                        </small>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
            {Boolean(draft.cues?.length || draft.facts?.length) && (
              <div className="context-preview">
                <h3>{t("我听见的生活线索", "Clues from your routine")}</h3>
                {draft.cues?.map((cue) => {
                  const places = overlayById(life.locations, draft.locations);
                  const candidate = discoveryFor(
                    {
                      ...life,
                      locations: places.map((l) => ({ ...l, confirmed: true })),
                      constraints: draft.constraints ?? life.constraints,
                    },
                    { ...cue, confirmed: true },
                  );
                  return (
                    <div className="context-row" key={cue.id}>
                      <div>
                        <strong>
                          {t(cueLabels[cue.kind], englishCues[cue.kind])}
                        </strong>{" "}
                        ·{" "}
                        {placeName(
                          places.find((l) => l.id === cue.locationId),
                          locale,
                        )}
                        <p>
                          {t(
                            `「${cue.evidence}」`,
                            `“${productText(cue.evidence, locale)}”`,
                          )}{" "}
                          {cue.uncertain ? t("· 待核实", "· Unconfirmed") : ""}
                        </p>
                        {candidate &&
                          !manual &&
                          (state.demo ||
                            (candidate.tailored && hasPlanContext(cue))) && (
                            <small>
                              {t("可探索", "Try")} ·{" "}
                              {(locale === "en"
                                ? englishPlan(candidate)?.title
                                : undefined) ??
                                questTitle(candidate.quest, locale)}
                            </small>
                          )}
                      </div>
                      <button
                        className="text-button"
                        aria-label={t(
                          `移除线索 ${cueLabels[cue.kind]}`,
                          `Remove cue: ${englishCues[cue.kind]}`,
                        )}
                        onClick={() =>
                          setDraft((d) => ({
                            ...d,
                            cues: d.cues?.filter((x) => x.id !== cue.id),
                          }))
                        }
                      >
                        {t("移除", "Remove")}
                      </button>
                    </div>
                  );
                })}
                {draft.facts?.map((fact) => (
                  <div className="context-row" key={fact.id}>
                    <div>
                      <strong>
                        {t(factLabels[fact.kind], englishFacts[fact.kind])}
                      </strong>
                      <p>
                        {t(
                          `「${fact.evidence}」`,
                          `“${productText(fact.evidence, locale)}”`,
                        )}{" "}
                        {fact.uncertain ? t("· 待核实", "· Unconfirmed") : ""}
                      </p>
                    </div>
                    <button
                      className="text-button"
                      aria-label={t(
                        `移除生活事实 ${factLabels[fact.kind]}`,
                        `Remove fact: ${englishFacts[fact.kind]}`,
                      )}
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          facts: d.facts?.filter((x) => x.id !== fact.id),
                        }))
                      }
                    >
                      {t("移除", "Remove")}
                    </button>
                  </div>
                ))}
              </div>
            )}
            {manual &&
              overlayById(life.locations, draft.locations).some((l) =>
                l.name.trim(),
              ) && (
                <details className="chat-details">
                  <summary>
                    {t("手动添加行为线索", "Add a routine cue")}
                  </summary>
                  <div className="form-stack">
                    <label>
                      {t("发生地点", "Where it happens")}
                      <select
                        value={manualPlace}
                        onChange={(e) => setManualPlace(e.target.value)}
                      >
                        <option value="">
                          {t("选一个地点", "Select a place")}
                        </option>
                        {overlayById(life.locations, draft.locations)
                          .filter((l) => l.name.trim())
                          .map((l) => (
                            <option key={l.id} value={l.id}>
                              {placeName(l, locale)}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label>
                      {t("发生什么事", "What happens?")}
                      <select
                        value={manualCue}
                        onChange={(e) =>
                          setManualCue(e.target.value as typeof manualCue)
                        }
                      >
                        {Object.entries(cueLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      {t("用自己的话记一句", "Describe it in your own words")}
                      <input
                        value={manualEvidence}
                        maxLength={300}
                        onChange={(e) => setManualEvidence(e.target.value)}
                      />
                    </label>
                    <button
                      className="button"
                      disabled={
                        !manualPlace ||
                        !manualEvidence.trim() ||
                        (draft.cues?.length ?? 0) >= 40
                      }
                      onClick={() => {
                        const cue = {
                          id: crypto.randomUUID(),
                          kind: manualCue,
                          locationId: manualPlace,
                          evidence: manualEvidence.trim(),
                          source: "manual" as const,
                          uncertain: false,
                        };
                        setDraft((d) => ({
                          ...d,
                          cues: [...(d.cues ?? []), cue],
                        }));
                        setManualEvidence("");
                      }}
                    >
                      {t("加入生活线索", "Add cue")}
                    </button>
                  </div>
                </details>
              )}
            <details
              open={manual}
              key={String(manual)}
              className="chat-details"
            >
              <summary>
                {t("查看或编辑详细资料", "View or edit details")}
              </summary>
              <div className="form-stack">
                {draft.preferences?.length ||
                draft.constraints?.notes.length ? (
                  <div className="notice">
                    <strong>
                      {t(
                        "待确认的偏好与限制",
                        "Preferences and limits to confirm",
                      )}
                    </strong>
                    <ul>
                      {[
                        ...(draft.preferences ?? []),
                        ...(draft.constraints?.notes ?? []),
                      ].map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                    {(
                      [
                        [
                          "walkingAllowed",
                          t("允许走动活动", "Allow walking"),
                          "Allow walking activities",
                        ],
                        [
                          "standingAllowed",
                          t("允许站立活动", "Allow standing"),
                          "Allow standing activities",
                        ],
                        [
                          "armsAllowed",
                          t("允许上肢活动", "Allow upper-body movement"),
                          "Allow arm movement",
                        ],
                        [
                          "legsAllowed",
                          t("允许腿脚活动", "Allow leg and foot movement"),
                          "Allow leg movement",
                        ],
                      ] as const
                    ).map(
                      ([key, zh, en]) =>
                        draft.constraints?.[key] !== undefined && (
                          <label key={key} className="inline-check">
                            <input
                              type="checkbox"
                              checked={draft.constraints[key]}
                              onChange={(e) =>
                                setDraft((d) => ({
                                  ...d,
                                  constraints: {
                                    ...d.constraints!,
                                    [key]: e.target.checked,
                                  },
                                }))
                              }
                            />
                            {t(zh, en)}
                          </label>
                        ),
                    )}
                  </div>
                ) : null}
                {draft.locations.map((location) => (
                  <fieldset key={location.id} className="life-location-editor">
                    <legend>{location.name || t("新地点", "New place")}</legend>
                    <div className="form-pair">
                      <label>
                        {t("地点名称", "Place name")}
                        <input
                          maxLength={60}
                          value={placeName(location, locale)}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              locations: d.locations.map((l) =>
                                l.id === location.id
                                  ? { ...l, name: e.target.value }
                                  : l,
                              ),
                            }))
                          }
                        />
                      </label>
                      <label>
                        {t("地点类型", "Place type")}
                        <select
                          value={location.category}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              locations: d.locations.map((l) =>
                                l.id === location.id
                                  ? {
                                      ...l,
                                      category: e.target.value as Category,
                                    }
                                  : l,
                              ),
                            }))
                          }
                        >
                          {categories.map((c) => (
                            <option key={c} value={c}>
                              {t(categoryNames[c], englishCategories[c])}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <button
                      className="text-button"
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          locations: d.locations.filter(
                            (l) => l.id !== location.id,
                          ),
                          cues: d.cues?.filter(
                            (x) => x.locationId !== location.id,
                          ),
                          facts: d.facts?.filter(
                            (x) => x.locationId !== location.id,
                          ),
                          events: d.events.filter(
                            (e) => e.locationId !== location.id,
                          ),
                        }))
                      }
                    >
                      <Trash2 size={15} />
                      {t("移除待确认地点", "Remove this place")}
                    </button>
                  </fieldset>
                ))}
                {draft.events.map((event) => (
                  <fieldset key={event.id} className="life-event-editor">
                    <legend>{t("生活事件", "Routine event")}</legend>
                    <label>
                      {t("发生地点", "Where it happens")}
                      <select
                        value={event.locationId}
                        onChange={(e) =>
                          updateEvent(event.id, { locationId: e.target.value })
                        }
                      >
                        {[
                          ...draft.locations,
                          ...life.locations.filter(
                            (l) => !draft.locations.some((d) => d.id === l.id),
                          ),
                        ].map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name || t("新地点", "New place")}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      {t("事件名称", "Event name")}
                      <input
                        value={event.title}
                        maxLength={160}
                        onChange={(e) =>
                          updateEvent(event.id, { title: e.target.value })
                        }
                      />
                    </label>
                    <div className="form-pair">
                      <label>
                        {t("开始时间（可空）", "Start time (optional)")}
                        <input
                          type="time"
                          value={event.start ?? ""}
                          onChange={(e) =>
                            updateEvent(event.id, {
                              start: e.target.value || null,
                            })
                          }
                        />
                      </label>
                      <label>
                        {t("结束时间（可空）", "End time (optional)")}
                        <input
                          type="time"
                          value={event.end ?? ""}
                          onChange={(e) =>
                            updateEvent(event.id, {
                              end: e.target.value || null,
                            })
                          }
                        />
                      </label>
                    </div>
                    <div className="form-pair">
                      <label>
                        {t("重复", "Repeats")}
                        <select
                          value={event.recurrence}
                          onChange={(e) =>
                            updateEvent(event.id, {
                              recurrence: e.target
                                .value as LifeEvent["recurrence"],
                            })
                          }
                        >
                          <option value="weekday">
                            {t("工作日", "Weekdays")}
                          </option>
                          <option value="weekend">
                            {t("周末", "Weekends")}
                          </option>
                          <option value="unscheduled">
                            {t("随事件，无固定时间", "Event-triggered")}
                          </option>
                          <option value="daily">{t("每天", "Daily")}</option>
                        </select>
                      </label>
                      <label>
                        {t("到达方式", "How you get there")}
                        <select
                          value={event.transport}
                          onChange={(e) =>
                            updateEvent(event.id, {
                              transport: e.target
                                .value as LifeEvent["transport"],
                            })
                          }
                        >
                          {[
                            ["unknown", t("未说明", "Not specified")],
                            ["walk", t("步行", "On foot")],
                            ["subway", t("地铁", "Metro")],
                            ["bus", t("公交", "Bus")],
                            ["bike", t("骑行", "Bicycle")],
                            ["car", t("汽车", "Car")],
                          ].map(([v, label]) => (
                            <option key={v} value={v}>
                              {t(
                                label,
                                englishTravel[v as LifeEvent["transport"]],
                              )}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <label className="inline-check">
                      <input
                        type="checkbox"
                        checked={event.approximate ?? false}
                        onChange={(e) =>
                          updateEvent(event.id, {
                            approximate: e.target.checked,
                          })
                        }
                      />
                      {t("这是大约时间", "Approximate time")}
                    </label>
                    <label className="inline-check">
                      <input
                        type="checkbox"
                        checked={event.busy}
                        onChange={(e) =>
                          updateEvent(event.id, { busy: e.target.checked })
                        }
                      />
                      {t(
                        "忙碌窗口，不自动推荐",
                        "Busy period. Do not suggest activities.",
                      )}
                    </label>
                    <p className="fineprint">
                      {t("来源：", "Source: ")}
                      {productText(event.evidence, locale) ||
                        t("待确认", "Unconfirmed")}
                    </p>
                    <button
                      className="text-button"
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          events: d.events.filter((e) => e.id !== event.id),
                        }))
                      }
                    >
                      {t("移除待确认事件", "Remove this event")}
                    </button>
                  </fieldset>
                ))}
                {(draft.locations.length > 0 || life.locations.length > 0) && (
                  <>
                    <button
                      className="button"
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          events: [
                            ...d.events,
                            {
                              id: `event_${crypto.randomUUID()}`,
                              locationId:
                                d.locations[0]?.id ?? life.locations[0].id,
                              title: "",
                              start: null,
                              end: null,
                              recurrence: "weekday",
                              transport: "unknown",
                              busy: false,
                              evidence: "用户手动录入",
                            },
                          ],
                        }))
                      }
                    >
                      <Plus size={16} />
                      {t("添加生活事件", "Add a routine event")}
                    </button>
                  </>
                )}
              </div>
            </details>
            <button
              className="button primary"
              disabled={
                busy ||
                pending ||
                draft.locations.some((l) => !l.name.trim()) ||
                draft.events.some((e) => !e.title.trim())
              }
              onClick={() => void confirm()}
            >
              <Check size={17} />
              {t("确认资料并生成城镇", "Confirm and update my town")}
              <ArrowRight size={17} />
            </button>
          </section>
        )}
      </div>
      {!onboarding && life.locations.length > 0 && (
        <section className="panel section-spaced">
          <h2>{t("已保存的地点", "Saved places")}</h2>
          <div className="saved-places">
            {life.locations.map((l) => (
              <div key={l.id}>
                <span>
                  {placeName(l, locale)} ·{" "}
                  {t(categoryNames[l.category], englishCategories[l.category])}
                </span>
                <button
                  className="text-button"
                  onClick={async () => {
                    if (await send({ type: "life-remove", locationId: l.id }))
                      setMessage(
                        t(
                          "地点与关联事件已移除，其他建筑位置保持不变。",
                          "Removed the place and its events. Other buildings remain in place.",
                        ),
                      );
                  }}
                >
                  {t("移除", "Remove")}
                  {placeName(l, locale)}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
