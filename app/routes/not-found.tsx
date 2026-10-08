import type { Route } from "./+types/not-found";
import { NotFoundMessage } from "~/components/layout/NotFoundMessage";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Page not found | IoT Simulator Lab" }];
}

export default function NotFound() {
  return <NotFoundMessage />;
}
