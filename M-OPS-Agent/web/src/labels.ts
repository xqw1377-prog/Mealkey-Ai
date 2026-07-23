export function dimensionLabel(dim?: string) {
  switch (dim) {
    case "customer":
      return "顾客体验";
    case "product":
      return "产品吸引力";
    case "service":
      return "服务流程";
    case "operation":
      return "运营效率";
    case "competition":
      return "竞争压力";
    case "growth":
      return "增长势能";
    default:
      return "经营状态";
  }
}

export function levelStars(level?: string) {
  switch (level) {
    case "critical":
      return "★☆☆☆☆";
    case "risk":
      return "★★☆☆☆";
    case "attention":
      return "★★★☆☆";
    case "observe":
      return "★★★★☆";
    case "healthy":
    default:
      return "★★★★★";
  }
}
