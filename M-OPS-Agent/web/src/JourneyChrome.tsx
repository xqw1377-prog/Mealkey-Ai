import { useEffect, useRef } from "react";
import {
  DEEPER_STEP,
  MOPS_JOURNEY,
  stepState,
  type JourneyStage,
} from "./journey";

export function JourneyRail(props: {
  current: JourneyStage;
  unlocked: boolean;
  onSelect: (stage: JourneyStage) => void;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const steps = [...MOPS_JOURNEY];
  if (props.unlocked) {
    steps.push(DEEPER_STEP);
  }

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const active = rail.querySelector<HTMLElement>('[data-state="active"]');
    active?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [props.current, props.unlocked]);

  return (
    <div
      ref={railRef}
      className="mops-step-rail mops-rise"
      data-count={steps.length}
      role="navigation"
      aria-label="经营体检旅程"
    >
      {steps.map((step) => {
        const state = stepState(step.id, props.current);
        const clickable =
          props.unlocked &&
          step.id !== "intake" &&
          step.id !== "recognizing" &&
          (state === "active" || state === "passed" || state === "future");
        return (
          <button
            key={step.id}
            type="button"
            className="mops-step"
            data-state={state === "locked" ? "locked" : state}
            disabled={!clickable}
            aria-current={state === "active" ? "step" : undefined}
            onClick={() => {
              if (clickable) props.onSelect(step.id);
            }}
          >
            <span className="mops-step-no">
              {state === "passed" ? "✓" : step.no}
            </span>
            <span className="mops-step-title">{step.title}</span>
            <span className="mops-step-feel">{step.feel}</span>
          </button>
        );
      })}
    </div>
  );
}

export function StickyCta(props: {
  label?: string;
  title: string;
  done?: boolean;
  primaryLabel: string;
  primaryDisabled?: boolean;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  showArrow?: boolean;
}) {
  const dark = !props.done;
  return (
    <div className="mops-sticky-cta" data-done={props.done ? "true" : "false"}>
      <div className="mops-sticky-copy">
        <p className="mops-sticky-label">{props.label || "现在只做这一步"}</p>
        <p className="mops-sticky-title">{props.title}</p>
      </div>
      <div className="mops-sticky-actions">
        {props.secondaryLabel && props.onSecondary ? (
          <button
            type="button"
            className={dark ? "btn btn-on-dark-ghost" : "btn btn-secondary"}
            onClick={props.onSecondary}
          >
            {props.secondaryLabel}
          </button>
        ) : null}
        <button
          type="button"
          className={dark ? "btn btn-on-dark" : "btn btn-olive"}
          disabled={props.primaryDisabled}
          onClick={props.onPrimary}
        >
          <span>{props.primaryLabel}</span>
          {props.showArrow !== false && !props.primaryDisabled ? (
            <span className="btn-arrow" aria-hidden="true">
              →
            </span>
          ) : null}
        </button>
      </div>
    </div>
  );
}
