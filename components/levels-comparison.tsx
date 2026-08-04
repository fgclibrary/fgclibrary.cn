const comparisonRows = [
  {
    label: "应用形态",
    values: [
      "单表应用",
      "数据填报与展示应用",
      "常规业务应用",
      "高可用 / 高性能核心业务应用",
    ],
  },
  {
    label: "数据模型",
    values: [
      "单张数据表",
      "多表关联、视图与查询",
      "多模块业务模型",
      "大数据量、高并发业务模型",
    ],
  },
  {
    label: "业务逻辑",
    values: [
      "页面命令与基础交互",
      "校验、流程、查询与报表",
      "服务端规则、事务与系统集成",
      "稳定性、可控性与可维护性",
    ],
  },
  {
    label: "协作范围",
    values: [
      "个人 / 小团队",
      "部门 / 中小型业务",
      "跨部门 / 多角色",
      "核心业务与长期运维团队",
    ],
  },
  {
    label: "核心关注",
    values: [
      "完成单表业务闭环",
      "数据组织与独立交付",
      "复杂业务逻辑与工程化",
      "大数据量下长期可靠运行",
    ],
  },
  {
    label: "典型场景",
    values: [
      "客户邀约登记 · 满意度调查",
      "在线工单 · 在线预约",
      "库存管理 · 订单管理",
      "集团级 ERP · 核心交易系统",
    ],
  },
]

const levelHeaders = ["L1", "L2", "L3", "L4"]

export function LevelsComparison() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
      <div className="max-w-2xl">
        <h2 className="text-balance text-2xl font-semibold tracking-tight">
          四级对比
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          从应用形态、数据模型到交付关注，横向比较四个能力等级，快速判断业务更接近哪个阶段。
        </p>
      </div>

      <div className="mt-10 overflow-hidden rounded-xl border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[64rem] border-collapse text-left text-sm">
            <caption className="sr-only">活字格 L1 至 L4 能力等级对比</caption>
            <thead>
              <tr className="border-b bg-muted/30">
                <th
                  scope="col"
                  className="sticky left-0 w-32 border-r bg-muted px-5 py-4 font-medium text-muted-foreground"
                >
                  维度
                </th>
                {levelHeaders.map((level) => (
                  <th
                    key={level}
                    scope="col"
                    className="min-w-56 px-6 py-4 font-mono text-xs font-medium tracking-[0.12em]"
                  >
                    {level}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.label} className="border-b last:border-b-0">
                  <th
                    scope="row"
                    className="sticky left-0 w-32 border-r bg-background px-5 py-5 font-normal text-muted-foreground"
                  >
                    {row.label}
                  </th>
                  {row.values.map((value, index) => (
                    <td
                      key={`${levelHeaders[index]}-${row.label}`}
                      className="min-w-56 px-6 py-5 leading-6"
                    >
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-4 text-xs leading-5 text-muted-foreground">
        本表用于能力分级的定性对照，具体业务方案仍需结合数据规模、并发量、安全要求与维护周期综合评估。
      </p>
    </section>
  )
}
