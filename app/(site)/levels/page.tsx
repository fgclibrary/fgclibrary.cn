import { IconArrowRight } from "@tabler/icons-react"
import type { Metadata } from "next"
import Link from "next/link"

import {
  type CapabilityLevel,
  LevelsCapabilityMap,
} from "@/components/levels-capability-map"
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
    skills: "9 项核心技能，覆盖页面设计、数据表操作、基础命令与发布流程。",
    skillItems: [
      "页面设计与数据表设计",
      "单表数据绑定与基础命令",
      "公式、表达式与数据操作",
      "应用发布、用户权限与调试预览",
    ],
    flow: ["在线录入", "单表数据", "查询筛选", "浏览器使用"],
    shapeDescription:
      "一张表支撑完整闭环：在线录入、查询筛选、权限控制，发布后直接在浏览器使用。",
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
    skills: "12 项核心技能，覆盖关联查询、列表图表、工作流与报表。",
    skillItems: [
      "多表关联、视图与查询",
      "数据导入导出与列表分页",
      "图表展示、主从页面联动与表单校验",
      "工作流、消息通知、报表与版本管理",
    ],
    flow: ["填报表单", "格式校验", "多表关联", "报表看板"],
    shapeDescription:
      "填报数据经过校验与多表关联，汇成报表看板；简单审批流与消息提醒随表单流转。",
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
    skills:
      "6 项核心技能，覆盖服务端命令、事务、接口集成、数据库设计与模块化。",
    skillItems: [
      "服务端命令与服务端编程",
      "事务处理与数据一致性",
      "外部接口与现有数据库集成",
      "数据库设计进阶与模块化复用",
    ],
    flow: ["业务模块", "服务端命令", "统一规则", "外部系统"],
    shapeDescription:
      "库存、订单、审批等业务模块接入服务端命令，规则集中执行、事务保持一致，并可对接外部系统。",
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
    position: "专家级能力，面向高可用、高性能核心业务场景。",
    focus: "围绕架构、性能、安全和运维，保障核心应用稳定运行。",
    skills: "12 项核心技能，覆盖大数据量、并发、缓存、集群、安全、监控与灾备。",
    skillItems: [
      "服务端命令与插件扩展",
      "大数据量、并发、缓存与性能调优",
      "身份认证、权限控制与安全防护",
      "集群高可用、监控告警、备份恢复与日志排查",
    ],
    flow: ["负载均衡", "应用集群", "数据库集群", "监控与安全"],
    shapeDescription:
      "负载均衡将请求分发到应用集群，数据落于主备容灾的数据库集群，监控与安全体系全程兜底。",
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
    </main>
  )
}
