"use client"

import { IconArrowRight, IconCheck } from "@tabler/icons-react"
import { useState } from "react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export type CapabilityLevel = {
  level: string
  title: string
  tabTitle?: string
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

      <Tabs
        value={active.level}
        onValueChange={(value) => {
          if (typeof value === "string") setActiveLevel(value)
        }}
        className="mt-10"
      >
        <TabsList className="!h-auto grid w-full grid-cols-4">
          {levels.map((item) => (
            <TabsTrigger
              key={item.level}
              value={item.level}
              aria-label={`${item.level} ${item.title}`}
              className="h-auto min-h-8 whitespace-normal px-2 py-2 sm:px-3"
            >
              <span className="font-mono text-xs tracking-[0.12em]">
                {item.level}
              </span>
              <span className="hidden sm:inline">
                · {item.tabTitle ?? item.title}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent
          value={active.level}
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
        </TabsContent>
      </Tabs>
    </section>
  )
}
