"use client"

import { IconArrowRight, IconCheck } from "@tabler/icons-react"
import { useState } from "react"

import { cn } from "@/lib/utils"

export type CapabilityLevel = {
  level: string
  title: string
  position: string
  focus: string
  skills: string
  skillItems: string[]
  flow: string[]
  shapeDescription: string
  scenarios: { title: string; description: string }[]
  href: string
}

export function LevelsCapabilityMap({ levels }: { levels: CapabilityLevel[] }) {
  const [activeLevel, setActiveLevel] = useState(levels[0]?.level ?? "")
  const active = levels.find((item) => item.level === activeLevel) ?? levels[0]

  if (!active) return null

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
      <div className="max-w-2xl">
        <h2 className="text-balance text-2xl font-semibold tracking-tight">
          能力地图
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          每个等级对应一种应用交付能力，先定位当前阶段，再选择下一步要掌握的能力。
        </p>
      </div>

      <div className="mt-10">
        <div className="overflow-x-auto pb-1">
          <div
            role="tablist"
            aria-label="能力等级"
            className="grid min-w-[44rem] grid-cols-4 gap-2"
          >
            {levels.map((item) => (
              <button
                key={item.level}
                type="button"
                role="tab"
                aria-selected={active.level === item.level}
                aria-controls={`level-panel-${item.level}`}
                onClick={() => setActiveLevel(item.level)}
                className={cn(
                  "flex min-w-0 flex-col items-start gap-1 rounded-lg border border-border bg-background px-4 py-3 text-left text-foreground transition-colors hover:bg-muted/50",
                  "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  "aria-selected:border-primary aria-selected:bg-primary aria-selected:text-primary-foreground aria-selected:hover:bg-primary",
                )}
              >
                <span className="font-mono text-xs tracking-[0.12em] opacity-75">
                  {item.level}
                </span>
                <span className="text-sm font-medium">{item.title}</span>
              </button>
            ))}
          </div>
        </div>

        <div
          id={`level-panel-${active.level}`}
          role="tabpanel"
          aria-label={`${active.level} ${active.title}`}
          className="mt-6 grid gap-4 lg:grid-cols-[7fr_5fr]"
        >
          <article className="rounded-lg border bg-background p-6 sm:p-7">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Capability · 当前版图
            </p>
            <div className="mt-4">
              <h3 className="text-2xl font-semibold tracking-tight">
                {active.title}
              </h3>
            </div>

            <div className="mt-7 grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  定位
                </p>
                <p className="mt-2 text-sm leading-6">{active.position}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  重点
                </p>
                <p className="mt-2 text-sm leading-6">{active.focus}</p>
              </div>
            </div>

            <p className="mt-8 border-t pt-5 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              包含的技能 · {active.skills}
            </p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {active.skillItems.map((skill) => (
                <li
                  key={skill}
                  className="flex items-start gap-2 text-sm leading-6"
                >
                  <IconCheck
                    aria-hidden="true"
                    className="mt-1 size-4 shrink-0 text-muted-foreground"
                  />
                  <span>{skill}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-lg border bg-background p-6 sm:p-7">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Application Shape · 应用形态
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-2">
              {active.flow.map((step, index) => (
                <div key={step} className="contents">
                  <span className="rounded-full border bg-muted/40 px-3 py-1.5 text-sm">
                    {step}
                  </span>
                  {index < active.flow.length - 1 && (
                    <IconArrowRight
                      aria-hidden="true"
                      className="size-4 shrink-0 text-muted-foreground"
                    />
                  )}
                </div>
              ))}
            </div>
            <p className="mt-8 border-t pt-5 text-sm leading-6 text-muted-foreground">
              {active.shapeDescription}
            </p>
          </article>

          <div className="rounded-lg border bg-background p-6 sm:p-7 lg:col-span-2">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              应用场景 · Scenarios
            </p>
            <div className="mt-5 grid gap-6 sm:grid-cols-2">
              {active.scenarios.map((scenario) => (
                <div key={scenario.title} className="group">
                  <h3 className="text-lg font-semibold tracking-tight">
                    {scenario.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {scenario.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
