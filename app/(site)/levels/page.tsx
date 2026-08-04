import { IconArrowRight } from "@tabler/icons-react"
import type { Metadata } from "next"
import Link from "next/link"

import {
  type CapabilityLevel,
  LevelsCapabilityMap,
} from "@/components/levels-capability-map"
import { LevelsComparison } from "@/components/levels-comparison"
import { SiteAnnouncement } from "@/components/site-announcement"
import { getSiteModule } from "@/lib/site-config"

export const metadata: Metadata = {
  title: "能力地图",
  description: "通过 L1–L4 能力地图定位活字格开发阶段，规划下一步学习路径。",
}

const module = getSiteModule("levels")

const levels: CapabilityLevel[] = [
  {
    level: "L1",
    title: "单表应用",
    tabTitle: "单表",
    position: "入门级能力，完成单表数据的录入、展示与基础交互。",
    focus: "建立「设计页面 → 绑定数据 → 发布运行」的完整认知。",
    skillItems: [
      "页面设计与数据表设计",
      "单表数据绑定与基础命令",
      "公式、表达式与数据操作",
      "应用发布、用户权限与调试预览",
    ],
    flow: {
      ariaLabel: "L1 单表应用典型流程",
      nodes: [
        {
          id: "input",
          label: "填写信息",
          variant: "input",
          desktop: { x: 0, y: 40 },
          mobile: { x: 100, y: 0 },
        },
        {
          id: "validate",
          label: "校验提交",
          desktop: { x: 280, y: 40 },
          mobile: { x: 100, y: 92 },
        },
        {
          id: "store",
          label: "保存入表",
          variant: "database",
          desktop: { x: 560, y: 40 },
          mobile: { x: 100, y: 184 },
        },
        {
          id: "query",
          label: "查询汇总",
          variant: "output",
          desktop: { x: 840, y: 40 },
          mobile: { x: 100, y: 288 },
        },
      ],
      edges: [
        { source: "input", target: "validate" },
        { source: "validate", target: "store" },
        { source: "store", target: "query" },
      ],
    },
    shapeDescription:
      "围绕一张业务表完成数据录入、校验、存储与查询汇总，快速形成结构简单、流程清晰的业务闭环。",
    scenarios: [
      {
        title: "客户邀约登记",
        description: "邀约信息在线录入，多人填写、随时汇总，替代纸质登记表。",
      },
      {
        title: "满意度调查",
        description: "在线发放问卷，提交即入库，结果实时可查可导出。",
      },
    ],
    href: "/docs/levels/l1",
  },
  {
    level: "L2",
    title: "数据填报与展示应用",
    tabTitle: "数据填报",
    position: "进阶级能力，独立完成多表关联、查询展示和流程型应用。",
    focus: "打磨数据模型与查询性能，完成从“能用”到“能交付”的过渡。",
    skillItems: [
      "多表关联、视图与查询",
      "数据导入导出与列表分页",
      "图表展示、主从页面联动与表单校验",
      "工作流、消息通知、报表与版本管理",
    ],
    flow: {
      ariaLabel: "L2 数据填报与展示应用典型流程",
      nodes: [
        {
          id: "online-entry",
          label: "在线填报",
          variant: "input",
          desktop: { x: 0, y: 40 },
          mobile: { x: -40, y: 0 },
        },
        {
          id: "batch-import",
          label: "批量导入",
          variant: "input",
          desktop: { x: 0, y: 180 },
          mobile: { x: 240, y: 0 },
        },
        {
          id: "validation",
          label: "校验与流转",
          desktop: { x: 280, y: 110 },
          mobile: { x: 100, y: 100 },
        },
        {
          id: "data-model",
          label: "多表数据模型",
          variant: "database",
          desktop: { x: 560, y: 110 },
          mobile: { x: 100, y: 210 },
        },
        {
          id: "workflow",
          label: "流程协作",
          desktop: { x: 840, y: 20 },
          mobile: { x: -40, y: 320 },
        },
        {
          id: "query",
          label: "查询列表",
          variant: "output",
          desktop: { x: 840, y: 110 },
          mobile: { x: 240, y: 320 },
        },
        {
          id: "dashboard",
          label: "报表看板",
          variant: "output",
          desktop: { x: 840, y: 200 },
          mobile: { x: 100, y: 430 },
        },
      ],
      edges: [
        { source: "online-entry", target: "validation" },
        { source: "batch-import", target: "validation" },
        { source: "validation", target: "data-model" },
        { source: "data-model", target: "workflow" },
        { source: "data-model", target: "query" },
        { source: "data-model", target: "dashboard" },
      ],
    },
    shapeDescription:
      "在线填报与批量数据经过校验和流程处理后汇入多表数据模型，再支撑流程协作、查询列表和报表看板。",
    scenarios: [
      {
        title: "在线工单",
        description: "报修与服务请求在线提交，自动分派、全程可追踪。",
      },
      {
        title: "在线预约",
        description: "预约信息登记与排期，到期自动提醒，减少遗漏。",
      },
    ],
    href: "/docs/levels/l2",
  },
  {
    level: "L3",
    title: "常规业务应用",
    tabTitle: "常规业务",
    position: "业务开发能力，独立交付复杂逻辑的常规企业应用。",
    focus: "将业务逻辑下沉到服务端，建立前后端分离与工程化思维。",
    skillItems: [
      "服务端命令与服务端编程",
      "事务处理与数据一致性",
      "外部接口与现有数据库集成",
      "数据库设计进阶与模块化复用",
    ],
    flow: {
      ariaLabel: "L3 常规业务应用典型流程",
      nodes: [
        {
          id: "orders",
          label: "订单模块",
          variant: "input",
          desktop: { x: 0, y: 20 },
          mobile: { x: -40, y: 0 },
        },
        {
          id: "inventory",
          label: "库存模块",
          variant: "input",
          desktop: { x: 0, y: 130 },
          mobile: { x: 240, y: 0 },
        },
        {
          id: "approval",
          label: "审批模块",
          variant: "input",
          desktop: { x: 0, y: 240 },
          mobile: { x: 100, y: 100 },
        },
        {
          id: "service",
          label: "服务端业务规则",
          desktop: { x: 300, y: 130 },
          mobile: { x: 100, y: 200 },
        },
        {
          id: "transaction",
          label: "事务处理",
          desktop: { x: 600, y: 40 },
          mobile: { x: -40, y: 300 },
        },
        {
          id: "integration",
          label: "外部系统协同",
          variant: "output",
          desktop: { x: 600, y: 220 },
          mobile: { x: 240, y: 300 },
        },
        {
          id: "database",
          label: "业务数据库",
          variant: "database",
          desktop: { x: 900, y: 40 },
          mobile: { x: -40, y: 410 },
        },
        {
          id: "business-loop",
          label: "业务结果回写",
          variant: "output",
          desktop: { x: 1200, y: 40 },
          mobile: { x: -40, y: 520 },
        },
      ],
      edges: [
        { source: "orders", target: "service" },
        { source: "inventory", target: "service" },
        { source: "approval", target: "service" },
        { source: "service", target: "transaction" },
        { source: "service", target: "integration" },
        { source: "transaction", target: "database" },
        { source: "database", target: "business-loop" },
      ],
    },
    shapeDescription:
      "订单、库存和审批等业务模块统一调用服务端规则；事务集中入库并回写业务结果，同时与外部系统协同。",
    scenarios: [
      {
        title: "库存管理",
        description: "出入库、余量与单据联动，库存数据实时准确。",
      },
      {
        title: "订单管理",
        description: "订单从录入、审批到履约全流程在线管理。",
      },
    ],
    href: "/docs/levels/l3",
  },
  {
    level: "L4",
    title: "高可用 / 高性能核心业务应用",
    tabTitle: "核心业务",
    position: "专家级能力，面向大数据量下长期运行的核心业务系统。",
    focus: "围绕大数据量下的稳定性、可控性与可维护性，让核心系统长期可靠运行。",
    skillItems: [
      "大数据量、并发、缓存与性能调优",
      "事务一致性、异常恢复与稳定性保障",
      "身份认证、权限控制、审计与监控告警",
      "日志追踪、备份恢复、运维诊断与版本演进",
    ],
    flow: {
      ariaLabel: "L4 高可用高性能核心业务应用典型流程",
      nodes: [
        {
          id: "core-system",
          label: "核心业务系统",
          variant: "input",
          desktop: { x: 0, y: 150 },
          mobile: { x: 100, y: 0 },
        },
        {
          id: "large-scale",
          label: "大数据量运行",
          desktop: { x: 280, y: 150 },
          mobile: { x: 100, y: 92 },
        },
        {
          id: "stability",
          label: "稳定性保障",
          desktop: { x: 560, y: 20 },
          mobile: { x: -40, y: 200 },
        },
        {
          id: "control",
          label: "可控性保障",
          desktop: { x: 560, y: 150 },
          mobile: { x: 240, y: 200 },
        },
        {
          id: "maintenance",
          label: "可维护性保障",
          desktop: { x: 560, y: 280 },
          mobile: { x: 100, y: 270 },
        },
        {
          id: "reliable-operation",
          label: "持续可靠运行",
          variant: "output",
          desktop: { x: 860, y: 150 },
          mobile: { x: 100, y: 460 },
        },
      ],
      edges: [
        { source: "core-system", target: "large-scale" },
        { source: "large-scale", target: "stability" },
        { source: "large-scale", target: "control" },
        { source: "large-scale", target: "maintenance" },
        { source: "stability", target: "reliable-operation" },
        { source: "control", target: "reliable-operation" },
        { source: "maintenance", target: "reliable-operation" },
      ],
    },
    shapeDescription:
      "从持续承载大数据量的核心系统出发，同时建立稳定性、可控性和可维护性保障，使系统能够长期可靠运行并持续演进。",
    scenarios: [
      {
        title: "集团级 ERP",
        description: "承载集团关键业务，在大数据量下保持稳定运行。",
      },
      {
        title: "核心交易系统",
        description: "面向高并发交易场景，以集群与容灾保障持续可用。",
      },
    ],
    href: "/docs/levels/l4",
  },
]

export default function LevelsPage() {
  return (
    <main className="flex-1">
      <section>
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
            <SiteAnnouncement />
            <h1 className="text-balance text-4xl font-semibold leading-[1.15] tracking-[-0.035em] sm:text-5xl">
              活字格能力地图
            </h1>
            <p className="mt-7 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground">
              从入门到核心业务，找到适合你的学习与交付路径。
            </p>
            <Link
              href={module.docsHref}
              className="group mt-8 inline-flex items-center gap-2 text-sm font-medium text-primary"
            >
              查看完整能力清单
              <IconArrowRight
                aria-hidden="true"
                className="size-4 transition-transform group-hover:translate-x-1"
              />
            </Link>
          </div>
        </div>
      </section>

      <LevelsCapabilityMap levels={levels} />
      <LevelsComparison />
    </main>
  )
}
