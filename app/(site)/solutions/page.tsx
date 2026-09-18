import { IconArrowRight, IconCheck } from "@tabler/icons-react"
import type { Metadata } from "next"
import Link from "next/link"

import { SiteAnnouncement } from "@/components/site-announcement"
import { getSiteModule } from "@/lib/site-config"

export const metadata: Metadata = {
  title: "解决方案",
  description: "浏览可以直接应用到活字格项目中的成熟、完整、可复用工程方案。",
}

const module = getSiteModule("solutions")

const solutions = [
  {
    title: "RBAC 权限框架",
    description:
      "将用户、角色、组织与权限能力封装为可复用模块，为新应用提供一套清晰、可靠的权限基础。",
    capabilities: [
      "用户、角色与组织结构管理",
      "权限组与角色继承模型",
      "页面、组件和服务端命令",
      "完整 API 与自定义前端支持",
    ],
    primaryLink: {
      href: "/docs/solutions/rbac/quick-start",
      label: "快速开始",
    },
    secondaryLink: {
      href: "/docs/solutions/rbac",
      label: "了解框架设计",
    },
  },
  {
    title: "HAC",
    description:
      "把活字格应用运行在 Android 手机、平板和工业 PDA 上，通过插件命令调用扫码、定位、拍摄、NFC、BLE 等设备能力，并按现场环境设计移动页面。",
    capabilities: [
      "激光扫码、UHF / RFID 与物理按键监听",
      "定位、NFC、BLE 与生物识别认证",
      "拍照、录像、录音与本地文件处理",
      "离线存储、PDF 预览、广播与 APP 交互",
    ],
    primaryLink: {
      href: "/docs/solutions/hac",
      label: "了解 HAC",
    },
    secondaryLink: {
      href: "/docs/solutions/hac/installation",
      label: "安装与配置",
    },
  },
  {
    title: "HAC 离线填报",
    description:
      "让现场作业人员断网也能继续完成表单填报，恢复网络后把填报记录与附件安全回传到活字格。",
    capabilities: [
      "自定义离线表单定义与多步骤填报",
      "图片、文件、签名与明细列表支持",
      "表单与说明 PDF 下发到 HAC",
      "记录回传、附件上传与设备数据维护",
    ],
    primaryLink: {
      href: "/docs/solutions/offline-form",
      label: "了解方案设计",
    },
    secondaryLink: {
      href: "/docs/solutions/offline-form/form-structure",
      label: "查看表单结构",
    },
  },
]

export default function SolutionsPage() {
  return (
    <main className="flex-1">
      <section>
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
            <SiteAnnouncement />
            <h1 className="text-balance text-4xl font-semibold leading-[1.15] tracking-[-0.035em] sm:text-5xl">
              活字格解决方案
            </h1>
            <p className="mt-7 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground">
              找到适合项目的成熟方案，把经过验证的业务能力直接带进活字格项目。
            </p>
            <Link
              href={module.docsHref}
              className="group mt-8 inline-flex items-center gap-2 text-sm font-medium text-primary"
            >
              浏览解决方案文档
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
            选择适合项目的方案
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            将经过验证的业务能力带进项目，减少从零设计和重复实现。
          </p>
        </div>

        <div className="mt-10 grid gap-6">
          {solutions.map((solution) => (
            <article
              key={solution.title}
              className="overflow-hidden rounded-xl border bg-background"
            >
              <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.75fr)] lg:gap-12">
                <div>
                  <h3 className="text-2xl font-semibold tracking-tight">
                    {solution.title}
                  </h3>
                  <p className="mt-4 max-w-2xl text-pretty text-sm leading-7 text-muted-foreground sm:text-base">
                    {solution.description}
                  </p>
                  <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm">
                    <Link
                      href={solution.primaryLink.href}
                      className="group inline-flex items-center gap-2 font-medium text-primary"
                    >
                      {solution.primaryLink.label}
                      <IconArrowRight
                        aria-hidden="true"
                        className="size-4 transition-transform group-hover:translate-x-1"
                      />
                    </Link>
                    <Link
                      href={solution.secondaryLink.href}
                      className="font-medium hover:underline"
                    >
                      {solution.secondaryLink.label}
                    </Link>
                  </div>
                </div>

                <div className="border-t pt-7 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                  <p className="text-xs font-medium tracking-[0.14em] text-primary">
                    包含能力
                  </p>
                  <ul className="mt-4 grid gap-3">
                    {solution.capabilities.map((capability) => (
                      <li
                        key={capability}
                        className="flex items-start gap-2 text-sm leading-6"
                      >
                        <IconCheck
                          aria-hidden="true"
                          className="mt-1 size-4 shrink-0 text-muted-foreground"
                        />
                        <span>{capability}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
