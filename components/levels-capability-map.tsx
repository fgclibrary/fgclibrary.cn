"use client"

import { IconArrowRight, IconCheck } from "@tabler/icons-react"
import Link from "next/link"
import { useState } from "react"

import {
  CapabilityFlow,
  type CapabilityFlowDefinition,
} from "@/components/capability-flow"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export type CapabilityLevel = {
  level: string
  title: string
  tabTitle?: string
  position: string
  focus: string
  skillItems: string[]
  flow: CapabilityFlowDefinition
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
          key={active.level}
          value={active.level}
          aria-label={`${active.level} ${active.title}`}
          className="mt-6"
        >
          <article className="overflow-hidden rounded-xl border bg-background">
            <header className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">
                  {active.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
                  {active.position}
                </p>
              </div>
              <Link
                href={active.href}
                className="group inline-flex w-fit shrink-0 items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary/80 hover:underline"
              >
                查看 {active.level} 文档
                <IconArrowRight
                  aria-hidden="true"
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </header>

            <div className="grid gap-8 border-t px-6 py-7 sm:px-8 sm:py-8 md:grid-cols-3">
              <section>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">
                  重点
                </p>
                <p className="mt-3 text-sm leading-6">{active.focus}</p>
              </section>

              <section>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">
                  关键能力
                </p>
                <ul className="mt-3 grid gap-3">
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
              </section>

              <section>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">
                  典型应用场景
                </p>
                <div className="mt-3 flex flex-col gap-3">
                  {active.scenarios.map((scenario) => (
                    <div key={scenario.title}>
                      <p className="text-sm font-medium tracking-tight">
                        {scenario.title}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {scenario.description}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <section className="border-t px-6 py-7 sm:px-8 sm:py-8">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">
                典型流程
              </p>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                {active.shapeDescription}
              </p>
              <CapabilityFlow graph={active.flow} />
            </section>
          </article>
        </TabsContent>
      </Tabs>
    </section>
  )
}
