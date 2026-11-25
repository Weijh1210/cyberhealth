import type { Move } from "../life/moveNow";
import { useLanguage } from "../i18n/language";

const neutralArms = "M97 69L82 85L84 102 M103 69L117 85L116 102";
const supportedArms = "M97 70l15 19 24-12 M103 70l16 16 17-9";
const arms: Partial<Record<Move["demonstration"], string>> = {
  open: "M96 70L72 72L51 66 M101 70L124 70L146 64",
  push: "M97 70l22 5 20-12 M102 72l22 7 15-16",
  household: "M96 71l-13 21 32 2 M102 71l12 20 22 3",
  fingers: "M97 70l-11 17-13-3 M103 70l13 17 15-3",
  elbow: "M97 69l-12 20 5-25 M103 69l14 17-1 16",
  reach: "M97 69l-12-24-3-23 M103 69l14 17-1 16",
  twist: "M97 69l-10 15 18-12 M103 69l9 15-19-12",
  shoulder: "M97 66l-17 19 2 17 M103 66l17 19-2 17",
  calf: "M97 71l20 7 22-14 M103 72l20 8 16-16",
};
const standingLegs: Partial<Record<Move["demonstration"], string>> = {
  side: "M92 105l-24 27h-9",
  back: "M92 105l-17 25h-8",
  step: "M92 105l-18 30h13",
  calf: "M92 105l-25 30h13",
  heels: "M92 105l-4 26 12 5",
  squat: "M92 105l5 15-10 16h13",
};

export function MovementFigure({
  pose = "march",
  seated = false,
  supported = false,
  active = false,
}: {
  pose?: Move["demonstration"];
  seated?: boolean;
  supported?: boolean;
  active?: boolean;
}) {
  const { t } = useLanguage();
  const upper = arms[pose] ?? (supported ? supportedArms : neutralArms);
  const leg = seated
    ? pose === "knee"
      ? "M93 105l16 8 18 9 6-5"
      : "M93 105l16 8v23h11"
    : (standingLegs[pose] ?? "M92 105l-4 31h13");
  return (
    <svg
      className={`move-figure ${active ? "in-motion" : ""}`}
      viewBox="0 0 200 158"
      role="img"
      aria-label={t("动作姿势示意", "Movement posture illustration")}
    >
      <ellipse cx="104" cy="140" rx="62" ry="7" fill="#b1c6a0" opacity=".5" />
      {(seated || supported) && (
        <path
          d={
            supported
              ? "M136 68v38h28m-26 0v30m24-30v30"
              : "M70 69V109H109M75 109v28m28-28v28"
          }
          fill="none"
          stroke="#9c7959"
          strokeWidth="5"
          strokeLinecap="round"
        />
      )}
      {(pose === "push" || pose === "calf") && (
        <path d="M141 45v93" stroke="#a3ad91" strokeWidth="6" />
      )}
      {pose === "household" && (
        <path d="M115 96h34v39" fill="none" stroke="#a48a6c" strokeWidth="4" />
      )}
      <g
        className={
          pose === "rise" || pose === "squat" ? "figure-rise" : undefined
        }
      >
        <g className={pose === "neck" ? "figure-head" : undefined}>
          <circle cx="99" cy="44" r="14" fill="#d69e79" />
          <path d="M85 42q0-19 22-13l6 12q-13-7-28 1" fill="#483a32" />
        </g>
        <path
          className={`figure-arm pose-${pose}`}
          d={upper}
          fill="none"
          stroke="#bb8063"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M87 65q12-5 24 0l1 39H88z" fill="#52866b" />
        <path
          d={seated ? "M102 104l18 7v25h12" : "M102 104l8 32h13"}
          fill="none"
          stroke="#344e48"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          className={`figure-leg pose-${pose}`}
          d={leg}
          fill="none"
          stroke="#526a62"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
