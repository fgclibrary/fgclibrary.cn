import { IconArrowRight } from "@tabler/icons-react"
import type { Metadata } from "next"
import Link from "next/link"

import { SiteAnnouncement } from "@/components/site-announcement"
import { getSiteModule } from "@/lib/site-config"

export const metadata: Metadata = {
  title: "标准化",
  description: "覆盖架构、开发和运维阶段的活字格标准化最佳实践与工程经验。",
}

const module = getSiteModule("standards")

const lifecycleStages = [
  {
    title: "需求调研",
    description:
      "先用原型确认系统边界、页面风格与核心业务逻辑，让需求在开发前变得可验证。",
    practices: [
      "原型验证与阶段性演示",
      "需求变化留痕",
      "明确项目范围与交付边界",
    ],
    href: "/docs/standards/arch/life-cycle#需求调研",
  },
  {
    title: "架构设计",
    description:
      "根据业务规模、团队协作方式和运行要求，选择合适的系统架构与部署方式。",
    practices: [
      "系统架构与模块边界",
      "部署方式与环境规划",
      "健壮性与可维护性设计",
    ],
    href: "/docs/standards/arch",
  },
  {
    title: "开发实施",
    description:
      "将页面、数据、业务逻辑和协作方式纳入统一规约，减少个人习惯带来的交付差异。",
    practices: [
      "开发原则与基础规范",
      "数据库、配置与扩展",
      "协同开发与版本管理",
    ],
    href: "/docs/standards/dev",
  },
  {
    title: "验证发布",
    description:
      "在接近生产的验证环境中完成测试、升级和备份确认，再将变更安全地交付给用户。",
    practices: ["验证环境与发布检查", "数据库升级验证", "发布窗口与应用备份"],
    href: "/docs/standards/arch/life-cycle#验证发布",
  },
  {
    title: "线上运维",
    description:
      "通过监控、日志、备份与安全策略，让应用上线之后仍然能够持续稳定地运行。",
    practices: [
      "系统、服务与数据管理",
      "监控告警与日志策略",
      "备份恢复与安全维护",
    ],
    href: "/docs/standards/operation",
  },
]

const values = [
  {
    title: "一致交付",
    description:
      "团队使用相同的约定和流程工作，减少沟通成本，让项目结果更可预测。",
  },
  {
    title: "质量可控",
    description:
      "把检查和验证前移，在需求、设计、开发和发布的关键节点及时发现风险。",
  },
  {
    title: "知识复用",
    description:
      "将成熟经验沉淀为文档和实践，新成员能够更快进入项目，团队能力持续积累。",
  },
  {
    title: "长期维护",
    description:
      "清晰的结构、规范的配置与完整的运行记录，为后续迭代、交接和问题定位留下依据。",
  },
]

export default function StandardsPage() {
  return (
    <main className="flex-1">
      <section>
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
            <SiteAnnouncement />
            <h1 className="text-balance text-4xl font-semibold leading-[1.15] tracking-[-0.035em] sm:text-5xl">
              活字格标准化
            </h1>
            <p className="mt-7 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground">
              从需求、架构与开发，到发布和运维，让每个项目阶段都有可复用的实践依据。
            </p>
            <Link
              href={module.docsHref}
              className="group mt-8 inline-flex items-center gap-2 text-sm font-medium text-primary"
            >
              阅读标准化文档
              <IconArrowRight
                aria-hidden="true"
                className="size-4 transition-transform group-hover:translate-x-1"
              />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <div className="max-w-2xl">
          <h2 className="text-balance text-2xl font-semibold tracking-tight">
            软件开发生命周期
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            标准化不是某一个阶段的检查表，而是从需求确认到线上运行都能持续复用的一套工作方法。
          </p>
        </div>

        <ol className="relative mt-10 ml-2 border-l border-border sm:ml-4">
          {lifecycleStages.map((stage, index) => (
            <li
              key={stage.title}
              className="relative pb-10 pl-8 last:pb-0 sm:pl-10"
            >
              <span className="absolute -left-[0.7rem] top-0 flex size-5 items-center justify-center rounded-full border-2 border-primary bg-background font-mono text-[10px] font-semibold text-primary">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="grid gap-5 lg:grid-cols-[minmax(10rem,0.65fr)_minmax(0,1fr)_auto] lg:items-start lg:gap-10">
                <h3 className="text-lg font-semibold tracking-tight">
                  {stage.title}
                </h3>
                <div>
                  <p className="text-sm leading-6">{stage.description}</p>
                  <ul className="mt-4 grid gap-2 text-sm leading-6 text-muted-foreground">
                    {stage.practices.map((practice) => (
                      <li key={practice}>· {practice}</li>
                    ))}
                  </ul>
                </div>
                <Link
                  href={stage.href}
                  className="group inline-flex w-fit items-center gap-2 text-sm font-medium text-primary"
                >
                  查看阶段规范
                  <IconArrowRight
                    aria-hidden="true"
                    className="size-4 transition-transform group-hover:translate-x-1"
                  />
                </Link>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <div className="border-t pt-10 lg:pt-14">
          <div>
            <h2 className="text-balance text-2xl font-semibold tracking-tight">
              标准化的价值
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              标准化把个人经验变成团队可以执行、复用和持续改进的工作方式，让活字格项目不仅能够快速交付，也能够长期维护。
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((value) => (
              <article
                key={value.title}
                className="h-full rounded-xl border bg-background p-5 sm:p-6"
              >
                <h3 className="font-semibold tracking-tight">{value.title}</h3>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  {value.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
