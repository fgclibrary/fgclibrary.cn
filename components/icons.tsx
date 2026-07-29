import type { SVGProps } from "react"

export function LogoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect
        className="fill-primary"
        height="18"
        rx="4"
        ry="4"
        width="18"
        x="0"
        y="0"
      />
      <rect
        className="fill-chart-1"
        fillOpacity="0.9"
        height="18"
        rx="4"
        ry="4"
        width="18"
        x="6"
        y="6"
      />
    </svg>
  )
}
